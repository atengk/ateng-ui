/**
 * WebSocket 地址解析与查询参数动态构造器。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import type { WebSocketClientOptions } from './types';

/**
 * 安全地将键值参数合并至 WebSocket URL 的查询字符串中。
 *
 * @param rawUrl 原始 WebSocket URL
 * @param params 待附加的查询参数字典
 * @returns 附加参数后的完整 URL
 */
export function appendQueryParams(
  rawUrl: string,
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return '';
  }

  if (!params || typeof params !== 'object') {
    return rawUrl;
  }

  const validEntries = Object.entries(params).filter(
    ([_, val]) => val !== undefined && val !== null && val !== '',
  );

  if (validEntries.length === 0) {
    return rawUrl;
  }

  // 1. 尝试使用 WHATWG 标准 URL 对象进行安全解析
  try {
    const isAbsoluteWs = rawUrl.startsWith('ws://') || rawUrl.startsWith('wss://');
    let dummyBase = 'http://localhost';
    if (typeof location !== 'undefined' && location.host) {
      const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
      dummyBase = `${scheme}//${location.host}`;
    }

    const urlObj = isAbsoluteWs ? new URL(rawUrl) : new URL(rawUrl, dummyBase);

    for (const [key, val] of validEntries) {
      urlObj.searchParams.set(key, String(val));
    }

    if (isAbsoluteWs || rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      return urlObj.toString();
    }

    // 相对路径保留原有路径结构
    return `${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
  } catch {
    // 2. 降级备用分支：手工解析 query 与 hash
    const hashIndex = rawUrl.indexOf('#');
    const hash = hashIndex >= 0 ? rawUrl.slice(hashIndex + 1) : undefined;
    const pathAndQuery = hashIndex >= 0 ? rawUrl.slice(0, hashIndex) : rawUrl;
    const qIndex = pathAndQuery.indexOf('?');
    const path = qIndex >= 0 ? pathAndQuery.slice(0, qIndex) : pathAndQuery;
    const query = qIndex >= 0 ? pathAndQuery.slice(qIndex + 1) : '';

    const searchParams = new URLSearchParams(query);

    for (const [key, val] of validEntries) {
      searchParams.set(key, String(val));
    }

    const newQuery = searchParams.toString();
    const result = newQuery ? `${path}?${newQuery}` : path;
    return hash !== undefined ? `${result}#${hash}` : result;
  }
}

/**
 * 组装并拼接所有鉴权、租户与附加参数至指定 URL。
 */
function assembleWebSocketUrl(
  options: WebSocketClientOptions,
  rawUrl: string,
  extraParams?: Record<string, string | number | boolean | undefined | null>,
): string {
  const queryParams: Record<string, string | number | boolean | undefined | null> = {};

  // 1. 注入通用鉴权凭据 Token
  if (options.authManager) {
    const token = options.authManager.getToken();
    if (token) {
      const tokenKey = options.tokenParamName ?? 'token';
      queryParams[tokenKey] = token;
    }
  }

  // 2. 注入多租户上下文 Tenant ID
  if (options.tenantManager) {
    const tenantId = options.tenantManager.getTenantId();
    if (tenantId) {
      const tenantKey = options.tenantParamName ?? 'tenantId';
      queryParams[tenantKey] = tenantId;
    }
  }

  // 3. 合并自定义附加参数
  if (extraParams && typeof extraParams === 'object') {
    Object.assign(queryParams, extraParams);
  }

  return appendQueryParams(rawUrl, queryParams);
}

/**
 * 完整解析 WebSocket 连接地址，自动结合 AuthManager、TenantManager 及自定义参数。
 * 当 URL 与参数均为同步值时同步返回，包含 Promise 时异步返回。
 *
 * @param options WebSocket 配置选项
 * @returns 最终用于建立连接的完整 WebSocket URL
 */
export function resolveWebSocketUrl(options: WebSocketClientOptions): string | Promise<string> {
  const urlCandidate = typeof options.url === 'function' ? options.url() : options.url;
  const paramsCandidate = typeof options.params === 'function' ? options.params() : options.params;

  const isUrlPromise =
    urlCandidate instanceof Promise ||
    (typeof urlCandidate === 'object' &&
      urlCandidate !== null &&
      'then' in urlCandidate &&
      typeof (urlCandidate as { then: unknown }).then === 'function');

  const isParamsPromise =
    paramsCandidate instanceof Promise ||
    (typeof paramsCandidate === 'object' &&
      paramsCandidate !== null &&
      'then' in paramsCandidate &&
      typeof (paramsCandidate as { then: unknown }).then === 'function');

  if (!isUrlPromise && !isParamsPromise) {
    return assembleWebSocketUrl(
      options,
      urlCandidate as string,
      paramsCandidate as Record<string, string | number | boolean | undefined | null> | undefined,
    );
  }

  return Promise.all([Promise.resolve(urlCandidate), Promise.resolve(paramsCandidate)]).then(
    ([resolvedUrl, resolvedParams]) =>
      assembleWebSocketUrl(
        options,
        String(resolvedUrl),
        resolvedParams as Record<string, string | number | boolean | undefined | null> | undefined,
      ),
  );
}
