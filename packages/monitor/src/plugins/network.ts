/**
 * 原生网络通信嗅探插件 (NetworkPlugin) 与 Axios TraceId 协同拦截器。
 *
 * @author Ateng
 * @since 2026-10-31
 */

import type { ErrorPayload, NetworkPayload } from '../types/event';
import type { MonitorKernelInstance, MonitorPlugin } from '../types/plugin';
import { sanitizeUrl } from '../sanitizer/pii';
import { isMonitorReportRequest } from '../transport/transport';

/**
 * 网络通信嗅探插件配置选项。
 */
export interface NetworkPluginOptions {
  /** 是否监听原生 window.fetch 请求，默认 true */
  enableFetch?: boolean;

  /** 是否监听原生 XMLHttpRequest 请求，默认 true */
  enableXhr?: boolean;

  /** 监控自身上报网关 URL (若未传则自动尝试从 kernel 中读取) */
  reportUrl?: string;

  /** 需要忽略过滤的 URL 正则或字符串黑名单列表 */
  ignoreUrls?: Array<string | RegExp>;

  /** 是否在 HTTP 响应状态码 >= 400 时自动派发 HTTP_ERROR 监控事件，默认 true */
  recordHttpError?: boolean;
}

/**
 * 契约兼容的 Axios 实例鸭子类型，保持 L0 纯粹无 Axios 运行时依赖。
 */
export interface AxiosLikeInstance {
  interceptors: {
    request?: {
      use: (
        onFulfilled?: (config: unknown) => unknown,
        onRejected?: (error: unknown) => unknown,
      ) => number;
      eject?: (id: number) => void;
    };
    response: {
      use: (
        onFulfilled?: (response: unknown) => unknown,
        onRejected?: (error: unknown) => unknown,
      ) => number;
      eject?: (id: number) => void;
    };
  };
}

/**
 * Axios 监控协同拦截器门面。
 */
export interface CoreAxiosMonitorInterceptor {
  /** 响应成功拦截处理器 */
  responseInterceptor: <T = unknown>(response: T) => T;

  /** 响应异常拦截处理器 */
  responseErrorInterceptor: (error: unknown) => Promise<never>;

  /** 一键安装至指定的 Axios 实例中，返回确定性注销句柄 */
  install: (axiosInstance: AxiosLikeInstance) => () => void;
}

/**
 * 从对象或响应头中提取 TraceId。
 *
 * @param data 响应数据体
 * @param headers 响应头实体
 * @returns 提取到的分布式链路追踪 ID
 */
function extractTraceId(data: unknown, headers: unknown): string | undefined {
  if (headers && typeof headers === 'object') {
    const h = headers as Record<string, unknown>;
    const headerTrace = h['x-trace-id'] || h['trace-id'] || h['x-request-id'] || h['X-Trace-Id'];
    if (typeof headerTrace === 'string' && headerTrace) {
      return headerTrace;
    }
  }

  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (typeof d.traceId === 'string' && d.traceId) {
      return d.traceId;
    }
  }

  return undefined;
}

/**
 * 校验目标 URL 是否命中黑名单过滤。
 *
 * @param url 请求绝对或相对路径
 * @param ignoreUrls 黑名单规则列表
 * @returns 是否应当忽略跳过
 */
function isIgnoredUrl(url: string, ignoreUrls?: Array<string | RegExp>): boolean {
  if (!url || !Array.isArray(ignoreUrls) || ignoreUrls.length === 0) {
    return false;
  }

  for (const rule of ignoreUrls) {
    if (typeof rule === 'string' && url.includes(rule)) {
      return true;
    }
    if (rule instanceof RegExp && rule.test(url)) {
      return true;
    }
  }

  return false;
}

/**
 * 创建面向 @atengk/core Axios 实例的 TraceId 全链路串联拦截器。
 *
 * @param kernel 监控微内核实例
 * @returns CoreAxiosMonitorInterceptor 拦截器适配器
 */
