/**
 * API 请求防重放与防篡改签名强类型契约与配置定义。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import type { HttpRequestConfig } from '../http/types';

/**
 * 支持的请求签名算法类型。
 *
 * - 'legacy-sha256': 遗留的裸 SHA-256(canonical + "&secret=" + secret)
 * - 'hmac-sha256': 标准 WebCrypto HMAC-SHA256（与服务端 ateng-boot-web HmacSha256Signer 对齐）
 */
export type SignatureAlgorithm = 'legacy-sha256' | 'hmac-sha256';

/**
 * 规范化待签名字符串预设。
 *
 * - 'legacy': 保留既有键值对拼接规范，确保向后兼容
 * - 'standard': 严格对齐服务端 SignCanonicalUtil 的 6 行规范串
 *   `METHOD\nURI\nTimestamp\nNonce\nSortedQueryString\nBodySha256`
 */
export type CanonicalPreset = 'legacy' | 'standard';

/**
 * 签名摘要输出编码格式。
 */
export type SignatureEncoding = 'base64' | 'hex';

/**
 * 自定义异步签名函数，可用于接入 RSA / 国密 SM2 等外部算法。
 */
export type CustomSignFn = (
  canonicalString: string,
  target: SignTarget,
  secret?: string,
) => string | Promise<string>;

/**
 * 待计算签名的请求目标上下文。
 */
export interface SignTarget {
  /**
   * HTTP 请求方法（大写，如 'POST' | 'PUT' | 'DELETE' | 'GET' 等）。
   */
  method?: string;

  /**
   * 请求完整 URL 或相对路径。
   */
  url?: string;

  /**
   * 请求基础网关前缀（用于标准规范串拼接完整 URI 路径）。
   */
  baseURL?: string;

  /**
   * 请求查询参数。
   */
  params?: unknown;

  /**
   * 请求体数据载荷（Encrypt-then-Sign 模式下为加密后的密文信封）。
   */
  data?: unknown;

  /**
   * 可选的精确请求体原始字节流（优先级高于 data 自动序列化）。
   */
  bodyBytes?: Uint8Array;

  /**
   * 当前时间戳（单位受 timestampUnit 控制，默认为毫秒）。
   */
  timestamp: number;

  /**
   * 唯一排重随机数 Nonce。
   */
  nonce: string;
}

/**
 * 出站响应验签目标上下文。
 */
export interface ResponseSignTarget {
  /**
   * 响应头携带的时间戳。
   */
  timestamp: string;

  /**
   * 响应头携带的 Nonce 随机数。
   */
  nonce: string;

  /**
   * 响应头携带的签名字符串。
   */
  signature: string;

  /**
   * 未解析前的原始响应体文本（Encrypt-then-Sign 模式下为服务端加密信封 JSON 字符串）。
   */
  rawBody: string;

  /**
   * 响应头字典。
   */
  headers: Record<string, string | undefined>;

  /**
   * HTTP 状态码。
   */
  status?: number;
}

/**
 * 自定义响应验签函数。
 */
export type ResponseVerifier = (
  target: ResponseSignTarget,
  secret?: string,
) => boolean | Promise<boolean>;

/**
 * 签名计算生成的结果实体。
 */
export interface SignResult {
  /**
   * 计算生成的签名摘要字符串。
   */
  signature: string;

  /**
   * 自动生成的请求头字典（包含可选 X-App-Id、时间戳、Nonce 与签名摘要）。
   */
  headers: Record<string, string>;
}

/**
 * 签名器配置选项。
 */
export interface RequestSignerOptions {
  /**
   * 签名密钥（Secret / AppSecret）。
   */
  secret?: string;

  /**
   * 可选的应用标识（AppId）。配置后将自动注入 appIdHeader 请求头。
   */
  appId?: string;

  /**
   * 应用标识 Header 键名。默认为 'X-App-Id'。
   */
  appIdHeader?: string;

