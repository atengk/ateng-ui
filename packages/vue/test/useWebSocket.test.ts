/**
 * useWebSocket 全双工长连接状态机 Hook 单元测试。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, isReadonly, ref } from 'vue';
import { useWebSocket } from '../src';

/**
 * 单测专用的 MockWebSocket 模拟类
 */
class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

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

describe('useWebSocket', () => {
  beforeEach(() => {
    MockWebSocket.clearInstances();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createMockFactory = () => {
    return (url: string, protocols?: string | string[]) =>
      new MockWebSocket(url, protocols) as unknown as WebSocket;
  };

  describe('Seam 1: 开箱即用与只读响应式状态机', () => {
    it('初始化时所有状态应处于默认值且被 readonly 只读保护', () => {
      const ws = useWebSocket('ws://localhost:8080/ws', {
        webSocketFactory: createMockFactory(),
      });

      expect(ws.status.value).toBe('CLOSED');
      expect(ws.data.value).toBeUndefined();
      expect(ws.error.value).toBeUndefined();
      expect(ws.isOpen.value).toBe(false);
      expect(ws.isClosed.value).toBe(true);
      expect(ws.reconnectAttempt.value).toBe(0);

      // 只读保护验证
      expect(isReadonly(ws.status)).toBe(true);
      expect(isReadonly(ws.data)).toBe(true);
      expect(isReadonly(ws.error)).toBe(true);
      expect(isReadonly(ws.isOpen)).toBe(true);
      expect(isReadonly(ws.isClosed)).toBe(true);
      expect(isReadonly(ws.reconnectAttempt)).toBe(true);
    });

    it('支持 Vue 3.5 MaybeRefOrGetter 动态 URL 地址', async () => {
      const dynamicPort = ref(8081);
      const ws = useWebSocket(() => `ws://localhost:${dynamicPort.value}/feed`, {
        webSocketFactory: createMockFactory(),
      });

      const connectPromise = ws.open();
      const mockWs = MockWebSocket.latest;
      expect(mockWs).toBeDefined();
      expect(mockWs?.url).toBe('ws://localhost:8081/feed');

      mockWs?.simulateOpen();
      await connectPromise;
      expect(ws.isOpen.value).toBe(true);
    });
  });

  describe('Seam 2: 双向全双工通信与数据帧收发', () => {
    it('连接打开后应支持 send 上行消息与响应式接收下行推送数据', async () => {
      const onConnected = vi.fn();
      const onMessage = vi.fn();

      const ws = useWebSocket<{ msg: string }>('ws://localhost:8080/chat', {
        webSocketFactory: createMockFactory(),
        onConnected,
        onMessage,
      });

      const connectPromise = ws.open();
      expect(ws.status.value).toBe('CONNECTING');

      const mockWs = MockWebSocket.latest;
      mockWs?.simulateOpen();
      await connectPromise;

      expect(ws.status.value).toBe('OPEN');
      expect(ws.isOpen.value).toBe(true);
      expect(ws.isClosed.value).toBe(false);
      expect(onConnected).toHaveBeenCalled();

      // 发送上行消息
      const sentSuccess = ws.send({ text: 'hello server' });
      expect(sentSuccess).toBe(true);
      expect(mockWs?.sentData).toEqual([JSON.stringify({ text: 'hello server' })]);

      // 接收下行推送消息
      mockWs?.simulateMessage(JSON.stringify({ msg: 'welcome client' }));
      expect(ws.data.value).toEqual({ msg: 'welcome client' });
      expect(onMessage).toHaveBeenCalledWith(
        { msg: 'welcome client' },
        expect.objectContaining({ data: JSON.stringify({ msg: 'welcome client' }) }),
      );

      // 主动断开连接
      ws.close();
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(ws.status.value).toBe('CLOSED');
      expect(ws.isOpen.value).toBe(false);
      expect(ws.isClosed.value).toBe(true);
    });
  });

  describe('Seam 3: 自动连接模式 (autoConnect / immediate)', () => {
    it('配置 autoConnect: true 时应在创建时自动发起连接', async () => {
      const ws = useWebSocket('ws://localhost:8080/auto', {
        autoConnect: true,
        webSocketFactory: createMockFactory(),
      });

      expect(MockWebSocket.instances).toHaveLength(1);
      const mockWs = MockWebSocket.latest;
      mockWs?.simulateOpen();
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(ws.isOpen.value).toBe(true);
    });
  });

  describe('Seam 4: 异常捕获与重连追踪', () => {
    it('发生异常与自动重连时应记录 error 并更新 reconnectAttempt 计数', async () => {
      const onError = vi.fn();
      const onReconnect = vi.fn();

      const ws = useWebSocket('ws://localhost:8080/reconnect', {
        webSocketFactory: createMockFactory(),
        reconnect: {
          enabled: true,
          baseDelay: 20,
          maxRetries: 3,
        },
        onError,
        onReconnect,
      });

      const connectPromise = ws.open();
      const mockWs = MockWebSocket.latest;
      mockWs?.simulateOpen();
      await connectPromise;

      // 模拟服务端连接异常中断
      mockWs?.simulateError();
      expect(ws.error.value).toBeDefined();
      expect(onError).toHaveBeenCalled();

      mockWs?.simulateClose(1006, 'Abnormal Closure');
      // 等待重连触发
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(ws.reconnectAttempt.value).toBe(1);
      expect(onReconnect).toHaveBeenCalledWith(1, expect.any(Number));
    });
  });

  describe('Seam 5: 确定性生命周期清理 (tryOnScopeDispose)', () => {
    it('当 effectScope 销毁时应自动调用 close() 并注销事件监听', async () => {
      const scope = effectScope();
      let wsInstance: ReturnType<typeof useWebSocket> | null = null;

      scope.run(() => {
        wsInstance = useWebSocket('ws://localhost:8080/scope', {
          webSocketFactory: createMockFactory(),
        });
      });

      const connectPromise = wsInstance!.open();
      const mockWs = MockWebSocket.latest;
      mockWs?.simulateOpen();
      await connectPromise;

      expect(wsInstance!.isOpen.value).toBe(true);

      // 销毁作用域
      scope.stop();
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(wsInstance!.status.value).toBe('CLOSED');
      expect(mockWs?.readyState).toBe(MockWebSocket.CLOSED);
    });
  });

  describe('Seam 6: 离线缓冲队列 (bufferWhileConnecting)', () => {
    it('开启 bufferWhileConnecting 时，未就绪时的 send 消息应在连接建立后自动冲刷', async () => {
      const ws = useWebSocket('ws://localhost:8080/buffered', {
        webSocketFactory: createMockFactory(),
        bufferWhileConnecting: true,
      });

      const connectPromise = ws.open();
      const mockWs = MockWebSocket.latest;

      // 在连接打开前发送离线数据
      const buffered = ws.send({ queued: 'item-1' });
      expect(buffered).toBe(true);

      mockWs?.simulateOpen();
      await connectPromise;

      expect(mockWs?.sentData).toEqual([JSON.stringify({ queued: 'item-1' })]);
    });
  });
});
