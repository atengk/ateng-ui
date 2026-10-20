/**
 * 异步请求状态机类型契约定义。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import type { DeepReadonly, MaybeRefOrGetter, Ref } from 'vue';
import type { BusinessException } from '@atengk/core';

/**
 * 异步服务函数签名。
 */
export type UseRequestService<TData, TParams extends unknown[]> = (
  ...args: TParams
) => Promise<TData>;

/**
 * 乐观更新回调或直接赋值载荷。
 */
export type MutateUpdater<TData> = TData | ((prev: TData | undefined) => TData | undefined);

/**
 * useRequest 可选配置项。
 */
export interface UseRequestOptions<TData, TParams extends unknown[]> {
  /**
   * 是否手动执行。默认 false（即在初始化时自动执行）。
   */
  manual?: boolean;

  /**
   * 默认自动执行时传入的参数。
   */
  defaultParams?: TParams;

  /**
   * 请求是否就绪守卫。为 false 时不自动执行，变为 true 时若未手动指定 manual: true 则自动触发。
   */
  ready?: MaybeRefOrGetter<boolean>;

  /**
   * 防抖延迟毫秒数。设置后调用 run() 将自动防抖。
   */
  debounceInterval?: number;

  /**
   * 节流间隔毫秒数。设置后调用 run() 将自动节流。
   */
  throttleInterval?: number;

  /**
   * 轮询间隔毫秒数。设置大于 0 时，请求完成后将定时自动刷新。
   */
  pollingInterval?: number;

  /**
   * 并发时是否取消并丢弃前序未决请求。默认为 true。
   */
  cancelPrevious?: boolean;

  /**
   * 初始默认数据。
   */
  initialData?: TData;

  /**
   * 请求成功回调。
   */
  onSuccess?: (data: TData, params: TParams) => void;

  /**
   * 请求失败回调。
   */
  onError?: (error: BusinessException | unknown, params: TParams) => void;

  /**
   * 请求结束回调（无论成功失败均触发）。
   */
  onFinally?: (params: TParams) => void;
}

/**
 * useRequest 返回的响应式状态与操作门面。
 */
export interface UseRequestResult<TData, TParams extends unknown[]> {
  /**
   * 请求成功返回的数据，受到 readonly 只读保护。
   */
  data: DeepReadonly<Ref<TData | undefined>>;

  /**
   * 当前是否处于请求执行中状态，受到 readonly 只读保护。
   */
  loading: DeepReadonly<Ref<boolean>>;

  /**
   * 请求捕获到的异常对象，受到 readonly 只读保护。
   */
  error: DeepReadonly<Ref<BusinessException | unknown>>;

  /**
   * 最近一次发起请求所使用的参数，受到 readonly 只读保护。
   */
  params: DeepReadonly<Ref<TParams | []>>;

  /**
   * 手动触发请求执行（异常时静默捕获并写入 error 状态，不抛出 Unhandled Rejection）。
   */
  run: (...args: TParams) => Promise<TData | undefined>;

  /**
   * 原始异步执行（失败时将异常抛出供外部 Promise 捕获）。
   */
  runAsync: (...args: TParams) => Promise<TData>;

  /**
   * 使用上一次请求参数重新刷新。
   */
  refresh: () => Promise<TData | undefined>;

  /**
   * 使用上一次请求参数重新刷新，并在异常时抛出 Promise 错误。
   */
  refreshAsync: () => Promise<TData>;

  /**
   * 本地乐观更新或直接覆盖 data，无需重新发起网络请求。
   */
  mutate: (updater: MutateUpdater<TData>) => void;

  /**
   * 取消当前在途请求、重置 loading 并注销未决的轮询定时器。
   */
  cancel: () => void;
}
