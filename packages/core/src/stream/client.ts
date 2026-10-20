/**
 * Web 原生流式响应与 SSE 打字机客户端门面实现。
 *
 * 基于标准 fetch 与 ReadableStream 实现，零 Axios 依赖，纯原生无框架中立，
 * 自动集成通用 AuthManager 凭据与 TenantManager 多租户请求头注入，
 * 原生支持 AbortSignal 即时中断与断线自动重连。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { BusinessException } from '../contracts';
import { authManager as defaultAuthManager, type AuthManager } from '../auth';
import { tenantManager as defaultTenantManager, type TenantManager } from '../tenant';
import { SseParser } from './parser';
import type { SseEvent, StreamClient, StreamClientOptions, StreamRequestOptions } from './types';

/**
 * 异步延迟等待（支持 AbortSignal 即时中断唤醒）。
 *
 * @param ms 等待毫秒数
 * @param signal 可选的中断信号
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise(resolve => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * 判断指定异常是否为主动取消异常。
 *
 * @param error 待检查异常
 * @returns 是否属于 AbortError
 */
function isAbortError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const err = error as { name?: string; message?: string };
    return (
      err.name === 'AbortError' ||
      err.message?.toLowerCase().includes('aborted') === true ||
      err.message?.toLowerCase().includes('canceled') === true
    );
  }
  return false;
}

/**
 * 工业级 Web 原生流式客户端默认实现。
 */
export class DefaultStreamClient implements StreamClient {
  readonly authManager: AuthManager;
  readonly tenantManager: TenantManager;

  private readonly baseURL: string;
  private readonly defaultHeaders: Record<string, string>;
  private readonly defaultReconnect: boolean;
  private readonly defaultMaxRetries: number;
  private readonly defaultRetryDelay: number;
  private readonly customFetch?: typeof fetch;

  /**
   * 构造流式客户端实例。
   *
   * @param options 客户端配置选项
   */
  constructor(options: StreamClientOptions = {}) {
    const {
      baseURL = '',
      authManager = defaultAuthManager,
      tenantManager = defaultTenantManager,
      defaultHeaders = {},
      defaultReconnect = false,
      defaultMaxRetries = 3,
      defaultRetryDelay = 1000,
      fetch: customFetch,
    } = options;

    this.baseURL = baseURL;
    this.authManager = authManager;
    this.tenantManager = tenantManager;
    this.defaultHeaders = defaultHeaders;
    this.defaultReconnect = defaultReconnect;
    this.defaultMaxRetries = defaultMaxRetries;
    this.defaultRetryDelay = defaultRetryDelay;
    this.customFetch = customFetch;
  }

  /**
   * 解析规范化目标请求 URL。
   *
   * @param url 输入路径或 URL
   * @returns 完整可用请求 URL
   */
  private resolveUrl(url: string): string {
    if (/^https?:\/\//i.test(url)) {
      return url;
    }
    if (!this.baseURL) {
      return url;
    }
    const cleanBase = this.baseURL.replace(/\/+$/, '');
    const cleanPath = url.replace(/^\/+/, '');
    return `${cleanBase}/${cleanPath}`;
  }

