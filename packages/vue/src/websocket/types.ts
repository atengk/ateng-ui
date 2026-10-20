/**
 * WebSocket 全双工长连接状态机 Hook 类型定义。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { DeepReadonly, Ref } from 'vue';
import type {
  WebSocketClient,
  WebSocketClientOptions,
  WebSocketHeartbeatOptions,
  WebSocketReconnectOptions,
  WebSocketStatus,
} from '@atengk/core';

/**
 * useWebSocket 配置选项。
 */
export interface UseWebSocketOptions<T = unknown> {
  /**
   * 可选的子协议（Subprotocol）或协议数组。
   */
  protocols?: string | string[];

  /**
   * 是否在组件挂载/作用域初始化时自动建立连接。默认为 false。
   *
   * @default false
   */
  autoConnect?: boolean;

  /**
   * autoConnect 的等价配置别名。
   */
  immediate?: boolean;

  /**
   * 应用层双向心跳保活与假死检测配置。
   * 传入 true 启用默认 30s 周期与 5s 假死判定；也可传入自定义配置对象。
   */
  heartbeat?: boolean | WebSocketHeartbeatOptions;

  /**
   * 指数退避自动重连配置选项。
   * 传入 true 启用默认重试退避；也可传入自定义配置对象。
   */
  reconnect?: boolean | WebSocketReconnectOptions;

  /**
   * 是否在连接建立中（CONNECTING）或断线重连期间启用发送数据离线缓冲。
   * 若为 true，在未就绪时调用 send() 将暂存并在就绪后自动冲刷。
   */
  bufferWhileConnecting?: boolean;

  /**
   * 离线缓冲队列的最大允许容量上限。默认为 100 条。
   */
  maxBufferSize?: number;

  /**
   * 附加至 Query 的鉴权凭据参数名。默认为 'token'。
   */
  tokenParamName?: string;

  /**
   * 附加至 Query 的多租户参数名。默认为 'tenantId'。
   */
  tenantParamName?: string;

  /**
   * 额外附加的自定义查询参数字典或动态 Getter 函数。
   */
  params?: WebSocketClientOptions['params'];

  /**
   * 自定义底层 WebSocket 构造工厂（用于 Node.js / SSR 环境或单测 Mock 注入）。
   */
  webSocketFactory?: (url: string, protocols?: string | string[]) => WebSocket;

  /**
   * 自定义入站消息反序列化函数。默认尝试 Snowflake 大数保真解析。
   */
  jsonParse?: (raw: string) => T;

  /**
   * 自定义出站数据序列化函数。默认使用 JSON.stringify。
   */
  jsonStringify?: (data: unknown) => string;

  /**
   * 连接成功建立时的回调函数。
   */
  onConnected?: (event: Event) => void;

  /**
   * 连接关闭时的回调函数。
   */
  onDisconnected?: (event: CloseEvent) => void;

  /**
   * 接收到服务端推送消息时的回调函数。
   */
  onMessage?: (data: T, event: MessageEvent) => void;

  /**
   * 发生异常错误时的回调函数。
   */
  onError?: (event: Event) => void;

  /**
   * 触发自动重连尝试时的回调函数。
   */
  onReconnect?: (attempt: number, delay: number) => void;
}

/**
 * useWebSocket 返回的只读响应式状态与控制门面。
 */
export interface UseWebSocketResult<T = unknown> {
  /**
   * 当前底层连接就绪状态，受到 readonly 只读保护。
   */
  status: DeepReadonly<Ref<WebSocketStatus>>;

  /**
   * 最近一次接收并反序列化的数据载荷，受到 readonly 只读保护。
   */
  data: DeepReadonly<Ref<T | undefined>>;

  /**
   * 最近一次捕获的错误事件对象，受到 readonly 只读保护。
   */
  error: DeepReadonly<Ref<Event | undefined>>;

  /**
   * 当前连接是否处于完全打开就绪态 (status === 'OPEN')，受到 readonly 只读保护。
   */
  isOpen: DeepReadonly<Ref<boolean>>;

  /**
   * 当前连接是否处于已关闭状态 (status === 'CLOSED')，受到 readonly 只读保护。
   */
  isClosed: DeepReadonly<Ref<boolean>>;

  /**
   * 当前自动重连尝试次数，受到 readonly 只读保护。
   */
  reconnectAttempt: DeepReadonly<Ref<number>>;

  /**
   * 手动触发建立 WebSocket 连接。
   */
  open: () => Promise<void>;

  /**
   * 手动建立连接（open 的等价别名）。
   */
  connect: () => Promise<void>;

  /**
   * 主动关闭 WebSocket 连接。
   *
   * @param code 关闭状态码（默认为 1000 正常关闭）
   * @param reason 关闭原因描述
   */
  close: (code?: number, reason?: string) => void;

  /**
   * 主动关闭连接（close 的等价别名）。
   */
  disconnect: (code?: number, reason?: string) => void;

  /**
   * 发送全双工上行数据帧。
   *
   * @param data 待发送数据（对象、字符串、Blob 或 ArrayBuffer）
   * @returns 是否成功发出或成功进入离线缓冲区
   */
  send: (data: string | ArrayBufferLike | Blob | ArrayBufferView | object) => boolean;

  /**
   * 底层 WebSocketClient 实例句柄（用于高级主题订阅或原生扩展）。
   */
  client: WebSocketClient;
}
