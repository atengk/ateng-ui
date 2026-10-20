/**
 * 工业级 HTTP 客户端门面实现与全局默认单例。
 *
 * 整合强类型响应契约、网关多路由前缀映射、双轨 Token 请求头注入、
 * 雪花 Long ID 大数防截断、请求取消防竞态协调器与 Blob 双态异常安全下载。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import axios, { type AxiosInstance } from 'axios';
import type { Result } from '../contracts';
import { createGatewayRouter, type GatewayRouter } from '../routing';
import { authManager as defaultAuthManager, type AuthManager } from '../auth';
import { tenantManager as defaultTenantManager, type TenantManager } from '../tenant';
import { createAbortCoordinator, type AbortCoordinator } from '../abort';
import { createRequestDeduplicator, type RequestDeduplicator } from '../dedupe';
import { parseContentDispositionFilename, saveBlobAsFile } from '../file';
import { setupInterceptors, getBlobDisposition } from './interceptors';
import type { HttpClient, HttpClientOptions, HttpRequestConfig } from './types';

/**
 * 工业级 HTTP 客户端默认实现类。
 */
export class DefaultHttpClient implements HttpClient {
  /**
   * 底层 Axios 实例。
   */
  readonly instance: AxiosInstance;

  /**
   * 当前客户端绑定的通用鉴权凭据管理器。
   */
  readonly authManager: AuthManager;

  /**
   * 当前客户端绑定的多租户上下文管理器。
   */
  readonly tenantManager: TenantManager;

  /**
   * 当前客户端绑定的请求取消协调器。
   */
  readonly abortCoordinator: AbortCoordinator;

  /**
   * 当前客户端绑定的飞行中请求合并去重调度器。
   */
  readonly deduplicator: RequestDeduplicator;

  /**
   * 当前客户端绑定的微服务网关路由器。
   */
  readonly router: GatewayRouter;

  /**
   * 客户端全局默认是否对并发同指纹只读请求去重合并。
   */
  private readonly defaultDedupeInFlight: boolean;

  /**
   * 构造 HTTP 客户端实例并完成全链路拦截器编排。
   *
   * @param options 客户端配置项
   */
  constructor(options: HttpClientOptions = {}) {
    const {
      baseURL = '',
      timeout = 10000,
      routes = [],
      defaultTarget,
      authManager = defaultAuthManager,
      tenantManager = defaultTenantManager,
      abortCoordinator = createAbortCoordinator(),
      deduplicator = createRequestDeduplicator(),
      cancelDuplicate = false,
      dedupeInFlight = false,
      unwrap = true,
      retry = 0,
      retryDelay = 1000,
      shouldRetry,
      onUnauthorized,
      axiosConfig = {},
    } = options;

    this.authManager = authManager;
    this.tenantManager = tenantManager;
    this.abortCoordinator = abortCoordinator;
    this.deduplicator = deduplicator;
    this.defaultDedupeInFlight = dedupeInFlight;
    this.router = createGatewayRouter({ routes, defaultTarget });

    // 1. 初始化底层 Axios 实例
    this.instance = axios.create({
      baseURL,
      timeout,
      ...axiosConfig,
    });

    // 2. 挂载工业级拦截器管道
    setupInterceptors(this.instance, {
      router: this.router,
      authManager: this.authManager,
      tenantManager: this.tenantManager,
      abortCoordinator: this.abortCoordinator,
      defaultCancelDuplicate: cancelDuplicate,
      defaultUnwrap: unwrap,
      defaultRetry: retry,
      defaultRetryDelay: retryDelay,
      defaultShouldRetry: shouldRetry,
      onUnauthorized,
    });
  }

  /**
   * 发起通用网络请求。
   */
  request<T = unknown, D = unknown>(
    config: HttpRequestConfig<D> & { unwrap: false },
  ): Promise<Result<T>>;
  request<T = unknown, D = unknown>(config?: HttpRequestConfig<D>): Promise<T>;
  async request<T = unknown, D = unknown>(
    config: HttpRequestConfig<D> = {},
  ): Promise<T | Result<T>> {
    const shouldDedupe = config.dedupeInFlight ?? this.defaultDedupeInFlight;

    if (shouldDedupe) {
      const target = {
        method: config.method ?? 'GET',
        url: config.url,
        params: config.params,
        dedupeKey: config.dedupeKey,
      };
      return this.deduplicator.execute(target, () => {
        return this.instance.request<T>(config as HttpRequestConfig) as Promise<T | Result<T>>;
      });
    }

    return this.instance.request<T>(config as HttpRequestConfig) as Promise<T | Result<T>>;
  }

