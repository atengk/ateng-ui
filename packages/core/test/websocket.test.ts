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

  describe('6. 指数退避自动重连与受控离线缓冲 (#22)', () => {
    describe('6.1 FIFO 离线缓冲队列', () => {
      it('开启 bufferWhileConnecting 时，未连接状态下调用 send 应暂存并在连接就绪时按序 Flush', async () => {
        const client = createWebSocketClient({
          url: 'ws://localhost:8080/ws',
          bufferWhileConnecting: true,
        });

        // 1. 未连接状态下发送消息
        expect(client.send('offline-msg-1')).toBe(true);
        expect(client.send({ id: 100, text: 'offline-msg-2' })).toBe(true);
        expect(client.getBufferSize()).toBe(2);

        // 2. 建立连接
        const connectPromise = client.connect();
        const mockWs = MockWebSocket.latest!;
        mockWs.simulateOpen();
        await connectPromise;

        // 3. 校验连接就绪后自动冲刷并清空缓冲区
        expect(client.getBufferSize()).toBe(0);
        expect(mockWs.sentData).toEqual([
          'offline-msg-1',
          JSON.stringify({ id: 100, text: 'offline-msg-2' }),
        ]);

        // 4. 连接建立后继续发送直接交付底层
        expect(client.send('online-msg-3')).toBe(true);
        expect(mockWs.sentData).toEqual([
          'offline-msg-1',
          JSON.stringify({ id: 100, text: 'offline-msg-2' }),
          'online-msg-3',
        ]);
      });

      it('缓冲队列堆积超过 maxBufferSize 时应丢弃最早入队的消息', async () => {
        const client = createWebSocketClient({
          url: 'ws://localhost:8080/ws',
          bufferWhileConnecting: true,
          maxBufferSize: 3,
        });

        // 连续推入 4 条
        client.send('msg-1');
        client.send('msg-2');
        client.send('msg-3');
        client.send('msg-4');

        // 上限为 3，msg-1 被丢弃
        expect(client.getBufferSize()).toBe(3);

        const connectPromise = client.connect();
        const mockWs = MockWebSocket.latest!;
        mockWs.simulateOpen();
        await connectPromise;

        expect(mockWs.sentData).toEqual(['msg-2', 'msg-3', 'msg-4']);
      });

      it('未开启缓冲 (bufferWhileConnecting: false) 时，未连接调用 send 应直接返回 false 并不发送', async () => {
        const client = createWebSocketClient({
          url: 'ws://localhost:8080/ws',
          bufferWhileConnecting: false,
        });

        expect(client.send('drop-me')).toBe(false);
        expect(client.getBufferSize()).toBe(0);

        const connectPromise = client.connect();
        const mockWs = MockWebSocket.latest!;
        mockWs.simulateOpen();
        await connectPromise;

        expect(mockWs.sentData).toHaveLength(0);
      });

      it('主动 close() 时应清空未发送的离线缓冲区', async () => {
        const client = createWebSocketClient({
          url: 'ws://localhost:8080/ws',
          bufferWhileConnecting: true,
        });

        client.send('queued-1');
        client.send('queued-2');
        expect(client.getBufferSize()).toBe(2);

        client.close();
        expect(client.getBufferSize()).toBe(0);
        expect(client.send('after-close')).toBe(false);
      });
    });

    describe('6.2 指数退避自动重连', () => {
      it('异常断开后应按照指数退避曲线自动尝试重连并派发 reconnect 事件', async () => {
        vi.useFakeTimers();
        const client = createWebSocketClient({
          url: 'ws://localhost:8080/ws',
          reconnect: {
            baseDelay: 1000,
            maxDelay: 5000,
            factor: 2,
          },
        });

        const reconnectSpy = vi.fn();
        client.on('reconnect', reconnectSpy);

        // 1. 首次连接并就绪
        const connectPromise = client.connect();
        const ws1 = MockWebSocket.latest!;
        ws1.simulateOpen();
        await connectPromise;
        expect(client.getStatus()).toBe('OPEN');

        // 2. 服务端异常断开
        ws1.simulateClose(1006, 'Abnormal');
        expect(client.getStatus()).toBe('CLOSED');

        // 此时已安排第 1 次重连：delay = 1000ms
        expect(reconnectSpy).toHaveBeenCalledWith(1, 1000);
        expect(MockWebSocket.instances).toHaveLength(1);

        // 推进 1000ms，触发第 1 次重连创建新的 WebSocket 实例
        vi.advanceTimersByTime(1000);
        expect(MockWebSocket.instances).toHaveLength(2);
        const ws2 = MockWebSocket.latest!;

        // 3. 第 2 次连接建立前再次失败
        ws2.simulateClose(1006, 'Connect failed');
        // 安排第 2 次重连：delay = 2000ms
        expect(reconnectSpy).toHaveBeenCalledWith(2, 2000);

        // 推进 2000ms，触发第 2 次重连
        vi.advanceTimersByTime(2000);
        expect(MockWebSocket.instances).toHaveLength(3);
        const ws3 = MockWebSocket.latest!;

        // 4. 第 3 次再次断开：delay = min(5000, 4000) = 4000ms
        ws3.simulateClose(1006, 'Failed again');
        expect(reconnectSpy).toHaveBeenCalledWith(3, 4000);

        // 5. 推进 4000ms，触发第 3 次重连
        vi.advanceTimersByTime(4000);
        expect(MockWebSocket.instances).toHaveLength(4);
        const ws4 = MockWebSocket.latest!;

        // 6. 第 4 次再次断开：delay = min(5000, 8000) = 5000ms (达到上限)
        ws4.simulateClose(1006, 'Failed again');
        expect(reconnectSpy).toHaveBeenCalledWith(4, 5000);

        // 7. 推进 5000ms 成功连接
        vi.advanceTimersByTime(5000);
        expect(MockWebSocket.instances).toHaveLength(5);
        const ws5 = MockWebSocket.latest!;
        ws5.simulateOpen();
        expect(client.getStatus()).toBe('OPEN');
      });

      it('达到 maxRetries 重试上限后应停止重试，连接保持 CLOSED', async () => {
        vi.useFakeTimers();
        const client = createWebSocketClient({
          url: 'ws://localhost:8080/ws',
          reconnect: {
            maxRetries: 2,
            baseDelay: 1000,
            factor: 2,
          },
        });

        const reconnectSpy = vi.fn();
        client.on('reconnect', reconnectSpy);

        const connectPromise = client.connect();
        const ws1 = MockWebSocket.latest!;
        ws1.simulateOpen();
        await connectPromise;

        // 第 1 次断开 -> 触发第 1 次重试
        ws1.simulateClose(1006);
        expect(reconnectSpy).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(1000);
        const ws2 = MockWebSocket.latest!;
        expect(MockWebSocket.instances).toHaveLength(2);

        // 第 2 次断开 -> 触发第 2 次重试
        ws2.simulateClose(1006);
        expect(reconnectSpy).toHaveBeenCalledTimes(2);

        vi.advanceTimersByTime(2000);
        const ws3 = MockWebSocket.latest!;
        expect(MockWebSocket.instances).toHaveLength(3);

        // 第 3 次断开 -> 已达上限 2，不再重试
        ws3.simulateClose(1006);
        expect(reconnectSpy).toHaveBeenCalledTimes(2);

        // 推进时间，不再创建新实例
        vi.advanceTimersByTime(20000);
        expect(MockWebSocket.instances).toHaveLength(3);
        expect(client.getStatus()).toBe('CLOSED');
      });

      it('主动调用 client.close() 应永久阻断重连并取消待执行的重连定时器', async () => {
        vi.useFakeTimers();
        const client = createWebSocketClient({
          url: 'ws://localhost:8080/ws',
          reconnect: true,
        });

        const reconnectSpy = vi.fn();
        client.on('reconnect', reconnectSpy);

        const connectPromise = client.connect();
        const ws1 = MockWebSocket.latest!;
        ws1.simulateOpen();
        await connectPromise;

        // 主动关闭
        client.close(1000, 'User normal shutdown');
        vi.runOnlyPendingTimers();

        expect(client.getStatus()).toBe('CLOSED');
        expect(reconnectSpy).not.toHaveBeenCalled();

        // 推进时间，确保没有任何重试
        vi.advanceTimersByTime(100000);
        expect(MockWebSocket.instances).toHaveLength(1);
      });

      it('心跳假死超时切断连接后，应联动触发自动重连机制', async () => {
        vi.useFakeTimers();
        const client = createWebSocketClient({
          url: 'ws://localhost:8080/ws',
          heartbeat: {
            interval: 5000,
            timeout: 2000,
          },
          reconnect: {
            baseDelay: 1000,
          },
        });

        const reconnectSpy = vi.fn();
        client.on('reconnect', reconnectSpy);

        const connectPromise = client.connect();
        const ws1 = MockWebSocket.latest!;
        ws1.simulateOpen();
        await connectPromise;

        // 5s 发送 ping
        vi.advanceTimersByTime(5000);
        expect(ws1.sentData).toEqual(['ping']);

        // 2s 内无 pong，判定假死，切断连接
        vi.advanceTimersByTime(2000);
        vi.runOnlyPendingTimers();
        expect(client.getStatus()).toBe('CLOSED');

        // 自动触发重连调度
        expect(reconnectSpy).toHaveBeenCalledWith(1, 1000);

        // 推进 1000ms，触发重连
        vi.advanceTimersByTime(1000);
        expect(MockWebSocket.instances).toHaveLength(2);
        const ws2 = MockWebSocket.latest!;
        ws2.simulateOpen();
        expect(client.getStatus()).toBe('OPEN');
      });
    });
  });

  describe('7. 高阶强类型主题订阅分发与注销 (#23)', () => {
    it('subscribe() 应按照 { type, data } 模式精准派发至指定主题并正确提取 payload', async () => {
      const client = createWebSocketClient('ws://localhost:8080/ws');
      interface ChatPayload {
        user: string;
        text: string;
      }

      const chatSpy = vi.fn();
      const quoteSpy = vi.fn();

      // 订阅不同主题
      client.subscribe<ChatPayload>('chat', chatSpy);
      client.subscribe<{ symbol: string; price: number }>('quote', quoteSpy);

      const connectPromise = client.connect();
      const mockWs = MockWebSocket.latest!;
      mockWs.simulateOpen();
      await connectPromise;

      // 1. 发送 chat 消息
      mockWs.simulateMessage(
        JSON.stringify({
          type: 'chat',
          data: { user: 'Alice', text: 'Hello WebSocket' },
        }),
      );

      expect(chatSpy).toHaveBeenCalledTimes(1);
      expect(chatSpy).toHaveBeenCalledWith({ user: 'Alice', text: 'Hello WebSocket' });
      expect(quoteSpy).not.toHaveBeenCalled();

      // 2. 发送 quote 消息
      mockWs.simulateMessage(
        JSON.stringify({
          type: 'quote',
          data: { symbol: 'ATENG', price: 99.88 },
        }),
      );

      expect(quoteSpy).toHaveBeenCalledTimes(1);
      expect(quoteSpy).toHaveBeenCalledWith({ symbol: 'ATENG', price: 99.88 });
      expect(chatSpy).toHaveBeenCalledTimes(1);
    });

    it('载荷未显式包含 data 字段时，应直接派发完整主题消息对象', async () => {
      const client = createWebSocketClient('ws://localhost:8080/ws');
      const noticeSpy = vi.fn();
      client.subscribe('notice', noticeSpy);

      const connectPromise = client.connect();
      const mockWs = MockWebSocket.latest!;
      mockWs.simulateOpen();
      await connectPromise;

      mockWs.simulateMessage(
        JSON.stringify({
          type: 'notice',
          title: 'System maintenance',
          level: 'warning',
        }),
      );

      expect(noticeSpy).toHaveBeenCalledWith({
        type: 'notice',
        title: 'System maintenance',
        level: 'warning',
      });
    });

    it('多个订阅者订阅同一主题时均应被触发，调用注销函数应精准解绑对应监听', async () => {
      const client = createWebSocketClient('ws://localhost:8080/ws');
      const spy1 = vi.fn();
      const spy2 = vi.fn();

      const unbind1 = client.subscribe('topic-a', spy1);
      const unbind2 = client.subscribe('topic-a', spy2);

      const connectPromise = client.connect();
      const mockWs = MockWebSocket.latest!;
      mockWs.simulateOpen();
      await connectPromise;

      // 发送一次
      mockWs.simulateMessage(JSON.stringify({ type: 'topic-a', data: 1 }));
      expect(spy1).toHaveBeenCalledTimes(1);
      expect(spy2).toHaveBeenCalledTimes(1);

      // 解绑 spy1
      unbind1();

      // 再发一次，仅 spy2 收到
      mockWs.simulateMessage(JSON.stringify({ type: 'topic-a', data: 2 }));
      expect(spy1).toHaveBeenCalledTimes(1);
      expect(spy2).toHaveBeenCalledTimes(2);

      // 解绑 spy2
      unbind2();
      mockWs.simulateMessage(JSON.stringify({ type: 'topic-a', data: 3 }));
      expect(spy1).toHaveBeenCalledTimes(1);
      expect(spy2).toHaveBeenCalledTimes(2);
    });

    it('收到非 JSON、纯字符串或未订阅主题时应防御性兜底丢弃，不报错', async () => {
      const client = createWebSocketClient('ws://localhost:8080/ws');
      const chatSpy = vi.fn();
      client.subscribe('chat', chatSpy);

      const connectPromise = client.connect();
      const mockWs = MockWebSocket.latest!;
      mockWs.simulateOpen();
      await connectPromise;

      // 纯字符串、非对象、null、其他主题
      mockWs.simulateMessage('hello raw text');
      mockWs.simulateMessage(JSON.stringify(12345));
      mockWs.simulateMessage(JSON.stringify({ other: 'field' }));
      mockWs.simulateMessage(JSON.stringify({ type: 'unknown', data: 'none' }));

      expect(chatSpy).not.toHaveBeenCalled();
    });

    it('单个订阅者回调抛出异常时不应影响其他订阅者正常执行', async () => {
      const client = createWebSocketClient('ws://localhost:8080/ws');
      const normalSpy = vi.fn();
      const brokenSpy = vi.fn().mockImplementation(() => {
        throw new Error('Subscriber internal fault');
      });

      client.subscribe('broadcast', brokenSpy);
      client.subscribe('broadcast', normalSpy);

      const connectPromise = client.connect();
      const mockWs = MockWebSocket.latest!;
      mockWs.simulateOpen();
      await connectPromise;

      mockWs.simulateMessage(JSON.stringify({ type: 'broadcast', data: 'all' }));

      expect(brokenSpy).toHaveBeenCalledTimes(1);
      expect(normalSpy).toHaveBeenCalledTimes(1);
      expect(normalSpy).toHaveBeenCalledWith('all');
    });

    it('destroy 与 clearListeners 应确定性清理所有监听器、订阅与连接', async () => {
      const client = createWebSocketClient('ws://localhost:8080/ws');
      const openSpy = vi.fn();
      const topicSpy = vi.fn();

      client.on('open', openSpy);
      client.subscribe('test', topicSpy);

      const connectPromise = client.connect();
      const mockWs = MockWebSocket.latest!;
      mockWs.simulateOpen();
      await connectPromise;

      client.destroy();

      expect(client.getStatus()).toBe('CLOSING');
      mockWs.simulateClose();
      expect(client.getStatus()).toBe('CLOSED');

      // 再次分发消息时，监听器与订阅者均已被注销
      mockWs.simulateMessage(JSON.stringify({ type: 'test', data: 'hello' }));
      expect(topicSpy).not.toHaveBeenCalled();
    });
  });
});
