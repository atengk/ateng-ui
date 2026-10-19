/**
 * 微服务网关多路由映射与调度引擎实现。
 *
 * @author Ateng
 * @since 2026-10-19
 */

import type {
  GatewayRoute,
  GatewayRouterOptions,
  ResolveRouteOptions,
  ResolvedRoute,
} from './types';

/**
 * 判断 URL 是否为绝对地址（以 http://、https:// 或 // 开头）。
 */
function isAbsoluteUrl(url: string): boolean {
  return /^(?:[a-z+]+:)?\/\//i.test(url);
}

/**
 * 规整目标基地址，去除首尾空白与末尾多余斜杠。
 */
function cleanTarget(target?: string): string {
  if (!target) {
    return '';
  }
  return target.trim().replace(/\/+$/, '');
}

/**
 * 规整路径前缀：确保以单个 '/' 开头，并去除末尾斜杠。
 */
function normalizePathPrefix(prefix: string): string {
  const trimmed = prefix.trim().replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}` : '';
}

/**
 * 将原始 URL 拆分为纯路径部分与后缀部分（保留 ?query 与 #hash）。
 */
function splitUrl(url: string): { path: string; suffix: string } {
  const searchIndex = url.search(/[?#]/);
  if (searchIndex === -1) {
    return { path: url, suffix: '' };
  }
  return {
    path: url.slice(0, searchIndex),
    suffix: url.slice(searchIndex),
  };
}

/**
 * 执行路径重写计算。
 */
function rewritePath(
  path: string,
  matchedPrefix: string,
  rewritePrefix: string | undefined,
): string {
  if (rewritePrefix === undefined) {
    return path.startsWith('/') ? path : `/${path}`;
  }

  // 1. 提取匹配前缀之后的剩余子路径
  const remaining = path.slice(matchedPrefix.length);

  // 2. 根据是否传入自定义重写前缀组装最终路径
  if (rewritePrefix === '') {
    if (remaining.startsWith('/')) {
      return remaining;
    }
    return remaining ? `/${remaining}` : '/';
  }

  const normalizedRewrite = normalizePathPrefix(rewritePrefix);
  if (!remaining || remaining === '/') {
    return normalizedRewrite;
  }

  const normalizedRemaining = remaining.startsWith('/') ? remaining : `/${remaining}`;
  return `${normalizedRewrite}${normalizedRemaining}`;
}

/**
 * 微服务网关多路由调度引擎。
 */
export class GatewayRouter {
  private readonly routes: GatewayRoute[] = [];

  private defaultTarget: string;

  private isDirty: boolean = true;

  private sortedRoutesCache: GatewayRoute[] = [];

  public constructor(options?: GatewayRouterOptions) {
    this.defaultTarget = cleanTarget(options?.defaultTarget);
    if (options?.routes && options.routes.length > 0) {
      this.addRoutes(options.routes);
    }
  }

  /**
   * 注册单个网关路由规则。
   *
   * @param route 网关路由配置
   * @returns 路由器实例（支持链式调用）
   */
  public addRoute(route: GatewayRoute): this {
    this.routes.push({ ...route });
    this.isDirty = true;
    return this;
  }

  /**
   * 批量注册网关路由规则。
   *
   * @param routes 网关路由配置列表
   * @returns 路由器实例（支持链式调用）
   */
  public addRoutes(routes: GatewayRoute[]): this {
    for (const route of routes) {
      this.addRoute(route);
    }
    return this;
  }

  /**
   * 获取当前已注册的路由规则只读镜像副本。
   *
   * @returns 防御性只读路由副本
   */
  public getRoutes(): readonly GatewayRoute[] {
    return [...this.routes];
  }

  /**
   * 清空所有已注册的路由规则。
   */
  public clearRoutes(): void {
    this.routes.length = 0;
    this.sortedRoutesCache = [];
    this.isDirty = false;
  }

  /**
   * 动态设置默认兜底基地址。
   *
   * @param target 默认目标基地址
   */
  public setDefaultTarget(target: string): void {
    this.defaultTarget = cleanTarget(target);
  }

  /**
   * 解析请求路径与路由配置，调度并输出最终的 target 与 URL。
   *
   * @param options 路由解析选项
   * @returns 解析后的基地址与路径对象
   */
  public resolve(options: ResolveRouteOptions): ResolvedRoute;
  /**
   * 解析请求路径与路由配置（快捷重载）。
   *
   * @param url 请求 URL
   * @param service 可选的显式 service 覆盖
   * @returns 解析后的基地址与路径对象
   */
  public resolve(url: string, service?: string): ResolvedRoute;
  /**
   * 解析请求路径与路由配置（联合签名）。
   *
   * @param optionsOrUrl 路由解析选项或请求 URL
   * @param service 可选的显式 service 覆盖
   * @returns 解析后的基地址与路径对象
   */
  public resolve(optionsOrUrl: ResolveRouteOptions | string, service?: string): ResolvedRoute;
  public resolve(
    optionsOrUrl: ResolveRouteOptions | string,
    explicitService?: string,
  ): ResolvedRoute {
    const options: ResolveRouteOptions =
      typeof optionsOrUrl === 'string'
        ? { url: optionsOrUrl, service: explicitService }
        : optionsOrUrl;

    const rawUrl = options.url.trim();

    // 1. 若为绝对 URL，直接旁路穿透，不进行网关前缀篡改
    if (isAbsoluteUrl(rawUrl)) {
      return {
        target: '',
        url: rawUrl,
        matchedRoute: undefined,
      };
    }

    const { path: rawPath, suffix } = splitUrl(rawUrl);
    const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;

    // 2. 检查是否有显式 service 覆盖需求
    if (options.service) {
      const targetService = options.service.trim();
      const matched = this.routes.find(item => item.service === targetService);
      if (!matched) {
        throw new Error(`Unknown service: '${targetService}'. No matching GatewayRoute found.`);
      }

      const target = cleanTarget(matched.target);
      const prefix = normalizePathPrefix(matched.prefix);

      // 若当前 URL 恰好以该路由的 prefix 开头，执行重写逻辑
      const isPrefixMatched =
        prefix !== '' && (normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`));

      const finalPath = isPrefixMatched
        ? rewritePath(normalizedPath, prefix, matched.rewritePrefix)
        : normalizedPath;

      return {
        target,
        url: `${finalPath}${suffix}`,
        matchedRoute: matched,
      };
    }

    // 3. 前缀匹配：按前缀长度降序排序（最长前缀优先匹配，Longest Prefix Match）
    if (this.isDirty) {
      this.sortedRoutesCache = [...this.routes].sort((a, b) => {
        const lenA = normalizePathPrefix(a.prefix).length;
        const lenB = normalizePathPrefix(b.prefix).length;
        return lenB - lenA;
      });
      this.isDirty = false;
    }

    for (const route of this.sortedRoutesCache) {
      const prefix = normalizePathPrefix(route.prefix);
      if (!prefix) {
        continue;
      }

      // 严格边界防护：必须全字匹配或后接 '/'，杜绝 /user-profile 误匹配 /user
      const isMatched = normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`);

      if (isMatched) {
        const finalPath = rewritePath(normalizedPath, prefix, route.rewritePrefix);
        return {
          target: cleanTarget(route.target),
          url: `${finalPath}${suffix}`,
          matchedRoute: route,
        };
      }
    }

    // 4. 无任何前缀命中：降级为请求级 baseURL 或全局 defaultTarget 单体直连
    const fallbackTarget = cleanTarget(options.baseURL ?? this.defaultTarget);
    return {
      target: fallbackTarget,
      url: `${normalizedPath}${suffix}`,
      matchedRoute: undefined,
    };
  }
}

/**
 * 创建 GatewayRouter 网关路由器实例工厂函数。
 *
 * @param options 初始化选项
 * @returns GatewayRouter 实例
 */
export function createGatewayRouter(options?: GatewayRouterOptions): GatewayRouter {
  return new GatewayRouter(options);
}

/**
 * 纯函数版单次路由解析门面。
 *
 * @param urlOrOptions 待解析的 URL 或解析选项
 * @param routes 路由规则列表
 * @param defaultTarget 可选的默认回退地址
 * @returns 解析结果
 */
export function resolveGatewayRoute(
  urlOrOptions: string | ResolveRouteOptions,
  routes: readonly GatewayRoute[],
  defaultTarget?: string,
): ResolvedRoute {
  const router = new GatewayRouter({
    routes: [...routes],
    defaultTarget,
  });
  return router.resolve(urlOrOptions);
}
