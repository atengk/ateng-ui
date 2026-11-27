/**
 * HTTP 传输层报文级混合加解密门面实现。
 *
 * 严格对齐服务端 ateng-boot-web `ApiCryptoFilter` 与 `ApiEncryptedPayload`：
 * - 默认集成 `RsaAesGcmCipherAdapter`（`RSA-OAEP-SHA256 + AES-256-GCM`）；
 * - 支持 `{"cipherText":"<Base64>"}` 标准密文信封、5 大元数据 Header、AAD 绑定与多版本密钥轮换；
 * - 通过 `CipherAdapter` 接口支持外部国密 `SM2/SM4` 无侵入扩展。
 *
 * @author Ateng
 * @since 2026-11-27
 */

import { BusinessException } from '../contracts';
import type { HttpRequestConfig } from '../http/types';
import {
  bytesToUtf8,
  getHeaderIgnoreCase,
  isBinaryRequestData,
  isBinaryResponseType,
  normalizeHeadersRecord,
  utf8ToBytes,
} from './crypto-utils';
import { RsaAesGcmCipherAdapter, buildStandardAad } from './rsa-aes-cipher';
import type {
  CipherAdapter,
  CipherKeyResolver,
  CipherPayloadMode,
  CryptoAlgorithmName,
  RequestCipher,
  RequestCipherOptions,
  RequestEncryptResult,
} from './cipher-types';

export { buildStandardAad, RsaAesGcmCipherAdapter };

const CIPHER_ERROR_CODE = 403;
const SKIP_REQUEST_BODY_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE']);

/**
 * 解析客户端解密私钥（支持静态字符串、版本映射表或异步回调）。
 */
async function resolveClientPrivateKey(
  resolver: CipherKeyResolver | undefined,
  keyId: string,
  algorithm: CryptoAlgorithmName,
): Promise<string | undefined> {
  if (!resolver) {
    return undefined;
  }
  if (typeof resolver === 'string') {
    return resolver;
  }
  if (typeof resolver === 'function') {
    return resolver(keyId, algorithm);
  }
  return resolver[keyId] ?? resolver['default'];
}

/**
 * 传输层报文级混合加解密默认门面实现。
 */
export class DefaultRequestCipher implements RequestCipher {
  readonly appId: string;
  readonly keyId: string;
  readonly algorithm: CryptoAlgorithmName;
  readonly strictResponseDecrypt: boolean;
  readonly headerNames: {
    readonly appId: string;
    readonly encryptKey: string;
    readonly encryptIv: string;
    readonly keyId: string;
    readonly encryptAlg: string;
  };

  private readonly serverPublicKey?: string;
  private readonly clientPrivateKey?: CipherKeyResolver;
  private readonly bindAad: boolean;
  private readonly payloadMode: CipherPayloadMode;
  private readonly cipherTextField: string;
  private readonly adapter: CipherAdapter;
  private readonly hasCustomAdapter: boolean;
  private readonly userShouldEncrypt?: (config: HttpRequestConfig) => boolean;

  constructor(options: RequestCipherOptions = {}) {
    const {
      serverPublicKey,
      clientPrivateKey,
      appId = 'default',
      keyId = 'v1',
      adapter,
      algorithm = adapter?.algorithm ?? 'RSA_AES_GCM',
      bindAad = false,
      payloadMode = 'json-envelope',
      cipherTextField = 'cipherText',
      appIdHeader = 'X-App-Id',
      encryptKeyHeader = 'X-Encrypt-Key',
      encryptIvHeader = 'X-Encrypt-Iv',
      keyIdHeader = 'X-Key-Id',
      encryptAlgHeader = 'X-Encrypt-Alg',
      strictResponseDecrypt = false,
      shouldEncrypt,
    } = options;

    this.serverPublicKey = serverPublicKey;
    this.clientPrivateKey = clientPrivateKey;
    this.appId = appId.trim() || 'default';
    this.keyId = keyId.trim() || 'v1';
    this.hasCustomAdapter = Boolean(adapter);
    this.adapter = adapter ?? new RsaAesGcmCipherAdapter();
    this.algorithm = algorithm;
    this.bindAad = bindAad;
    this.payloadMode = payloadMode;
    this.cipherTextField = cipherTextField;
    this.strictResponseDecrypt = strictResponseDecrypt;
    this.userShouldEncrypt = shouldEncrypt;
    this.headerNames = {
      appId: appIdHeader,
      encryptKey: encryptKeyHeader,
      encryptIv: encryptIvHeader,
      keyId: keyIdHeader,
      encryptAlg: encryptAlgHeader,
    };
  }

  /**
   * 判断指定请求是否需要对请求体执行加密。
   */
  shouldEncrypt(config: HttpRequestConfig): boolean {
    if (isBinaryResponseType(config.responseType) || isBinaryRequestData(config.data)) {
      return false;
    }

    if (this.userShouldEncrypt) {
      return this.userShouldEncrypt(config);
    }

    const method = (config.method ?? 'GET').toUpperCase();
    if (SKIP_REQUEST_BODY_METHODS.has(method)) {
      return false;
    }

    if (method === 'DELETE' && (config.data === undefined || config.data === null)) {
      return false;
    }

    return true;
  }

