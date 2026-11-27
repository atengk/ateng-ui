/**
 * 基于原生 WebCrypto 的 RSA-OAEP-SHA256 + AES-256-GCM 混合加解密适配器。
 *
 * 严格对齐服务端 ateng-boot-web `RsaAesGcmApiCipher` 与 `ApiCryptoContext`，
 * 零外部重型密码学依赖，支持可选 AEAD AAD 附加认证数据绑定与内存密钥即时擦除。
 *
 * @author Ateng
 * @since 2026-11-27
 */

import { BusinessException } from '../contracts';
import {
  base64ToBytes,
  bytesToBase64,
  getSubtleCrypto,
  getWebCrypto,
  importRsaOaepPrivateKey,
  importRsaOaepPublicKey,
  utf8ToBytes,
} from './crypto-utils';
import type {
  CipherAdapter,
  CipherDecryptInput,
  CipherEncryptInput,
  CipherEncryptOutput,
  CryptoAlgorithmName,
} from './cipher-types';

const AES_KEY_BYTES = 32;
const GCM_IV_BYTES = 12;
const GCM_TAG_BITS = 128;
const GCM_TAG_BYTES = 16;
const CIPHER_ERROR_CODE = 403;

/**
 * 按服务端 ApiCryptoContext.buildStandardAad 规范拼装 AEAD 附加认证数据（`appId|keyId|algorithm`）。
 *
 * @param appId 应用标识
 * @param keyId 密钥版本标识
 * @param algorithm 算法套件标识
 * @returns UTF-8 编码的 AAD 字节数组
 */
export function buildStandardAad(
  appId: string,
  keyId: string,
  algorithm: CryptoAlgorithmName,
): Uint8Array {
  return utf8ToBytes(`${appId}|${keyId}|${algorithm}`);
}

/**
 * 基于原生 WebCrypto 的 RSA-OAEP-SHA256 + AES-256-GCM 混合加解密适配器。
 */
export class RsaAesGcmCipherAdapter implements CipherAdapter {
  readonly algorithm: CryptoAlgorithmName = 'RSA_AES_GCM';

  /**
   * 使用随机 256-bit AES-GCM 密钥加密明文，并用服务端 RSA-OAEP-SHA256 公钥封装会话密钥。
   */
  async encrypt(input: CipherEncryptInput): Promise<CipherEncryptOutput> {
    if (!input.publicKey?.trim()) {
      throw new BusinessException(CIPHER_ERROR_CODE, '未配置请求体 RSA 加密公钥 (serverPublicKey)');
    }

    const webCrypto = getWebCrypto();
    const subtle = getSubtleCrypto();
    const rawAesKey = new Uint8Array(AES_KEY_BYTES);
    const iv = new Uint8Array(GCM_IV_BYTES);
    webCrypto.getRandomValues(rawAesKey);
    webCrypto.getRandomValues(iv);

    try {
      const publicKey = await importRsaOaepPublicKey(input.publicKey);
      const aesKey = await subtle.importKey('raw', rawAesKey.buffer, { name: 'AES-GCM' }, false, [
        'encrypt',
      ]);

      const plaintextCopy = new Uint8Array(input.plaintext);
      const aesParams: AesGcmParams = input.aad
        ? {
            name: 'AES-GCM',
            iv: new Uint8Array(iv),
            tagLength: GCM_TAG_BITS,
            additionalData: new Uint8Array(input.aad),
          }
        : {
            name: 'AES-GCM',
            iv: new Uint8Array(iv),
            tagLength: GCM_TAG_BITS,
          };

      const cipherBuffer = await subtle.encrypt(aesParams, aesKey, plaintextCopy.buffer);
      const wrappedKeyBuffer = await subtle.encrypt(
        { name: 'RSA-OAEP' },
        publicKey,
        new Uint8Array(rawAesKey).buffer,
      );

      return {
        encryptedKey: bytesToBase64(new Uint8Array(wrappedKeyBuffer)),
        iv: bytesToBase64(iv),
        cipherText: bytesToBase64(new Uint8Array(cipherBuffer)),
      };
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      throw new BusinessException(
        CIPHER_ERROR_CODE,
        `RSA+AES-GCM 报文加密失败: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        error,
      );
    } finally {
      rawAesKey.fill(0);
    }
  }

  /**
   * 使用客户端 RSA-OAEP-SHA256 私钥解封会话密钥并认证解密 AES-256-GCM 密文。
   */
  async decrypt(input: CipherDecryptInput): Promise<Uint8Array> {
    if (!input.privateKey?.trim()) {
      throw new BusinessException(
        CIPHER_ERROR_CODE,
        `未配置密钥版本 [${input.keyId}] 对应的客户端 RSA 解密私钥 (clientPrivateKey)`,
      );
    }
    if (!input.encryptedKey.trim() || !input.iv.trim() || !input.cipherText.trim()) {
      throw new BusinessException(CIPHER_ERROR_CODE, '缺少加密响应必要元数据或密文载荷');
    }

    let wrappedKeyBytes: Uint8Array;
    let ivBytes: Uint8Array;
    let cipherBytes: Uint8Array;
    try {
      wrappedKeyBytes = base64ToBytes(input.encryptedKey);
      ivBytes = base64ToBytes(input.iv);
      cipherBytes = base64ToBytes(input.cipherText);
    } catch (error) {
      throw new BusinessException(
        CIPHER_ERROR_CODE,
        '响应加密元数据或密文 Base64 格式非法',
        undefined,
        error,
      );
    }

    if (ivBytes.length !== GCM_IV_BYTES) {
      throw new BusinessException(CIPHER_ERROR_CODE, '非法的 AES-GCM IV 长度，期望 12 字节');
    }
    if (cipherBytes.length < GCM_TAG_BYTES) {
      throw new BusinessException(
        CIPHER_ERROR_CODE,
        '响应密文载荷长度非法，缺少完整的 GCM 认证标签',
      );
    }

    const subtle = getSubtleCrypto();
    let rawSessionKey: Uint8Array | undefined;

    try {
      const privateKey = await importRsaOaepPrivateKey(input.privateKey);
      const unwrappedBuffer = await subtle.decrypt(
        { name: 'RSA-OAEP' },
        privateKey,
        new Uint8Array(wrappedKeyBytes).buffer,
      );
      rawSessionKey = new Uint8Array(unwrappedBuffer);

      if (
        rawSessionKey.length !== 16 &&
        rawSessionKey.length !== 24 &&
        rawSessionKey.length !== 32
      ) {
        throw new BusinessException(CIPHER_ERROR_CODE, '解封得到的 AES 会话密钥长度非法');
      }

      const aesKey = await subtle.importKey(
        'raw',
        new Uint8Array(rawSessionKey).buffer,
        { name: 'AES-GCM' },
        false,
        ['decrypt'],
      );

      const aesParams: AesGcmParams = input.aad
        ? {
            name: 'AES-GCM',
            iv: new Uint8Array(ivBytes),
            tagLength: GCM_TAG_BITS,
            additionalData: new Uint8Array(input.aad),
          }
        : {
            name: 'AES-GCM',
            iv: new Uint8Array(ivBytes),
            tagLength: GCM_TAG_BITS,
          };

      const plainBuffer = await subtle.decrypt(
        aesParams,
        aesKey,
        new Uint8Array(cipherBytes).buffer,
      );
      return new Uint8Array(plainBuffer);
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      throw new BusinessException(
        CIPHER_ERROR_CODE,
        '响应密文解密或 GCM 认证校验失败',
        undefined,
        error,
      );
    } finally {
      if (rawSessionKey) {
        rawSessionKey.fill(0);
      }
    }
  }
}
