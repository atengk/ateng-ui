/**
 * WebSocketClient 基础长连接状态机、编解码与凭据透传单元测试。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createWebSocketClient, WebSocketClient } from '../src/websocket';
import { createAuthManager, MemoryAuthStorage } from '../src/auth';
import { createTenantManager, MemoryTenantStorage } from '../src/tenant';

/**
 * 内存级 Mock WebSocket 实现，用于确定性模拟原生 W3C WebSocket 行为。
 */
class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;

  url: string;
  protocols?: string | string[];
  readyState: number = MockWebSocket.CONNECTING;

  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  sentData: (string | ArrayBufferLike | Blob | ArrayBufferView)[] = [];

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    this.protocols = protocols;
    MockWebSocket.instances.push(this);
  }

  static instances: MockWebSocket[] = [];

  static clearInstances(): void {
    MockWebSocket.instances = [];
  }

  static get latest(): MockWebSocket | undefined {
    return MockWebSocket.instances[MockWebSocket.instances.length - 1];
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    this.sentData.push(data);
  }

  close(code = 1000, reason = ''): void {
    this.readyState = MockWebSocket.CLOSING;
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED;
      this.onclose?.({ code, reason, wasClean: true } as CloseEvent);
    }, 0);
  }

  // 模拟服务端事件触发辅助方法
  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }

  simulateMessage(data: unknown): void {
    this.onmessage?.({ data } as MessageEvent);
  }

  simulateError(errorEvent = new Event('error')): void {
    this.onerror?.(errorEvent);
  }

  simulateClose(code = 1000, reason = ''): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code, reason, wasClean: true } as CloseEvent);
  }
}

