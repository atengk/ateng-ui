/**
 * 契约分页状态机 Hook 实现。
 *
 * 基于 useRequest 深度组合，提供零样板分页状态调度、五维原子语义动作与硬性空安全保底。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import {
  computed,
  readonly,
  reactive,
  ref,
  toValue,
  watch,
  type DeepReadonly,
  type Ref,
} from 'vue';
import type { PageQuery, PageResult } from '@atengk/core';
import { useAtengConfig } from '../context';
import { useRequest } from '../request';
import { tryOnScopeDispose } from '../utils/lifecycle';
import type { UsePaginationOptions, UsePaginationResult, UsePaginationService } from './types';

/**
 * 契约分页状态机调度 Hook。
 *
 * @template TItem 列表项数据类型
 * @template TParams 查询参数类型（必须满足 PageQuery 契约）
 * @param service 分页请求服务函数
 * @param options 分页配置项
 * @returns 具备只读保护与五维原子动作的分页结果对象
 */
export function usePagination<TItem, TParams extends PageQuery = PageQuery>(
  service: UsePaginationService<TItem, TParams>,
  options: UsePaginationOptions<TItem, TParams> = {},
): UsePaginationResult<TItem, TParams> {
  const globalConfig = useAtengConfig();

  // 1. Vue 3.5 响应式解构入参解析：toValue 解包初始分页、排序与筛选参数
  const resolvedDefaultPageNum = toValue(options.defaultPageNum);
  const resolvedDefaultPageSize = toValue(options.defaultPageSize);
  const resolvedDefaultParams = toValue(options.defaultParams);
  const resolvedDefaultSortField = toValue(options.defaultSortField);
  const resolvedDefaultSortAsc = toValue(options.defaultSortAsc);

  const initialPageNum = Math.max(1, resolvedDefaultPageNum ?? 1);
  const initialPageSize =
    resolvedDefaultPageSize ??
    resolvedDefaultParams?.pageSize ??
    globalConfig.defaultPageSize ??
    10;
  const initialSortField = resolvedDefaultSortField ?? resolvedDefaultParams?.sortField;
  const initialSortAsc = resolvedDefaultSortAsc ?? resolvedDefaultParams?.sortAsc;
  const initialExtraParams = { ...(resolvedDefaultParams || {}) } as Partial<TParams>;

  const pageNum = ref<number>(initialPageNum);
  const pageSize = ref<number>(initialPageSize);
  const sortField = ref<string | undefined>(initialSortField);
  const sortAsc = ref<boolean | undefined>(initialSortAsc);
  const extraParams = ref<Partial<TParams>>({ ...initialExtraParams });
  const query = reactive<Record<string, unknown>>({ ...initialExtraParams }) as Partial<TParams>;

  /**
   * 构建当前生效的完整分页请求入参（override 优先级最高）。
   */
  const buildCurrentParams = (override?: Partial<TParams>): TParams => {
    return {
      ...extraParams.value,
      ...query,
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      sortField: sortField.value,
      sortAsc: sortAsc.value,
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
    if ('sortField' in override) {
      sortField.value = override.sortField;
    }
    if ('sortAsc' in override) {
      sortAsc.value = override.sortAsc;
    }
    extraParams.value = {
      ...extraParams.value,
      ...override,
    };
    Object.assign(query, override);
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

  // 4. 五维原子语义动作定义

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
   * 排序动作：更新 sortField 与 sortAsc，将 pageNum 归 1 并重新发起请求。
   * 若 field 为空或未传，则清除当前排序。
   */
  const changeSort = (field?: string, asc?: boolean): Promise<PageResult<TItem> | undefined> => {
    sortField.value = field || undefined;
    sortAsc.value = field ? (asc ?? true) : undefined;
    pageNum.value = 1;
    return request.run(
      buildCurrentParams({
        pageNum: 1,
        sortField: sortField.value,
        sortAsc: sortAsc.value,
      } as Partial<TParams>),
    );
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
      Object.assign(query, newExtraParams);
    } else {
      extraParams.value = {
        ...extraParams.value,
        ...query,
      };
    }
    pageNum.value = 1;
    return request.run(buildCurrentParams({ pageNum: 1 } as Partial<TParams>));
  };

  /**
   * 重置动作：恢复初始 defaultParams 筛选条件与排序，将 pageNum 归 1 重新发起请求。
   */
  const reset = (): Promise<PageResult<TItem> | undefined> => {
    extraParams.value = { ...initialExtraParams };
    for (const key of Object.keys(query)) {
      if (!(key in initialExtraParams)) {
        delete (query as Record<string, unknown>)[key];
      }
    }
    Object.assign(query, initialExtraParams);
    sortField.value = initialSortField;
    sortAsc.value = initialSortAsc;
    pageNum.value = 1;
    return request.run({
      ...initialExtraParams,
      pageNum: 1,
      pageSize: pageSize.value,
      sortField: initialSortField,
      sortAsc: initialSortAsc,
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

  // 5. 响应式依赖变化时自动将页码重置归 1 并触发重新查询（严格受 ready 守卫保护）
  if (options.refreshDeps !== undefined) {
    const stopWatch = watch(
      options.refreshDeps,
      () => {
        const isReady = options.ready === undefined ? true : toValue(options.ready);
        if (isReady) {
          pageNum.value = 1;
          request.run(buildCurrentParams({ pageNum: 1 } as Partial<TParams>));
        }
      },
      { deep: true },
    );
    tryOnScopeDispose(stopWatch);
  }

  return {
    query,
    pageNum: readonly(pageNum) as DeepReadonly<Ref<number>>,
    pageSize: readonly(pageSize) as DeepReadonly<Ref<number>>,
    sortField: readonly(sortField) as DeepReadonly<Ref<string | undefined>>,
    sortAsc: readonly(sortAsc) as DeepReadonly<Ref<boolean | undefined>>,
    total: readonly(total) as DeepReadonly<Ref<number>>,
    list: readonly(list) as DeepReadonly<Ref<TItem[]>>,
    loading: request.loading,
    error: request.error,
    data: request.data,
    params: request.params,
    changePage,
    changePageSize,
    changeSort,
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
