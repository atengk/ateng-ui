/**
 * 异步时序竞态控制状态机类型定义。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import type { DeepReadonly, Ref } from 'vue';
import type { MutateUpdater } from '../request/types';

/**
 * 支持物理中断协调的异步执行函数签名。
 *
 * 首参注入针对当前请求专属的 AbortSignal，后续参数为调用方传递的业务实参。
 */
export type UseLatestAsyncFn<TData, TArgs extends unknown[] = []> = (
  signal: AbortSignal,
  ...args: TArgs
) => Promise<TData>;

/**
 * useLatest 可选配置项。
 */
export interface UseLatestOptions<TData, TArgs extends unknown[] = []> {
  /**
   * 初始默认数据。
   */
  initialData?: TData;

  /**
   * 最新请求成功完成时的回调（仅当该请求为最新有效请求时触发）。
   */
  onSuccess?: (data: TData, args: TArgs) => void;

  /**
   * 最新请求发生异常时的回调（仅当该请求为最新有效请求时触发）。
   */
  onError?: (error: unknown, args: TArgs) => void;

  /**
   * 最新请求结束时的回调（无论成功或失败，仅当为最新有效请求时触发）。
   */
  onFinally?: (args: TArgs) => void;
}

/**
 * useLatest 返回的只读状态机与操作门面。
 */
export interface UseLatestResult<TData, TArgs extends unknown[] = []> {
  /**
   * 最新成功请求的数据实体，受到 readonly 只读保护。
   */
  data: DeepReadonly<Ref<TData | undefined>>;

  /**
   * 当前是否有请求正在执行中，受到 readonly 只读保护。
   */
  loading: DeepReadonly<Ref<boolean>>;

  /**
   * 最新请求捕获到的异常对象，受到 readonly 只读保护。
   */
  error: DeepReadonly<Ref<unknown>>;

  /**
   * 触发异步执行（静默执行，过期请求自动丢弃，异常写入 error 状态）。
   *
   * @param args 业务调用参数
   */
  run: (...args: TArgs) => Promise<TData | undefined>;

  /**
   * 原始异步执行（返回当前执行的 Promise，若被后续请求作废则静默完成并返回 undefined）。
   *
   * @param args 业务调用参数
   */
  runAsync: (...args: TArgs) => Promise<TData | undefined>;

  /**
   * 本地乐观更新或直接覆盖 data，无需重新发起网络请求。
   */
  mutate: (updater: MutateUpdater<TData>) => void;

  /**
   * 主动取消当前在途请求并递增作废序列号。
   */
  cancel: () => void;
}