  /**
   * 发起流式订阅并监听事件回调。
   *
   * @param url 请求目标地址
   * @param options 请求配置与回调监听
   */
  async subscribe(url: string, options: StreamRequestOptions = {}): Promise<void> {
    const {
      method = 'GET',
      body,
      headers: customHeaders = {},
      sse = true,
      onMessage,
      onError,
      onDone,
      signal,
      reconnect = this.defaultReconnect,
      maxRetries = this.defaultMaxRetries,
      retryDelay = this.defaultRetryDelay,
    } = options;

    const fullUrl = this.resolveUrl(url);
    let retryCount = 0;
    let lastEventId: string | undefined;

    while (true) {
      // 1. 若外部信号已被中止，直接优雅退出
      if (signal?.aborted) {
        return;
      }

      // 2. 组装请求头
      const authHeaders = this.authManager.getHeaders();
      const tenantHeaders = this.tenantManager.getHeaders();
      const headers: Record<string, string> = {
        Accept: 'text/event-stream, text/plain; charset=utf-8',
        ...this.defaultHeaders,
        ...authHeaders,
        ...tenantHeaders,
        ...customHeaders,
      };

      if (lastEventId) {
        headers['Last-Event-ID'] = lastEventId;
      }

      let payload: BodyInit | undefined;
      if (body !== undefined && body !== null) {
        if (
          typeof body === 'string' ||
          (typeof Blob !== 'undefined' && body instanceof Blob) ||
          (typeof FormData !== 'undefined' && body instanceof FormData) ||
          (typeof ArrayBuffer !== 'undefined' && body instanceof ArrayBuffer)
        ) {
          payload = body as BodyInit;
        } else {
          payload = JSON.stringify(body);
          if (!headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
          }
        }
      }

      try {
        const fetchFn =
          this.customFetch ??
          (typeof fetch !== 'undefined'
            ? fetch
            : (globalThis as unknown as { fetch?: typeof fetch }).fetch);

        if (!fetchFn) {
          throw new Error('Native fetch API is not available in the current runtime environment');
        }

        const response = await fetchFn(fullUrl, {
          method,
          headers,
          body: payload,
          signal,
        });

        // 3. 校验 HTTP 状态码
        if (!response.ok) {
          if (response.status === 401) {
            this.authManager.handleUnauthorized();
          }
          throw new BusinessException(
            response.status,
            `HTTP ${response.status}: ${response.statusText}`,
            undefined,
            response,
          );
        }

        // 4. 获取流读取器
        const stream = response.body;
        if (!stream) {
          throw new Error('Response body is null and cannot be streamed');
        }

        const reader = stream.getReader();
        const decoder = new TextDecoder('utf-8');
        const parser = new SseParser();

        const abortListener = () => {
          reader.cancel().catch(() => {});
        };
        signal?.addEventListener('abort', abortListener, { once: true });

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }

            const chunkText = decoder.decode(value, { stream: true });
            if (sse) {
              const events = parser.feed(chunkText);
              for (const event of events) {
                if (event.id) {
                  lastEventId = event.id;
                }
                onMessage?.(event.data, event);
              }
            } else {
              onMessage?.(chunkText);
            }
          }

          // 读取完毕，刷新缓冲区剩余事件
          if (sse) {
            const flushedEvents = parser.flush();
            for (const event of flushedEvents) {
              if (event.id) {
                lastEventId = event.id;
              }
              onMessage?.(event.data, event);
            }
          }

          onDone?.();
          return;
        } finally {
          signal?.removeEventListener('abort', abortListener);
          reader.releaseLock?.();
        }
      } catch (err) {
        // 主动中断不视为错误，直接退出
        if (signal?.aborted || isAbortError(err)) {
          return;
        }

        const error = err instanceof Error ? err : new Error(String(err));

        // 检查重连条件
        if (reconnect && retryCount < maxRetries) {
          retryCount++;
          const delay = Math.min(30000, retryDelay * Math.pow(2, retryCount - 1));
          await sleep(delay, signal);
          continue;
        }

        // 达到最大重试或未开启重连
        if (onError) {
          onError(error);
          return;
        }
        throw error;
      }
    }
  }

  /**
   * 发起流式请求并返回异步迭代器（AsyncIterable），供 for await 语法消费。
   *
   * @param url 请求目标地址
   * @param options 请求配置
   * @returns 异步可迭代对象
   */
  async *stream(
    url: string,
    options: Omit<StreamRequestOptions, 'onMessage' | 'onError' | 'onDone'> = {},
  ): AsyncIterable<SseEvent> {
    type QueueItem = { event?: SseEvent; error?: Error; done?: boolean };
    const queue: QueueItem[] = [];
    let resolver: (() => void) | null = null;

    const push = (item: QueueItem) => {
      queue.push(item);
      if (resolver) {
        resolver();
        resolver = null;
      }
    };

    const subscribePromise = this.subscribe(url, {
      ...options,
      sse: true,
      onMessage: (_data, event) => {
        if (event) {
          push({ event });
        }
      },
      onError: error => {
        push({ error });
      },
      onDone: () => {
        push({ done: true });
      },
    });

    try {
      while (true) {
        if (queue.length === 0) {
          await new Promise<void>(resolve => {
            resolver = resolve;
          });
        }
        const item = queue.shift();
        if (!item) {
          continue;
        }
        if (item.error) {
          throw item.error;
        }
        if (item.done) {
          break;
        }
        if (item.event) {
          yield item.event;
        }
      }
    } finally {
      await subscribePromise.catch(() => {});
    }
  }
}

/**
 * 便捷工厂函数：创建并初始化一个 Web 原生流式客户端实例。
 *
 * @param options 客户端配置选项
 * @returns 流式客户端门面实例
 */
export function createStreamClient(options?: StreamClientOptions): StreamClient {
  return new DefaultStreamClient(options);
}

/**
 * 开箱即用的全局默认流式客户端单例。
 */
export const streamClient: StreamClient = new DefaultStreamClient();
