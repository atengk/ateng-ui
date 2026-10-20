/**
 * 异步时序竞态控制 Hook 实现。
 *
 * 采用“物理中断 + 逻辑过期”双重协同防御机制，解决搜索框、Tab 切换等高频异步场景中的时序倒挂痛点。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { readonly, ref, type DeepReadonly, type Ref } from 'vue';
import { useAtengConfig } from '../context';
import type { MutateUpdater } from '../request/types';
import { tryOnScopeDispose } from '../utils/lifecycle';
import type { UseLatestAsyncFn, UseLatestOptions, UseLatestResult } from './types';

/**
 * 异步时序竞态双重防御协调 Hook。
 *
 * @template TData 响应数据类型
 * @template TArgs 参数元组类型
 * @param asyncFn 异步请求函数（注入专属 AbortSignal）
 * @param options 配置项
 * @returns 具备只读保护与双重竞态防线的状态机结果对象
 */
export function useLatest<TData, TArgs extends unknown[] = []>(
  asyncFn: UseLatestAsyncFn<TData, TArgs>,
  options: UseLatestOptions<TData, TArgs> = {},
): UseLatestResult<TData, TArgs> {
  const globalConfig = useAtengConfig();

  // 1. 初始化响应式只读状态
  const data = ref<TData | undefined>(options.initialData);
  const loading = ref<boolean>(false);
  const error = ref<unknown>(undefined);

  // 2. 双重防御状态控制量
  let currentSeq = 0;
  let activeAbortController: AbortController | null = null;

  /**
   * 取消当前在途请求并逻辑废弃所有未决回调。
   */
  const cancel = (): void => {
    currentSeq++;
    if (activeAbortController) {
      activeAbortController.abort('Canceled by useLatest cancel');
      activeAbortController = null;
    }
    loading.value = false;
  };

  /**
   * 注册生命周期自动解绑，防止组件卸载后离线回调悬挂。
   */
  tryOnScopeDispose(cancel);

  /**
   * 核心异步执行管道。
   */
  const execute = async (...args: TArgs): Promise<TData | undefined> => {
    // 双重防御第一重：物理切断上一次在途未决的网络连接
    if (activeAbortController) {
      activeAbortController.abort('Canceled by subsequent useLatest call');
      activeAbortController = null;
    }

    const abortController = new AbortController();
    activeAbortController = abortController;

    // 双重防御第二重：递增版本号标记过期，逻辑废弃所有过期 Promise
    const seq = ++currentSeq;

    loading.value = true;
    error.value = undefined;

    try {
      const res = await asyncFn(abortController.signal, ...args);

      // 逻辑时序校验：仅当序列号与最新请求一致时采纳数据
      if (seq === currentSeq) {
        data.value = res;
        options.onSuccess?.(res, args);
        return res;
      }
      return undefined;
    } catch (err: unknown) {
      // 逻辑异常校验：仅当序列号与最新请求一致时采纳错误
      if (seq === currentSeq) {
        error.value = err;
        options.onError?.(err, args);
        globalConfig.onError?.(err);
        throw err;
      }
      return undefined;
    } finally {
      // 仅当最新请求完成时才重置全局 loading 与 controller
      if (seq === currentSeq) {
        loading.value = false;
        activeAbortController = null;
        options.onFinally?.(args);
      }
    }
  };

  /**
   * 静默执行门面（吞掉过期及自身异常，不产生 Unhandled Rejection）。
   */
  const run = async (...args: TArgs): Promise<TData | undefined> => {
    try {
      return await execute(...args);
    } catch {
      return undefined;
    }
  };

  /**
   * 原始异步执行门面（当为最新请求异常时向外抛出）。
   */
  const runAsync = (...args: TArgs): Promise<TData | undefined> => {
    return execute(...args);
  };

  /**
   * 乐观更新门面。
   */
  const mutate = (updater: MutateUpdater<TData>): void => {
    if (typeof updater === 'function') {
      data.value = (updater as (prev: TData | undefined) => TData | undefined)(data.value);
    } else {
      data.value = updater;
    }
  };

  return {
    data: readonly(data) as DeepReadonly<Ref<TData | undefined>>,
    loading: readonly(loading) as DeepReadonly<Ref<boolean>>,
    error: readonly(error) as DeepReadonly<Ref<unknown>>,
    run,
    runAsync,
    mutate,
    cancel,
  };
}
