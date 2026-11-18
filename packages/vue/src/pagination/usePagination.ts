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
import type { PageQuery, PageResult, SortDirection, SortItem } from '@atengk/core';
import { useAtengConfig } from '../context';
import { useRequest } from '../request';
import { tryOnScopeDispose } from '../utils/lifecycle';
import type {
  ChangeSortFn,
  UsePaginationOptions,
  UsePaginationResult,
  UsePaginationService,
} from './types';

/**
 * 规范化多字段排序规则列表，过滤空白字段并生成防御性副本。
 */
function normalizeSorts(raw?: SortItem[] | null): SortItem[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [];
  }
  return raw
    .filter(item => item && typeof item.property === 'string' && item.property.trim().length > 0)
    .map(item => ({
      property: item.property.trim(),
      direction: item.direction === 'DESC' ? 'DESC' : 'ASC',
    }));
}

/**
 * 将规范化后的排序规则写入请求参数字典；为空时移除 sorts 字段避免冗余空数组透传。
 */
function applySortsParam(target: Record<string, unknown>, sortList: SortItem[]): void {
  if (sortList.length > 0) {
    target.sorts = sortList.map(item => ({ ...item }));
  } else {
    delete target.sorts;
  }
}

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
  const resolvedDefaultCurrent = toValue(options.defaultCurrent);
  const resolvedDefaultSize = toValue(options.defaultSize);
  const resolvedDefaultParams = toValue(options.defaultParams);
  const resolvedDefaultSorts = toValue(options.defaultSorts);

  const initialCurrent = Math.max(1, resolvedDefaultCurrent ?? resolvedDefaultParams?.current ?? 1);
  const initialSize =
    resolvedDefaultSize ?? resolvedDefaultParams?.size ?? globalConfig.defaultSize ?? 10;
  const initialSorts = normalizeSorts(resolvedDefaultSorts ?? resolvedDefaultParams?.sorts);
  const initialExtraParams = { ...(resolvedDefaultParams || {}) } as Partial<TParams>;

  const current = ref<number>(initialCurrent);
  const size = ref<number>(initialSize);
  const sorts = ref<SortItem[]>(initialSorts);
  const extraParams = ref<Partial<TParams>>({ ...initialExtraParams });
  const query = reactive<Record<string, unknown>>({ ...initialExtraParams }) as Partial<TParams>;

  /**
   * 构建当前生效的完整分页请求入参（override 优先级最高）。
   */
  const buildCurrentParams = (override?: Partial<TParams>): TParams => {
    const merged: Record<string, unknown> = {
      ...extraParams.value,
      ...query,
      current: current.value,
      size: size.value,
      ...override,
    };

    if (override && 'sorts' in override) {
      applySortsParam(merged, normalizeSorts(override.sorts));
    } else {
      applySortsParam(merged, sorts.value);
    }

    return merged as TParams;
  };

  /**
   * 同步更新覆盖入参至内部响应式状态。
   */
  const applyOverrideParams = (override?: Partial<TParams>): void => {
    if (!override) return;
    if (override.current !== undefined) {
      current.value = Math.max(1, Math.floor(override.current));
    }
    if (override.size !== undefined) {
      size.value = Math.max(1, Math.floor(override.size));
    }
    if ('sorts' in override) {
      sorts.value = normalizeSorts(override.sorts);
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
      // 空安全硬性保底：无论服务端返回 null、undefined 还是缺少 records 属性，100% 保底返回 []
      const safeRecords = Array.isArray(res?.records) ? res.records : [];
      const safeTotal =
        typeof res?.total === 'number' && !Number.isNaN(res.total) && res.total >= 0
          ? res.total
          : safeRecords.length;

      return {
        ...res,
        records: safeRecords,
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

  const records = computed(() => {
    if (request.error.value) {
      return [];
    }
    return request.data.value?.records ?? [];
  });

  // 4. 五维原子语义动作定义

  /**
   * 翻页动作：修改 current 并发起请求。
   */
  const changePage = (page: number): Promise<PageResult<TItem> | undefined> => {
    const safePage = Math.max(1, Math.floor(page || 1));
    current.value = safePage;
    return request.run(buildCurrentParams({ current: safePage } as Partial<TParams>));
  };

  /**
   * 修改每页条数动作：更新 size，将 current 归 1 并重新发起请求。
   */
  const changePageSize = (nextSize: number): Promise<PageResult<TItem> | undefined> => {
    const safeSize = Math.max(1, Math.floor(nextSize || 10));
    size.value = safeSize;
    current.value = 1;
    return request.run(buildCurrentParams({ current: 1, size: safeSize } as Partial<TParams>));
  };

  /**
   * 排序动作：更新 sorts 排序规则列表，将 current 归 1 并重新发起请求。
   * 支持 SortItem[] 多字段数组或单字段 (property, direction) 简写，传空或空数组则清空排序。
   */
  const changeSort: ChangeSortFn<TItem> = (
    propertyOrSorts?: string | SortItem[],
    direction?: SortDirection,
  ): Promise<PageResult<TItem> | undefined> => {
    if (Array.isArray(propertyOrSorts)) {
      sorts.value = normalizeSorts(propertyOrSorts);
    } else if (typeof propertyOrSorts === 'string' && propertyOrSorts.trim().length > 0) {
      sorts.value = [
        {
          property: propertyOrSorts.trim(),
          direction: direction === 'DESC' ? 'DESC' : 'ASC',
        },
      ];
    } else {
      sorts.value = [];
    }

    current.value = 1;
    return request.run(buildCurrentParams({ current: 1 } as Partial<TParams>));
  };

  /**
   * 搜索动作：合并额外筛选条件，将 current 归 1 并重新发起请求。
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
    current.value = 1;
    return request.run(buildCurrentParams({ current: 1 } as Partial<TParams>));
  };

  /**
   * 重置动作：恢复初始 defaultParams 筛选条件与 defaultSorts 排序，将 current 归 1 重新发起请求。
   */
  const reset = (): Promise<PageResult<TItem> | undefined> => {
    extraParams.value = { ...initialExtraParams };
    for (const key of Object.keys(query)) {
      if (!(key in initialExtraParams)) {
        delete (query as Record<string, unknown>)[key];
      }
    }
    Object.assign(query, initialExtraParams);
    sorts.value = normalizeSorts(initialSorts);
    current.value = 1;

    const resetParams: Record<string, unknown> = {
      ...initialExtraParams,
      current: 1,
      size: size.value,
    };
    applySortsParam(resetParams, sorts.value);

    return request.run(resetParams as TParams);
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
          current.value = 1;
          request.run(buildCurrentParams({ current: 1 } as Partial<TParams>));
        }
      },
      { deep: true },
    );
    tryOnScopeDispose(stopWatch);
  }

  return {
    query,
    current: readonly(current) as DeepReadonly<Ref<number>>,
    size: readonly(size) as DeepReadonly<Ref<number>>,
    sorts: readonly(sorts) as DeepReadonly<Ref<SortItem[]>>,
    total: readonly(total) as DeepReadonly<Ref<number>>,
    records: readonly(records) as DeepReadonly<Ref<TItem[]>>,
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
