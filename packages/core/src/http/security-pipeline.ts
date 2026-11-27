/**
 * HTTP 客户端传输层安全管道（Encrypt-then-Sign 请求加密加签 + 响应验签解密）。
 *
 * 严格遵循：
 * 1. 入站方向：明文防重放指纹已在调用前生成 ➔ RequestCipher 加密 ➔ RequestSigner 对密文加签；
 * 2. 出站方向：原始响应文本保真捕获 ➔ RequestSigner 3 行响应验签 ➔ RequestCipher 解密 ➔ parseSnowflakeJson 防大数截断；
 * 3. 安全校验失败统一抛出非 401 BusinessException(403)，严禁误触发登录失效登出。
 *
 * @author Ateng
 * @since 2026-11-27
 */

import axios, { type AxiosResponseTransformer, type InternalAxiosRequestConfig } from 'axios';
import { BusinessException } from '../contracts';
import { parseSnowflakeJson } from '../transform';
import type { RequestCipher, RequestSigner } from '../security';
import {
  getHeaderIgnoreCase,
  isBinaryRequestData,
  isBinaryResponseType,
  normalizeHeadersRecord,
} from '../security/crypto-utils';
import type { HttpRequestConfig } from './types';

const SECURITY_VERIFY_ERROR_CODE = 403;

/**
 * 重试周期需要还原的请求快照状态（通过 WeakMap 管理，零对象属性污染）。
 */
interface RetrySecuritySnapshot {
  originalData: unknown;
  originalContentType: string | undefined;
  generatedSecurityHeaders: string[];
}

const rawResponseTextMap = new WeakMap<object, string>();
const retrySnapshotMap = new WeakMap<object, RetrySecuritySnapshot>();

const captureRawResponseTransformer: AxiosResponseTransformer = function (
  this: unknown,
  data: unknown,
): unknown {
  if (typeof data === 'string' && this && typeof this === 'object') {
    rawResponseTextMap.set(this, data);
  }
  return data;
};

/**
 * 拦截器管道安全上下文依赖。
 */
export interface SecurityPipelineContext {
  signer?: RequestSigner;
  cipher?: RequestCipher;
}

/**
 * 安全读取/写入/删除 AxiosHeaders 或普通请求头对象中的字段（大小写无关）。
 */
export function hasRequestHeader(headers: unknown, name: string): boolean {
  if (!headers || typeof headers !== 'object') {
    return false;
  }
  const h = headers as { has?: (key: string) => boolean };
  if (typeof h.has === 'function') {
    return Boolean(h.has(name));
  }
  const lower = name.toLowerCase();
  return Object.keys(headers as Record<string, unknown>).some(k => k.toLowerCase() === lower);
}

export function setRequestHeader(headers: unknown, name: string, value: string): void {
  if (!headers || typeof headers !== 'object') {
    return;
  }
  const h = headers as { set?: (key: string, val: string) => void };
  if (typeof h.set === 'function') {
    h.set(name, value);
    return;
  }
  (headers as Record<string, string>)[name] = value;
}

function deleteRequestHeader(headers: unknown, name: string): void {
  if (!headers || typeof headers !== 'object') {
    return;
  }
  const h = headers as { delete?: (key: string) => void };
  if (typeof h.delete === 'function') {
    h.delete(name);
    return;
  }
  const lower = name.toLowerCase();
  const record = headers as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (key.toLowerCase() === lower) {
      delete record[key];
    }
  }
}

function hasArrayParam(params: unknown): boolean {
  if (!params || typeof params !== 'object' || params instanceof URLSearchParams) {
    return false;
  }
  return Object.values(params as Record<string, unknown>).some(v => Array.isArray(v));
}

/**
 * 保存请求重试所需的原始载荷快照。
 */
export function snapshotAndResetSecurityState(
  config: HttpRequestConfig & InternalAxiosRequestConfig,
): void {
  if (!retrySnapshotMap.has(config)) {
    retrySnapshotMap.set(config, {
      originalData: config.data,
      originalContentType: getHeaderIgnoreCase(config.headers, 'Content-Type'),
      generatedSecurityHeaders: [],
    });
  }
  rawResponseTextMap.delete(config);
}

/**
 * 重试前恢复原始明文请求体并清除上一轮生成的加密头与签名头，防止双重加密或复用过期 Nonce。
 */
