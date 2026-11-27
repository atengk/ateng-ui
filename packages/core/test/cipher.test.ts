/**
 * 传输层混合加解密 RequestCipher 与 Encrypt-then-Sign 管道单元测试。
 *
 * 严格零硬编码私钥：所有 RSA 密钥对均在测试运行时由 WebCrypto 动态生成。
 *
 * @author Ateng
 * @since 2026-11-27
 */

import { createHmac } from 'node:crypto';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  BusinessException,
  RsaAesGcmCipherAdapter,
  buildResponseCanonicalString,
  buildStandardAad,
  buildStandardCanonicalString,
  createHttpClient,
  createRequestCipher,
  createRequestSigner,
  isAbortError,
  sha256Hex,
  type CipherAdapter,
} from '../src';
import { bytesToBase64, utf8ToBytes } from '../src/security/crypto-utils';

interface RsaPemPair {
  publicKeyPem: string;
  privateKeyPem: string;
}

async function generateRsaPemPair(): Promise<RsaPemPair> {
  const pair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt'],
  );

  const spki = new Uint8Array(await crypto.subtle.exportKey('spki', pair.publicKey));
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));

  return {
    publicKeyPem: `-----BEGIN PUBLIC KEY-----\n${bytesToBase64(spki)}\n-----END PUBLIC KEY-----`,
    privateKeyPem: `-----BEGIN PRIVATE KEY-----\n${bytesToBase64(pkcs8)}\n-----END PRIVATE KEY-----`,
  };
}

let serverKeys: RsaPemPair;
let clientV1: RsaPemPair;
let clientV2: RsaPemPair;

beforeAll(async () => {
  [serverKeys, clientV1, clientV2] = await Promise.all([
    generateRsaPemPair(),
    generateRsaPemPair(),
    generateRsaPemPair(),
  ]);
}, 30000);

