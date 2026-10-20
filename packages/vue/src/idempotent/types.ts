/**
 * 前端提交防刷与幂等互斥锁状态机类型定义。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import type { DeepReadonly, MaybeRefOrGetter, Ref } from 'vue';

/**
 * 待保护的异步写操作动作函数签名。
 */
export type UseIdempotentAction<TResult, TArgs extends unknown[] = []> = (
  ...args: TArgs
) => Promise<TResult>;

/**
 * useIdempotent 可选配置项。
 */
export interface UseIdempotentOptions<TResult, TArgs extends unknown[] = []> {
  /**
   * 安全超时时间（毫秒），支持传入数值、Ref 或 Getter 箭头函数。
   *
   * 当异步任务超过该时间仍未决时，自动释放互斥锁，彻底杜绝死锁卡死。
   */
  timeout?: MaybeRefOrGetter<number | undefined>;

  /**
   * 动作成功完成回调。
   */
  onSuccess?: (result: TResult, args: TArgs) => void;

  /**
   * 动作异常失败回调。
   */
  onError?: (error: unknown, args: TArgs) => void;

  /**
   * 动作结束回调（无论成功失败均触发）。
   */
  onFinally?: (args: TArgs) => void;

  /**
   * 互斥锁处于激活状态、重复点击被成功阻断时的回调通知。
   */
  onBlocked?: (args: TArgs) => void;
}

/**
 * useIdempotent 返回的只读状态与操作门面。
 */
export interface UseIdempotentResult<TResult, TArgs extends unknown[] = []> {
  /**
   * 当前是否处于互斥写操作执行中状态，受到 readonly 只读保护。
   */
  executing: DeepReadonly<Ref<boolean>>;

  /**
   * 最近一次执行捕获的异常对象，受到 readonly 只读保护。
   */
  error: DeepReadonly<Ref<unknown>>;

  /**
   * 触发执行包装后的防刷动作。
   *
   * 若当前已有未决任务执行中，将自动阻断忽略并返回 undefined。
   *
   * @param args 业务参数
   */
  run: (...args: TArgs) => Promise<TResult | undefined>;

  /**
   * 原始异步执行（当处于互斥锁锁定时返回拒绝或 undefined）。
   *
   * @param args 业务参数
   */
  runAsync: (...args: TArgs) => Promise<TResult>;

  /**
   * 手动强制解锁并清除在途超时定时器。
   */
  unlock: () => void;
}
