/**
 * Web 原生流式响应与 SSE 打字机 Hook 实现。
 *
 * 响应式桥接 @atengk/core 的 StreamClient，提供 SSE 与大模型打字机流式增量文本累积、
 * 事件监听、断线重试、手动中止并在组件作用域卸载时确定性回收资源。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { readonly, ref, toValue, type DeepReadonly, type MaybeRefOrGetter, type Ref } from 'vue';
import {
  streamClient as defaultStreamClient,
  type SseEvent,
  type StreamClient,
  type StreamRequestOptions,
} from '@atengk/core';
import { tryOnScopeDispose } from '../utils/lifecycle';
import type { UseStreamOptions, UseStreamResult } from './types';

/**
 * 判断指定异常是否属于主动取消。
 */
function isAbortException(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const err = error as { name?: string; message?: string };
    return (
      err.name === 'AbortError' ||
      err.message?.toLowerCase().includes('aborted') === true ||
      err.message?.toLowerCase().includes('canceled') === true
    );
  }
  return false;
}

/**
 * Web 原生流式响应与 SSE 打字机 Hook。
 *
 * @param url 请求目标地址（支持 URL 字符串或 MaybeRefOrGetter）
 * @param options 可选配置项
 * @returns 只读状态机与流控制门面
 */
export function useStream(
  url: MaybeRefOrGetter<string>,
  options: UseStreamOptions = {},
): UseStreamResult {
  // 1. 响应式状态机
  const text = ref<string>('');
  const isStreaming = ref<boolean>(false);
  const event = ref<SseEvent | undefined>(undefined);
  const error = ref<unknown>(undefined);

  // 2. 内部控制状态
  let activeAbortController: AbortController | null = null;
  let isAbortedByAction = false;

  /**
   * 手动中断并关闭当前在途的流式连接。
   */
  const abort = (): void => {
    if (activeAbortController) {
      isAbortedByAction = true;
      activeAbortController.abort('Aborted by useStream');
      activeAbortController = null;
    }
    isStreaming.value = false;
  };

  /**
   * 重置累积文本与全部流状态为初始值。
   */
  const reset = (): void => {
    abort();
    text.value = '';
    event.value = undefined;
    error.value = undefined;
  };

  /**
   * 发起或重新发起流式请求。
   */
  const start = async (overrideOptions?: Partial<StreamRequestOptions>): Promise<string> => {
    // 0. 中断前序在途连接
    abort();
    isAbortedByAction = false;

    // 1. Vue 3.5 响应式解构入参解析
    const resolvedUrl = toValue(url);
    if (!resolvedUrl || typeof resolvedUrl !== 'string' || !resolvedUrl.trim()) {
      const invalidErr = new TypeError('useStream: url must be a valid non-empty string');
      error.value = invalidErr;
      isStreaming.value = false;
      options.onError?.(invalidErr);
      throw invalidErr;
    }

    // 2. 初始化全新控制器与状态
    const controller = new AbortController();
    activeAbortController = controller;

    text.value = '';
    event.value = undefined;
    error.value = undefined;
    isStreaming.value = true;

    const client: StreamClient = options.streamClient ?? defaultStreamClient;

    const reqOptions: StreamRequestOptions = {
      method: overrideOptions?.method ?? options.method ?? 'GET',
      headers: {
        ...(options.headers ?? {}),
        ...(overrideOptions?.headers ?? {}),
      },
      body: overrideOptions?.body ?? options.body,
      sse: overrideOptions?.sse ?? options.sse ?? true,
      reconnect: overrideOptions?.reconnect ?? options.reconnect,
      maxRetries: overrideOptions?.maxRetries ?? options.maxRetries,
      retryDelay: overrideOptions?.retryDelay ?? options.retryDelay,
      signal: controller.signal,
      onMessage: (data: string, sseEvt?: SseEvent) => {
        // 过滤标准大模型结束标识符 [DONE]
        if (data.trim() === '[DONE]') {
          return;
        }
        text.value += data;
        event.value = sseEvt;
        options.onMessage?.(data, sseEvt);
      },
    };

    try {
      await client.subscribe(resolvedUrl.trim(), reqOptions);

      // 仅当当前任务仍是活跃任务时更新状态与通知
      if (activeAbortController === controller) {
        isStreaming.value = false;
        activeAbortController = null;
        options.onDone?.(text.value);
      }
      return text.value;
    } catch (err: unknown) {
      if (activeAbortController === controller) {
        activeAbortController = null;
        isStreaming.value = false;

        // 若非主动中断，记录异常并派发错误回调
        if (!isAbortedByAction && !controller.signal.aborted && !isAbortException(err)) {
          error.value = err;
          options.onError?.(err);
          throw err;
        }
      }
      return text.value;
    }
  };

  // 3. 作用域注销时确定性关闭底层读取器与切断网络连接
  tryOnScopeDispose(abort);

  // 4. 自动连接模式判断
  if (options.autoConnect === true || options.autoStart === true) {
    start().catch(() => {});
  }

  return {
    text: readonly(text) as DeepReadonly<Ref<string>>,
    isStreaming: readonly(isStreaming) as DeepReadonly<Ref<boolean>>,
    event: readonly(event) as DeepReadonly<Ref<SseEvent | undefined>>,
    error: readonly(error) as DeepReadonly<Ref<unknown>>,
    start,
    abort,
    stop: abort,
    reset,
  };
}
