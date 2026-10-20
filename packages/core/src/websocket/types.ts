/**
 * WebSocketClient 全双工长连接客户端强类型契约与配置定义。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import type { AuthManager } from '../auth';
import type { TenantManager } from '../tenant';

/**
 * WebSocket 连接状态枚举字符串。
 */
export type WebSocketStatus = 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED';

/**
 * 目标 WebSocket 地址解析器，支持静态地址或返回地址的同步/异步工厂函数。
 */
export type WebSocketUrlResolver = string | (() => string | Promise<string>);

/**
 * WebSocket 底层生命周期与数据事件处理函数映射表。
 */
export interface WebSocketEventMap {
  /**
   * 连接成功建立时触发。
   */
  open: (event: Event) => void;

  /**
   * 连接关闭时触发。
   */
  close: (event: CloseEvent) => void;

  /**
   * 连接发生异常错误时触发。
   */
  error: (event: Event) => void;

  /**
   * 接收到服务端推送数据时触发。
   * 数据已自动尝试 JSON 反序列化及 Snowflake ID 保真。
   */
  message: (data: unknown, event: MessageEvent) => void;
}

/**
 * WebSocket 应用层双向心跳保活与假死检测配置。
 */
export interface WebSocketHeartbeatOptions {
  /**
   * 是否开启应用层双向心跳检测机制。默认为 true（传入配置对象时）。
   */
  enabled?: boolean;

  /**
   * 心跳发送周期（毫秒）。默认为 30000 (30秒)。
   */
  interval?: number;

  /**
   * 等待 Pong 回复的超时时间（毫秒）。默认为 5000 (5秒)。
   * 若超出此时间仍未收到合法 Pong 响应，判定长连接假死并主动切断底层连接。
   */
  timeout?: number;

  /**
   * 发送的心跳载荷（支持字符串或普通对象）。默认为 'ping'。
   */
  pingMessage?: string | object;

  /**
   * 合法的心跳响应判定规则：
   * - 若为字符串：比对收到的文本或反序列化字符串是否全等；默认为 'pong'。
   * - 若为函数：接收解码后的消息数据，返回布尔值（true 表示当前消息为合法 pong 心跳应答）。
   */
  pongMessage?: string | ((data: unknown) => boolean);
}

/**
 * WebSocket 客户端初始化配置选项。
 */
export interface WebSocketClientOptions {
  /**
   * 服务端 WebSocket 地址，支持静态 URL 或动态 Getter 函数。
   */
  url: WebSocketUrlResolver;

  /**
   * 可选的子协议（Subprotocol）或协议数组。
   */
  protocols?: string | string[];

  /**
   * 可选的通用鉴权凭据门面。
   * 若配置，连接建立前自动读取当前 Token 并追加至 Query 参数。
   */
  authManager?: AuthManager;

  /**
   * 可选的多租户上下文门面。
   * 若配置，连接建立前自动读取当前 Tenant ID 并追加至 Query 参数。
   */
  tenantManager?: TenantManager;

  /**
   * 注入至 Query 中的鉴权凭据参数键名。默认为 'token'。
   */
  tokenParamName?: string;

  /**
   * 注入至 Query 中的多租户参数键名。默认为 'tenantId'。
   */
  tenantParamName?: string;

  /**
   * 额外附加的自定义查询参数字典或动态 Getter 函数。
   */
  params?:
    | Record<string, string | number | boolean | undefined | null>
    | (() =>
        | Record<string, string | number | boolean | undefined | null>
        | Promise<Record<string, string | number | boolean | undefined | null>>);

  /**
   * 是否在实例化后立即自动尝试建立连接。默认为 false。
   */
  autoConnect?: boolean;

  /**
   * 可选的应用层双向心跳保活与假死检测配置。
   * 支持传入 true（启用默认 30s 心跳与 5s 假死判定）或详细配置对象。
   */
  heartbeat?: boolean | WebSocketHeartbeatOptions;

  /**
   * 自定义底层 WebSocket 构造工厂（用于 Node.js / SSR 环境或单测 Mock 注入）。
   */
  webSocketFactory?: (url: string, protocols?: string | string[]) => WebSocket;

  /**
   * 自定义入站消息反序列化函数。
   * 默认尝试通过 parseSnowflakeJson 保真解析，非 JSON 文本时回退原样返回。
   */
  jsonParse?: (raw: string) => unknown;

  /**
   * 自定义出站数据序列化函数。默认使用 JSON.stringify。
   */
  jsonStringify?: (data: unknown) => string;
}
