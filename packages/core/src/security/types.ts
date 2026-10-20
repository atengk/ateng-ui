/**
 * API 请求防重放与防篡改签名强类型契约与配置定义。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import type { HttpRequestConfig } from '../http/types';

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
   * 请求查询参数。
   */
  params?: unknown;

  /**
   * 请求体数据载荷。
   */
  data?: unknown;

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
 * 签名计算生成的结果实体。
 */
export interface SignResult {
  /**
   * 计算生成的十六进制签名摘要字符串。
   */
  signature: string;

  /**
   * 自动生成的请求头字典（包含时间戳、Nonce 与签名摘要）。
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
  buildCanonicalString?: (target: SignTarget, secret?: string) => string;

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
    readonly timestamp: string;
    readonly nonce: string;
    readonly signature: string;
  };

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
   * 判断指定请求是否应当执行签名注入。
   *
   * @param config 请求配置信息
   * @returns 是否需要签名
   */
  shouldSign(config: HttpRequestConfig): boolean;
}