export function createCoreAxiosMonitorInterceptor(
  kernel: MonitorKernelInstance,
): CoreAxiosMonitorInterceptor {
  const syncTraceId = (traceId?: string): void => {
    if (traceId && kernel) {
      kernel.contextStore.setTag('traceId', traceId);
    }
  };

  const responseInterceptor = <T = unknown>(response: T): T => {
    if (response && typeof response === 'object') {
      const respRecord = response as { data?: unknown; headers?: unknown };
      const traceId = extractTraceId(respRecord.data, respRecord.headers);
      syncTraceId(traceId);
    }
    return response;
  };

  const responseErrorInterceptor = async (error: unknown): Promise<never> => {
    if (error && typeof error === 'object') {
      const errRecord = error as {
        response?: { data?: unknown; headers?: unknown };
        traceId?: string;
      };
      const traceId =
        extractTraceId(errRecord.response?.data, errRecord.response?.headers) || errRecord.traceId;
      syncTraceId(traceId);
    }
    return Promise.reject(error);
  };

  const install = (axiosInstance: AxiosLikeInstance): (() => void) => {
    const id = axiosInstance.interceptors.response.use(
      responseInterceptor,
      responseErrorInterceptor,
    );
    return () => {
      axiosInstance.interceptors.response.eject?.(id);
    };
  };

  return {
    responseInterceptor,
    responseErrorInterceptor,
    install,
  };
}

/**
 * 创建原生网络通信嗅探采集插件。
 *
 * @param options 插件配置项
 * @returns MonitorPlugin 实体
 */