describe('WebSocketClient (核心长连接状态机、编解码与凭据透传)', () => {
  let originalWebSocket: typeof globalThis.WebSocket;

  beforeEach(() => {
    MockWebSocket.clearInstances();
    originalWebSocket = globalThis.WebSocket;
    globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
  });

  afterEach(() => {
    globalThis.WebSocket = originalWebSocket;
    vi.restoreAllMocks();
  });

  describe('1. 实例初始化与状态机流转', () => {
    it('默认创建后状态应为 CLOSED，且未创建底层连接', () => {
      const client = createWebSocketClient({
        url: 'ws://localhost:8080/ws',
      });

      expect(client.getStatus()).toBe('CLOSED');
      expect(client.getSocket()).toBeNull();
      expect(MockWebSocket.instances).toHaveLength(0);
    });

    it('调用 connect() 应流转至 CONNECTING，并在服务端就绪后流转为 OPEN', async () => {
      const client = new WebSocketClient({
        url: 'ws://localhost:8080/ws',
      });

      const openSpy = vi.fn();
      client.on('open', openSpy);

      const connectPromise = client.connect();
      expect(client.getStatus()).toBe('CONNECTING');
      expect(MockWebSocket.instances).toHaveLength(1);

      // 服务端模拟握手成功
      MockWebSocket.latest?.simulateOpen();
      await connectPromise;

      expect(client.getStatus()).toBe('OPEN');
      expect(openSpy).toHaveBeenCalledTimes(1);
    });

    it('若连接过程中触发错误并关闭，connect() Promise 应能安全 reject', async () => {
      const client = createWebSocketClient('ws://localhost:8080/ws');
      const errorSpy = vi.fn();
      client.on('error', errorSpy);

      const connectPromise = client.connect();
      MockWebSocket.latest?.simulateError();
      MockWebSocket.latest?.simulateClose(1006, 'Abnormal Closure');

      await expect(connectPromise).rejects.toThrow();
      expect(client.getStatus()).toBe('CLOSED');
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('2. 凭据透传与动态 URL 解析', () => {
    it('应自动从 AuthManager 提取 Token 拼装至 Query 参数', async () => {
      const authManager = createAuthManager({ storage: new MemoryAuthStorage() });
      authManager.setToken('test-token-12345');

      const client = createWebSocketClient({
        url: 'ws://localhost:8080/ws',
        authManager,
      });

      const connectPromise = client.connect();
      MockWebSocket.latest?.simulateOpen();
      await connectPromise;

      expect(MockWebSocket.latest?.url).toBe('ws://localhost:8080/ws?token=test-token-12345');
    });

    it('应支持保留原有 Query 并同时合并 TenantManager 租户 ID 与 Token', async () => {
      const authManager = createAuthManager({ storage: new MemoryAuthStorage() });
      authManager.setToken('auth-token');

      const tenantManager = createTenantManager({ storage: new MemoryTenantStorage() });
      tenantManager.setTenantId('tenant-999');

      const client = createWebSocketClient({
        url: 'ws://localhost:8080/api/v1/chat?channel=public',
        authManager,
        tenantManager,
        tokenParamName: 'auth',
        tenantParamName: 'x-tenant',
      });

      const connectPromise = client.connect();
      MockWebSocket.latest?.simulateOpen();
      await connectPromise;

      const url = new URL(MockWebSocket.latest?.url ?? '');
      expect(url.pathname).toBe('/api/v1/chat');
      expect(url.searchParams.get('channel')).toBe('public');
      expect(url.searchParams.get('auth')).toBe('auth-token');
      expect(url.searchParams.get('x-tenant')).toBe('tenant-999');
    });

    it('应支持传入异步函数动态计算最新的 URL', async () => {
      const urlGetter = vi.fn().mockResolvedValue('wss://secure.atengk.com/socket');

      const client = createWebSocketClient({
        url: urlGetter,
      });

      const connectPromise = client.connect();
      // 等待异步 URL Getter 决议并完成底层 Socket 实例化
      await new Promise(resolve => setTimeout(resolve, 10));
      MockWebSocket.latest?.simulateOpen();
      await connectPromise;

      expect(urlGetter).toHaveBeenCalledTimes(1);
      expect(MockWebSocket.latest?.url).toBe('wss://secure.atengk.com/socket');
    });
  });

  describe('3. 消息发送与雪花大数编解码', () => {
    it('未连接处于 CLOSED 状态时调用 send() 应返回 false 且不抛出未捕获异常', () => {
      const client = createWebSocketClient('ws://localhost:8080/ws');
      const result = client.send('hello');
      expect(result).toBe(false);
    });

    it('在 OPEN 状态下发送字符串与对象时，对象应自动 JSON 序列化', async () => {
      const client = createWebSocketClient('ws://localhost:8080/ws');
      const connectPromise = client.connect();
      MockWebSocket.latest?.simulateOpen();
      await connectPromise;

      const textResult = client.send('plain-text');
      expect(textResult).toBe(true);
      expect(MockWebSocket.latest?.sentData[0]).toBe('plain-text');

      const objResult = client.send({ action: 'ping', count: 1 });
      expect(objResult).toBe(true);
      expect(MockWebSocket.latest?.sentData[1]).toBe(JSON.stringify({ action: 'ping', count: 1 }));
    });

    it('接收服务端返回的含雪花大数 JSON 时，应自动保真解析且大数保持为字符串', async () => {
      const client = createWebSocketClient('ws://localhost:8080/ws');
      const messageSpy = vi.fn();
      client.on('message', messageSpy);

      const connectPromise = client.connect();
      MockWebSocket.latest?.simulateOpen();
      await connectPromise;

      // 服务端推送携带 18 位雪花数字 ID 的原始 JSON 文本
      const rawJson = '{"orderId":185912345678901234,"title":"Test Order"}';
      MockWebSocket.latest?.simulateMessage(rawJson);

      expect(messageSpy).toHaveBeenCalledTimes(1);
      const parsedData = messageSpy.mock.calls[0][0];
      expect(parsedData).toEqual({
        orderId: '185912345678901234',
        title: 'Test Order',
      });
      // 验证类型确实为 string，而非发生溢出截断的 number
      expect(typeof parsedData.orderId).toBe('string');
    });

    it('接收普通非 JSON 纯文本时应优雅回退，原样交付原始文本', async () => {
      const client = createWebSocketClient('ws://localhost:8080/ws');
      const messageSpy = vi.fn();
      client.on('message', messageSpy);

      const connectPromise = client.connect();
      MockWebSocket.latest?.simulateOpen();
      await connectPromise;

      MockWebSocket.latest?.simulateMessage('pong');

      expect(messageSpy).toHaveBeenCalledTimes(1);
      expect(messageSpy.mock.calls[0][0]).toBe('pong');
    });
  });

  describe('4. 生命周期监听器与注销清理', () => {
    it('调用 on() 返回的解绑函数应能正确停止接收后续事件', async () => {
      const client = createWebSocketClient('ws://localhost:8080/ws');
      const messageSpy = vi.fn();
      const unbind = client.on('message', messageSpy);

      const connectPromise = client.connect();
      MockWebSocket.latest?.simulateOpen();
      await connectPromise;

      MockWebSocket.latest?.simulateMessage('msg-1');
      expect(messageSpy).toHaveBeenCalledTimes(1);

      // 解绑
      unbind();

      MockWebSocket.latest?.simulateMessage('msg-2');
      expect(messageSpy).toHaveBeenCalledTimes(1);
    });

    it('主动调用 close() 应断开底层 socket 并将状态收敛至 CLOSED', async () => {
      const client = createWebSocketClient('ws://localhost:8080/ws');
      const closeSpy = vi.fn();
      client.on('close', closeSpy);

      const connectPromise = client.connect();
      MockWebSocket.latest?.simulateOpen();
      await connectPromise;

      expect(client.getStatus()).toBe('OPEN');

      client.close(1000, 'User normal exit');
      expect(client.getStatus()).toBe('CLOSING');

      // 等待 Mock socket 触发 close 事件
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(client.getStatus()).toBe('CLOSED');
      expect(closeSpy).toHaveBeenCalledTimes(1);
    });
  });
});
