/**
 * Web 原生流式响应与 SSE 打字机 Hook 类型定义。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { DeepReadonly, Ref } from 'vue';
import type { SseEvent, StreamClient, StreamRequestOptions } from '@atengk/core';

/**
 * useStream 配置选项。
 */
export interface UseStreamOptions {
  /**
   * 自定义 StreamClient 实例。未指定时默认使用全局 streamClient 单例。
   */
  streamClient?: StreamClient;

  /**
   * HTTP 请求方法，默认为 'GET'。
   */
  method?: string;

  /**
   * 附加请求头字典。
   */
  headers?: Record<string, string>;

  /**
   * 请求体载荷（POST 等请求场景）。
   */
  body?: unknown;

  /**
   * 是否按 SSE 规范逐行解析事件。
   * - true (默认)：逐行解析标准 SSE 字段并派发规范化 SseEvent；
   * - false：按底层 ReadableStream 原始 UTF-8 文本分块直接派发。
   *
   * @default true
   */
  sse?: boolean;

  /**
   * 是否在组件挂载/作用域初始化时自动建立流式连接。默认为 false。
   *
   * @default false
   */
  autoConnect?: boolean;

  /**
   * autoConnect 的等价配置别名。
   */
  autoStart?: boolean;

  /**
   * 遇到断线时是否启用自动重试重连机制。默认为 false。
   */
  reconnect?: boolean;

  /**
   * 最大自动重连次数，默认为 3。
   */
  maxRetries?: number;

  /**
   * 自动重连基础等待延迟（毫秒），默认为 1000ms。
   */
  retryDelay?: number;

  /**
   * 接收到消息事件时的回调函数。
   *
   * @param data 消息纯文本内容
   * @param event 完整的 SSE 事件实体
   */
  onMessage?: (data: string, event?: SseEvent) => void;

  /**
   * 遇到网络故障或读取异常时的错误回调函数。
   *
   * @param error 捕获到的异常对象
   */
  onError?: (error: unknown) => void;

  /**
   * 流式响应全部读取结束或安全完成时的回调函数。
   *
   * @param fullText 完整累积的文本内容
   */
  onDone?: (fullText: string) => void;
}

/**
 * useStream 返回的只读响应式状态与控制门面。
 */
export interface UseStreamResult {
  /**
   * 增量累积的打字机文本，受到 readonly 只读保护。
   */
  text: DeepReadonly<Ref<string>>;

  /**
   * 当前是否正处于流传输中，受到 readonly 只读保护。
   */
  isStreaming: DeepReadonly<Ref<boolean>>;

  /**
   * 最近一次接收到的 SSE 事件实体，受到 readonly 只读保护。
   */
  event: DeepReadonly<Ref<SseEvent | undefined>>;

  /**
   * 最近一次捕获的异常信息，受到 readonly 只读保护。
   */
  error: DeepReadonly<Ref<unknown>>;

  /**
   * 发起或重新发起流式请求。
   *
   * @param overrideOptions 可选的单次请求覆盖配置
   * @returns 传输完成后返回完整累积文本 Promise
   */
  start: (overrideOptions?: Partial<StreamRequestOptions>) => Promise<string>;

  /**
   * 手动中断并关闭当前在途的流式连接。
   */
  abort: () => void;

  /**
   * 手动中断流式连接（abort 的等价别名）。
   */
  stop: () => void;

  /**
   * 重置累积文本与全部流状态为初始值。
   */
  reset: () => void;
}
