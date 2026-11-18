/**
 * usePagination 契约分页联动与空安全保底单元测试。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, effectScope, h, isReadonly, ref } from 'vue';
import { BusinessException, type PageQuery, type PageResult, type SortItem } from '@atengk/core';
import { createAtengVue, usePagination } from '../src';

interface TestUser {
  id: number;
  name: string;
}

interface TestUserQuery extends PageQuery {
  keyword?: string;
  status?: string;
}

describe('usePagination', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Seam 1: Out-of-the-box & Pagination Defaults', () => {
    it('should auto-run by default with current 1 and default size 10', async () => {
      const mockResult: PageResult<TestUser> = {
        records: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
        total: 2,
      };
      const service = vi.fn(async (_params: PageQuery) => mockResult);
      const scope = effectScope();

      let result!: ReturnType<typeof usePagination<TestUser>>;

      scope.run(() => {
        result = usePagination(service);
      });

      expect(result.loading.value).toBe(true);
      expect(result.current.value).toBe(1);
      expect(result.size.value).toBe(10);
      expect(result.records.value).toEqual([]);
      expect(result.total.value).toBe(0);

      await vi.runAllTimersAsync();

      expect(result.loading.value).toBe(false);
      expect(result.records.value).toEqual(mockResult.records);
      expect(result.total.value).toBe(2);
      expect(service).toHaveBeenCalledTimes(1);
      expect(service).toHaveBeenCalledWith(
        expect.objectContaining({
          current: 1,
          size: 10,
        }),
      );

      scope.stop();
    });

    it('should respect custom defaultCurrent and defaultSize options as MaybeRefOrGetter', async () => {
      const service = vi.fn(async (_params: PageQuery) => ({
        records: [{ id: 10, name: 'Ten' }],
        total: 50,
      }));
      const scope = effectScope();

      let result!: ReturnType<typeof usePagination<TestUser>>;

      scope.run(() => {
        result = usePagination(service, {
          defaultCurrent: () => 2,
          defaultSize: () => 20,
        });
      });

      expect(result.current.value).toBe(2);
      expect(result.size.value).toBe(20);

      await vi.runAllTimersAsync();

      expect(service).toHaveBeenCalledWith(
        expect.objectContaining({
          current: 2,
          size: 20,
        }),
      );

      scope.stop();
    });

    it('should fallback to defaultSize from AtengVue global context', async () => {
      const service = vi.fn(async (_params: PageQuery) => ({
        records: [],
        total: 0,
      }));

      let result!: ReturnType<typeof usePagination<TestUser>>;

      const app = createApp({
        setup() {
          result = usePagination(service);
          return () => h('div');
        },
      });

      app.use(createAtengVue({ defaultSize: 25 }));
      const root = document.createElement('div');
      app.mount(root);

      expect(result.size.value).toBe(25);

      await vi.runAllTimersAsync();

      expect(service).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 25,
        }),
      );

      app.unmount();
    });
  });

  describe('Seam 2: Null Safety & Defensive Return Invariant', () => {
    it('should guarantee records is [] when service returns null or undefined records', async () => {
      const badResponse = {
        records: null as unknown as TestUser[],
        total: 0,
      };
      const service = vi.fn(async () => badResponse);
      const scope = effectScope();

      let result!: ReturnType<typeof usePagination<TestUser>>;

      scope.run(() => {
        result = usePagination(service);
      });

      // Before request resolves
      expect(result.records.value).toEqual([]);

      await vi.runAllTimersAsync();

      // After request resolves with null records
      expect(result.records.value).toEqual([]);
      expect(Array.isArray(result.records.value)).toBe(true);
      expect(result.total.value).toBe(0);

      scope.stop();
    });

    it('should guarantee records is [] and total is 0 when service throws exception', async () => {
      const error = new BusinessException(500, 'Internal Server Error');
      const service = vi.fn(async () => {
        throw error;
      });
      const scope = effectScope();

      let result!: ReturnType<typeof usePagination<TestUser>>;

      scope.run(() => {
        result = usePagination(service);
      });

      await vi.runAllTimersAsync();

      expect(result.loading.value).toBe(false);
      expect(result.error.value).toBe(error);
      expect(result.records.value).toEqual([]);
      expect(Array.isArray(result.records.value)).toBe(true);
      expect(result.total.value).toBe(0);

      scope.stop();
    });

    it('should reset records to [] when a subsequent request encounters an error', async () => {
      let fail = false;
      const service = vi.fn(async (params: PageQuery) => {
        if (fail) {
          throw new BusinessException(500, 'Network Failed');
        }
        return {
          records: [{ id: params.current!, name: 'Success' }],
          total: 10,
        };
      });
      const scope = effectScope();

      let result!: ReturnType<typeof usePagination<TestUser>>;

      scope.run(() => {
        result = usePagination(service);
      });

      await vi.runAllTimersAsync();
      expect(result.records.value).toHaveLength(1);
      expect(result.total.value).toBe(10);

      // 下一次请求模拟失败
      fail = true;
      result.changePage(2);
      await vi.runAllTimersAsync();

      expect(result.error.value).toBeDefined();
      expect(result.records.value).toEqual([]);
      expect(result.total.value).toBe(0);

      scope.stop();
    });
  });

  describe('Seam 3: Atomic Pagination Actions & Reset-to-Page-1 Invariant', () => {
    it('changePage should switch current and fetch new page data', async () => {
      const service = vi.fn(async (params: PageQuery) => ({
        records: [{ id: params.current!, name: `User_${params.current}` }],
        total: 100,
      }));
      const scope = effectScope();

      let result!: ReturnType<typeof usePagination<TestUser>>;

      scope.run(() => {
        result = usePagination(service);
      });

      await vi.runAllTimersAsync();
      expect(result.current.value).toBe(1);

      // 翻到第 3 页
      result.changePage(3);
      expect(result.current.value).toBe(3);

      await vi.runAllTimersAsync();
      expect(service).toHaveBeenLastCalledWith(
        expect.objectContaining({
          current: 3,
        }),
      );

      // 非法页码安全保底为 1
      result.changePage(0);
      expect(result.current.value).toBe(1);

      await vi.runAllTimersAsync();
      expect(service).toHaveBeenLastCalledWith(
        expect.objectContaining({
          current: 1,
        }),
      );

      scope.stop();
    });

    it('changePageSize should update size, reset current to 1, and re-fetch', async () => {
      const service = vi.fn(async (_params: PageQuery) => ({
        records: [],
        total: 100,
      }));
      const scope = effectScope();

      let result!: ReturnType<typeof usePagination<TestUser>>;

      scope.run(() => {
        result = usePagination(service);
      });

      await vi.runAllTimersAsync();

      // 先翻到第 4 页
      result.changePage(4);
      await vi.runAllTimersAsync();
      expect(result.current.value).toBe(4);

      // 切换每页条数至 50
      result.changePageSize(50);
      expect(result.size.value).toBe(50);
      expect(result.current.value).toBe(1); // 自动归 1 页

      await vi.runAllTimersAsync();
      expect(service).toHaveBeenLastCalledWith(
        expect.objectContaining({
          current: 1,
          size: 50,
        }),
      );

      scope.stop();
    });

    it('search should merge extra query params, reset current to 1, and fetch', async () => {
      const service = vi.fn(async (_params: TestUserQuery) => ({
        records: [],
        total: 10,
      }));
      const scope = effectScope();

      let result!: ReturnType<typeof usePagination<TestUser, TestUserQuery>>;

      scope.run(() => {
        result = usePagination(service, {
          defaultParams: { status: 'ACTIVE' },
        });
      });

      await vi.runAllTimersAsync();
      expect(service).toHaveBeenLastCalledWith(
        expect.objectContaining({
          current: 1,
          status: 'ACTIVE',
        }),
      );

      // 先翻到第 5 页
      result.changePage(5);
      await vi.runAllTimersAsync();
      expect(result.current.value).toBe(5);

      // 触发搜索
      result.search({ keyword: 'jack' });
      expect(result.current.value).toBe(1); // 自动归 1 页

      await vi.runAllTimersAsync();
      expect(service).toHaveBeenLastCalledWith(
        expect.objectContaining({
          current: 1,
          status: 'ACTIVE',
          keyword: 'jack',
        }),
      );

      scope.stop();
    });

    it('reset should restore initial defaultParams and reset current to 1', async () => {
      const service = vi.fn(async (_params: TestUserQuery) => ({
        records: [],
        total: 10,
      }));
      const scope = effectScope();

      let result!: ReturnType<typeof usePagination<TestUser, TestUserQuery>>;

      scope.run(() => {
        result = usePagination(service, {
          defaultCurrent: 1,
          defaultSize: 10,
          defaultParams: { status: 'NORMAL' },
        });
      });

      await vi.runAllTimersAsync();

      // 执行搜索并翻页
      result.search({ keyword: 'temp_word', status: 'DISABLED' });
      result.changePage(3);
      await vi.runAllTimersAsync();

      expect(result.current.value).toBe(3);

      // 执行重置
      result.reset();
      expect(result.current.value).toBe(1);

      await vi.runAllTimersAsync();
      expect(service).toHaveBeenLastCalledWith({
        current: 1,
        size: 10,
        status: 'NORMAL',
      });

      scope.stop();
    });
  });

  describe('Seam 4: Inherited Request Invariants & State Protection', () => {
    it('all exposed reactive states should be readonly', () => {
      const service = vi.fn(async () => ({ records: [], total: 0 }));
      const scope = effectScope();

      let result!: ReturnType<typeof usePagination<TestUser>>;

      scope.run(() => {
        result = usePagination(service, { manual: true });
      });

      expect(isReadonly(result.current)).toBe(true);
      expect(isReadonly(result.size)).toBe(true);
      expect(isReadonly(result.sorts)).toBe(true);
      expect(isReadonly(result.total)).toBe(true);
      expect(isReadonly(result.records)).toBe(true);
      expect(isReadonly(result.loading)).toBe(true);
      expect(isReadonly(result.error)).toBe(true);
      expect(isReadonly(result.data)).toBe(true);
      expect(isReadonly(result.params)).toBe(true);

      scope.stop();
    });

    it('manual mode should not trigger service until run is called', async () => {
      const service = vi.fn(async () => ({ records: [], total: 0 }));
      const scope = effectScope();

      let result!: ReturnType<typeof usePagination<TestUser>>;

      scope.run(() => {
        result = usePagination(service, { manual: true });
      });

      await vi.runAllTimersAsync();
      expect(service).not.toHaveBeenCalled();

      result.run();
      await vi.runAllTimersAsync();
      expect(service).toHaveBeenCalledTimes(1);

      scope.stop();
    });

    it('refresh should re-run with current, size and params', async () => {
      const service = vi.fn(async (_params: TestUserQuery) => ({
        records: [{ id: 1, name: 'Refreshed' }],
        total: 1,
      }));
      const scope = effectScope();

      let result!: ReturnType<typeof usePagination<TestUser, TestUserQuery>>;

      scope.run(() => {
        result = usePagination(service, {
          defaultParams: { keyword: 'find_me' },
        });
      });

      await vi.runAllTimersAsync();
      expect(service).toHaveBeenCalledTimes(1);

      result.refresh();
      await vi.runAllTimersAsync();
      expect(service).toHaveBeenCalledTimes(2);
      expect(service).toHaveBeenLastCalledWith(
        expect.objectContaining({
          current: 1,
          keyword: 'find_me',
        }),
      );

      scope.stop();
    });

    it('mutate should allow local optimistic updates', async () => {
      const service = vi.fn(async () => ({
        records: [{ id: 1, name: 'Before' }],
        total: 1,
      }));
      const scope = effectScope();

      let result!: ReturnType<typeof usePagination<TestUser>>;

      scope.run(() => {
        result = usePagination(service);
      });

      await vi.runAllTimersAsync();
      expect(result.records.value[0]?.name).toBe('Before');

      result.mutate(prev => ({
        records: [{ id: 1, name: 'Mutated' }],
        total: prev?.total ?? 1,
      }));

      expect(result.records.value[0]?.name).toBe('Mutated');

      scope.stop();
    });

    it('should debounce requests when debounceInterval is configured', async () => {
      const service = vi.fn(async () => ({ records: [], total: 0 }));
      const scope = effectScope();

      let result!: ReturnType<typeof usePagination<TestUser>>;

      scope.run(() => {
        result = usePagination(service, {
          manual: true,
          debounceInterval: 300,
        });
      });

      result.changePage(2);
      result.changePage(3);
      result.changePage(4);

      expect(service).not.toHaveBeenCalled();

      // 前进 200ms
      await vi.advanceTimersByTimeAsync(200);
      expect(service).not.toHaveBeenCalled();

      // 再前进 150ms（超过 300ms 防抖间隔）
      await vi.advanceTimersByTimeAsync(150);
      expect(service).toHaveBeenCalledTimes(1);
      expect(service).toHaveBeenCalledWith(
        expect.objectContaining({
          current: 4,
        }),
      );

      scope.stop();
    });

    it('should cancel in-flight request on scope disposal', async () => {
      const service = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return { records: [], total: 0 };
      });
      const scope = effectScope();

      let result!: ReturnType<typeof usePagination<TestUser>>;

      scope.run(() => {
        result = usePagination(service);
      });

      expect(result.loading.value).toBe(true);

      // 作用域销毁
      scope.stop();

      expect(result.loading.value).toBe(false);
    });
  });

  describe('Seam 5: Sorting & changeSort (SortItem[])', () => {
    it('should initialize with sorts as empty array [] by default', async () => {
      const service = vi.fn(async (_params: PageQuery) => ({ records: [], total: 0 }));
      const scope = effectScope();
      let result!: ReturnType<typeof usePagination<TestUser>>;

      scope.run(() => {
        result = usePagination(service);
      });

      expect(result.sorts.value).toEqual([]);
      expect(isReadonly(result.sorts)).toBe(true);

      await vi.runAllTimersAsync();
      expect(service).toHaveBeenCalledWith({
        current: 1,
        size: 10,
      });

      scope.stop();
    });

    it('should initialize with defaultSorts option as MaybeRefOrGetter', async () => {
      const initialSorts: SortItem[] = [
        { property: 'createTime', direction: 'DESC' },
        { property: 'id', direction: 'ASC' },
      ];
      const service = vi.fn(async (_params: PageQuery) => ({ records: [], total: 0 }));
      const scope = effectScope();
      let result!: ReturnType<typeof usePagination<TestUser>>;

      scope.run(() => {
        result = usePagination(service, {
          defaultSorts: () => initialSorts,
        });
      });

      expect(result.sorts.value).toEqual(initialSorts);

      await vi.runAllTimersAsync();
      expect(service).toHaveBeenCalledWith(
        expect.objectContaining({
          sorts: initialSorts,
        }),
      );

      scope.stop();
    });

    it('should support single-field shorthand and SortItem[] array in changeSort, resetting current to 1', async () => {
      const service = vi.fn(async (_params: PageQuery) => ({ records: [], total: 0 }));
      const scope = effectScope();
      let result!: ReturnType<typeof usePagination<TestUser>>;

      scope.run(() => {
        result = usePagination(service, { defaultCurrent: 3 });
      });

      await vi.runAllTimersAsync();
      expect(result.current.value).toBe(3);

      // 1. 单字段简写：默认 ASC
      await result.changeSort('age');
      expect(result.sorts.value).toEqual([{ property: 'age', direction: 'ASC' }]);
      expect(result.current.value).toBe(1);
      expect(service).toHaveBeenLastCalledWith(
        expect.objectContaining({
          current: 1,
          sorts: [{ property: 'age', direction: 'ASC' }],
        }),
      );

      // 2. 单字段简写：指定 DESC
      await result.changeSort('age', 'DESC');
      expect(result.sorts.value).toEqual([{ property: 'age', direction: 'DESC' }]);
      expect(result.current.value).toBe(1);

      // 3. 多字段排序数组
      const multiSorts: SortItem[] = [
        { property: 'status', direction: 'ASC' },
        { property: 'createTime', direction: 'DESC' },
      ];
      await result.changeSort(multiSorts);
      expect(result.sorts.value).toEqual(multiSorts);
      expect(service).toHaveBeenLastCalledWith(
        expect.objectContaining({
          current: 1,
          sorts: multiSorts,
        }),
      );

      // 4. 清空排序（传入空数组或 undefined）
      await result.changeSort([]);
      expect(result.sorts.value).toEqual([]);
      expect(service).toHaveBeenLastCalledWith({
        current: 1,
        size: 10,
      });

      scope.stop();
    });

    it('should restore sorts to initial defaultSorts on reset()', async () => {
      const initialSorts: SortItem[] = [{ property: 'id', direction: 'ASC' }];
      const service = vi.fn(async (_params: PageQuery) => ({ records: [], total: 0 }));
      const scope = effectScope();
      let result!: ReturnType<typeof usePagination<TestUser>>;

      scope.run(() => {
        result = usePagination(service, {
          defaultSorts: initialSorts,
        });
      });

      await vi.runAllTimersAsync();
      expect(result.sorts.value).toEqual(initialSorts);

      // 调整为别的排序
      await result.changeSort('createTime', 'DESC');
      expect(result.sorts.value).toEqual([{ property: 'createTime', direction: 'DESC' }]);

      // 执行 reset()
      await result.reset();
      expect(result.sorts.value).toEqual(initialSorts);
      expect(result.current.value).toBe(1);

      expect(service).toHaveBeenLastCalledWith(
        expect.objectContaining({
          current: 1,
          sorts: initialSorts,
        }),
      );

      scope.stop();
    });
  });

  describe('Seam 6: refreshDeps in usePagination', () => {
    it('should reset current to 1 and re-fetch when refreshDeps changes', async () => {
      const service = vi.fn(async (_params: PageQuery) => ({ records: [], total: 0 }));
      const scope = effectScope();
      let result!: ReturnType<typeof usePagination<TestUser>>;

      const deptRef = ref(101);

      scope.run(() => {
        result = usePagination(service, {
          defaultCurrent: 4,
          refreshDeps: () => deptRef.value,
        });
      });

      await vi.runAllTimersAsync();
      expect(service).toHaveBeenCalledTimes(1);
      expect(result.current.value).toBe(4);

      // 依赖变化
      deptRef.value = 102;
      await vi.runAllTimersAsync();

      expect(service).toHaveBeenCalledTimes(2);
      expect(result.current.value).toBe(1);
      expect(service).toHaveBeenLastCalledWith(
        expect.objectContaining({
          current: 1,
        }),
      );

      scope.stop();
    });

    it('should not re-fetch when refreshDeps changes if ready is false', async () => {
      const isReady = ref(false);
      const deptRef = ref(101);
      const service = vi.fn(async (_params: PageQuery) => ({ records: [], total: 0 }));
      const scope = effectScope();

      scope.run(() => {
        usePagination(service, {
          ready: isReady,
          refreshDeps: deptRef,
        });
      });

      await vi.runAllTimersAsync();
      expect(service).not.toHaveBeenCalled();

      // 依赖变动但 ready 仍为 false
      deptRef.value = 102;
      await vi.runAllTimersAsync();
      expect(service).not.toHaveBeenCalled();

      // ready 变为 true
      isReady.value = true;
      await vi.runAllTimersAsync();
      expect(service).toHaveBeenCalledTimes(1);

      // 此时依赖变动触发重新查询
      deptRef.value = 103;
      await vi.runAllTimersAsync();
      expect(service).toHaveBeenCalledTimes(2);

      scope.stop();
    });
  });
});
