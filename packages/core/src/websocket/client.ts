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
  };

  private connectPromise: Promise<void> | null = null;
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  private pongTimeoutTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * 构造全新的 WebSocket 客户端实例。
   *
   * @param options 配置选项或目标连接地址字符串
   */
  constructor(options: WebSocketClientOptions | string) {
    this.options = typeof options === 'string' ? { url: options } : options;

    if (this.options.autoConnect) {
      void this.connect();
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
        if (!isHandshakeSettled) {
          isHandshakeSettled = true;
          resolve();
        }
        this.startHeartbeat();
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
      };

      ws.onmessage = (event: MessageEvent) => {
        const parsedData = this.decodeMessage(event.data);
        this.handleHeartbeatMessage(parsedData, event.data);
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
   * 向服务端发送数据帧。
   * 若传入非 Buffer 的普通对象，自动调用 JSON 序列化处理。
   *
   * @param data 待发送的数据载荷
   * @returns 是否成功交付底层 socket 发送（未连接时返回 false）
   */
  send(data: string | ArrayBufferLike | Blob | ArrayBufferView | object): boolean {
    if (!this.socket || this.socket.readyState !== 1) {
      return false;
    }

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

  /**
   * 确定性主动断开底层连接并释放资源。
   *
   * @param code 状态码（默认 1000）
   * @param reason 关闭原因说明
   */
  close(code = 1000, reason = ''): void {
    // 1. 注销心跳探针与超时定时器
    this.stopHeartbeat();

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
