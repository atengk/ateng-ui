/**
 * WebSocketClient 纯原生全双工长连接客户端实现。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { parseSnowflakeJson } from '../transform/snowflake';
import type {
  WebSocketClientOptions,
  WebSocketEventMap,
  WebSocketHeartbeatOptions,
  WebSocketReconnectOptions,
  WebSocketStatus,
} from './types';
import { resolveWebSocketUrl } from './url';

/**
 * 纯原生全双工 WebSocket 长连接客户端。
 */
export class WebSocketClient {
  private readonly options: WebSocketClientOptions;
  private socket: WebSocket | null = null;
  private status: WebSocketStatus = 'CLOSED';
  private listeners: {
    [K in keyof WebSocketEventMap]: Set<WebSocketEventMap[K]>;
  } = {
    open: new Set(),
    close: new Set(),
    error: new Set(),
    message: new Set(),
    reconnect: new Set(),
  };

  private connectPromise: Promise<void> | null = null;
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  private pongTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private isManualClose = false;
  private sendBuffer: (string | ArrayBufferLike | Blob | ArrayBufferView | object)[] = [];
  private topicSubscribers = new Map<string, Set<(payload: unknown) => void>>();

  /**
   * 构造全新的 WebSocket 客户端实例。
   *
   * @param options 配置选项或目标连接地址字符串
   */
  constructor(options: WebSocketClientOptions | string) {
    this.options = typeof options === 'string' ? { url: options } : options;

    if (this.options.autoConnect) {
      void this.connect().catch(() => {
        // 自动连接阶段异常交由底层生命周期事件通知
      });
    }
  }

  /**
   * 获取当前底层长连接的就绪状态。
   *
   * @returns 连接状态 ('CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED')
   */
  getStatus(): WebSocketStatus {
    if (!this.socket) {
      return this.status;
    }

    switch (this.socket.readyState) {
      case 0:
        return 'CONNECTING';
      case 1:
        return 'OPEN';
      case 2:
        return 'CLOSING';
      case 3:
      default:
        return 'CLOSED';
    }
  }

  /**
   * 获取底层原生 WebSocket 实例句柄（若未建立则为 null）。
   *
   * @returns 原生 WebSocket 或 null
   */
  getSocket(): WebSocket | null {
    return this.socket;
  }

  /**
   * 启动建立 WebSocket 连接。
   *
   * @returns 握手就绪后的 Promise
   */
  async connect(): Promise<void> {
    if (this.socket && (this.socket.readyState === 0 || this.socket.readyState === 1)) {
      return this.connectPromise ?? Promise.resolve();
    }

    // 1. 重置主动关闭标记并立即停止待执行的重连定时器，消除并发重连竞态
    this.isManualClose = false;
    this.stopReconnect();
    this.status = 'CONNECTING';

    const urlResult = resolveWebSocketUrl(this.options);

    const initSocket = (finalUrl: string, resolve: () => void, reject: (err: unknown) => void) => {
      let ws: WebSocket;
      if (this.options.webSocketFactory) {
        ws = this.options.webSocketFactory(finalUrl, this.options.protocols);
      } else if (typeof WebSocket !== 'undefined') {
        ws = new WebSocket(finalUrl, this.options.protocols);
      } else {
        throw new Error('[WebSocketClient] 环境中未检测到可用 WebSocket 构造函数');
      }

      this.socket = ws;

      let isHandshakeSettled = false;

      ws.onopen = (event: Event) => {
        this.status = 'OPEN';
        this.reconnectAttempt = 0;
        this.stopReconnect();
        if (!isHandshakeSettled) {
          isHandshakeSettled = true;
          resolve();
        }
        this.startHeartbeat();
        this.flushBuffer();
        this.emit('open', event);
      };

      ws.onerror = (event: Event) => {
        this.emit('error', event);
      };

      ws.onclose = (event: CloseEvent) => {
        this.status = 'CLOSED';
        this.stopHeartbeat();
        if (!isHandshakeSettled) {
          isHandshakeSettled = true;
          reject(
            new Error(
              `[WebSocketClient] 连接未就绪即关闭: code=${event.code}, reason=${event.reason || 'none'}`,
            ),
          );
        }
        this.emit('close', event);
        this.scheduleReconnect();
      };

      ws.onmessage = (event: MessageEvent) => {
        const parsedData = this.decodeMessage(event.data);
        this.handleHeartbeatMessage(parsedData, event.data);
        this.dispatchTopicMessage(parsedData);
        this.emit('message', parsedData, event);
      };
    };

    if (typeof urlResult === 'string') {
      this.connectPromise = new Promise<void>((resolve, reject) => {
        try {
          initSocket(urlResult, resolve, reject);
        } catch (err) {
          this.status = 'CLOSED';
          this.stopHeartbeat();
          reject(err);
        }
      });
    } else {
      this.connectPromise = new Promise<void>((resolve, reject) => {
        urlResult
          .then(finalUrl => {
            initSocket(finalUrl, resolve, reject);
          })
          .catch(err => {
            this.status = 'CLOSED';
            this.stopHeartbeat();
            reject(err);
          });
      });
    }

    return this.connectPromise;
  }

