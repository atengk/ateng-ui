/**
 * 微服务网关多路由映射与调度引擎契约定义。
 *
 * @author Ateng
 * @since 2026-10-19
 */

/**
 * 微服务网关路由配置项契约。
 */
export interface GatewayRoute {
  /**
   * 路由服务标识（用于显式 service 覆盖匹配）。
   */
  service?: string;

  /**
   * 路径前缀匹配规则（如 '/auth' 或 '/api/v1/system'）。
   */
  prefix: string;

  /**
   * 目标网关或后端微服务基地址（如 'https://gateway.example.com'）。
   */
  target: string;

  /**
   * 路径重写前缀。
   * 若提供，将把匹配到的 prefix 替换为此 rewritePrefix；
   * 若传入空字符串 ''，则直接剥离 prefix。
   */
  rewritePrefix?: string;

  /**
   * 路由描述信息（可选）。
   */
  description?: string;
}

/**
 * 网关路由器初始化配置项。
 */
export interface GatewayRouterOptions {
  /**
   * 预配置的网关路由列表。
   */
  routes?: GatewayRoute[];

  /**
   * 默认目标基地址（单体应用直连或前缀无匹配时的降级兜底地址）。
   */
  defaultTarget?: string;
}

/**
 * 路由解析选项参数。
 */
export interface ResolveRouteOptions {
  /**
   * 待解析的请求 URL 或相对路径。
   */
  url: string;

  /**
   * 显式指定的目标服务名称（优先于前缀自动匹配）。
   */
  service?: string;

  /**
   * 请求级自定义兜底基地址（可选）。
   */
  baseURL?: string;
}

/**
 * 路由解析完成后的产物。
 */
export interface ResolvedRoute {
  /**
   * 目标服务基地址 (baseURL)。
   */
  target: string;

  /**
   * 重写或解析后的请求相对路径（含保留的 query 与 hash）。
   */
  url: string;

  /**
   * 命中的路由配置（若未命中任何路由则为 undefined）。
   */
  matchedRoute?: GatewayRoute;
}
