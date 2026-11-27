/**
 * sample-core 共享客户端实例与 Mock 适配器挂载配置。
 *
 * @author Ateng
 * @since 2026-11-04
 */

import {
  http,
  createHttpClient,
  createRequestCipher,
  createRequestSigner,
  createStreamClient,
  type HttpClient,
} from '@atengk/core';
import {
  installMockAdapter,
  createMockStreamFetch,
  createMockWebSocketServer,
  setMockCryptoMaterial,
} from './mock';

type UnauthorizedCallback = (msg: string) => void;
let unauthorizedCallback: UnauthorizedCallback | null = null;

/**
 * 注册 401 凭据失效全局通知回调。
 */
export function registerUnauthorizedCallback(cb: UnauthorizedCallback): void {
  unauthorizedCallback = cb;
}

/**
 * 微服务网关多路由客户端实例。
 */
export const microserviceClient: HttpClient = createHttpClient({
  routes: [
    { prefix: '/auth', target: 'https://auth-service.cloud' },
    { prefix: '/order', target: 'https://order-service.cloud', rewritePrefix: '/api/v1' },
    { prefix: '/vip', target: 'https://vip-service.cloud', service: 'vip' },
  ],
  cancelDuplicate: true,
  onUnauthorized: () => {
    unauthorizedCallback?.('401 凭据失效，已触发客户端全局 onUnauthorized 回调！');
  },
});

/**
 * 请求防重放与原生签名客户端实例（对齐服务端标准 HMAC-SHA256 6 行规范签与 3 行响应验签）。
 */
export const signedClient: HttpClient = createHttpClient({
  signer: createRequestSigner({
    appId: 'sample-web-01',
    secret: 'ateng-sample-secret-2026',
    canonicalPreset: 'standard',
    verifyResponse: true,
  }),
});

let encryptedClientPromise: Promise<HttpClient> | null = null;

function encodeBytesBase64(bytes: Uint8Array): string {
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += 0x8000) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + 0x8000)));
  }
  return btoa(chunks.join(''));
}

async function generateRuntimeRsaPemPair(): Promise<{ publicPem: string; privatePem: string }> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt'],
  );
  const spki = new Uint8Array(await crypto.subtle.exportKey('spki', keyPair.publicKey));
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', keyPair.privateKey));
  return {
    publicPem: `-----BEGIN PUBLIC KEY-----\n${encodeBytesBase64(spki)}\n-----END PUBLIC KEY-----`,
    privatePem: `-----BEGIN PRIVATE KEY-----\n${encodeBytesBase64(pkcs8)}\n-----END PRIVATE KEY-----`,
  };
}

/**
 * 懒初始化 Encrypt-then-Sign 混合加解密演示客户端（运行时动态生成 RSA 密钥对，零硬编码私钥）。
 */
export function getEncryptedClient(): Promise<HttpClient> {
  if (!encryptedClientPromise) {
    encryptedClientPromise = (async () => {
      const serverPair = await generateRuntimeRsaPemPair();
      const clientPair = await generateRuntimeRsaPemPair();
      const appId = 'sample-crypto-01';
      const signSecret = 'ateng-sample-cipher-sign-secret';

      setMockCryptoMaterial({
        serverPrivateKeyPem: serverPair.privatePem,
        clientPublicKeyPem: clientPair.publicPem,
        signSecret,
        appId,
      });

      const client = createHttpClient({
        cipher: createRequestCipher({
          appId,
          keyId: 'v1',
          bindAad: true,
          serverPublicKey: serverPair.publicPem,
          clientPrivateKey: clientPair.privatePem,
        }),
        signer: createRequestSigner({
          appId,
          secret: signSecret,
          canonicalPreset: 'standard',
          verifyResponse: true,
        }),
      });
      installMockAdapter(client.instance);
      return client;
    })();
  }
  return encryptedClientPromise;
}

/**
 * Web 原生流式响应客户端实例。
 */
export const sampleStreamClient = createStreamClient({
  fetch: createMockStreamFetch(),
});

/**
 * 模拟 WebSocket 服务端实例。
 */
export const mockWebSocketServer = createMockWebSocketServer();

/**
 * 初始化并挂载所有客户端的离线 Mock 适配器。
 */
export function initSharedClients(): void {
  installMockAdapter(http.instance);
  installMockAdapter(microserviceClient.instance);
  installMockAdapter(signedClient.instance);
}
