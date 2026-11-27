/**
 * API 请求与响应标准化待签名字符串构建器。
 *
 * 严格支持两套规约：
 * 1. `legacy`：键名字典序拼接，确保既有业务 100% 向后兼容；
 * 2. `standard`：严格对齐后端 ateng-boot-web `SignCanonicalUtil` 的 6 行请求规范串与 3 行响应规范串。
 *
 * @author Ateng
 * @since 2026-11-27
 */

import { isBinaryRequestData, sha256Hex } from './crypto-utils';
import type { SignTarget } from './types';

const BODY_LESS_METHODS = new Set(['GET', 'DELETE', 'HEAD', 'OPTIONS', 'TRACE']);

/**
 * 按 ASCII 码位升序比较两个字符串（禁止使用受区域设置影响的 localeCompare）。
 */
function compareAscii(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * 递归对普通对象进行键排序稳定 JSON 字符串化（用于 legacy 规范串）。
 */
function stableStringify(data: unknown): string {
  if (data === null || data === undefined) {
    return '';
  }
  if (typeof data === 'string') {
    return data;
  }
  if (typeof data !== 'object') {
    return String(data);
  }
  if (Array.isArray(data)) {
    return `[${data.map(stableStringify).join(',')}]`;
  }
  const record = data as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort();
  const entries = sortedKeys.map(k => `${JSON.stringify(k)}:${stableStringify(record[k])}`);
  return `{${entries.join(',')}}`;
}

/**
 * 规范化序列化 query 查询参数对象（用于 legacy 规范串）。
 */
function serializeLegacyParams(params: unknown): string {
  if (!params || typeof params !== 'object') {
    return '';
  }
  const record = params as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort();
  const pairs: string[] = [];
  for (const key of sortedKeys) {
    const val = record[key];
    if (val !== undefined && val !== null) {
      const valStr = typeof val === 'object' ? stableStringify(val) : String(val);
      pairs.push(`${key}=${valStr}`);
    }
  }
  return pairs.join('&');
}

/**
 * 默认规范化待签名字符串构建器（legacy 遗留模式，向后兼容）。
 *
 * @param target 签名请求上下文
 * @param secret 可选的签名密钥
 * @returns 规范化字符串
 */
export function defaultBuildCanonicalString(target: SignTarget, secret?: string): string {
  const method = (target.method ?? 'GET').toUpperCase();
  const url = target.url ?? '';
  const paramsStr = serializeLegacyParams(target.params);
  const dataStr = stableStringify(target.data);
  const timestamp = String(target.timestamp);
  const nonce = target.nonce;

  let canonical = `data=${dataStr}&method=${method}&nonce=${nonce}&params=${paramsStr}&timestamp=${timestamp}&url=${url}`;
  if (secret !== undefined && secret !== '') {
    canonical += `&secret=${secret}`;
  }
  return canonical;
}

/**
 * 从 URL 与可选 baseURL 提取纯请求 URI 路径（不含 scheme、host 与 ?query/#hash）。
 *
 * 对齐服务端 `HttpServletRequest.getRequestURI()`。
 *
 * @param url 请求 URL 或相对路径
 * @param baseURL 可选网关基地址
 * @returns 以 '/' 开头的规范化请求 URI
 */
export function extractRequestUriPath(url?: string, baseURL?: string): string {
  const rawUrl = (url ?? '').trim();
  const rawBase = (baseURL ?? '').trim();

  if (!rawUrl && !rawBase) {
    return '/';
  }

  try {
    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(rawUrl)) {
      const parsed = new URL(rawUrl);
      return parsed.pathname || '/';
    }

    const baseWithoutSearch = rawBase.split(/[?#]/)[0] ?? '';
    let basePath = '';
    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(baseWithoutSearch)) {
      basePath = new URL(baseWithoutSearch).pathname;
    } else if (baseWithoutSearch) {
      basePath = baseWithoutSearch;
    }

    const cleanBasePath = basePath.replace(/\/+$/, '');
    const urlPathPart = rawUrl.split(/[?#]/)[0] ?? '';
    const cleanUrlPath = urlPathPart
      ? urlPathPart.startsWith('/')
        ? urlPathPart
        : `/${urlPathPart}`
      : '';

    if (!cleanBasePath || cleanBasePath === '/') {
      return cleanUrlPath || '/';
    }
    if (!cleanUrlPath || cleanUrlPath === '/') {
      return cleanBasePath.startsWith('/') ? cleanBasePath : `/${cleanBasePath}`;
    }
    const normalizedBase = cleanBasePath.startsWith('/') ? cleanBasePath : `/${cleanBasePath}`;
    return `${normalizedBase}${cleanUrlPath}`;
  } catch {
    const stripped = rawUrl.split(/[?#]/)[0] ?? '';
    if (!stripped) {
      return '/';
    }
    return stripped.startsWith('/') ? stripped : `/${stripped}`;
  }
}

/**
 * 按服务端 SignCanonicalUtil.buildSortedQueryString 规则组装标准化 Query 字符串。
 *
 * 1. 自动解析并解码 URL 自带查询参数与 `params` 参数映射（含数组多值展开）；
 * 2. 按 key 的 ASCII 码位升序、同 key 多值按值 ASCII 码位升序排列；
 * 3. 以明文 `key=value` 形式通过 `&` 拼接，完全对齐 Servlet `request.getParameterMap()`。
 *
 * @param url 请求 URL（可含 `?query`）
 * @param params Axios `params` 参数对象或 `URLSearchParams`
 * @returns 排序后的 Query 字符串；无参数返回空串 `""`
 */
export function buildStandardSortedQueryString(url?: string, params?: unknown): string {
  const paramMap = new Map<string, string[]>();

  const pushValue = (key: string, val: string): void => {
    const list = paramMap.get(key);
    if (list) {
      list.push(val);
    } else {
      paramMap.set(key, [val]);
    }
  };

  if (url) {
    const qIndex = url.indexOf('?');
    if (qIndex !== -1) {
      const hashIndex = url.indexOf('#', qIndex);
      const queryPart = hashIndex === -1 ? url.slice(qIndex + 1) : url.slice(qIndex + 1, hashIndex);
      if (queryPart) {
        const searchParams = new URLSearchParams(queryPart);
        searchParams.forEach((value, key) => {
          pushValue(key, value);
        });
      }
    }
  }

  if (params instanceof URLSearchParams) {
    params.forEach((value, key) => {
      pushValue(key, value);
    });
  } else if (params && typeof params === 'object') {
    const record = params as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      const rawVal = record[key];
      if (rawVal === undefined || rawVal === null) {
        continue;
      }
      if (Array.isArray(rawVal)) {
        for (const item of rawVal) {
          if (item !== undefined && item !== null) {
            pushValue(key, typeof item === 'object' ? JSON.stringify(item) : String(item));
          }
        }
      } else {
        pushValue(key, typeof rawVal === 'object' ? JSON.stringify(rawVal) : String(rawVal));
      }
    }
  }

  if (paramMap.size === 0) {
    return '';
  }

  const sortedKeys = Array.from(paramMap.keys()).sort(compareAscii);
  const pairs: string[] = [];
  for (const key of sortedKeys) {
    const values = paramMap.get(key) ?? [];
    if (values.length === 0) {
      pairs.push(`${key}=`);
    } else {
      const sortedValues = [...values].sort(compareAscii);
      for (const val of sortedValues) {
        pairs.push(`${key}=${val}`);
      }
    }
  }

  return pairs.join('&');
}

async function resolveStandardBodySha256(target: SignTarget): Promise<string> {
  const method = (target.method ?? 'GET').toUpperCase();
  if (BODY_LESS_METHODS.has(method)) {
    return sha256Hex('');
  }
  if (target.bodyBytes) {
    return target.bodyBytes.length > 0 ? sha256Hex(target.bodyBytes) : sha256Hex('');
  }
  const data = target.data;
  if (data === undefined || data === null) {
    return sha256Hex('');
  }
  if (typeof data === 'string') {
    return data.length > 0 ? sha256Hex(data) : sha256Hex('');
  }
  if (isBinaryRequestData(data)) {
    if (data instanceof URLSearchParams) {
      const serialized = data.toString();
      return serialized.length > 0 ? sha256Hex(serialized) : sha256Hex('');
    }
    return sha256Hex('');
  }
  return sha256Hex(JSON.stringify(data));
}

/**
 * 构建与服务端 SignCanonicalUtil.buildRequestCanonicalString 逐字节一致的 6 行入站待签串。
 *
 * 规范格式：`METHOD\nURI\nTimestamp\nNonce\nSortedQueryString\nBodySha256`
 *
 * @param target 签名请求上下文
 * @returns 6 行标准待签串
 */
export async function buildStandardCanonicalString(target: SignTarget): Promise<string> {
  const method = (target.method ?? 'GET').toUpperCase();
  const uri = extractRequestUriPath(target.url, target.baseURL);
  const timestamp = String(target.timestamp);
  const nonce = target.nonce;
  const sortedQuery = buildStandardSortedQueryString(target.url, target.params);
  const bodySha256 = await resolveStandardBodySha256(target);

  return [method, uri, timestamp, nonce, sortedQuery, bodySha256].join('\n');
}

/**
 * 构建与服务端 SignCanonicalUtil.buildResponseCanonicalString 逐字节一致的 3 行出站响应待签串。
 *
 * 规范格式：`Timestamp\nNonce\nResponseBodySha256`
 *
 * @param timestamp 响应时间戳
 * @param nonce 响应 Nonce
 * @param responseBodySha256 响应体 SHA-256 小写十六进制摘要
 * @returns 3 行标准响应待签串
 */
export async function buildResponseCanonicalString(
  timestamp: string,
  nonce: string,
  responseBodySha256: string,
): Promise<string> {
  const cleanHash = responseBodySha256.trim()
    ? responseBodySha256.trim().toLowerCase()
    : await sha256Hex('');
  return [timestamp, nonce, cleanHash].join('\n');
}