  /**
   * 注册底层生命周期事件监听器。
   *
   * @param event 事件名称 ('open' | 'close' | 'error' | 'message')
   * @param handler 事件处理回调函数
   * @returns 用于注销当前监听器的闭包函数
   */
  on<K extends keyof WebSocketEventMap>(event: K, handler: WebSocketEventMap[K]): () => void {
    const targetSet = this.listeners[event] as Set<WebSocketEventMap[K]>;
    targetSet.add(handler);

    return () => {
      targetSet.delete(handler);
    };
  }

  /**
   * 订阅指定业务主题（Topic）的消息推送。
   * 自动按照服务端推送载荷中的 `{ type, data: T }` 模式精准分发。
   *
   * @param type 目标业务主题标识（如 'chat', 'notice', 'quote'）
   * @param handler 接收业务载荷（payload: T）的回调函数
   * @returns 用于注销当前主题订阅的闭包函数
   */
  subscribe<T = unknown>(type: string, handler: (payload: T) => void): () => void {
    if (!this.topicSubscribers.has(type)) {
      this.topicSubscribers.set(type, new Set());
    }

    const set = this.topicSubscribers.get(type)!;
    const genericHandler = handler as (payload: unknown) => void;
    set.add(genericHandler);

    return () => {
      set.delete(genericHandler);
      if (set.size === 0) {
        this.topicSubscribers.delete(type);
      }
    };
  }

  /**
   * 向服务端发送数据帧。
   * 若传入非 Buffer 的普通对象，自动调用 JSON 序列化处理。
   * 若连接尚未就绪且开启了 bufferWhileConnecting，自动暂存至 FIFO 缓冲队列并在连接建立后自动冲刷。
   *
   * @param data 待发送的数据载荷
   * @returns 是否成功交付底层 socket 发送或成功排队入离线缓冲
   */
  send(data: string | ArrayBufferLike | Blob | ArrayBufferView | object): boolean {
    if (this.socket && this.socket.readyState === 1) {
      try {
        let payload: string | ArrayBufferLike | Blob | ArrayBufferView;

        if (typeof data === 'string') {
          payload = data;
        } else if (
          data instanceof ArrayBuffer ||
          ArrayBuffer.isView(data) ||
          (typeof Blob !== 'undefined' && data instanceof Blob)
        ) {
          payload = data as ArrayBufferLike | Blob | ArrayBufferView;
        } else {
          const stringifier = this.options.jsonStringify ?? JSON.stringify;
          payload = stringifier(data);
        }

        this.socket.send(payload);
        return true;
      } catch {
        return false;
      }
    }

    // 若连接尚未就绪且启用了离线缓冲，且未处于主动关闭状态，压入 FIFO 缓冲队列
    if (this.options.bufferWhileConnecting && !this.isManualClose) {
      const maxBuffer = Math.max(1, this.options.maxBufferSize ?? 100);
      this.sendBuffer.push(data);
      if (this.sendBuffer.length > maxBuffer) {
        this.sendBuffer.shift();
        console.warn(
          `[WebSocketClient] 离线缓冲队列已达上限 (${maxBuffer})，已丢弃最早入队的数据帧`,
        );
      }
      return true;
    }

    return false;
  }

  /**
   * 获取当前离线发送缓冲队列中暂存的消息数量。
   *
   * @returns 缓冲队列长度
   */
  getBufferSize(): number {
    return this.sendBuffer.length;
  }

  /**
   * 清空离线发送缓冲队列。
   */
  clearBuffer(): void {
    this.sendBuffer = [];
  }

  /**
   * 确定性主动断开底层连接并释放资源。
   * 设置主动关闭标记，永久阻断后续任何自动重连。
   *
   * @param code 状态码（默认 1000）
   * @param reason 关闭原因说明
   */
  close(code = 1000, reason = ''): void {
    // 1. 设置主动关闭标记，注销心跳探针、重连定时器并清空离线缓冲区
    this.isManualClose = true;
    this.stopHeartbeat();
    this.stopReconnect();
    this.clearBuffer();

    // 2. 断开底层原生 WebSocket 连接
    if (!this.socket) {
      this.status = 'CLOSED';
      return;
    }

    this.status = 'CLOSING';

    try {
      this.socket.close(code, reason);
    } catch {
      this.status = 'CLOSED';
    }
  }