export function createNetworkPlugin(options?: NetworkPluginOptions): MonitorPlugin {
  const enableFetch = options?.enableFetch ?? true;
  const enableXhr = options?.enableXhr ?? true;
  const recordHttpError = options?.recordHttpError ?? true;
  const ignoreUrls = options?.ignoreUrls ?? [];

  let originalFetch: typeof window.fetch | null = null;
  let originalOpen: typeof XMLHttpRequest.prototype.open | null = null;
  let originalSend: typeof XMLHttpRequest.prototype.send | null = null;
  let originalSetRequestHeader: typeof XMLHttpRequest.prototype.setRequestHeader | null = null;

  return {
    name: 'network',

    setup(kernel: MonitorKernelInstance): void {
      if (typeof window === 'undefined') {
        return;
      }

      const effectiveReportUrl = options?.reportUrl || kernel.queue.reportUrl;

      const recordBreadcrumb = (
        method: string,
        url: string,
        status: number,
        duration: number,
        traceId?: string,
      ): void => {
        const breadcrumbPlugin = kernel.getPlugin('breadcrumb') as
          { addBreadcrumb?: (item: unknown) => void } | undefined;

        breadcrumbPlugin?.addBreadcrumb?.({
          type: 'network',
          category: 'xhr.fetch',
          message: `${method} ${sanitizeUrl(url)} [${status}] (${duration}ms)`,
          data: {
            url: sanitizeUrl(url),
            method,
            status,
            duration,
            traceId: traceId || undefined,
            success: status < 400 && status !== 0,
          },
          level: status >= 400 || status === 0 ? 'error' : 'info',
        });
      };

      // 1. 代理原生 window.fetch
      if (enableFetch && typeof window.fetch === 'function') {
        originalFetch = window.fetch.bind(window);

        window.fetch = async function (
          input: RequestInfo | URL,
          init?: RequestInit,
        ): Promise<Response> {
          let url = '';
          let method = (init?.method || 'GET').toUpperCase();
          const headersMap: Record<string, string> = {};

          if (typeof input === 'string') {
            url = input;
          } else if (input instanceof URL) {
            url = input.href;
          } else if (typeof Request !== 'undefined' && input instanceof Request) {
            url = input.url;
            method = (init?.method || input.method || 'GET').toUpperCase();
            try {
              input.headers.forEach((val, key) => {
                headersMap[key.toLowerCase()] = val;
              });
            } catch {
              // 忽略
            }
          }

          if (init?.headers) {
            if (typeof Headers !== 'undefined' && init.headers instanceof Headers) {
              init.headers.forEach((val, key) => {
                headersMap[key.toLowerCase()] = val;
              });
            } else if (Array.isArray(init.headers)) {
              for (const [key, val] of init.headers) {
                headersMap[key.toLowerCase()] = val;
              }
            } else if (typeof init.headers === 'object') {
              for (const [key, val] of Object.entries(init.headers)) {
                headersMap[key.toLowerCase()] = String(val);
              }
            }
          }

          if (!originalFetch) {
            return Promise.reject(new Error('[@atengk/monitor] Native fetch is uninitialized'));
          }

          // 防死循环协议与黑名单过滤
          if (
            isMonitorReportRequest(url, headersMap, effectiveReportUrl) ||
            isIgnoredUrl(url, ignoreUrls)
          ) {
            return originalFetch(input, init);
          }

          const startTime =
            typeof performance !== 'undefined' && typeof performance.now === 'function'
              ? performance.now()
              : Date.now();

          try {
            const response = await originalFetch(input, init);
            const duration = Math.round(
              (typeof performance !== 'undefined' && typeof performance.now === 'function'
                ? performance.now()
                : Date.now()) - startTime,
            );

            const status = response.status;
            let traceId: string | undefined;

            try {
              traceId =
                response.headers.get('x-trace-id') ||
                response.headers.get('trace-id') ||
                response.headers.get('x-request-id') ||
                undefined;
            } catch {
              // 忽略 Header 解析异常
            }

            if (traceId) {
              kernel.contextStore.setTag('traceId', traceId);
            }

            // 记录行为轨迹面包屑
            recordBreadcrumb(method, url, status, duration, traceId);

            // 派发标准 network 遥测事件
            kernel.emit<NetworkPayload>({
              type: 'network',
              level: status >= 400 ? 'warn' : 'info',
              payload: {
                url: sanitizeUrl(url),
                method,
                status,
                duration,
                traceId,
                requestType: 'fetch',
                success: status < 400,
              },
            });

            // 接口返回 4xx/5xx 时生成 HTTP_ERROR 监控事件
            if (status >= 400 && recordHttpError) {
              kernel.emit<ErrorPayload>({
                type: 'error',
                level: 'error',
                payload: {
                  category: 'custom',
                  name: 'HTTP_ERROR',
                  message: `HTTP Request Failed: ${method} ${sanitizeUrl(url)} responded with status ${status}`,
                  filename: sanitizeUrl(url),
                },
              });
            }

            return response;
          } catch (error) {
            const duration = Math.round(
              (typeof performance !== 'undefined' && typeof performance.now === 'function'
                ? performance.now()
                : Date.now()) - startTime,
            );

            recordBreadcrumb(method, url, 0, duration);

            kernel.emit<NetworkPayload>({
              type: 'network',
              level: 'error',
              payload: {
                url: sanitizeUrl(url),
                method,
                status: 0,
                duration,
                requestType: 'fetch',
                success: false,
              },
            });

            if (recordHttpError) {
              kernel.emit<ErrorPayload>({
                type: 'error',
                level: 'error',
                payload: {
                  category: 'custom',
                  name: 'HTTP_ERROR',
                  message: `Network Error: ${method} ${sanitizeUrl(url)} failed (${error instanceof Error ? error.message : String(error)})`,
                  filename: sanitizeUrl(url),
                },
              });
            }

            throw error;
          }
        };
      }

      // 2. 代理原生 XMLHttpRequest.prototype
      if (enableXhr && typeof XMLHttpRequest !== 'undefined') {
        originalOpen = XMLHttpRequest.prototype.open;
        originalSend = XMLHttpRequest.prototype.send;
        originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

        interface XhrMeta {
          method: string;
          url: string;
          headers: Record<string, string>;
          startTime: number;
        }

        const xhrMetaMap = new WeakMap<XMLHttpRequest, XhrMeta>();

        XMLHttpRequest.prototype.open = function (
          method: string,
          url: string | URL,
          ...rest: unknown[]
        ): void {
          const meta: XhrMeta = {
            method: (method || 'GET').toUpperCase(),
            url: String(url),
            headers: {},
            startTime: 0,
          };
          xhrMetaMap.set(this, meta);
          if (originalOpen) {
            Reflect.apply(originalOpen, this, [method, url, ...rest]);
          }
        };

        XMLHttpRequest.prototype.setRequestHeader = function (header: string, value: string): void {
          const meta = xhrMetaMap.get(this);
          if (meta && header) {
            meta.headers[header.toLowerCase()] = String(value);
          }
          if (originalSetRequestHeader) {
            Reflect.apply(originalSetRequestHeader, this, [header, value]);
          }
        };

        XMLHttpRequest.prototype.send = function (...args: unknown[]): void {
          const meta = xhrMetaMap.get(this);

          if (
            meta &&
            (isMonitorReportRequest(meta.url, meta.headers, effectiveReportUrl) ||
              isIgnoredUrl(meta.url, ignoreUrls))
          ) {
            if (originalSend) {
              Reflect.apply(originalSend, this, args);
            }
            return;
          }

          if (meta) {
            meta.startTime =
              typeof performance !== 'undefined' && typeof performance.now === 'function'
                ? performance.now()
                : Date.now();
          }

          let isHandled = false;
          const onFinished = (): void => {
            if (isHandled || !meta) return;
            isHandled = true;

            const duration = Math.round(
              (typeof performance !== 'undefined' && typeof performance.now === 'function'
                ? performance.now()
                : Date.now()) - meta.startTime,
            );
            const status = this.status;

            let traceId: string | undefined;
            try {
              traceId =
                this.getResponseHeader('x-trace-id') ||
                this.getResponseHeader('trace-id') ||
                this.getResponseHeader('x-request-id') ||
                undefined;
            } catch {
              // 忽略
            }

            if (traceId) {
              kernel.contextStore.setTag('traceId', traceId);
            }

            recordBreadcrumb(meta.method, meta.url, status, duration, traceId);

            kernel.emit<NetworkPayload>({
              type: 'network',
              level: status >= 400 || status === 0 ? 'warn' : 'info',
              payload: {
                url: sanitizeUrl(meta.url),
                method: meta.method,
                status,
                duration,
                traceId,
                requestType: 'xhr',
                success: status >= 200 && status < 400,
              },
            });

            if ((status >= 400 || status === 0) && recordHttpError) {
              kernel.emit<ErrorPayload>({
                type: 'error',
                level: 'error',
                payload: {
                  category: 'custom',
                  name: 'HTTP_ERROR',
                  message: `XHR Request Failed: ${meta.method} ${sanitizeUrl(meta.url)} responded with status ${status}`,
                  filename: sanitizeUrl(meta.url),
                },
              });
            }
          };

          const removeListeners = (): void => {
            this.removeEventListener('loadend', handleFinished);
            this.removeEventListener('error', handleFinished);
            this.removeEventListener('abort', handleFinished);
            this.removeEventListener('timeout', handleFinished);
          };

          const handleFinished = (): void => {
            removeListeners();
            onFinished();
          };

          this.addEventListener('loadend', handleFinished);
          this.addEventListener('error', handleFinished);
          this.addEventListener('abort', handleFinished);
          this.addEventListener('timeout', handleFinished);

          if (originalSend) {
            Reflect.apply(originalSend, this, args);
          }
        };
      }
    },

    teardown(): void {
      if (typeof window !== 'undefined') {
        if (originalFetch) {
          window.fetch = originalFetch;
          originalFetch = null;
        }

        if (originalOpen) {
          XMLHttpRequest.prototype.open = originalOpen;
          originalOpen = null;
        }

        if (originalSend) {
          XMLHttpRequest.prototype.send = originalSend;
          originalSend = null;
        }

        if (originalSetRequestHeader) {
          XMLHttpRequest.prototype.setRequestHeader = originalSetRequestHeader;
          originalSetRequestHeader = null;
        }
      }
    },
  };
}
