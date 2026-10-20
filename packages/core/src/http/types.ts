/**
 * 工业级 HTTP 客户端强类型契约与配置定义。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import type { Result } from '../contracts';
import type { GatewayRoute, GatewayRouter } from '../routing';
import type { AuthManager } from '../auth';
import type { TenantManager } from '../tenant';
import type { AbortCoordinator } from '../abort';

/**
 * 扩展 Axios 请求配置，赋予微服务路由、重复请求中断与结果自动解包控制能力。
 */
export interface HttpRequestConfig<D = unknown> extends AxiosRequestConfig<D> {
  /**
   * 显式指定微服务标识（覆盖基于 URL 路径前缀的自动分发规则）。
   */
  service?: string;

  /**
   * 是否自动中断同签名（Method + URL + Params + Data）未决请求。
   * 若不指定，则继承 HttpClientOptions.cancelDuplicate 配置。
   */
  cancelDuplicate?: boolean;

  /**
   * 是否自动解包 Result<T> 响应载荷。
   * - true (默认)：自动校验 code === 200 并返回 Promise<T>；若非 200 则抛出 BusinessException；
   * - false (逃生门)：保留完整统一信封，返回 Promise<Result<T>>。
   */
  unwrap?: boolean;
}

/**
 * HTTP 客户端构造与集成配置选项。
 */
export interface HttpClientOptions {
  /**
   * 默认基础请求 URL。
   */
  baseURL?: string;

  /**
   * 默认超时时间（毫秒），默认为 10000ms。
   */
  timeout?: number;

  /**
   * 微服务网关路由配置表。
   */
  routes?: GatewayRoute[];

  /**
   * 未能匹配任何网关路由前缀时的默认保底目标基地址。
   */
  defaultTarget?: string;

  /**
   * 鉴权凭据管理器实例。若未提供，默认使用全局 authManager 单例。
   */
  authManager?: AuthManager;

  /**
   * 多租户上下文管理器实例。若未提供，默认使用全局 tenantManager 单例。
   */
  tenantManager?: TenantManager;

  /**
   * 异步请求取消协调器。若未提供，将为当前客户端分配专属实例。
   */
  abortCoordinator?: AbortCoordinator;

  /**
   * 客户端全局默认防重复提交与竞态中断开关。默认为 false。
   */
  cancelDuplicate?: boolean;

  /**
   * 客户端全局默认是否自动解包。默认为 true。
   */
  unwrap?: boolean;

  /**
   * 401 凭据失效时的全局业务回调通知函数。
   */
  onUnauthorized?: () => void;

  /**
   * 底层 Axios 实例的其他定制化默认配置。
   */
  axiosConfig?: AxiosRequestConfig;
}

/**
 * 工业级 HTTP 客户端门面接口。
 */
export interface HttpClient {
  /**
   * 底层 Axios 实例，供高级深度定制与插件扩展。
   */
  readonly instance: AxiosInstance;

  /**
   * 当前客户端绑定的通用鉴权凭据门面。
   */
  readonly authManager: AuthManager;

  /**
   * 当前客户端绑定的多租户上下文门面。
   */
  readonly tenantManager: TenantManager;

  /**
   * 当前客户端绑定的请求取消协调器。
   */
  readonly abortCoordinator: AbortCoordinator;

  /**
   * 当前客户端绑定的微服务网关路由器。
   */
  readonly router: GatewayRouter;

  /**
   * 发起通用网络请求。
   */
  request<T = unknown, D = unknown>(
    config: HttpRequestConfig<D> & { unwrap: false },
  ): Promise<Result<T>>;
  request<T = unknown, D = unknown>(config?: HttpRequestConfig<D>): Promise<T>;

  /**
   * 发起 GET 请求。
   */
  get<T = unknown, D = unknown>(
    url: string,
    config: HttpRequestConfig<D> & { unwrap: false },
  ): Promise<Result<T>>;
  get<T = unknown, D = unknown>(url: string, config?: HttpRequestConfig<D>): Promise<T>;

  /**
   * 发起 POST 请求。
   */
  post<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: HttpRequestConfig<D> & { unwrap: false },
  ): Promise<Result<T>>;
  post<T = unknown, D = unknown>(url: string, data?: D, config?: HttpRequestConfig<D>): Promise<T>;

  /**
   * 发起 PUT 请求。
   */
  put<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: HttpRequestConfig<D> & { unwrap: false },
  ): Promise<Result<T>>;
  put<T = unknown, D = unknown>(url: string, data?: D, config?: HttpRequestConfig<D>): Promise<T>;

  /**
   * 发起 DELETE 请求。
   */
  delete<T = unknown, D = unknown>(
    url: string,
    config: HttpRequestConfig<D> & { unwrap: false },
  ): Promise<Result<T>>;
  delete<T = unknown, D = unknown>(url: string, config?: HttpRequestConfig<D>): Promise<T>;

  /**
   * 发起 PATCH 请求。
   */
  patch<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: HttpRequestConfig<D> & { unwrap: false },
  ): Promise<Result<T>>;
  patch<T = unknown, D = unknown>(url: string, data?: D, config?: HttpRequestConfig<D>): Promise<T>;

  /**
   * 平台守卫型安全文件下载。
   *
   * 自动设置 responseType: 'blob'，探测并拦截服务端 JSON 业务异常，
   * 自动提取 Content-Disposition 文件名，安全落地浏览器下载并确定性回收内存。
   *
   * @param url 下载目标地址
   * @param filename 可选的指定文件名（优先级高于响应头提取）
   * @param config 可选的请求配置
   * @returns 成功触发下载返回 true，非浏览器环境或下载被阻止返回 false
   */
  download(url: string, filename?: string, config?: HttpRequestConfig): Promise<boolean>;
}