  /**
   * 清空所有已注册的生命周期监听器与主题订阅者。
   */
  clearListeners(): void {
    for (const key of Object.keys(this.listeners) as (keyof WebSocketEventMap)[]) {
      this.listeners[key].clear();
    }
    this.topicSubscribers.clear();
  }

  /**
   * 确定性销毁当前 WebSocket 客户端。
   * 自动断开物理连接并清空所有事件监听与主题订阅，保障组件销毁时零内存泄漏。
   */
  destroy(): void {
    this.close();
    this.clearListeners();
  }

  /**
   * 触发注册的事件回调。
   */
  private emit<K extends keyof WebSocketEventMap>(
    event: K,
    ...args: Parameters<WebSocketEventMap[K]>
  ): void {
    const targetSet = this.listeners[event] as Set<(...params: unknown[]) => void>;
    for (const listener of targetSet) {
      try {
        listener(...args);
      } catch (err) {
        // 防止单个监听器抛出异常中断其他监听器的执行
        console.error(`[WebSocketClient] 事件 ${event} 监听器执行异常:`, err);
      }
    }
  }

  /**
   * 解析并规范化当前心跳保活配置。若未配置或显式禁用，返回 null。
   */
  private resolveHeartbeatOptions(): Required<WebSocketHeartbeatOptions> | null {
    const { heartbeat } = this.options;
    if (!heartbeat) {
      return null;
    }

    if (heartbeat === true) {
      return {
        enabled: true,
        interval: 30000,
        timeout: 5000,
        pingMessage: 'ping',
        pongMessage: 'pong',
      };
    }

    if (heartbeat.enabled === false) {
      return null;
    }

    return {
      enabled: true,
      interval: Math.max(1, heartbeat.interval ?? 30000),
      timeout: Math.max(1, heartbeat.timeout ?? 5000),
      pingMessage: heartbeat.pingMessage ?? 'ping',
      pongMessage: heartbeat.pongMessage ?? 'pong',
    };
  }

  /**
   * 启动应用层双向心跳检测循环。
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.scheduleHeartbeatPing();
  }

  /**
   * 停止并注销所有运行中的心跳定时器（包括 Ping 调度与 Pong 超时定时器）。
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.pongTimeoutTimer !== null) {
      clearTimeout(this.pongTimeoutTimer);
      this.pongTimeoutTimer = null;
    }
  }

  /**
   * 调度下一轮心跳 Ping 探针发送。
   */
  private scheduleHeartbeatPing(): void {
    if (this.heartbeatTimer !== null) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    const hb = this.resolveHeartbeatOptions();
    if (!hb || this.getStatus() !== 'OPEN') {
      return;
    }

    this.heartbeatTimer = setTimeout(() => {
      this.sendHeartbeatPing();
    }, hb.interval);
  }

  /**
   * 发送心跳 Ping 载荷并开启 Pong 超时假死探测定时器。
   */
  private sendHeartbeatPing(): void {
    if (this.getStatus() !== 'OPEN' || !this.socket) {
      return;
    }

    const hb = this.resolveHeartbeatOptions();
    if (!hb) {
      return;
    }

    // 1. 发送心跳载荷帧
    this.send(hb.pingMessage);

    // 2. 清理旧超时定时器并启动等待 Pong 响应的超时检测
    if (this.pongTimeoutTimer !== null) {
      clearTimeout(this.pongTimeoutTimer);
      this.pongTimeoutTimer = null;
    }

    this.pongTimeoutTimer = setTimeout(() => {
      this.handlePongTimeout();
    }, hb.timeout);
  }

  /**
   * 处理入站消息的心跳识别与 Pong 响应续命。
   *
   * @param decodedData 已解码后的载荷对象
   * @param rawData 原始数据载荷
   * @returns 是否命中合法 Pong 心跳应答
   */
  private handleHeartbeatMessage(decodedData: unknown, rawData: unknown): boolean {
    const hb = this.resolveHeartbeatOptions();
    if (!hb) {
      return false;
    }

    const { pongMessage } = hb;
    let isPong = false;

    if (typeof pongMessage === 'function') {
      try {
        isPong = Boolean(pongMessage(decodedData));
      } catch {
        isPong = false;
      }
    } else if (typeof pongMessage === 'string') {
      if (decodedData === pongMessage) {
        isPong = true;
      } else if (typeof rawData === 'string' && rawData.trim() === pongMessage) {
        isPong = true;
      }
    }

    if (isPong) {
      // 1. 清理未决的 Pong 超时假死判定定时器
      if (this.pongTimeoutTimer !== null) {
        clearTimeout(this.pongTimeoutTimer);
        this.pongTimeoutTimer = null;
      }

      // 2. 规划下一轮心跳 Ping 发送
      this.scheduleHeartbeatPing();
    }

    return isPong;
  }

