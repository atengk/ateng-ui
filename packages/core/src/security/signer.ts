/**
 * API 请求防重放与防篡改签名原生 WebCrypto 门面实现。
 *
 * 坚持纯原生 Web 标准 API 实现，基于 crypto.subtle.digest 生成 SHA-256 摘要，
 * 零第三方加密依赖，支持自定义 Header 键名、密钥、时间戳与规范化排序规则。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import type { HttpRequestConfig } from '../http/types';
import type { RequestSigner, RequestSignerOptions, SignResult, SignTarget } from './types';

/**
 * 使用原生 Web Crypto API 计算 UTF-8 字符串的 SHA-256 十六进制摘要。
 *
 * @param message 待哈希字符串
 * @returns 64 位小写十六进制哈希摘要
 */
export async function sha256Hex(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);

  const subtle =
    typeof crypto !== 'undefined' && crypto.subtle
      ? crypto.subtle
      : (globalThis as unknown as { crypto?: { subtle?: SubtleCrypto } }).crypto?.subtle;

  if (!subtle) {
    throw new Error('WebCrypto subtle is not available in the current runtime environment');
  }

  const hashBuffer = await subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 原生生成唯一排重随机数 Nonce。
 *
 * 优先采用 crypto.randomUUID，保底采用 crypto.getRandomValues 或时间戳降级。
 *
 * @returns 唯一随机字符串
 */
export function generateNonce(): string {
  const currentCrypto =
    typeof crypto !== 'undefined' ? crypto : (globalThis as unknown as { crypto?: Crypto }).crypto;

  if (currentCrypto) {
    if (typeof currentCrypto.randomUUID === 'function') {
      return currentCrypto.randomUUID().replace(/-/g, '');
    }
    if (typeof currentCrypto.getRandomValues === 'function') {
      const buffer = new Uint8Array(16);
      currentCrypto.getRandomValues(buffer);
      return Array.from(buffer)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
  }

  // 环境无 crypto 保底
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

/**
 * 递归对普通对象进行键排序稳定 JSON 字符串化。
 *
 * 确保属性声明顺序不一致时仍能输出 100% 相同的结果。
 *
 * @param data 待序列化数据
 * @returns 稳定字符串
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
 * 规范化序列化 query 查询参数对象（按 key 字典序升序排列）。
 *
 * @param params 查询参数对象
 * @returns 规范化键值对字符串
 */
function serializeParams(params: unknown): string {
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
 * 默认规范化待签名字符串构建器。
 *
 * 采用标准键名字典序拼接：
 * `data=${data}&method=${method}&nonce=${nonce}&params=${params}&timestamp=${timestamp}&url=${url}&secret=${secret}`
 *
 * @param target 签名请求上下文
 * @param secret 可选的签名密钥
 * @returns 规范化字符串
 */
export function defaultBuildCanonicalString(target: SignTarget, secret?: string): string {
  const method = (target.method ?? 'GET').toUpperCase();
  const url = target.url ?? '';
  const paramsStr = serializeParams(target.params);
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
 * API 请求防重放与防篡改签名默认实现类。
 */
export class DefaultRequestSigner implements RequestSigner {
  /**
   * 当前签名器配置的 Header 键名映射表。
   */
  readonly headerNames: {
    readonly timestamp: string;
    readonly nonce: string;
    readonly signature: string;
  };

  private readonly secret?: string;
  private readonly timestampUnit: 'ms' | 's';
  private readonly nonceGenerator: () => string;
  private readonly buildCanonicalString: (target: SignTarget, secret?: string) => string;
  private readonly userShouldSign?: (config: HttpRequestConfig) => boolean;

  /**
   * 构造签名器实例。
   *
   * @param options 签名器配置选项
   */
  constructor(options: RequestSignerOptions = {}) {
    const {
      secret,
      timestampHeader = 'X-Timestamp',
      nonceHeader = 'X-Nonce',
      signatureHeader = 'X-Signature',
      timestampUnit = 'ms',
      nonceGenerator = generateNonce,
      buildCanonicalString = defaultBuildCanonicalString,
      shouldSign,
    } = options;

    this.secret = secret;
    this.headerNames = {
      timestamp: timestampHeader,
      nonce: nonceHeader,
      signature: signatureHeader,
    };
    this.timestampUnit = timestampUnit;
    this.nonceGenerator = nonceGenerator;
    this.buildCanonicalString = buildCanonicalString;
    this.userShouldSign = shouldSign;
  }

  /**
   * 生成当前时间戳。
   */
  generateTimestamp(): number {
    return this.timestampUnit === 's' ? Math.floor(Date.now() / 1000) : Date.now();
  }

  /**
   * 生成唯一排重随机数 Nonce。
   */
  generateNonce(): string {
    return this.nonceGenerator();
  }

  /**
   * 对指定的 HTTP 请求目标计算签名并生成注入请求头。
   *
   * @param target 签名上下文目标
   * @returns 签名结果
   */
  async sign(target: SignTarget): Promise<SignResult> {
    const canonicalString = this.buildCanonicalString(target, this.secret);
    const signature = await sha256Hex(canonicalString);

    const headers: Record<string, string> = {
      [this.headerNames.timestamp]: String(target.timestamp),
      [this.headerNames.nonce]: target.nonce,
      [this.headerNames.signature]: signature,
    };

    return {
      signature,
      headers,
    };
  }

  /**
   * 判断指定请求是否应当执行签名注入。
   *
   * 默认对所有写操作请求（POST, PUT, DELETE, PATCH）返回 true。
   *
   * @param config 请求配置信息
   * @returns 是否需要签名
   */
  shouldSign(config: HttpRequestConfig): boolean {
    if (this.userShouldSign) {
      return this.userShouldSign(config);
    }
    const method = (config.method ?? 'GET').toUpperCase();
    return ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
  }
}

/**
 * 便捷工厂函数：创建并初始化一个 API 请求签名器实例。
 *
 * @param options 签名器配置选项
 * @returns 签名器门面实例
 */
export function createRequestSigner(options?: RequestSignerOptions): RequestSigner {
  return new DefaultRequestSigner(options);
}