  /**
   * 时间戳 Header 键名。默认为 'X-Timestamp'。
   */
  timestampHeader?: string;

  /**
   * 唯一随机数 Header 键名。默认为 'X-Nonce'。
   */
  nonceHeader?: string;

  /**
   * 签名摘要 Header 键名。默认为 'X-Signature'。
   */
  signatureHeader?: string;

  /**
   * 签名算法。
   * - 未指定时：当 canonicalPreset === 'standard' 自动联动 'hmac-sha256'，否则为 'legacy-sha256'。
   */
  algorithm?: SignatureAlgorithm;

  /**
   * 待签串预设格式。默认为 'legacy' 保持 100% 向后兼容；推荐新对接使用 'standard'。
   */
  canonicalPreset?: CanonicalPreset;

  /**
   * 签名摘要输出编码。
   * - 'hmac-sha256' 默认为 'base64'（严格对齐后端 ateng-boot-web HmacSha256Signer.sign）
   * - 'legacy-sha256' 默认为 'hex'
   */
  outputEncoding?: SignatureEncoding;

  /**
   * 可插拔异步签名实现函数（如接入 RSA / 国密 SM2 签名器）。
   */
  signer?: CustomSignFn;

  /**
   * 响应验签配置。
   * - true: 启用标准 3 行出站响应待签串（Timestamp\nNonce\nResponseBodySha256）HMAC-SHA256 验签
   * - 函数: 自定义异步响应验签回调
   * - false / undefined (默认): 不执行响应验签
   */
  verifyResponse?: boolean | ResponseVerifier;

  /**
   * 严格响应验签开关（默认为 false）。
   * - true: 只要启用了 verifyResponse，响应缺失签名头即视为验签失败并拒绝放行
   * - false: 仅在响应头携带签名头时执行验签（兼容后端明文错误降级帧）
   */
  strictResponseVerify?: boolean;

  /**
   * 时间戳单位。
   * - 'ms' (默认)：毫秒级时间戳 (Date.now())
   * - 's'：秒级时间戳 (Math.floor(Date.now() / 1000))
   */
  timestampUnit?: 'ms' | 's';

  /**
   * 自定义 Nonce 随机数生成器。
   */
  nonceGenerator?: () => string;

  /**
   * 自定义待签名字符串构建策略（Canonical String Builder）。
   *
   * @param target 签名上下文目标
   * @param secret 可选的密钥
   * @returns 规范化的待签名字符串
   */
  buildCanonicalString?: (target: SignTarget, secret?: string) => string | Promise<string>;

  /**
   * 自定义判定指定请求是否需要执行签名的谓词函数。
   * 若未提供，默认对所有写操作（POST, PUT, DELETE, PATCH）返回 true。
   */
  shouldSign?: (config: HttpRequestConfig) => boolean;
}

/**
 * API 请求防重放与防篡改签名器契约接口。
 */
export interface RequestSigner {
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
   * 是否开启严格响应验签（缺失签名头直接拒收）。
   */
  readonly strictResponseVerify: boolean;

  /**
   * 生成当前时间戳。
   */
  generateTimestamp(): number;

  /**
   * 生成唯一随机数 Nonce。
   */
  generateNonce(): string;

  /**
   * 对指定的 HTTP 请求目标计算签名并生成注入请求头。
   *
   * @param target 签名上下文目标
   * @returns 签名结果
   */
  sign(target: SignTarget): Promise<SignResult>;

  /**
   * 对服务端响应执行防篡改验签。
   *
   * @param target 响应验签上下文
   * @returns 是否验签通过
   */
  verifyResponse?(target: ResponseSignTarget): Promise<boolean>;

  /**
   * 判断指定请求是否应当执行签名注入。
   *
   * @param config 请求配置信息
   * @returns 是否需要签名
   */
  shouldSign(config: HttpRequestConfig): boolean;
}