  /**
   * 对请求载荷执行混合加密并生成密文信封与加密元数据请求头。
   */
  async encryptRequest(data: unknown): Promise<RequestEncryptResult> {
    const plainText =
      data === undefined || data === null
        ? ''
        : typeof data === 'string'
          ? data
          : JSON.stringify(data);

    const aad = this.bindAad ? buildStandardAad(this.appId, this.keyId, this.algorithm) : undefined;

    const output = await this.adapter.encrypt({
      plaintext: utf8ToBytes(plainText),
      publicKey: this.serverPublicKey,
      appId: this.appId,
      keyId: this.keyId,
      algorithm: this.algorithm,
      aad,
    });

    const body =
      this.payloadMode === 'raw-text'
        ? output.cipherText
        : JSON.stringify({ [this.cipherTextField]: output.cipherText });

    const contentType =
      this.payloadMode === 'raw-text'
        ? 'text/plain;charset=UTF-8'
        : 'application/json;charset=UTF-8';

    const headers: Record<string, string> = {
      [this.headerNames.appId]: this.appId,
      [this.headerNames.encryptKey]: output.encryptedKey,
      [this.headerNames.encryptIv]: output.iv,
      [this.headerNames.keyId]: this.keyId,
      [this.headerNames.encryptAlg]: this.algorithm,
    };

    return { body, contentType, headers };
  }

  /**
   * 判断响应是否携带加密标识头。
   */
  isEncryptedResponse(headers: unknown): boolean {
    const encKey = getHeaderIgnoreCase(headers, this.headerNames.encryptKey);
    const encIv = getHeaderIgnoreCase(headers, this.headerNames.encryptIv);
    if (this.hasCustomAdapter) {
      return Boolean(encIv?.trim() || encKey?.trim());
    }
    return Boolean(encKey?.trim() && encIv?.trim());
  }

  /**
   * 对加密响应报文执行解密，还原明文 UTF-8 字符串。
   */
  async decryptResponse(data: unknown, headers: unknown): Promise<string> {
    const encryptedKey = (getHeaderIgnoreCase(headers, this.headerNames.encryptKey) ?? '').trim();
    const iv = (getHeaderIgnoreCase(headers, this.headerNames.encryptIv) ?? '').trim();
    const responseKeyId =
      (getHeaderIgnoreCase(headers, this.headerNames.keyId) ?? '').trim() || this.keyId;
    const responseAlg =
      (getHeaderIgnoreCase(headers, this.headerNames.encryptAlg) ?? '').trim() || this.algorithm;

    const cipherText = this.extractCipherText(data);
    if (!cipherText) {
      throw new BusinessException(
        CIPHER_ERROR_CODE,
        `响应密文信封缺少有效的 ${this.cipherTextField} 字段`,
      );
    }

    const privateKey = await resolveClientPrivateKey(
      this.clientPrivateKey,
      responseKeyId,
      responseAlg,
    );

    const aad = this.bindAad ? buildStandardAad(this.appId, responseKeyId, responseAlg) : undefined;

    const plainBytes = await this.adapter.decrypt({
      encryptedKey,
      iv,
      cipherText,
      privateKey,
      appId: this.appId,
      keyId: responseKeyId,
      algorithm: responseAlg,
      aad,
      headers: normalizeHeadersRecord(headers),
    });

    try {
      return bytesToUtf8(plainBytes);
    } catch (error) {
      throw new BusinessException(
        CIPHER_ERROR_CODE,
        '解密后的响应字节流不是有效的 UTF-8 文本',
        undefined,
        error,
      );
    }
  }

  private extractCipherText(data: unknown): string {
    if (this.payloadMode === 'raw-text') {
      if (typeof data === 'string') {
        return data.trim();
      }
      if (data && typeof data === 'object') {
        const record = data as Record<string, unknown>;
        const fieldVal = record[this.cipherTextField];
        if (typeof fieldVal === 'string') {
          return fieldVal.trim();
        }
      }
      return '';
    }

    let envelopeObj: unknown = data;
    if (typeof data === 'string') {
      const trimmed = data.trim();
      if (!trimmed) {
        return '';
      }
      try {
        envelopeObj = JSON.parse(trimmed);
      } catch (error) {
        throw new BusinessException(
          CIPHER_ERROR_CODE,
          '加密响应体格式非法，期望标准 JSON 密文信封',
          undefined,
          error,
        );
      }
    }

    if (envelopeObj && typeof envelopeObj === 'object') {
      const val = (envelopeObj as Record<string, unknown>)[this.cipherTextField];
      if (typeof val === 'string') {
        return val.trim();
      }
    }
    return '';
  }
}

/**
 * 便捷工厂函数：创建并初始化传输层混合加解密拦截门面。
 *
 * @param options 加解密配置选项
 * @returns RequestCipher 实例
 */
export function createRequestCipher(options?: RequestCipherOptions): RequestCipher {
  return new DefaultRequestCipher(options);
}
