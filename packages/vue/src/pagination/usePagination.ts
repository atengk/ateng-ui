/**
 * 契约分页状态机 Hook 实现。
 *
 * 基于 useRequest 深度组合，提供零样板分页状态调度、四维原子语义动作与硬性空安全保底。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { computed, readonly, ref, toValue, type DeepReadonly, type Ref } from 'vue';
import type { PageQuery, PageResult } from '@atengk/core';
import { useAtengConfig } from '../context';
import { useRequest } from '../request';
import type { UsePaginationOptions, UsePaginationResult, UsePaginationService } from './types';

/**
 * 契约分页状态机调度 Hook。
 *
 * @template TItem 列表项数据类型
 * @template TParams 查询参数类型（必须满足 PageQuery 契约）
 * @param service 分页请求服务函数
 * @param options 分页配置项
 * @returns 具备只读保护与四维原子动作的分页结果对象
 */
export function usePagination<TItem, TParams extends PageQuery = PageQuery>(
  service: UsePaginationService<TItem, TParams>,
  options: UsePaginationOptions<TItem, TParams> = {},
): UsePaginationResult<TItem, TParams> {
  const globalConfig = useAtengConfig();

  // 1. Vue 3.5 响应式解构入参解析：toValue 解包初始分页与筛选参数
  const resolvedDefaultPageNum = toValue(options.defaultPageNum);
  const resolvedDefaultPageSize = toValue(options.defaultPageSize);
  const resolvedDefaultParams = toValue(options.defaultParams);

  const initialPageNum = Math.max(1, resolvedDefaultPageNum ?? 1);
  const initialPageSize =
    resolvedDefaultPageSize ??
    resolvedDefaultParams?.pageSize ??
    globalConfig.defaultPageSize ??
    10;
  const initialExtraParams = { ...(resolvedDefaultParams || {}) } as Partial<TParams>;

  const pageNum = ref<number>(initialPageNum);
  const pageSize = ref<number>(initialPageSize);
  const extraParams = ref<Partial<TParams>>({ ...initialExtraParams });

  /**
   * 构建当前生效的完整分页请求入参（override 优先级最高）。
   */
  const buildCurrentParams = (override?: Partial<TParams>): TParams => {
    return {
      ...extraParams.value,
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      ...override,
    } as TParams;
  };

  /**
   * 同步更新覆盖入参至内部响应式状态。
   */
  const applyOverrideParams = (override?: Partial<TParams>): void => {
    if (!override) return;
    if (override.pageNum !== undefined) {
      pageNum.value = Math.max(1, Math.floor(override.pageNum));
    }
    if (override.pageSize !== undefined) {
      pageSize.value = Math.max(1, Math.floor(override.pageSize));
    }
    extraParams.value = {
      ...extraParams.value,
      ...override,
    };
  };

  // 2. 深度组合 useRequest 请求状态机，并注入空安全保底拦截
  const initialFullParams = buildCurrentParams();

  const request = useRequest<PageResult<TItem>, [TParams]>(
    async (params: TParams): Promise<PageResult<TItem>> => {
      const res = await service(params);
      // 空安全硬性保底：无论服务端返回 null、undefined 还是缺少 list 属性，100% 保底返回 []
      const safeList = Array.isArray(res?.list) ? res.list : [];
      const safeTotal =
        typeof res?.total === 'number' && !Number.isNaN(res.total) && res.total >= 0
          ? res.total
          : safeList.length;

      return {
        list: safeList,
        total: safeTotal,
      };
    },
    {
      manual: options.manual ?? false,
      defaultParams: [initialFullParams],
      ready: options.ready,
      debounceInterval: options.debounceInterval,
      throttleInterval: options.throttleInterval,
      pollingInterval: options.pollingInterval,
      cancelPrevious: options.cancelPrevious ?? true,
      onSuccess: (data, p) => options.onSuccess?.(data, p[0]),
      onError: (err, p) => options.onError?.(err, p[0]),
      onFinally: p => options.onFinally?.(p[0]),
    },
  );

  // 3. 计算派生状态并实施硬性空安全保底（异常态与空数据态 100% 返回空数组与 0）
  const total = computed<number>(() => {
    if (request.error.value) {
      return 0;
    }
    return request.data.value?.total ?? 0;
  });

  const list = computed(() => {
    if (request.error.value) {
      return [];
    }
    return request.data.value?.list ?? [];
  });

  // 4. 四维原子语义动作定义

  /**
   * 翻页动作：修改 pageNum 并发起请求。
   */
  const changePage = (page: number): Promise<PageResult<TItem> | undefined> => {
    const safePage = Math.max(1, Math.floor(page || 1));
    pageNum.value = safePage;
    return request.run(buildCurrentParams({ pageNum: safePage } as Partial<TParams>));
  };

  /**
   * 修改每页条数动作：更新 pageSize，将 pageNum 归 1 并重新发起请求。
   */
  const changePageSize = (size: number): Promise<PageResult<TItem> | undefined> => {
    const safeSize = Math.max(1, Math.floor(size || 10));
    pageSize.value = safeSize;
    pageNum.value = 1;
    return request.run(buildCurrentParams({ pageNum: 1, pageSize: safeSize } as Partial<TParams>));
  };

  /**
   * 搜索动作：合并额外筛选条件，将 pageNum 归 1 并重新发起请求。
   */
  const search = (newExtraParams?: Partial<TParams>): Promise<PageResult<TItem> | undefined> => {
    if (newExtraParams) {
      extraParams.value = {
        ...extraParams.value,
        ...newExtraParams,
      };
    }
    pageNum.value = 1;
    return request.run(buildCurrentParams({ pageNum: 1 } as Partial<TParams>));
  };

  /**
   * 重置动作：恢复初始 defaultParams 筛选条件，将 pageNum 归 1 重新发起请求。
   */
  const reset = (): Promise<PageResult<TItem> | undefined> => {
    extraParams.value = { ...initialExtraParams };
    pageNum.value = 1;
    return request.run({
      ...initialExtraParams,
      pageNum: 1,
      pageSize: pageSize.value,
    } as TParams);
  };

  /**
   * 手动触发执行。
   */
  const run = (overrideParams?: Partial<TParams>): Promise<PageResult<TItem> | undefined> => {
    applyOverrideParams(overrideParams);
    return request.run(buildCurrentParams(overrideParams));
  };

  /**
   * 原始异步执行。
   */
  const runAsync = (overrideParams?: Partial<TParams>): Promise<PageResult<TItem>> => {
    applyOverrideParams(overrideParams);
    return request.runAsync(buildCurrentParams(overrideParams));
  };

  /**
   * 当前状态静默刷新。
   */
  const refresh = (): Promise<PageResult<TItem> | undefined> => {
    return request.run(buildCurrentParams());
  };

  /**
   * 当前状态异步刷新。
   */
  const refreshAsync = (): Promise<PageResult<TItem>> => {
    return request.runAsync(buildCurrentParams());
  };

  return {
    pageNum: readonly(pageNum) as DeepReadonly<Ref<number>>,
    pageSize: readonly(pageSize) as DeepReadonly<Ref<number>>,
    total: readonly(total) as DeepReadonly<Ref<number>>,
    list: readonly(list) as DeepReadonly<Ref<TItem[]>>,
    loading: request.loading,
    error: request.error,
    data: request.data,
    params: request.params,
    changePage,
    changePageSize,
    search,
    reset,
    run,
    runAsync,
    refresh,
    refreshAsync,
    mutate: request.mutate,
    cancel: request.cancel,
  };
}