describe('RequestCipher (HTTP 传输层报文级混合加解密)', () => {
  it('RsaAesGcmCipherAdapter 应支持 AES-256-GCM + RSA-OAEP-SHA256 加解密、AAD 绑定与密文篡改拦截', async () => {
    const adapter = new RsaAesGcmCipherAdapter();

    const plaintext = utf8ToBytes(JSON.stringify({ orderId: '9007199254740995123', amount: 8800 }));
    const aad = buildStandardAad('app-1', 'v1', 'RSA_AES_GCM');

    const encrypted = await adapter.encrypt({
      plaintext,
      publicKey: serverKeys.publicKeyPem,
      appId: 'app-1',
      keyId: 'v1',
      algorithm: 'RSA_AES_GCM',
      aad,
    });

    expect(encrypted.encryptedKey.length).toBeGreaterThan(0);
    expect(encrypted.iv.length).toBeGreaterThan(0);
    expect(encrypted.cipherText.length).toBeGreaterThan(0);

    const decrypted = await adapter.decrypt({
      encryptedKey: encrypted.encryptedKey,
      iv: encrypted.iv,
      cipherText: encrypted.cipherText,
      privateKey: serverKeys.privateKeyPem,
      appId: 'app-1',
      keyId: 'v1',
      algorithm: 'RSA_AES_GCM',
      aad,
    });

    expect(JSON.parse(new TextDecoder().decode(decrypted))).toEqual({
      orderId: '9007199254740995123',
      amount: 8800,
    });

    // AAD 不一致时 GCM 认证失败并抛出非 401 BusinessException
    await expect(
      adapter.decrypt({
        encryptedKey: encrypted.encryptedKey,
        iv: encrypted.iv,
        cipherText: encrypted.cipherText,
        privateKey: serverKeys.privateKeyPem,
        appId: 'app-1',
        keyId: 'v2',
        algorithm: 'RSA_AES_GCM',
        aad: buildStandardAad('app-1', 'v2', 'RSA_AES_GCM'),
      }),
    ).rejects.toSatisfy(err => err instanceof BusinessException && err.code === 403);

    // 篡改密文最后字符应触发 GCM Tag 校验失败且抛非 401 BusinessException
    const tampered =
      encrypted.cipherText.slice(0, -2) + (encrypted.cipherText.endsWith('AA') ? 'BB' : 'AA');
    await expect(
      adapter.decrypt({
        encryptedKey: encrypted.encryptedKey,
        iv: encrypted.iv,
        cipherText: tampered,
        privateKey: serverKeys.privateKeyPem,
        appId: 'app-1',
        keyId: 'v1',
        algorithm: 'RSA_AES_GCM',
        aad,
      }),
    ).rejects.toSatisfy(err => err instanceof BusinessException && err.code === 403);
  });

  it('DefaultRequestCipher 应支持标准 JSON 信封、5 大加密头、多版本密钥轮换与 raw-text 模式', async () => {
    const adapter = new RsaAesGcmCipherAdapter();

    const cipher = createRequestCipher({
      appId: 'app-crypto',
      keyId: 'v2',
      bindAad: true,
      serverPublicKey: serverKeys.publicKeyPem,
      clientPrivateKey: {
        v1: clientV1.privateKeyPem,
        v2: clientV2.privateKeyPem,
      },
    });

    const reqEncrypted = await cipher.encryptRequest({ name: '阿腾', id: '9007199254740995123' });
    const envelope = JSON.parse(reqEncrypted.body) as { cipherText: string };
    expect(typeof envelope.cipherText).toBe('string');
    expect(reqEncrypted.headers['X-App-Id']).toBe('app-crypto');
    expect(reqEncrypted.headers['X-Key-Id']).toBe('v2');
    expect(reqEncrypted.headers['X-Encrypt-Alg']).toBe('RSA_AES_GCM');
    expect(reqEncrypted.headers['X-Encrypt-Key']).toBeDefined();
    expect(reqEncrypted.headers['X-Encrypt-Iv']).toBeDefined();

    // 服务端模拟用 v1 客户端公钥加密响应，验证客户端按 X-Key-Id=v1 自动路由轮换密钥解密
    const respPlain = '{"code":200,"data":{"id":9007199254740995888},"msg":"ok"}';
    const respEncrypted = await adapter.encrypt({
      plaintext: utf8ToBytes(respPlain),
      publicKey: clientV1.publicKeyPem,
      appId: 'app-crypto',
      keyId: 'v1',
      algorithm: 'RSA_AES_GCM',
      aad: buildStandardAad('app-crypto', 'v1', 'RSA_AES_GCM'),
    });

    const respText = await cipher.decryptResponse(
      JSON.stringify({ cipherText: respEncrypted.cipherText }),
      {
        'x-encrypt-key': respEncrypted.encryptedKey,
        'x-encrypt-iv': respEncrypted.iv,
        'x-key-id': 'v1',
        'x-encrypt-alg': 'RSA_AES_GCM',
      },
    );
    expect(respText).toBe(respPlain);

    // 验证 raw-text 模式
    const rawCipher = createRequestCipher({
      payloadMode: 'raw-text',
      serverPublicKey: serverKeys.publicKeyPem,
      clientPrivateKey: clientV2.privateKeyPem,
    });
    const rawReq = await rawCipher.encryptRequest({ hello: 'world' });
    expect(rawReq.contentType).toBe('text/plain;charset=UTF-8');
    expect(rawReq.body.startsWith('{')).toBe(false);
  });

  it('应支持通过 CipherAdapter 注入国密 SM2_SM4_GCM 等自定义加解密算法', async () => {
    const customAdapter: CipherAdapter = {
      algorithm: 'SM2_SM4_GCM',
      async encrypt(input) {
        const text = new TextDecoder().decode(input.plaintext);
        return {
          encryptedKey: 'SM2-KEY-' + input.keyId,
          iv: 'U000SU00U000',
          cipherText: bytesToBase64(utf8ToBytes(`SM4:${text}`)),
        };
      },
      async decrypt(input) {
        const decoded = new TextDecoder().decode(
          Uint8Array.from(atob(input.cipherText), c => c.charCodeAt(0)),
        );
        if (!decoded.startsWith('SM4:')) {
          throw new BusinessException(403, 'SM4 解密失败');
        }
        return utf8ToBytes(decoded.slice(4));
      },
    };

    const cipher = createRequestCipher({
      adapter: customAdapter,
      appId: 'sm-app',
    });

    const enc = await cipher.encryptRequest({ sm: true });
    expect(enc.headers['X-Encrypt-Alg']).toBe('SM2_SM4_GCM');
    expect(enc.headers['X-Encrypt-Key']).toBe('SM2-KEY-v1');

    const dec = await cipher.decryptResponse(enc.body, {
      'X-Encrypt-Key': enc.headers['X-Encrypt-Key'],
      'X-Encrypt-Iv': enc.headers['X-Encrypt-Iv'],
      'X-Encrypt-Alg': 'SM2_SM4_GCM',
    });
    expect(JSON.parse(dec)).toEqual({ sm: true });
  });
});

