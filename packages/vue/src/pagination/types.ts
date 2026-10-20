/**
 * 契约分页状态机类型定义。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import type { DeepReadonly, MaybeRefOrGetter, Ref } from 'vue';
import type { PageQuery, PageResult } from '@atengk/core';
import type { MutateUpdater } from '../request/types';

/**
 * 分页异步服务函数签名。
 */
export type UsePaginationService<TItem, TParams extends PageQuery = PageQuery> = (
  params: TParams,
) => Promise<PageResult<TItem>>;

/**
 * usePagination 可选配置项。
 */
export interface UsePaginationOptions<TItem, TParams extends PageQuery = PageQuery> {
  /**
   * 默认初始页码。未指定时默认为 1。支持传入 Ref 或 Getter。
   */
  defaultPageNum?: MaybeRefOrGetter<number>;

  /**
   * 默认每页记录数。未指定时优先读取 defaultParams.pageSize，若仍未指定则回退至全局配置 defaultPageSize（默认 10）。支持传入 Ref 或 Getter。
   */
  defaultPageSize?: MaybeRefOrGetter<number>;

  /**
   * 初始默认查询与筛选参数。支持传入 Ref 或 Getter。
   */
  defaultParams?: MaybeRefOrGetter<Partial<TParams>>;

  /**
   * 是否手动执行。默认 false（即初始化时自动触发第一页请求）。
   */
  manual?: boolean;

  /**
   * 请求是否就绪守卫。为 false 时不自动执行，变为 true 时若 manual 为 false 则自动触发。
   */
  ready?: MaybeRefOrGetter<boolean>;

  /**
   * 防抖延迟毫秒数。
   */
  debounceInterval?: number;

  /**
   * 节流间隔毫秒数。
   */
  throttleInterval?: number;

  /**
   * 轮询间隔毫秒数。
   */
  pollingInterval?: number;

  /**
   * 并发时是否取消并丢弃前序未决请求。默认为 true。
   */
  cancelPrevious?: boolean;

  /**
   * 请求成功回调。
   */
  onSuccess?: (data: PageResult<TItem>, params: TParams) => void;

  /**
   * 请求失败回调。
   */
  onError?: (error: unknown, params: TParams) => void;

  /**
   * 请求结束回调（无论成功失败均触发）。
   */
  onFinally?: (params: TParams) => void;
}

/**
 * usePagination 返回的只读状态机与四维原子操作门面。
 */
export interface UsePaginationResult<TItem, TParams extends PageQuery = PageQuery> {
  /**
   * 当前生效的页码，受到 readonly 只读保护。
   */
  pageNum: DeepReadonly<Ref<number>>;

  /**
   * 当前生效的每页记录数，受到 readonly 只读保护。
   */
  pageSize: DeepReadonly<Ref<number>>;

  /**
   * 总记录数，受到 readonly 只读保护（空数据或异常时保底为 0）。
   */
  total: DeepReadonly<Ref<number>>;

  /**
   * 当前页数据集合，受到 readonly 只读保护（空数据或异常时 100% 保底为空数组 []）。
   */
  list: DeepReadonly<Ref<TItem[]>>;

  /**
   * 当前是否处于请求执行中状态，受到 readonly 只读保护。
   */
  loading: DeepReadonly<Ref<boolean>>;

  /**
   * 请求捕获到的异常对象，受到 readonly 只读保护。
   */
  error: DeepReadonly<Ref<unknown>>;

  /**
   * 底层请求成功返回的分页原始数据对象，受到 readonly 只读保护。
   */
  data: DeepReadonly<Ref<PageResult<TItem> | undefined>>;

  /**
   * 最近一次发起请求所使用的完整参数，受到 readonly 只读保护。
   */
  params: DeepReadonly<Ref<[TParams] | []>>;

  /**
   * 翻页原子动作：修改当前页码并重新发起请求。
   *
   * @param page 目标页码（若小于 1 则安全保底为 1）
   */
  changePage: (page: number) => Promise<PageResult<TItem> | undefined>;

  /**
   * 修改每页条数原子动作：修改 pageSize，自动将 pageNum 归 1 并重新发起请求。
   *
   * @param size 目标每页条数
   */
  changePageSize: (size: number) => Promise<PageResult<TItem> | undefined>;

  /**
   * 条件搜索原子动作：合并新的筛选参数，自动将 pageNum 归 1 并重新发起请求。
   *
   * @param extraParams 附加的筛选参数
   */
  search: (extraParams?: Partial<TParams>) => Promise<PageResult<TItem> | undefined>;

  /**
   * 重置原子动作：清空额外筛选条件，恢复为初始 defaultParams，并将 pageNum 归 1 重新发起请求。
   */
  reset: () => Promise<PageResult<TItem> | undefined>;

  /**
   * 手动触发执行（可传入覆盖参数）。
   */
  run: (overrideParams?: Partial<TParams>) => Promise<PageResult<TItem> | undefined>;

  /**
   * 原始异步执行（失败时向外抛出 Promise 异常）。
   */
  runAsync: (overrideParams?: Partial<TParams>) => Promise<PageResult<TItem>>;

  /**
   * 按照当前页码与参数刷新。
   */
  refresh: () => Promise<PageResult<TItem> | undefined>;

  /**
   * 按照当前页码与参数异步刷新（失败时抛出异常）。
   */
  refreshAsync: () => Promise<PageResult<TItem>>;

  /**
   * 本地乐观更新分页结果对象。
   */
  mutate: (updater: MutateUpdater<PageResult<TItem>>) => void;

  /**
   * 取消当前在途请求并停止轮询。
   */
  cancel: () => void;
}
