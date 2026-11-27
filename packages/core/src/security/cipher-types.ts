/**
 * HTTP 传输层混合加解密（RequestCipher）强类型契约与配置定义。
 *
 * 严格对齐服务端 ateng-boot-web ApiCryptoFilter / RsaAesGcmApiCipher / ApiEncryptedPayload 协议。
 *
 * @author Ateng
 * @since 2026-11-27
 */

import type { HttpRequestConfig } from '../http/types';

/**
 * 支持的传输层混合加密套件标识。
 */
export type CryptoAlgorithmName = 'RSA_AES_GCM' | 'SM2_SM4_GCM' | (string & {});

/**
 * 密文传输载荷形态。
 *
 * - 'json-envelope' (默认): 标准 JSON 信封 `{"cipherText":"<Base64>"}`
 * - 'raw-text': 纯文本 Base64 密文裸体传输（`Content-Type: text/plain;charset=UTF-8`）
 */
export type CipherPayloadMode = 'json-envelope' | 'raw-text';

/**
 * 密码学适配器加密入参。
 */
export interface CipherEncryptInput {
  /**
   * 待加密明文字节数组（UTF-8）。
   */
  plaintext: Uint8Array;

  /**
   * 非对称公钥（用于封装一次性会话密钥；内置 RSA 模式必填，自定义国密 Adapter 可按需读取）。
   */
  publicKey?: string;

  /**
   * 应用标识。
   */
  appId: string;

  /**
   * 密钥版本标识。
   */
  keyId: string;

  /**
   * 加密算法套件标识。
   */
  algorithm: CryptoAlgorithmName;

  /**
   * 可选 AEAD 附加认证数据（`appId|keyId|algorithm` UTF-8 字节）。
   */
  aad?: Uint8Array;
}

/**
 * 密码学适配器加密输出。
 */
export interface CipherEncryptOutput {
  /**
   * Base64 编码的非对称封装会话密钥（写入 X-Encrypt-Key）。
   */
  encryptedKey: string;

  /**
   * Base64 编码的 12 字节随机 GCM IV（写入 X-Encrypt-Iv）。
   */
  iv: string;

  /**
   * Base64 编码的 AEAD 密文及尾部认证 Tag（写入信封 cipherText 字段）。
   */
  cipherText: string;
}

/**
 * 密码学适配器解密入参。
 */
export interface CipherDecryptInput {
  /**
   * 响应头携带的非对称封装会话密钥。
   */
  encryptedKey: string;

  /**
   * 响应头携带的 12 字节随机 GCM IV。
   */
  iv: string;

  /**
   * 密文载荷文本。
   */
  cipherText: string;

  /**
   * 客户端解密私钥（内置 RSA 模式必填，自定义 Adapter 可按需读取）。
   */
  privateKey?: string;

  /**
   * 应用标识。
   */
  appId: string;

  /**
   * 响应头携带的密钥版本标识。
   */
  keyId: string;

  /**
   * 响应头携带的加密算法套件标识。
   */
  algorithm: CryptoAlgorithmName;

  /**
   * 可选 AEAD 附加认证数据。
   */
  aad?: Uint8Array;

  /**
   * 原始响应头字典（供自定义扩展读取额外元信息）。
   */
  headers?: Record<string, string | undefined>;
}

/**
 * 可插拔传输层加解密算法适配器契约（如内置 WebCrypto RSA-OAEP+AES-GCM 或外部国密 SM2/SM4）。
 */
export interface CipherAdapter {
  /**
   * 当前适配器声明支持的加密算法标识。
   */
  readonly algorithm: CryptoAlgorithmName;

  /**
   * 对明文字节流执行混合加密。
   */
  encrypt(input: CipherEncryptInput): Promise<CipherEncryptOutput>;

  /**
   * 对密文载荷执行认证解密并返回明文字节流。
   */
  decrypt(input: CipherDecryptInput): Promise<Uint8Array>;
}

/**
 * 多版本私钥解析器类型：支持静态字符串、版本映射表或异步按需获取函数。
 */
export type CipherKeyResolver =
  | string
  | Record<string, string>
  | ((
      keyId: string,
      algorithm: CryptoAlgorithmName,
    ) => string | undefined | Promise<string | undefined>);

/**
 * 请求体加密结果。
 */
export interface RequestEncryptResult {
  /**
   * 序列化后的最终发送请求体（JSON 信封字符串或纯文本密文）。
   */
  body: string;

