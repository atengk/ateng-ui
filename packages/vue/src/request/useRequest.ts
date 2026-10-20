/**
 * 异步请求状态机 Hook 实现。
 *
 * 提供严格只读的状态机流转、防抖/节流/轮询调度、双重抗竞态中断及单向受控变更。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { readonly, ref, toValue, watch, type DeepReadonly, type Ref } from 'vue';
import { useAtengConfig } from '../context';
import { tryOnScopeDispose } from '../utils/lifecycle';
import { useDebounceFn, useThrottleFn } from '../utils/timing';
import type {
  MutateUpdater,
  UseRequestOptions,
  UseRequestResult,
  UseRequestService,
} from './types';

/**
 * 异步数据请求响应式包装 Hook。
 *
 * @template TData 响应数据类型
 * @template TParams 请求参数元组类型
 * @param service 异步请求函数
 * @param options 请求配置项
 * @returns 包含状态机与操作门面的只读结果对象
 */
export function useRequest<TData, TParams extends unknown[] = []>(
  service: UseRequestService<TData, TParams>,
  options: UseRequestOptions<TData, TParams> = {},
): UseRequestResult<TData, TParams> {
  const globalConfig = useAtengConfig();

  // 1. 初始化响应式状态
  const data = ref<TData | undefined>(options.initialData);
  const loading = ref<boolean>(false);
  const error = ref<unknown>(undefined);
  const params = ref<TParams | []>(
    options.defaultParams ? ([...options.defaultParams] as TParams) : [],
  );

  // 2. 内部控制量与双重竞态防线
  let currentSeq = 0;
  let activeAbortController: AbortController | null = null;
  let pollTimer: ReturnType<typeof setTimeout> | null = null;

  const cancelPrevious = options.cancelPrevious ?? true;
  const manual = options.manual ?? false;

  const stopPolling = () => {
    if (pollTimer !== null) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
  };

  const schedulePoll = () => {
    stopPolling();
    if (options.pollingInterval && options.pollingInterval > 0) {
      pollTimer = setTimeout(() => {
        execute(...(params.value as TParams)).catch(() => {});
      }, options.pollingInterval);
    }
  };

  /**
   * 底层核心异步执行管道。
   */
  const execute = async (...args: TParams): Promise<TData> => {
    stopPolling();

    // 物理中断在途的前序未决请求
    if (cancelPrevious && activeAbortController) {
      activeAbortController.abort('Canceled by subsequent request');
      activeAbortController = null;
    }

    const abortController = new AbortController();
    activeAbortController = abortController;
    const seq = ++currentSeq;

    loading.value = true;
    error.value = undefined;
    params.value = args;

    try {
      const res = await service(...args);
      // 逻辑过期判决：若在此期间有新请求发起，丢弃当前状态更新与回调
      if (seq === currentSeq) {
        data.value = res;
        options.onSuccess?.(res, args);
      }
      return res;
    } catch (err: unknown) {
      if (seq === currentSeq) {
        error.value = err;
        options.onError?.(err, args);
        globalConfig.onError?.(err);
        throw err;
      }
      return undefined as unknown as TData;
    } finally {
      if (seq === currentSeq) {
        loading.value = false;
        activeAbortController = null;
        options.onFinally?.(args);
        schedulePoll();
      }
    }
  };

  // 3. 构建防抖与节流包装器
  let debouncedRun: (((...args: TParams) => void) & { cancel: () => void }) | null = null;
  if (options.debounceInterval && options.debounceInterval > 0) {
    debouncedRun = useDebounceFn((...args: TParams) => {
      execute(...args).catch(() => {});
    }, options.debounceInterval);
  }

  let throttledRun: (((...args: TParams) => void) & { cancel: () => void }) | null = null;
  if (options.throttleInterval && options.throttleInterval > 0) {
    throttledRun = useThrottleFn((...args: TParams) => {
      execute(...args).catch(() => {});
    }, options.throttleInterval);
  }

  /**
   * 静默手动执行门面。
   */
  const run = (...args: TParams): Promise<TData | undefined> => {
    if (debouncedRun) {
      debouncedRun(...args);
      return Promise.resolve(undefined);
    }
    if (throttledRun) {
      throttledRun(...args);
      return Promise.resolve(undefined);
    }
    return execute(...args).catch(() => undefined);
  };

  /**
   * 原始异步执行门面。
   */
  const runAsync = (...args: TParams): Promise<TData> => {
    return execute(...args);
  };

  /**
   * 刷新门面。
   */
  const refresh = (): Promise<TData | undefined> => {
    return run(...(params.value as TParams));
  };

  /**
   * 异步刷新门面。
   */
  const refreshAsync = (): Promise<TData> => {
    return runAsync(...(params.value as TParams));
  };

  /**
   * 本地乐观更新门面。
   */
  const mutate = (updater: MutateUpdater<TData>): void => {
    if (typeof updater === 'function') {
      data.value = (updater as (prev: TData | undefined) => TData | undefined)(data.value);
    } else {
      data.value = updater;
    }
  };

  /**
   * 主动取消在途请求与定时器。
   */
  const cancel = (): void => {
    currentSeq++;
    if (activeAbortController) {
      activeAbortController.abort('Canceled by user');
      activeAbortController = null;
    }
    debouncedRun?.cancel();
    throttledRun?.cancel();
    stopPolling();
    loading.value = false;
  };

  // 4. 注册作用域销毁时确定性清理
  tryOnScopeDispose(cancel);

  // 5. 就绪守卫与生命周期自动触发
  if (options.ready !== undefined) {
    watch(
      () => toValue(options.ready),
      isReady => {
        if (isReady && !manual) {
          run(...(params.value as TParams));
        }
      },
      { flush: 'sync' },
    );
  }

  if (!manual) {
    const isReady = options.ready === undefined ? true : toValue(options.ready);
    if (isReady) {
      run(...(params.value as TParams));
    }
  }

  return {
    data: readonly(data) as DeepReadonly<Ref<TData | undefined>>,
    loading: readonly(loading) as DeepReadonly<Ref<boolean>>,
    error: readonly(error) as DeepReadonly<Ref<unknown>>,
    params: readonly(params) as DeepReadonly<Ref<TParams | []>>,
    run,
    runAsync,
    refresh,
    refreshAsync,
    mutate,
    cancel,
  };
}
