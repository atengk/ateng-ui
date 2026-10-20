/**
 * Web 原生流式响应与 SSE 打字机客户端强类型契约与配置定义。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import type { AuthManager } from '../auth';
import type { TenantManager } from '../tenant';

/**
 * 标准 Server-Sent Events (SSE) 事件数据载荷。
 */
export interface SseEvent {
  /**
   * 事件类型名称，默认通常为 'message'。
   */
  event?: string;

  /**
   * 事件消息文本载荷（若服务端多行传输，自动以换行符 '\n' 拼接）。
   */
  data: string;

  /**
   * 事件唯一标识符（若服务端提供，重连时自动置入 Last-Event-ID）。
   */
  id?: string;

  /**
   * 服务端建议的客户端断线重连等待延迟（毫秒）。
   */
  retry?: number;
}

/**
 * 流式请求选项配置。
 */
export interface StreamRequestOptions {
  /**
   * HTTP 请求方法。默认为 'GET'（可为 'POST' 等）。
   */
  method?: string;

  /**
   * 额外附加的自定义请求头字典。
   */
  headers?: Record<string, string>;

  /**
   * 请求体载荷（若为对象，将自动通过 JSON.stringify 序列化并附加 Content-Type: application/json）。
   */
  body?: unknown;

  /**
   * 是否按 SSE 规范逐行解析事件。
   * - true (默认)：逐行解析标准 SSE 字段并派发规范化 SseEvent；
   * - false：按底层 ReadableStream 原始 UTF-8 文本分块直接派发。
   */
  sse?: boolean;

  /**
   * 接收到消息事件时的回调函数。
   *
   * @param data 消息纯文本内容
   * @param event 完整的 SSE 事件实体（若开启 sse 模式）
   */
  onMessage?: (data: string, event?: SseEvent) => void;

  /**
   * 遇到网络故障或读取异常时的错误回调函数。
   *
   * @param error 捕获到的异常对象
   */
  onError?: (error: Error) => void;

  /**
   * 流式响应全部读取结束或安全完成时的回调函数。
   */
  onDone?: () => void;

  /**
   * 外部请求中断与资源回收信号。
   */
  signal?: AbortSignal;

  /**
   * 发生非主动中断的瞬态异常时，是否启用自动重连机制。默认为 false。
   */
  reconnect?: boolean;

  /**
   * 最大自动重试重连次数。默认为 3。
   */
  maxRetries?: number;

  /**
   * 自动重连基础等待延迟（毫秒）。默认为 1000。
   */
  retryDelay?: number;
}

/**
 * 流式客户端构造与实例级配置选项。
 */
export interface StreamClientOptions {
  /**
   * 默认基础请求 URL。
   */
  baseURL?: string;

  /**
   * 通用鉴权凭据管理器实例。若未提供，默认使用全局 authManager 单例。
   */
  authManager?: AuthManager;

  /**
   * 多租户上下文管理器实例。若未提供，默认使用全局 tenantManager 单例。
   */
  tenantManager?: TenantManager;

  /**
   * 客户端默认附加请求头。
   */
  defaultHeaders?: Record<string, string>;

  /**
   * 客户端全局默认是否启用断线重连。默认为 false。
   */
  defaultReconnect?: boolean;

  /**
   * 客户端全局默认最大重试次数。默认为 3。
   */
  defaultMaxRetries?: number;

  /**
   * 客户端全局默认重连等待延迟（毫秒）。默认为 1000。
   */
  defaultRetryDelay?: number;

  /**
   * 自定义 fetch 函数实现（优先采用运行环境原生 fetch）。
   */
  fetch?: typeof fetch;
}

/**
 * 工业级 Web 原生流式响应客户端门面接口。
 */
export interface StreamClient {
  /**
   * 当前客户端绑定的通用鉴权凭据门面。
   */
  readonly authManager: AuthManager;

  /**
   * 当前客户端绑定的多租户上下文门面。
   */
  readonly tenantManager: TenantManager;

  /**
   * 发起流式订阅并监听事件回调。
   *
   * @param url 请求目标地址（支持相对路径或完整 URL）
   * @param options 请求配置与回调监听
   * @returns Promise，在流全部处理完毕或主动中止时完成
   */
  subscribe(url: string, options?: StreamRequestOptions): Promise<void>;

  /**
   * 发起流式请求并返回异步迭代器（AsyncIterable），供 for await 语法消费。
   *
   * @param url 请求目标地址
   * @param options 请求配置
   * @returns 异步可迭代对象
   */
  stream(
    url: string,
    options?: Omit<StreamRequestOptions, 'onMessage' | 'onError' | 'onDone'>,
  ): AsyncIterable<SseEvent>;
}