export function restoreSecurityStateForRetry(
  config: HttpRequestConfig & InternalAxiosRequestConfig,
): void {
  const snapshot = retrySnapshotMap.get(config);
  if (snapshot) {
    config.data = snapshot.originalData;
    if (config.headers) {
      if (typeof snapshot.originalContentType === 'string') {
        setRequestHeader(config.headers, 'Content-Type', snapshot.originalContentType);
      } else {
        deleteRequestHeader(config.headers, 'Content-Type');
      }
      for (const headerName of snapshot.generatedSecurityHeaders) {
        deleteRequestHeader(config.headers, headerName);
      }
    }
    snapshot.generatedSecurityHeaders = [];
  }
  rawResponseTextMap.delete(config);
}

/**
 * 在请求发送管道中执行 Encrypt-then-Sign（先加密请求体，再对最终密文计算签名）。
 */
export async function applyOutboundRequestSecurity(
  config: HttpRequestConfig & InternalAxiosRequestConfig,
  context: SecurityPipelineContext,
): Promise<void> {
  const generatedHeaders: string[] = [];
  config.headers = config.headers || {};

  let cipherEncrypted = false;
  let cipherAppId: string | undefined;

  // 1. 请求传输层混合加密（config.encrypt === true 显式强制启用，仅受二进制载体硬护栏约束）
  if (context.cipher) {
    const isBinary = isBinaryResponseType(config.responseType) || isBinaryRequestData(config.data);

    const shouldEncrypt =
      !isBinary &&
      (config.encrypt !== undefined ? config.encrypt : context.cipher.shouldEncrypt(config));

    if (shouldEncrypt) {
      const encrypted = await context.cipher.encryptRequest(config.data);
      config.data = encrypted.body;
      cipherEncrypted = true;
      cipherAppId = context.cipher.appId;
      setRequestHeader(config.headers, 'Content-Type', encrypted.contentType);

      for (const [key, value] of Object.entries(encrypted.headers)) {
        if (value) {
          setRequestHeader(config.headers, key, value);
          generatedHeaders.push(key);
        }
      }
    } else if (!isBinary && config.encrypt !== false && context.cipher.appId) {
      const appIdHeader = context.cipher.headerNames.appId;
      if (!hasRequestHeader(config.headers, appIdHeader)) {
        setRequestHeader(config.headers, appIdHeader, context.cipher.appId);
        generatedHeaders.push(appIdHeader);
      }
    }
  }

  // 2. 请求防重放与防篡改签名（对加密后的密文信封计算摘要与签名）
  if (context.signer) {
    const shouldSign = config.sign !== undefined ? config.sign : context.signer.shouldSign(config);

    if (shouldSign) {
      // 数组参数默认使用无括号 repeat 序列化，与 buildStandardSortedQueryString 及后端 Servlet 参数一致
      if (hasArrayParam(config.params) && config.paramsSerializer === undefined) {
        config.paramsSerializer = { indexes: null };
      }

      const timestamp = context.signer.generateTimestamp();
      const nonce = context.signer.generateNonce();
      const signResult = await context.signer.sign({
        method: config.method,
        baseURL: config.baseURL,
        url: config.url,
        params: config.params,
        data: config.data,
        timestamp,
        nonce,
      });

      if (cipherEncrypted && context.cipher && cipherAppId) {
        const signerAppId = getHeaderIgnoreCase(
          signResult.headers,
          context.cipher.headerNames.appId,
        );
        if (signerAppId && signerAppId !== cipherAppId) {
          throw new BusinessException(
            500,
            `RequestCipher(${cipherAppId}) 与 RequestSigner(${signerAppId}) 的 appId 配置不一致，可能导致 AAD 认证失败`,
          );
        }
      }

      for (const [key, value] of Object.entries(signResult.headers)) {
        if (value) {
          setRequestHeader(config.headers, key, value);
          generatedHeaders.push(key);
        }
      }
    }
  }

  const snapshot = retrySnapshotMap.get(config);
  if (snapshot) {
    snapshot.generatedSecurityHeaders = generatedHeaders;
  }
}

/**
 * 归一化并返回 Axios 配置的 transformResponse 数组副本。
 */
export function normalizeResponseTransformers(
  config: HttpRequestConfig & InternalAxiosRequestConfig,
): AxiosResponseTransformer[] {
  if (Array.isArray(config.transformResponse)) {
    return [...(config.transformResponse as AxiosResponseTransformer[])];
  }
  if (config.transformResponse) {
    return [config.transformResponse as AxiosResponseTransformer];
  }
  if (Array.isArray(axios.defaults.transformResponse)) {
    return [...(axios.defaults.transformResponse as AxiosResponseTransformer[])];
  }
  return [];
}

