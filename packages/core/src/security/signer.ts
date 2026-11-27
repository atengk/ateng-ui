/**
 * API 请求防重放与防篡改签名原生 WebCrypto 门面实现。
 *
 * 坚持纯原生 Web 标准 API 实现，零第三方加密依赖：
 * - 支持遗留模式（legacy）保持 100% 向后兼容；
 * - 支持标准规范协议（standard + HMAC-SHA256），严格对齐服务端 ateng-boot-web；
 * - 支持可插拔异步签名函数（RSA / SM2）与 3 行响应报文防篡改验签。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import type { HttpRequestConfig } from '../http/types';
import {
  buildResponseCanonicalString,
  buildStandardCanonicalString,
  defaultBuildCanonicalString,
} from './canonical';
import { constantTimeEqual, getWebCrypto, hmacSha256, sha256Hex } from './crypto-utils';
import type {
  CanonicalPreset,
  CustomSignFn,
  RequestSigner,
  RequestSignerOptions,
  ResponseSignTarget,
  ResponseVerifier,
  SignResult,
  SignTarget,
  SignatureAlgorithm,
  SignatureEncoding,
} from './types';

export { sha256Hex, hmacSha256 };
export {
  buildResponseCanonicalString,
  buildStandardCanonicalString,
  buildStandardSortedQueryString,
  defaultBuildCanonicalString,
  extractRequestUriPath,
} from './canonical';

/**
 * 原生生成唯一排重随机数 Nonce。
 *
 * 优先采用 crypto.randomUUID，保底采用 crypto.getRandomValues 或时间戳降级。
 *
 * @returns 唯一随机字符串
 */
export function generateNonce(): string {
  try {
    const currentCrypto = getWebCrypto();
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
  } catch {
    // 非标准宿主无 crypto 时走时间戳兜底
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

/**
 * API 请求防重放与防篡改签名默认实现类。
 */
export class DefaultRequestSigner implements RequestSigner {
  /**
   * 当前签名器配置的 Header 键名映射表。
   */
  readonly headerNames: {
    readonly appId: string;
    readonly timestamp: string;
    readonly nonce: string;
    readonly signature: string;
  };

  /**
   * 是否启用了出站响应验签能力。
   */
  readonly hasResponseVerification: boolean;

  /**
   * 是否开启严格响应验签。
   */
  readonly strictResponseVerify: boolean;

  private readonly secret?: string;
  private readonly appId?: string;
  private readonly algorithm: SignatureAlgorithm;
  private readonly canonicalPreset: CanonicalPreset;
  private readonly outputEncoding: SignatureEncoding;
  private readonly timestampUnit: 'ms' | 's';
  private readonly nonceGenerator: () => string;
  private readonly customSignFn?: CustomSignFn;
  private readonly customCanonicalBuilder?: (
    target: SignTarget,
    secret?: string,
  ) => string | Promise<string>;
  private readonly userShouldSign?: (config: HttpRequestConfig) => boolean;
  private readonly responseVerifierOption?: boolean | ResponseVerifier;

  /**
   * 构造签名器实例。
   *
   * @param options 签名器配置选项
   */
  constructor(options: RequestSignerOptions = {}) {
    const {
      secret,
      appId,
      appIdHeader = 'X-App-Id',
      timestampHeader = 'X-Timestamp',
      nonceHeader = 'X-Nonce',
      signatureHeader = 'X-Signature',
      canonicalPreset = 'legacy',
      algorithm = canonicalPreset === 'standard' ? 'hmac-sha256' : 'legacy-sha256',
      outputEncoding = algorithm === 'hmac-sha256' ? 'base64' : 'hex',
      timestampUnit = 'ms',
      nonceGenerator = generateNonce,
      signer,
      buildCanonicalString,
      verifyResponse,
      strictResponseVerify = false,
      shouldSign,
    } = options;

    this.secret = secret;
    this.appId = appId?.trim() || undefined;
    this.headerNames = {
      appId: appIdHeader,
      timestamp: timestampHeader,
      nonce: nonceHeader,
      signature: signatureHeader,
    };
    this.canonicalPreset = canonicalPreset;
    this.algorithm = algorithm;
    this.outputEncoding = outputEncoding;
    this.timestampUnit = timestampUnit;
    this.nonceGenerator = nonceGenerator;
    this.customSignFn = signer;
    this.customCanonicalBuilder = buildCanonicalString;
    this.responseVerifierOption = verifyResponse;
    this.hasResponseVerification = Boolean(verifyResponse);
    this.strictResponseVerify = strictResponseVerify;
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
    const canonicalString = this.customCanonicalBuilder
      ? await this.customCanonicalBuilder(target, this.secret)
      : this.canonicalPreset === 'standard'
        ? await buildStandardCanonicalString(target)
        : defaultBuildCanonicalString(target, this.secret);

    let signature: string;
    if (this.customSignFn) {
      signature = await this.customSignFn(canonicalString, target, this.secret);
    } else if (this.algorithm === 'hmac-sha256') {
      if (!this.secret) {
        throw new Error('RequestSigner secret is required for hmac-sha256 algorithm');
      }
      signature = await hmacSha256(canonicalString, this.secret, this.outputEncoding);
    } else {
      signature = await sha256Hex(canonicalString);
    }

    const headers: Record<string, string> = {
      [this.headerNames.timestamp]: String(target.timestamp),
      [this.headerNames.nonce]: target.nonce,
      [this.headerNames.signature]: signature,
    };

    if (this.appId) {
      headers[this.headerNames.appId] = this.appId;
    }

    return {
      signature,
      headers,
    };
  }

  /**
   * 对服务端出站响应执行防篡改验签。
   *
   * @param target 响应验签上下文
   * @returns 是否验签通过
   */
  async verifyResponse(target: ResponseSignTarget): Promise<boolean> {
    if (!this.responseVerifierOption) {
      return true;
    }
    if (typeof this.responseVerifierOption === 'function') {
      return Boolean(await this.responseVerifierOption(target, this.secret));
    }

    if (!target.timestamp || !target.nonce || !target.signature || !this.secret) {
      return false;
    }

    const bodySha256 = await sha256Hex(target.rawBody);
    const canonical = await buildResponseCanonicalString(
      target.timestamp,
      target.nonce,
      bodySha256,
    );

    const expectedBase64 = await hmacSha256(canonical, this.secret, 'base64');
    if (constantTimeEqual(expectedBase64, target.signature)) {
      return true;
    }
    const expectedHex = await hmacSha256(canonical, this.secret, 'hex');
    return constantTimeEqual(expectedHex, target.signature.toLowerCase());
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