  /**
   * 发起 GET 请求。
   */
  get<T = unknown, D = unknown>(
    url: string,
    config: HttpRequestConfig<D> & { unwrap: false },
  ): Promise<Result<T>>;
  get<T = unknown, D = unknown>(url: string, config?: HttpRequestConfig<D>): Promise<T>;
  async get<T = unknown, D = unknown>(
    url: string,
    config: HttpRequestConfig<D> = {},
  ): Promise<T | Result<T>> {
    return this.request<T, D>({ ...config, url, method: 'GET' });
  }

  /**
   * 发起 POST 请求。
   */
  post<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: HttpRequestConfig<D> & { unwrap: false },
  ): Promise<Result<T>>;
  post<T = unknown, D = unknown>(url: string, data?: D, config?: HttpRequestConfig<D>): Promise<T>;
  async post<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config: HttpRequestConfig<D> = {},
  ): Promise<T | Result<T>> {
    return this.request<T, D>({ ...config, url, data, method: 'POST' });
  }

  /**
   * 发起 PUT 请求。
   */
  put<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: HttpRequestConfig<D> & { unwrap: false },
  ): Promise<Result<T>>;
  put<T = unknown, D = unknown>(url: string, data?: D, config?: HttpRequestConfig<D>): Promise<T>;
  async put<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config: HttpRequestConfig<D> = {},
  ): Promise<T | Result<T>> {
    return this.request<T, D>({ ...config, url, data, method: 'PUT' });
  }

  /**
   * 发起 DELETE 请求。
   */
  delete<T = unknown, D = unknown>(
    url: string,
    config: HttpRequestConfig<D> & { unwrap: false },
  ): Promise<Result<T>>;
  delete<T = unknown, D = unknown>(url: string, config?: HttpRequestConfig<D>): Promise<T>;
  async delete<T = unknown, D = unknown>(
    url: string,
    config: HttpRequestConfig<D> = {},
  ): Promise<T | Result<T>> {
    return this.request<T, D>({ ...config, url, method: 'DELETE' });
  }

  /**
   * 发起 PATCH 请求。
   */
  patch<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: HttpRequestConfig<D> & { unwrap: false },
  ): Promise<Result<T>>;
  patch<T = unknown, D = unknown>(url: string, data?: D, config?: HttpRequestConfig<D>): Promise<T>;
  async patch<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config: HttpRequestConfig<D> = {},
  ): Promise<T | Result<T>> {
    return this.request<T, D>({ ...config, url, data, method: 'PATCH' });
  }

  /**
   * 平台守卫型安全文件下载。
   */
  async download(url: string, filename?: string, config: HttpRequestConfig = {}): Promise<boolean> {
    const raw = await this.request<Blob>({
      ...config,
      url,
      method: 'GET',
      responseType: 'blob',
      unwrap: false,
    });

    const blob = (
      raw && typeof raw === 'object' && 'data' in raw ? (raw as Result<Blob>).data : raw
    ) as Blob;

    const disposition = blob instanceof Blob ? getBlobDisposition(blob) : undefined;
    const parsedName = parseContentDispositionFilename(disposition);
    const finalFilename = filename || (parsedName !== 'download' ? parsedName : 'download');

    return saveBlobAsFile(blob, finalFilename);
  }
}

/**
 * 创建具备独立拦截器管道、网关配置与鉴权域的 HTTP 客户端实例。
 *
 * @param options 客户端配置项
 * @returns 独立的 HttpClient 实例
 */
export function createHttpClient(options?: HttpClientOptions): HttpClient {
  return new DefaultHttpClient(options);
}

/**
 * 开箱即用的工业级 HTTP 客户端全局默认单例。
 */
export const http: HttpClient = createHttpClient();