  /**
   * 处理 Pong 响应超时：判定连接假死并主动切断底层连接。
   */
  private handlePongTimeout(): void {
    this.stopHeartbeat();

    if (this.socket && (this.socket.readyState === 0 || this.socket.readyState === 1)) {
      this.status = 'CLOSING';
      try {
        this.socket.close(4000, '[WebSocketClient] 心跳响应超时，判定假死切断连接');
      } catch {
        this.status = 'CLOSED';
      }
    }
  }

  /**
   * 冲刷并按序发送离线缓冲队列中的全部数据帧。
   */
  private flushBuffer(): void {
    if (!this.socket || this.socket.readyState !== 1 || this.sendBuffer.length === 0) {
      return;
    }

    // 1. 拷贝并重置缓冲队列，防止发送过程中递归调用 send 导致死循环
    const queue = [...this.sendBuffer];
    this.sendBuffer = [];

    // 2. 依次交付底层 socket 发送
    for (const item of queue) {
      this.send(item);
    }
  }

  /**
   * 解析并规范化指数退避自动重连配置。若未配置或显式禁用，返回 null。
   */
  private resolveReconnectOptions(): Required<WebSocketReconnectOptions> | null {
    const { reconnect } = this.options;
    if (!reconnect) {
      return null;
    }

    if (reconnect === true) {
      return {
        enabled: true,
        maxRetries: Infinity,
        baseDelay: 1000,
        maxDelay: 30000,
        factor: 2,
      };
    }

    if (reconnect.enabled === false) {
      return null;
    }

    return {
      enabled: true,
      maxRetries: reconnect.maxRetries ?? Infinity,
      baseDelay: Math.max(0, reconnect.baseDelay ?? 1000),
      maxDelay: Math.max(0, reconnect.maxDelay ?? 30000),
      factor: Math.max(1, reconnect.factor ?? 2),
    };
  }

  /**
   * 停止并注销待执行的自动重连定时器。
   */
  private stopReconnect(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * 根据指数退避算法调度下一次自动重连。
   */
  private scheduleReconnect(): void {
    this.stopReconnect();

    if (this.isManualClose) {
      return;
    }

    const config = this.resolveReconnectOptions();
    if (!config) {
      return;
    }

    if (this.reconnectAttempt >= config.maxRetries) {
      return;
    }

    // 1. 计算当前指数退避重试延迟
    const delay = Math.min(
      config.maxDelay,
      config.baseDelay * Math.pow(config.factor, this.reconnectAttempt),
    );

    // 2. 递增重试计数并触发 reconnect 事件
    this.reconnectAttempt += 1;
    this.emit('reconnect', this.reconnectAttempt, delay);

    // 3. 启动重连定时器
    this.reconnectTimer = setTimeout(() => {
      void this.connect().catch(() => {
        // 重连阶段底层握手失败由 ws.onclose 捕获并流转下一轮，在此吸收未决 Promise 异常
      });
    }, delay);
  }

  /**
   * 派发业务主题订阅消息。
   */
  private dispatchTopicMessage(decodedData: unknown): void {
    if (typeof decodedData !== 'object' || decodedData === null) {
      return;
    }

    const record = decodedData as Record<string, unknown>;
    const type = record['type'];
    if (typeof type !== 'string') {
      return;
    }

    const subscribers = this.topicSubscribers.get(type);
    if (!subscribers || subscribers.size === 0) {
      return;
    }

    const payload = 'data' in record ? record['data'] : record;
    for (const subscriber of subscribers) {
      try {
        subscriber(payload);
      } catch (err) {
        console.error(`[WebSocketClient] 主题 ${type} 订阅处理函数执行异常:`, err);
      }
    }
  }

  /**
   * 解析收到的原始数据帧，优先尝试带雪花大数保真的 JSON 反序列化。
   */
  private decodeMessage(raw: unknown): unknown {
    if (typeof raw !== 'string') {
      return raw;
    }

    if (this.options.jsonParse) {
      return this.options.jsonParse(raw);
    }

    const trimmed = raw.trim();
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        return parseSnowflakeJson(raw);
      } catch {
        return raw;
      }
    }

    return raw;
  }
}

/**
 * 快捷创建 WebSocketClient 客户端实例的工厂函数。
 *
 * @param options 配置选项或目标连接地址字符串
 * @returns 全新的 WebSocketClient 实例
 */
export function createWebSocketClient(options: WebSocketClientOptions | string): WebSocketClient {
  return new WebSocketClient(options);
}
