/**
 * sample-core 共享客户端实例与 Mock 适配器挂载配置。
 *
 * @author Ateng
 * @since 2026-11-04
 */

import {
  http,
  createHttpClient,
  createRequestSigner,
  createStreamClient,
  type HttpClient,
} from '@atengk/core';
import { installMockAdapter, createMockStreamFetch, createMockWebSocketServer } from './mock';

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
 * 请求防重放与原生签名客户端实例。
 */
export const signedClient: HttpClient = createHttpClient({
  signer: createRequestSigner({ secret: 'ateng-sample-secret-2026' }),
});

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