function runTransformResponse(config: InternalAxiosRequestConfig, rawData: unknown): unknown {
  let result = rawData;
  if (Array.isArray(config.transformResponse)) {
    for (const fn of config.transformResponse) {
      result = fn.call(config, result, config.headers);
    }
  }
  return result;
}

describe('HttpClient Encrypt-then-Sign 全链路拦截器集成', () => {
  it('应严格按 Encrypt-then-Sign 顺序加解密与加签，并支持 3 行响应验签与雪花大数防截断', async () => {
    const clientKeys = clientV1;
    const adapter = new RsaAesGcmCipherAdapter();
    const signSecret = 'e2e-hmac-secret-2026';

    const onUnauthorized = vi.fn();
    const client = createHttpClient({
      baseURL: 'https://api.ateng.local/gw',
      cipher: createRequestCipher({
        appId: 'app-e2e',
        keyId: 'v1',
        bindAad: true,
        serverPublicKey: serverKeys.publicKeyPem,
        clientPrivateKey: clientKeys.privateKeyPem,
      }),
      signer: createRequestSigner({
        appId: 'app-e2e',
        secret: signSecret,
        canonicalPreset: 'standard',
        verifyResponse: true,
      }),
      onUnauthorized,
    });

    let serverVerifiedCipherSignature = false;
    let serverDecryptedPlaintext: Record<string, unknown> | undefined;

    client.instance.defaults.adapter = async (
      config: InternalAxiosRequestConfig,
    ): Promise<AxiosResponse> => {
      // 1. 校验请求体已被加密为 {"cipherText": "..."} 且签名覆盖的是密文信封本身
      expect(typeof config.data).toBe('string');
      const reqEnvelope = JSON.parse(config.data as string) as { cipherText: string };
      expect(typeof reqEnvelope.cipherText).toBe('string');

      const ts = String(config.headers['X-Timestamp']);
      const nonce = String(config.headers['X-Nonce']);
      const sig = String(config.headers['X-Signature']);
      const canonical = await buildStandardCanonicalString({
        method: config.method,
        baseURL: config.baseURL,
        url: config.url,
        params: config.params,
        data: config.data,
        timestamp: Number(ts),
        nonce,
      });
      const expectedSig = createHmac('sha256', signSecret)
        .update(canonical, 'utf8')
        .digest('base64');
      expect(sig).toBe(expectedSig);
      serverVerifiedCipherSignature = true;

      // 2. 服务端用私钥解密请求密文
      const plainBytes = await adapter.decrypt({
        encryptedKey: String(config.headers['X-Encrypt-Key']),
        iv: String(config.headers['X-Encrypt-Iv']),
        cipherText: reqEnvelope.cipherText,
        privateKey: serverKeys.privateKeyPem,
        appId: String(config.headers['X-App-Id']),
        keyId: String(config.headers['X-Key-Id']),
        algorithm: 'RSA_AES_GCM',
        aad: buildStandardAad('app-e2e', 'v1', 'RSA_AES_GCM'),
      });
      serverDecryptedPlaintext = JSON.parse(new TextDecoder().decode(plainBytes)) as Record<
        string,
        unknown
      >;

      // 3. 构造含 19 位未加引号雪花 ID 的响应，加密并执行出站延迟加签 (Encrypt-then-Sign)
      const respPlainRaw =
        '{"code":200,"data":{"orderId":9007199254740995888,"status":"PAID"},"msg":"ok","traceId":"tr-e2e-1"}';
      const respEnc = await adapter.encrypt({
        plaintext: utf8ToBytes(respPlainRaw),
        publicKey: clientKeys.publicKeyPem,
        appId: 'app-e2e',
        keyId: 'v1',
        algorithm: 'RSA_AES_GCM',
        aad: buildStandardAad('app-e2e', 'v1', 'RSA_AES_GCM'),
      });
      const respEnvelopeRaw = JSON.stringify({ cipherText: respEnc.cipherText });
      const respHash = await sha256Hex(respEnvelopeRaw);
      const respCanonical = await buildResponseCanonicalString(ts, nonce, respHash);
      const respSig = createHmac('sha256', signSecret)
        .update(respCanonical, 'utf8')
        .digest('base64');

      const transformed = runTransformResponse(config, respEnvelopeRaw);
      return {
        data: transformed,
        status: 200,
        statusText: 'OK',
        headers: {
          'x-timestamp': ts,
          'x-nonce': nonce,
          'x-signature': respSig,
          'x-encrypt-key': respEnc.encryptedKey,
          'x-encrypt-iv': respEnc.iv,
          'x-key-id': 'v1',
          'x-encrypt-alg': 'RSA_AES_GCM',
        },
        config,
      };
    };

    const result = await client.post<{ orderId: string; status: string }>(
      '/orders/pay?channel=web',
      { orderNo: 'ORD-2026', amount: 188 },
    );

    expect(serverVerifiedCipherSignature).toBe(true);
    expect(serverDecryptedPlaintext).toEqual({ orderNo: 'ORD-2026', amount: 188 });
    expect(result).toEqual({
      orderId: '9007199254740995888',
      status: 'PAID',
    });
    expect(typeof result.orderId).toBe('string');
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('响应验签基于未解析原始文本保真校验；验签或解密失败抛非 401 BusinessException', async () => {
    const clientKeys = clientV1;
    const signSecret = 'resp-raw-secret';
    const onUnauthorized = vi.fn();

    const client = createHttpClient({
      cipher: createRequestCipher({
        serverPublicKey: serverKeys.publicKeyPem,
        clientPrivateKey: clientKeys.privateKeyPem,
      }),
      signer: createRequestSigner({
        secret: signSecret,
        canonicalPreset: 'standard',
        verifyResponse: true,
        strictResponseVerify: true,
      }),
      onUnauthorized,
    });

    // 1. 明文响应含排版空格与大数字：原始文本验签应通过且雪花 ID 保真
    const prettyRawJson =
      '{\n  "code": 200,\n  "data": { "id": 9007199254740995777 },\n  "msg": "ok"\n}';
    const bodyHash = await sha256Hex(prettyRawJson);
    const respCan = await buildResponseCanonicalString('1729000001', 'n-pretty', bodyHash);
    const validSig = createHmac('sha256', signSecret).update(respCan, 'utf8').digest('base64');

    client.instance.defaults.adapter = async config => ({
      data: runTransformResponse(config, prettyRawJson),
      status: 200,
      statusText: 'OK',
      headers: {
        'X-Timestamp': '1729000001',
        'X-Nonce': 'n-pretty',
        'X-Signature': validSig,
      },
      config,
    });

    const data = await client.get<{ id: string }>('/api/pretty');
    expect(data.id).toBe('9007199254740995777');

    // 2. 篡改响应签名时应抛 403 且绝不触发 onUnauthorized
    client.instance.defaults.adapter = async config => ({
      data: runTransformResponse(config, prettyRawJson),
      status: 200,
      statusText: 'OK',
      headers: {
        'X-Timestamp': '1729000001',
        'X-Nonce': 'n-pretty',
        'X-Signature': 'INVALID_SIG',
      },
      config,
    });

    await expect(client.get('/api/pretty')).rejects.toSatisfy(
      err => err instanceof BusinessException && err.code === 403,
    );
    expect(onUnauthorized).not.toHaveBeenCalled();

    // 3. 加密响应篡改密文时应抛 403 且绝不触发 onUnauthorized
    const adapter = new RsaAesGcmCipherAdapter();
    const enc = await adapter.encrypt({
      plaintext: utf8ToBytes('{"code":200,"data":"secret"}'),
      publicKey: clientKeys.publicKeyPem,
      appId: 'default',
      keyId: 'v1',
      algorithm: 'RSA_AES_GCM',
    });
    const badEnvelope = JSON.stringify({ cipherText: 'AAAA' + enc.cipherText.slice(4) });
    const badHash = await sha256Hex(badEnvelope);
    const badCan = await buildResponseCanonicalString('1729000002', 'n-bad', badHash);
    const badEnvSig = createHmac('sha256', signSecret).update(badCan, 'utf8').digest('base64');

    client.instance.defaults.adapter = async config => ({
      data: runTransformResponse(config, badEnvelope),
      status: 200,
      statusText: 'OK',
      headers: {
        'X-Timestamp': '1729000002',
        'X-Nonce': 'n-bad',
        'X-Signature': badEnvSig,
        'X-Encrypt-Key': enc.encryptedKey,
        'X-Encrypt-Iv': enc.iv,
      },
      config,
    });

    await expect(client.get('/api/bad-cipher')).rejects.toSatisfy(
      err => err instanceof BusinessException && err.code === 403,
    );
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('GET 请求跳过请求加密但支持解密响应，并支持加密 400 错误帧还原与二进制请求跳过', async () => {
    const clientKeys = clientV1;
    const adapter = new RsaAesGcmCipherAdapter();

    const client = createHttpClient({
      cipher: createRequestCipher({
        serverPublicKey: serverKeys.publicKeyPem,
        clientPrivateKey: clientKeys.privateKeyPem,
      }),
    });

    // 1. GET 不发送请求加密头，但能解密响应
    client.instance.defaults.adapter = async config => {
      expect(config.headers['X-Encrypt-Key']).toBeUndefined();
      const respEnc = await adapter.encrypt({
        plaintext: utf8ToBytes('{"code":200,"data":"GET_SECRET","msg":"ok"}'),
        publicKey: clientKeys.publicKeyPem,
        appId: 'default',
        keyId: 'v1',
        algorithm: 'RSA_AES_GCM',
      });
      return {
        data: runTransformResponse(config, JSON.stringify({ cipherText: respEnc.cipherText })),
        status: 200,
        statusText: 'OK',
        headers: {
          'X-Encrypt-Key': respEnc.encryptedKey,
          'X-Encrypt-Iv': respEnc.iv,
        },
        config,
      };
    };
    expect(await client.get<string>('/api/secret-get')).toBe('GET_SECRET');

    // 2. 加密 400 错误帧还原真实业务异常 code/msg/traceId
    client.instance.defaults.adapter = async config => {
      const errEnc = await adapter.encrypt({
        plaintext: utf8ToBytes('{"code":42201,"msg":"订单金额校验失败","traceId":"tr-err-422"}'),
        publicKey: clientKeys.publicKeyPem,
        appId: 'default',
        keyId: 'v1',
        algorithm: 'RSA_AES_GCM',
      });
      const errObj = Object.assign(new Error('Request failed with status code 400'), {
        isAxiosError: true,
        config,
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: runTransformResponse(config, JSON.stringify({ cipherText: errEnc.cipherText })),
          headers: {
            'X-Encrypt-Key': errEnc.encryptedKey,
            'X-Encrypt-Iv': errEnc.iv,
          },
          config,
        },
      });
      throw errObj;
    };

    await expect(client.post('/api/orders/check', { amount: -1 })).rejects.toSatisfy(
      err =>
        err instanceof BusinessException &&
        err.code === 42201 &&
        err.msg === '订单金额校验失败' &&
        err.traceId === 'tr-err-422',
    );

    // 3. FormData / Blob / ArrayBuffer / URLSearchParams / responseType: blob|arraybuffer|stream 自动跳过加解密
    const binaryPayloads: unknown[] = [
      new FormData(),
      new Blob(['hello'], { type: 'text/plain' }),
      new Uint8Array([1, 2, 3]).buffer,
      new URLSearchParams({ k: 'v' }),
    ];

    for (const payload of binaryPayloads) {
      client.instance.defaults.adapter = async config => {
        expect(config.headers['X-Encrypt-Key']).toBeUndefined();
        if (payload instanceof URLSearchParams) {
          expect(config.data).toBe(payload.toString());
        } else {
          expect(config.data).toBe(payload);
        }
        return {
          data: { code: 200, data: 'ok', msg: 'ok' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      };
      expect(await client.post('/api/upload', payload)).toBe('ok');
    }

    for (const responseType of ['blob', 'arraybuffer', 'stream'] as const) {
      client.instance.defaults.adapter = async config => {
        expect(config.headers['X-Encrypt-Key']).toBeUndefined();
        return {
          data: responseType === 'blob' ? new Blob(['bin']) : new ArrayBuffer(4),
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/octet-stream' },
          config,
        };
      };
      await client.post('/api/bin', { a: 1 }, { responseType, unwrap: false });
    }
  });

  it('Retry 重试应从明文重新加密刷新 Nonce/IV，cancelDuplicate 应基于明文指纹正常中断旧请求', async () => {
    const clientKeys = clientV1;
    const adapter = new RsaAesGcmCipherAdapter();

    const client = createHttpClient({
      cipher: createRequestCipher({
        serverPublicKey: serverKeys.publicKeyPem,
        clientPrivateKey: clientKeys.privateKeyPem,
      }),
      signer: createRequestSigner({
        secret: 'retry-secret',
        canonicalPreset: 'standard',
        shouldSign: () => true,
      }),
    });

    // 1. Retry 场景（GET 或显式 shouldRetry 允许的写操作均不双重加密）
    const seenNonces: string[] = [];
    const seenIvs: string[] = [];
    const seenPlaintexts: string[] = [];

    client.instance.defaults.adapter = async config => {
      seenNonces.push(String(config.headers['X-Nonce']));
      seenIvs.push(String(config.headers['X-Encrypt-Iv']));
      const env = JSON.parse(config.data as string) as { cipherText: string };
      const plainBytes = await adapter.decrypt({
        encryptedKey: String(config.headers['X-Encrypt-Key']),
        iv: String(config.headers['X-Encrypt-Iv']),
        cipherText: env.cipherText,
        privateKey: serverKeys.privateKeyPem,
        appId: 'default',
        keyId: 'v1',
        algorithm: 'RSA_AES_GCM',
      });
      seenPlaintexts.push(new TextDecoder().decode(plainBytes));

      if (seenNonces.length === 1) {
        throw Object.assign(new Error('Network Timeout'), {
          isAxiosError: true,
          code: 'ECONNABORTED',
          config,
        });
      }
      return {
        data: { code: 200, data: 'retried-ok', msg: 'ok' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };

    const retryRes = await client.post<string>(
      '/api/retry-crypto',
      { attemptKey: 'hello' },
      {
        retry: 1,
        retryDelay: 10,
        shouldRetry: () => true,
      },
    );
    expect(retryRes).toBe('retried-ok');
    expect(seenNonces).toHaveLength(2);
    expect(seenNonces[0]).not.toBe(seenNonces[1]);
    expect(seenIvs[0]).not.toBe(seenIvs[1]);
    expect(seenPlaintexts).toEqual(['{"attemptKey":"hello"}', '{"attemptKey":"hello"}']);

    // 2. cancelDuplicate 场景：两次完全相同明文请求，前一个请求被新请求精准取消
    client.instance.defaults.adapter = async config => {
      const signal = config.signal as AbortSignal;
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 60);
        signal.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            reject(
              Object.assign(new Error('canceled'), { name: 'CanceledError', code: 'ERR_CANCELED' }),
            );
          },
          { once: true },
        );
      });
      return {
        data: { code: 200, data: 'winner', msg: 'ok' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };

    const p1 = client.post('/api/dup', { item: 1 }, { cancelDuplicate: true });
    const p2 = client.post('/api/dup', { item: 1 }, { cancelDuplicate: true });

    await expect(p1).rejects.toSatisfy(err => isAbortError(err));
    await expect(p2).resolves.toBe('winner');
  });

  it('encrypt: true 应强制覆盖 shouldEncrypt、appId 冲突应 Fail-Fast 且数组参数默认无括号序列化', async () => {
    // 1. encrypt: true 在自定义 shouldEncrypt: () => false 下仍强制加密；二进制仍跳过
    const forcedClient = createHttpClient({
      cipher: createRequestCipher({
        serverPublicKey: serverKeys.publicKeyPem,
        shouldEncrypt: () => false,
      }),
    });

    let sawEncryptedEnvelope = false;
    forcedClient.instance.defaults.adapter = async config => {
      sawEncryptedEnvelope =
        typeof config.headers['X-Encrypt-Key'] === 'string' &&
        typeof config.data === 'string' &&
        'cipherText' in JSON.parse(config.data);
      return {
        data: { code: 200, data: 'forced-ok', msg: 'ok' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };

    expect(await forcedClient.post('/api/force', { secret: 1 }, { encrypt: true })).toBe(
      'forced-ok',
    );
    expect(sawEncryptedEnvelope).toBe(true);

    // 2. cipher 与 signer 的 appId 不一致时 Fail-Fast 报错，防 AAD 静默校验失败
    const conflictClient = createHttpClient({
      cipher: createRequestCipher({
        appId: 'app-cipher',
        bindAad: true,
        serverPublicKey: serverKeys.publicKeyPem,
      }),
      signer: createRequestSigner({
        appId: 'app-signer',
        secret: 'conflict-secret',
        canonicalPreset: 'standard',
      }),
    });

    await expect(conflictClient.post('/api/conflict', { x: 1 })).rejects.toSatisfy(
      err => err instanceof BusinessException && err.code === 500 && err.msg.includes('appId'),
    );

    // 3. 标准签名下含数组 params 时自动注入 paramsSerializer: { indexes: null }
    const arrayParamClient = createHttpClient({
      signer: createRequestSigner({
        secret: 'arr-secret',
        canonicalPreset: 'standard',
        shouldSign: () => true,
      }),
    });

    let capturedSerializer: unknown;
    arrayParamClient.instance.defaults.adapter = async config => {
      capturedSerializer = config.paramsSerializer;
      return {
        data: { code: 200, data: 'arr-ok', msg: 'ok' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };

    expect(await arrayParamClient.get('/api/items', { params: { ids: ['2', '1'] } })).toBe(
      'arr-ok',
    );
    expect(capturedSerializer).toEqual({ indexes: null });
  });
});