  /**
   * 需要设置的 Content-Type 请求头值。
   */
  contentType: string;

  /**
   * 需要注入的加密元数据请求头映射表。
   */
  headers: Record<string, string>;
}

/**
 * RequestCipher 构造配置选项。
 */
export interface RequestCipherOptions {
  /**
   * 服务端非对称加密公钥（PEM 或 Base64 SPKI，用于加密入站请求会话密钥）。
   */
  serverPublicKey?: string;

  /**
   * 客户端非对称解密私钥（PEM 或 Base64 PKCS#8，支持多版本映射或异步回调，用于解密出站响应）。
   */
  clientPrivateKey?: CipherKeyResolver;

  /**
   * 应用标识（默认 'default'）。
   */
  appId?: string;

  /**
   * 当前使用的密钥版本标识（默认 'v1'）。
   */
  keyId?: string;

  /**
   * 加密套件标识（默认跟随 adapter.algorithm，未提供 adapter 时为 'RSA_AES_GCM'）。
   */
  algorithm?: CryptoAlgorithmName;

  /**
   * 是否开启 AEAD AAD 附加认证数据绑定（默认 false；开启后绑定 `appId|keyId|algorithm`）。
   */
  bindAad?: boolean;

  /**
   * 密文载荷传输格式（默认 'json-envelope'）。
   */
  payloadMode?: CipherPayloadMode;

  /**
   * JSON 信封中的密文字段名称（默认 'cipherText'，严格对齐服务端 ApiEncryptedPayload）。
   */
  cipherTextField?: string;

  /**
   * 自定义可插拔加解密适配器（如注入国密 SM2_SM4_GCM 实现）。
   */
  adapter?: CipherAdapter;

  /**
   * 应用标识请求头键名（默认 'X-App-Id'）。
   */
  appIdHeader?: string;

  /**
   * 封装会话密钥请求/响应头键名（默认 'X-Encrypt-Key'）。
   */
  encryptKeyHeader?: string;

  /**
   * 随机 IV 请求/响应头键名（默认 'X-Encrypt-Iv'）。
   */
  encryptIvHeader?: string;

  /**
   * 密钥版本标识请求/响应头键名（默认 'X-Key-Id'）。
   */
  keyIdHeader?: string;

  /**
   * 算法套件标识请求/响应头键名（默认 'X-Encrypt-Alg'）。
   */
  encryptAlgHeader?: string;

  /**
   * 严格响应解密开关（默认 false）。
   * - true: 任何非二进制响应若缺失加密响应头则立即拒绝并抛出异常；
   * - false: 仅当响应携带加密标识头时执行解密，无加密头时按明文透传（兼容明文错误帧）。
   */
  strictResponseDecrypt?: boolean;

  /**
   * 自定义请求体加密判定谓词。
   * 注意：FormData/Blob/ArrayBuffer/URLSearchParams 及二进制 responseType 始终自动跳过。
   */
  shouldEncrypt?: (config: HttpRequestConfig) => boolean;
}

/**
 * HTTP 传输层报文级混合加解密门面接口。
 */
export interface RequestCipher {
  /**
   * 当前配置的应用标识。
   */
  readonly appId: string;

  /**
   * 当前配置的密钥版本标识。
   */
  readonly keyId: string;

  /**
   * 当前配置的加密套件标识。
   */
  readonly algorithm: CryptoAlgorithmName;

  /**
   * 当前配置的 Header 键名映射表。
   */
  readonly headerNames: {
    readonly appId: string;
    readonly encryptKey: string;
    readonly encryptIv: string;
    readonly keyId: string;
    readonly encryptAlg: string;
  };

  /**
   * 是否开启严格响应解密校验。
   */
  readonly strictResponseDecrypt: boolean;

  /**
   * 判断指定请求是否应当对请求体执行加密。
   */
  shouldEncrypt(config: HttpRequestConfig): boolean;

  /**
   * 对请求载荷执行加密并产出请求体及待注入请求头。
   */
  encryptRequest(data: unknown): Promise<RequestEncryptResult>;

  /**
   * 检测响应是否为加密响应报文。
   */
  isEncryptedResponse(headers: unknown, data?: unknown): boolean;

  /**
   * 对加密响应报文执行认证解密并还原明文文本。
   */
  decryptResponse(data: unknown, headers: unknown): Promise<string>;
}
