/**
 * WebSocket 全双工长连接状态机 Hook 实现。
 *
 * 响应式桥接 @atengk/core 的 WebSocketClient，提供连接就绪状态机、全双工数据帧收发、
 * 双向心跳保活、指数退避自动重连、离线缓冲与组件作用域销毁时确定性资源释放。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import {
  computed,
  readonly,
  ref,
  toValue,
  type DeepReadonly,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue';
import {
  createWebSocketClient,
  type WebSocketClient,
  type WebSocketStatus,
  type WebSocketUrlResolver,
} from '@atengk/core';
import { tryOnScopeDispose } from '../utils/lifecycle';
import type { UseWebSocketOptions, UseWebSocketResult } from './types';

/**
 * WebSocket 全双工长连接状态机 Hook。
 *
 * @param url 目标 WebSocket 服务端地址（支持静态 URL 或 MaybeRefOrGetter）
 * @param options 可选配置项
 * @returns 包含只读响应式状态与全双工控制门面的结果对象
 */
export function useWebSocket<T = unknown>(
  url: MaybeRefOrGetter<string | WebSocketUrlResolver>,
  options: UseWebSocketOptions<T> = {},
): UseWebSocketResult<T> {
  // 1. 响应式只读状态机
  const status = ref<WebSocketStatus>('CLOSED');
  const data = ref<T | undefined>(undefined) as Ref<T | undefined>;
  const error = ref<Event | undefined>(undefined);
  const reconnectAttempt = ref<number>(0);

  const isOpen = computed<boolean>(() => status.value === 'OPEN');
  const isClosed = computed<boolean>(() => status.value === 'CLOSED');

  // 2. Vue 3.5 响应式动态地址解析器
  const resolvedUrlResolver: WebSocketUrlResolver = (): string | Promise<string> => {
    const raw = toValue(url);
    if (typeof raw === 'function') {
      return raw();
    }
    return raw;
  };

  // 3. 构建底层纯原生 WebSocketClient 客户端实例
  const client: WebSocketClient = createWebSocketClient({
    url: resolvedUrlResolver,
    protocols: options.protocols,
    autoConnect: false, // 由 Hook 显式生命周期或 autoConnect 调度
    heartbeat: options.heartbeat,
    reconnect: options.reconnect,
    bufferWhileConnecting: options.bufferWhileConnecting,
    maxBufferSize: options.maxBufferSize,
    tokenParamName: options.tokenParamName,
    tenantParamName: options.tenantParamName,
    params: options.params,
    webSocketFactory: options.webSocketFactory,
    jsonParse: options.jsonParse as ((raw: string) => unknown) | undefined,
    jsonStringify: options.jsonStringify,
  });

  // 4. 挂载全生命周期事件监听器
  const unbindOpen = client.on('open', (evt: Event) => {
    status.value = 'OPEN';
    error.value = undefined;
    reconnectAttempt.value = 0;
    options.onConnected?.(evt);
  });

  const unbindClose = client.on('close', (evt: CloseEvent) => {
    status.value = client.getStatus();
    options.onDisconnected?.(evt);
  });

  const unbindError = client.on('error', (evt: Event) => {
    status.value = client.getStatus();
    error.value = evt;
    options.onError?.(evt);
  });

  const unbindMessage = client.on('message', (payload: unknown, evt: MessageEvent) => {
    data.value = payload as T;
    options.onMessage?.(payload as T, evt);
  });

  const unbindReconnect = client.on('reconnect', (attempt: number, delay: number) => {
    status.value = client.getStatus();
    reconnectAttempt.value = attempt;
    options.onReconnect?.(attempt, delay);
  });

  /**
   * 手动建立 WebSocket 连接。
   */
  const open = async (): Promise<void> => {
    status.value = 'CONNECTING';
    try {
      await client.connect();
      status.value = client.getStatus();
    } catch (err: unknown) {
      status.value = client.getStatus();
      throw err;
    }
  };

  /**
   * 主动关闭 WebSocket 连接。
   */
  const close = (code = 1000, reason = ''): void => {
    client.close(code, reason);
    status.value = client.getStatus();
  };

  /**
   * 发送全双工上行数据帧。
   */
  const send = (payload: string | ArrayBufferLike | Blob | ArrayBufferView | object): boolean => {
    return client.send(payload);
  };

  // 5. 作用域生命周期注销守卫：确定性断开物理连接并注销全部事件监听
  tryOnScopeDispose(() => {
    close();
    status.value = 'CLOSED';
    unbindOpen();
    unbindClose();
    unbindError();
    unbindMessage();
    unbindReconnect();
  });

  // 6. 自动连接模式判断
  if (options.autoConnect === true || options.immediate === true) {
    open().catch(() => {});
  }

  return {
    status: readonly(status) as DeepReadonly<Ref<WebSocketStatus>>,
    data: readonly(data) as DeepReadonly<Ref<T | undefined>>,
    error: readonly(error) as DeepReadonly<Ref<Event | undefined>>,
    isOpen: readonly(isOpen) as DeepReadonly<Ref<boolean>>,
    isClosed: readonly(isClosed) as DeepReadonly<Ref<boolean>>,
    reconnectAttempt: readonly(reconnectAttempt) as DeepReadonly<Ref<number>>,
    open,
    connect: open,
    close,
    disconnect: close,
    send,
    client,
  };
}
