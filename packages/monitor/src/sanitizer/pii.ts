/**
 * 敏感数据与隐私信息脱敏管道 (PII Sanitizer)。
 *
 * @author Ateng
 * @since 2026-10-31
 */

/** 默认敏感 URL Query 参数键集合 (忽略大小写) */
export const DEFAULT_SENSITIVE_QUERY_KEYS: readonly string[] = [
  'token',
  'secret',
  'password',
  'pwd',
  'key',
  'auth',
  'ticket',
  'access_token',
  'refresh_token',
  'credential',
  'session',
  'apikey',
  'api_key',
];

/** 默认敏感 HTTP 请求头集合 (小写化比对) */
export const DEFAULT_SENSITIVE_HEADER_KEYS: readonly string[] = [
  'authorization',
  'cookie',
  'set-cookie',
  'x-token',
  'x-auth-token',
  'x-access-token',
  'x-api-key',
  'token',
];

/** 默认脱敏 DOM 属性与类名选择器 */
export const DEFAULT_MASK_SELECTORS: readonly string[] = [
  '[data-monitor-mask]',
  '.monitor-mask',
  '.at-mask',
  'input[type="password"]',
];

/**
 * 过滤与清洗 URL 中的敏感 Query 参数。
 *
 * @param url 待脱敏的完整或相对 URL
 * @param sensitiveKeys 自定义敏感键名清单（不区分大小写）
 * @returns 脱敏处理后的安全 URL
 */
export function sanitizeUrl(
  url: string,
  sensitiveKeys: readonly string[] = DEFAULT_SENSITIVE_QUERY_KEYS,
): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const queryIndex = url.indexOf('?');
  if (queryIndex === -1) {
    return url;
  }

  const baseUrl = url.slice(0, queryIndex);
  const queryString = url.slice(queryIndex + 1);
  const hashIndex = queryString.indexOf('#');

  let rawQuery = queryString;
  let hashPart = '';

  if (hashIndex !== -1) {
    rawQuery = queryString.slice(0, hashIndex);
    hashPart = queryString.slice(hashIndex);
  }

  const keySet = new Set(sensitiveKeys.map(k => k.toLowerCase()));
  const pairs = rawQuery.split('&');
  const sanitizedPairs: string[] = [];

  for (const pair of pairs) {
    if (!pair) continue;
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) {
      sanitizedPairs.push(pair);
      continue;
    }

    const key = pair.slice(0, eqIdx);
    const lowerKey = decodeURIComponent(key).toLowerCase();

    if (keySet.has(lowerKey)) {
      sanitizedPairs.push(`${key}=******`);
    } else {
      sanitizedPairs.push(pair);
    }
  }

  return `${baseUrl}?${sanitizedPairs.join('&')}${hashPart}`;
}

/**
 * 清洗敏感 HTTP 请求头。
 *
 * @param headers 原始请求头对象
 * @param sensitiveHeaders 自定义敏感请求头清单（不区分大小写）
 * @returns 经过脱敏后的安全请求头副本
 */
export function sanitizeHeaders(
  headers: Record<string, string>,
  sensitiveHeaders: readonly string[] = DEFAULT_SENSITIVE_HEADER_KEYS,
): Record<string, string> {
  if (!headers || typeof headers !== 'object') {
    return {};
  }

  const keySet = new Set(sensitiveHeaders.map(k => k.toLowerCase()));
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (keySet.has(key.toLowerCase())) {
      result[key] = '******';
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * 判断指定 DOM 节点或其祖先节点是否命中脱敏规则。
 *
 * @param element 目标 DOM 节点
 * @param customMaskSelectors 用户额外配置的脱敏选择器列表
 * @returns 是否应当脱敏掩码
 */
export function isElementMasked(
  element: Element | null | undefined,
  customMaskSelectors: string[] = [],
): boolean {
  if (!element || typeof element.matches !== 'function') {
    return false;
  }

  const allSelectors = [...DEFAULT_MASK_SELECTORS, ...customMaskSelectors];

  let current: Element | null = element;
  while (current && current !== document.documentElement) {
    for (const selector of allSelectors) {
      try {
        if (current.matches(selector)) {
          return true;
        }
      } catch {
        // 忽略非法选择器
      }
    }
    current = current.parentElement;
  }

  return false;
}

/**
 * 针对 DOM 节点安全提取文本与输入值。若命中脱敏规则，自动返回 '******'。
 *
 * @param element 目标 DOM 节点
 * @param customMaskSelectors 用户额外配置的脱敏选择器列表
 * @returns 脱敏后的文本内容与可能存在的输入值
 */
export function sanitizeDomText(
  element: Element | null | undefined,
  customMaskSelectors: string[] = [],
): { text: string; value?: string; isMasked: boolean } {
  if (!element) {
    return { text: '', isMasked: false };
  }

  const masked = isElementMasked(element, customMaskSelectors);

  if (masked) {
    return {
      text: '******',
      value: '******',
      isMasked: true,
    };
  }

  // 提取输入框值
  let val: string | undefined;
  if ('value' in element && typeof (element as HTMLInputElement).value === 'string') {
    val = (element as HTMLInputElement).value;
  }

  // 提取常规文本
  const rawText = element.textContent || '';
  const text = rawText.trim().slice(0, 100); // 截断过长文本，避免过大 Payload

  return {
    text,
    value: val,
    isMasked: false,
  };
}
