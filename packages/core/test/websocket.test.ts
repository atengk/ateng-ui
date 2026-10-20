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
    vi.useRealTimers();
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

  describe('5. 双向心跳保活探针与假死检测 (#21)', () => {
    it('开启默认心跳时，连接就绪后应按默认周期 (30s) 自动发送 "ping" 心跳帧', async () => {
      vi.useFakeTimers();
      const client = createWebSocketClient({
        url: 'ws://localhost:8080/ws',
        heartbeat: true,
      });

      const connectPromise = client.connect();
      const mockWs = MockWebSocket.latest!;
      mockWs.simulateOpen();
      await connectPromise;

      expect(mockWs.sentData).toHaveLength(0);

      // 时间推移 29s，尚未到达 30s 周期，不应发送
      vi.advanceTimersByTime(29000);
      expect(mockWs.sentData).toHaveLength(0);

      // 时间推移至 30s，触发第一轮心跳 ping
      vi.advanceTimersByTime(1000);
      expect(mockWs.sentData).toEqual(['ping']);
    });

    it('收到合法 pong 响应应成功续命，重置超时定时器并在下一个周期继续发送 ping', async () => {
      vi.useFakeTimers();
      const client = createWebSocketClient({
        url: 'ws://localhost:8080/ws',
        heartbeat: {
          interval: 10000,
          timeout: 2000,
          pingMessage: 'ping',
          pongMessage: 'pong',
        },
      });

      const connectPromise = client.connect();
      const mockWs = MockWebSocket.latest!;
      mockWs.simulateOpen();
      await connectPromise;

      // 1. 到达 10s，发送第 1 次 ping
      vi.advanceTimersByTime(10000);
      expect(mockWs.sentData).toEqual(['ping']);

      // 2. 经过 1s（此时还在 2s 超时窗口内），服务端应答 'pong'
      vi.advanceTimersByTime(1000);
      mockWs.simulateMessage('pong');

      // 3. 超时窗口过去（再过 2s，累计 13s），连接不应被切断，状态仍为 OPEN
      vi.advanceTimersByTime(2000);
      expect(client.getStatus()).toBe('OPEN');

      // 4. 再过 8s（距收到 pong 满 10s 周期，累计 21s），发送第 2 次 ping
      vi.advanceTimersByTime(8000);
      expect(mockWs.sentData).toEqual(['ping', 'ping']);
    });

    it('心跳响应超时未收到 pong 时，应判定连接假死并主动切断底层连接 (code=4000)', async () => {
      vi.useFakeTimers();
      const client = createWebSocketClient({
        url: 'ws://localhost:8080/ws',
        heartbeat: {
          interval: 10000,
          timeout: 3000,
        },
      });

      const closeSpy = vi.fn();
      client.on('close', closeSpy);

      const connectPromise = client.connect();
      const mockWs = MockWebSocket.latest!;
      mockWs.simulateOpen();
      await connectPromise;

      // 到达 10s 发送 ping
      vi.advanceTimersByTime(10000);
      expect(mockWs.sentData).toEqual(['ping']);

      // 超时窗口 3s 内对端无任何响应，假死触发底层关闭
      vi.advanceTimersByTime(3000);

      // MockWebSocket 的 close 会异步触发 onclose
      vi.runOnlyPendingTimers();

      expect(client.getStatus()).toBe('CLOSED');
      expect(closeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 4000,
        }),
      );
    });

    it('支持自定义对象 pingMessage 与函数式谓词 pongMessage 判定', async () => {
      vi.useFakeTimers();
      interface HeartbeatPayload {
        type: string;
        timestamp?: number;
      }

      const client = createWebSocketClient({
        url: 'ws://localhost:8080/ws',
        heartbeat: {
          interval: 5000,
          timeout: 1000,
          pingMessage: { type: 'heartbeat_ping' },
          pongMessage: (data: unknown) => {
            return (
              typeof data === 'object' &&
              data !== null &&
              (data as HeartbeatPayload).type === 'heartbeat_pong'
            );
          },
        },
      });

      const connectPromise = client.connect();
      const mockWs = MockWebSocket.latest!;
      mockWs.simulateOpen();
      await connectPromise;

      // 5s 到达，发送 JSON ping
      vi.advanceTimersByTime(5000);
      expect(mockWs.sentData).toEqual([JSON.stringify({ type: 'heartbeat_ping' })]);

      // 收到非 pong 的普通业务消息，不能解除 pong 超时
      mockWs.simulateMessage(JSON.stringify({ type: 'chat', text: 'hello' }));

      // 收到合法 pong 响应，成功解除
      mockWs.simulateMessage(JSON.stringify({ type: 'heartbeat_pong', timestamp: 123456 }));

      // 超时后连接依然健康
      vi.advanceTimersByTime(1000);
      expect(client.getStatus()).toBe('OPEN');
    });

    it('主动 close() 时应确定性回收所有心跳定时器，连接关闭后不再触发超时与 ping', async () => {
      vi.useFakeTimers();
      const client = createWebSocketClient({
        url: 'ws://localhost:8080/ws',
        heartbeat: {
          interval: 5000,
          timeout: 2000,
        },
      });

      const connectPromise = client.connect();
      const mockWs = MockWebSocket.latest!;
      mockWs.simulateOpen();
      await connectPromise;

      // 在 3s 时主动关闭连接
      vi.advanceTimersByTime(3000);
      client.close(1000, 'Normal shutdown');
      vi.runOnlyPendingTimers();

      // 时间继续大幅推进，确保不会发送 ping 也不会触发任何超时异常
      vi.advanceTimersByTime(20000);
      expect(mockWs.sentData).toHaveLength(0);
      expect(client.getStatus()).toBe('CLOSED');
    });

    it('未开启心跳 (heartbeat: false 或未配置) 时不应发送任何 ping', async () => {
      vi.useFakeTimers();
      const client = createWebSocketClient({
        url: 'ws://localhost:8080/ws',
        heartbeat: false,
      });

      const connectPromise = client.connect();
      const mockWs = MockWebSocket.latest!;
      mockWs.simulateOpen();
      await connectPromise;

      // 时间大幅推进 100s
      vi.advanceTimersByTime(100000);
      expect(mockWs.sentData).toHaveLength(0);
    });

    it('心跳配置 interval / timeout 为负数或 0 时应防御性校准为安全值 (>=1ms)', async () => {
      vi.useFakeTimers();
      const client = createWebSocketClient({
        url: 'ws://localhost:8080/ws',
        heartbeat: {
          interval: -100,
          timeout: 0,
        },
      });

      const connectPromise = client.connect();
      const mockWs = MockWebSocket.latest!;
      mockWs.simulateOpen();
      await connectPromise;

      // 推进 1ms 立即触发 ping
      vi.advanceTimersByTime(1);
      expect(mockWs.sentData).toEqual(['ping']);

      // 再推进 1ms 触发 timeout 判定假死
      vi.advanceTimersByTime(1);
      vi.runOnlyPendingTimers();
      expect(client.getStatus()).toBe('CLOSED');
    });

    it('pongMessage 谓词函数抛出异常时应防御性捕获并视为非 pong 消息', async () => {
      vi.useFakeTimers();
      const client = createWebSocketClient({
        url: 'ws://localhost:8080/ws',
        heartbeat: {
          interval: 5000,
          timeout: 2000,
          pongMessage: () => {
            throw new Error('Unexpected predicate failure');
          },
        },
      });

      const connectPromise = client.connect();
      const mockWs = MockWebSocket.latest!;
      mockWs.simulateOpen();
      await connectPromise;

      vi.advanceTimersByTime(5000);
      expect(mockWs.sentData).toEqual(['ping']);

      // 收到消息但谓词异常，不判定为 pong
      mockWs.simulateMessage('something');

      // 超时判定假死
      vi.advanceTimersByTime(2000);
      vi.runOnlyPendingTimers();
      expect(client.getStatus()).toBe('CLOSED');
    });

    it('等待 pong 期间若底层连接被服务端异常关闭，应立即清理心跳定时器', async () => {
      vi.useFakeTimers();
      const client = createWebSocketClient({
        url: 'ws://localhost:8080/ws',
        heartbeat: {
          interval: 5000,
          timeout: 5000,
        },
      });

      const closeSpy = vi.fn();
      client.on('close', closeSpy);

      const connectPromise = client.connect();
      const mockWs = MockWebSocket.latest!;
      mockWs.simulateOpen();
      await connectPromise;

      // 5s 发送 ping
      vi.advanceTimersByTime(5000);
      expect(mockWs.sentData).toEqual(['ping']);

      // 服务端在 2s 后主动切断
      mockWs.simulateClose(1006, 'Abnormal Closure');
      expect(client.getStatus()).toBe('CLOSED');
      expect(closeSpy).toHaveBeenCalledTimes(1);

      // 后续时间继续推进，不应再触发任何假死 close 逻辑
      vi.advanceTimersByTime(10000);
      expect(closeSpy).toHaveBeenCalledTimes(1);
    });
  });
});
