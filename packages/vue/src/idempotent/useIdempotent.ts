/**
 * 前端提交防刷与幂等互斥锁 Hook 实现。
 *
 * 针对表单提交、支付扣款、保存删除等写操作场景，提供前端执行中互斥锁与超时自动防死锁机制。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { readonly, ref, toValue, type DeepReadonly, type Ref } from 'vue';
import { useAtengConfig } from '../context';
import { tryOnScopeDispose } from '../utils/lifecycle';
import type { UseIdempotentAction, UseIdempotentOptions, UseIdempotentResult } from './types';

/**
 * 前端提交防刷与幂等互斥锁 Hook。
 *
 * @template TResult 返回值类型
 * @template TArgs 参数元组类型
 * @param actionFn 异步写操作函数
 * @param options 防刷互斥锁配置项
 * @returns 包含 executing 状态与受控执行门面的结果对象
 */
export function useIdempotent<TResult, TArgs extends unknown[] = []>(
  actionFn: UseIdempotentAction<TResult, TArgs>,
  options: UseIdempotentOptions<TResult, TArgs> = {},
): UseIdempotentResult<TResult, TArgs> {
  const globalConfig = useAtengConfig();

  // 1. 响应式互斥锁执行状态与异常状态
  const executing = ref<boolean>(false);
  const error = ref<unknown>(undefined);

  // 2. 超时防死锁定时器与序列号防时序倒挂
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  let currentSeq = 0;

  /**
   * 清除未决的超时定时器。
   */
  const clearTimer = (): void => {
    if (timeoutTimer !== null) {
      clearTimeout(timeoutTimer);
      timeoutTimer = null;
    }
  };

  /**
   * 手动或超时强制解锁。
   */
  const unlock = (): void => {
    currentSeq++;
    clearTimer();
    executing.value = false;
  };

  /**
   * 注册活跃作用域销毁时确定性清理。
   */
  tryOnScopeDispose(unlock);

  /**
   * 核心互斥执行管道。
   */
  const execute = async (...args: TArgs): Promise<TResult> => {
    // 互斥前置守卫：若当前正在执行中，拦截并触发 onBlocked
    if (executing.value) {
      options.onBlocked?.(args);
      throw new Error('[useIdempotent] Concurrent execution blocked by mutex lock');
    }

    executing.value = true;
    error.value = undefined;
    const seq = ++currentSeq;

    // 调度安全超时自动释放
    clearTimer();
    const timeoutMs = toValue(options.timeout);
    if (timeoutMs && timeoutMs > 0) {
      timeoutTimer = setTimeout(() => {
        if (seq === currentSeq) {
          unlock();
        }
      }, timeoutMs);
    }

    try {
      const res = await actionFn(...args);
      if (seq === currentSeq) {
        options.onSuccess?.(res, args);
      }
      return res;
    } catch (err: unknown) {
      if (seq === currentSeq) {
        error.value = err;
        options.onError?.(err, args);
        globalConfig.onError?.(err);
      }
      throw err;
    } finally {
      if (seq === currentSeq) {
        clearTimer();
        executing.value = false;
        options.onFinally?.(args);
      }
    }
  };

  /**
   * 静默执行门面（阻断或异常时返回 undefined，杜绝未捕获异常）。
   */
  const run = async (...args: TArgs): Promise<TResult | undefined> => {
    try {
      return await execute(...args);
    } catch {
      return undefined;
    }
  };

  /**
   * 原始异步执行门面。
   */
  const runAsync = (...args: TArgs): Promise<TResult> => {
    return execute(...args);
  };

  return {
    executing: readonly(executing) as DeepReadonly<Ref<boolean>>,
    error: readonly(error) as DeepReadonly<Ref<unknown>>,
    run,
    runAsync,
    unlock,
  };
}