/**
 * 注入原始响应文本捕获转换器（置于 transformResponse 链最前端并去重）。
 */
export function ensureRawResponseCapture(
  config: HttpRequestConfig & InternalAxiosRequestConfig,
): void {
  const existing = normalizeResponseTransformers(config);
  if (!existing.includes(captureRawResponseTransformer)) {
    config.transformResponse = [captureRawResponseTransformer, ...existing];
  }
}

function extractTraceId(headers: unknown, data?: unknown): string | undefined {
  if (data && typeof data === 'object') {
    const rec = data as Record<string, unknown>;
    if (typeof rec.traceId === 'string' && rec.traceId) {
      return rec.traceId;
    }
  }
  return getHeaderIgnoreCase(headers, 'x-trace-id') ?? getHeaderIgnoreCase(headers, 'trace-id');
}

function isLikelyJsonText(text: string, headers: unknown): boolean {
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return true;
  }
  const contentType = getHeaderIgnoreCase(headers, 'content-type') ?? '';
  return contentType.toLowerCase().includes('application/json');
}

/**
 * 执行响应验签与响应解密管道：
 * 1. 先基于未解析原始响应文本进行 3 行响应验签（Encrypt-then-Sign）；
 * 2. 再解密密文信封并经 parseSnowflakeJson 保留 16 位以上雪花 ID 为 string；
 * 3. 任何校验失败抛出非 401 的 BusinessException(403)。
 */
export async function applyInboundResponseSecurity(
  data: unknown,
  headers: unknown,
  status: number | undefined,
  config: (HttpRequestConfig & InternalAxiosRequestConfig) | undefined,
  context: SecurityPipelineContext,
  strictMode: boolean,
): Promise<unknown> {
  if (
    isBinaryResponseType(config?.responseType) ||
    (typeof Blob !== 'undefined' && data instanceof Blob)
  ) {
    return data;
  }

  const rawBodyFromCapture = config ? rawResponseTextMap.get(config) : undefined;
  if (config) {
    rawResponseTextMap.delete(config);
  }

  const rawBody =
    rawBodyFromCapture !== undefined
      ? rawBodyFromCapture
      : typeof data === 'string'
        ? data
        : data !== undefined && data !== null
          ? JSON.stringify(data)
          : '';

  // 1. 出站响应防篡改验签（优先覆盖密文信封原字节）
  if (context.signer?.hasResponseVerification && context.signer.verifyResponse) {
    const ts = getHeaderIgnoreCase(headers, context.signer.headerNames.timestamp);
    const nonce = getHeaderIgnoreCase(headers, context.signer.headerNames.nonce);
    const sig = getHeaderIgnoreCase(headers, context.signer.headerNames.signature);

    if (sig && ts && nonce) {
      const valid = await context.signer.verifyResponse({
        timestamp: ts,
        nonce,
        signature: sig,
        rawBody,
        headers: normalizeHeadersRecord(headers),
        status,
      });

      if (!valid) {
        throw new BusinessException(
          SECURITY_VERIFY_ERROR_CODE,
          '服务端响应签名校验失败，报文可能已被篡改',
          extractTraceId(headers, data),
        );
      }
    } else if (strictMode && context.signer.strictResponseVerify) {
      throw new BusinessException(
        SECURITY_VERIFY_ERROR_CODE,
        `服务端响应缺少必要签名头 (${context.signer.headerNames.signature})`,
        extractTraceId(headers, data),
      );
    }
  }

  // 2. 出站响应混合解密 + 雪花大数安全解析
  if (context.cipher && config?.encrypt !== false) {
    const isEncrypted = context.cipher.isEncryptedResponse(headers, data);
    if (isEncrypted) {
      const decryptedText = await context.cipher.decryptResponse(
        rawBodyFromCapture ?? data,
        headers,
      );
      if (isLikelyJsonText(decryptedText, headers)) {
        try {
          return parseSnowflakeJson(decryptedText);
        } catch (parseError) {
          throw new BusinessException(
            SECURITY_VERIFY_ERROR_CODE,
            '解密后的响应 JSON 载荷解析失败',
            extractTraceId(headers, data),
            parseError,
          );
        }
      }
      return decryptedText;
    }
    if (strictMode && context.cipher.strictResponseDecrypt) {
      throw new BusinessException(
        SECURITY_VERIFY_ERROR_CODE,
        `严格加密模式下拒绝未加密响应 (缺少 ${context.cipher.headerNames.encryptIv})`,
        extractTraceId(headers, data),
      );
    }
  }

  return data;
}
