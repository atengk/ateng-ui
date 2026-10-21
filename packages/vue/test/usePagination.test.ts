/**
 * usePagination 契约分页联动与空安全保底单元测试。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, effectScope, h, isReadonly, ref } from 'vue';
import { BusinessException, type PageQuery, type PageResult } from '@atengk/core';
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
    it('should auto-run by default with pageNum 1 and default pageSize 10', async () => {
      const mockResult: PageResult<TestUser> = {
        list: [
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
      expect(result.pageNum.value).toBe(1);
      expect(result.pageSize.value).toBe(10);
      expect(result.list.value).toEqual([]);
      expect(result.total.value).toBe(0);

      await vi.runAllTimersAsync();

      expect(result.loading.value).toBe(false);
      expect(result.list.value).toEqual(mockResult.list);
      expect(result.total.value).toBe(2);
      expect(service).toHaveBeenCalledTimes(1);
      expect(service).toHaveBeenCalledWith(
        expect.objectContaining({
          pageNum: 1,
          pageSize: 10,
        }),
      );

      scope.stop();
    });

    it('should respect custom defaultPageNum and defaultPageSize options as MaybeRefOrGetter', async () => {
      const service = vi.fn(async (_params: PageQuery) => ({
        list: [{ id: 10, name: 'Ten' }],
        total: 50,
      }));
      const scope = effectScope();

      let result!: ReturnType<typeof usePagination<TestUser>>;

      scope.run(() => {
        result = usePagination(service, {
          defaultPageNum: () => 2,
          defaultPageSize: () => 20,
        });
      });

      expect(result.pageNum.value).toBe(2);
      expect(result.pageSize.value).toBe(20);

      await vi.runAllTimersAsync();

      expect(service).toHaveBeenCalledWith(
        expect.objectContaining({
          pageNum: 2,
          pageSize: 20,
        }),
      );

      scope.stop();
    });

    it('should fallback to defaultPageSize from AtengVue global context', async () => {
      const service = vi.fn(async (_params: PageQuery) => ({
        list: [],
        total: 0,
      }));

      let result!: ReturnType<typeof usePagination<TestUser>>;

      const app = createApp({
        setup() {
          result = usePagination(service);
          return () => h('div');
        },
      });

      app.use(createAtengVue({ defaultPageSize: 25 }));
      const root = document.createElement('div');
      app.mount(root);

      expect(result.pageSize.value).toBe(25);

      await vi.runAllTimersAsync();

      expect(service).toHaveBeenCalledWith(
        expect.objectContaining({
          pageSize: 25,
        }),
      );

      app.unmount();
    });
  });

  describe('Seam 2: Null Safety & Defensive Return Invariant', () => {
    it('should guarantee list is [] when service returns null or undefined list', async () => {
      const badResponse = {
        list: null as unknown as TestUser[],
        total: 0,
      };
      const service = vi.fn(async () => badResponse);
      const scope = effectScope();

      let result!: ReturnType<typeof usePagination<TestUser>>;

      scope.run(() => {
        result = usePagination(service);
      });

      // Before request resolves
      expect(result.list.value).toEqual([]);

      await vi.runAllTimersAsync();

      // After request resolves with null list
      expect(result.list.value).toEqual([]);
      expect(Array.isArray(result.list.value)).toBe(true);
      expect(result.total.value).toBe(0);

      scope.stop();
    });

    it('should guarantee list is [] and total is 0 when service throws exception', async () => {
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
      expect(result.list.value).toEqual([]);
      expect(Array.isArray(result.list.value)).toBe(true);
      expect(result.total.value).toBe(0);

      scope.stop();
    });

    it('should reset list to [] when a subsequent request encounters an error', async () => {
      let fail = false;
      const service = vi.fn(async (params: PageQuery) => {
        if (fail) {
          throw new BusinessException(500, 'Network Failed');
        }
        return {
          list: [{ id: params.pageNum!, name: 'Success' }],
          total: 10,
        };
      });
      const scope = effectScope();

      let result!: ReturnType<typeof usePagination<TestUser>>;

      scope.run(() => {
        result = usePagination(service);
      });

      await vi.runAllTimersAsync();
      expect(result.list.value).toHaveLength(1);
      expect(result.total.value).toBe(10);

      // 下一次请求模拟失败
      fail = true;
      result.changePage(2);
      await vi.runAllTimersAsync();

      expect(result.error.value).toBeDefined();
      expect(result.list.value).toEqual([]);
      expect(result.total.value).toBe(0);

      scope.stop();
    });
  });

  describe('Seam 3: Atomic Pagination Actions & Reset-to-Page-1 Invariant', () => {
    it('changePage should switch pageNum and fetch new page data', async () => {
      const service = vi.fn(async (params: PageQuery) => ({
        list: [{ id: params.pageNum!, name: `User_${params.pageNum}` }],
        total: 100,
      }));
      const scope = effectScope();

      let result!: ReturnType<typeof usePagination<TestUser>>;

      scope.run(() => {
        result = usePagination(service);
      });

      await vi.runAllTimersAsync();
      expect(result.pageNum.value).toBe(1);

      // 翻到第 3 页
      result.changePage(3);
      expect(result.pageNum.value).toBe(3);

      await vi.runAllTimersAsync();
      expect(service).toHaveBeenLastCalledWith(
        expect.objectContaining({
          pageNum: 3,
        }),
      );

      // 非法页码安全保底为 1
      result.changePage(0);
      expect(result.pageNum.value).toBe(1);

      await vi.runAllTimersAsync();
      expect(service).toHaveBeenLastCalledWith(
        expect.objectContaining({
          pageNum: 1,
        }),
      );

      scope.stop();
    });

    it('changePageSize should update pageSize, reset pageNum to 1, and re-fetch', async () => {
      const service = vi.fn(async (_params: PageQuery) => ({
        list: [],
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
      expect(result.pageNum.value).toBe(4);

      // 切换每页条数至 50
      result.changePageSize(50);
      expect(result.pageSize.value).toBe(50);
      expect(result.pageNum.value).toBe(1); // 自动归 1 页

      await vi.runAllTimersAsync();
      expect(service).toHaveBeenLastCalledWith(
        expect.objectContaining({
          pageNum: 1,
          pageSize: 50,
        }),
      );

      scope.stop();
    });

    it('search should merge extra query params, reset pageNum to 1, and fetch', async () => {
      const service = vi.fn(async (_params: TestUserQuery) => ({
        list: [],
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
          pageNum: 1,
          status: 'ACTIVE',
        }),
      );

      // 先翻到第 5 页
      result.changePage(5);
      await vi.runAllTimersAsync();
      expect(result.pageNum.value).toBe(5);

      // 触发搜索
      result.search({ keyword: 'jack' });
      expect(result.pageNum.value).toBe(1); // 自动归 1 页

      await vi.runAllTimersAsync();
      expect(service).toHaveBeenLastCalledWith(
        expect.objectContaining({
          pageNum: 1,
          status: 'ACTIVE',
          keyword: 'jack',
        }),
      );

      scope.stop();
    });

    it('reset should restore initial defaultParams and reset pageNum to 1', async () => {
      const service = vi.fn(async (_params: TestUserQuery) => ({
        list: [],
        total: 10,
      }));
      const scope = effectScope();

      let result!: ReturnType<typeof usePagination<TestUser, TestUserQuery>>;

      scope.run(() => {
        result = usePagination(service, {
          defaultPageNum: 1,
          defaultPageSize: 10,
          defaultParams: { status: 'NORMAL' },
        });
      });

      await vi.runAllTimersAsync();

      // 执行搜索并翻页
      result.search({ keyword: 'temp_word', status: 'DISABLED' });
      result.changePage(3);
      await vi.runAllTimersAsync();

      expect(result.pageNum.value).toBe(3);

      // 执行重置
      result.reset();
      expect(result.pageNum.value).toBe(1);

      await vi.runAllTimersAsync();
      expect(service).toHaveBeenLastCalledWith({
        pageNum: 1,
        pageSize: 10,
        status: 'NORMAL',
      });

      scope.stop();
    });
  });

  describe('Seam 4: Inherited Request Invariants & State Protection', () => {
    it('all exposed reactive states should be readonly', () => {
      const service = vi.fn(async () => ({ list: [], total: 0 }));
      const scope = effectScope();

      let result!: ReturnType<typeof usePagination<TestUser>>;

      scope.run(() => {
        result = usePagination(service, { manual: true });
      });

      expect(isReadonly(result.pageNum)).toBe(true);
      expect(isReadonly(result.pageSize)).toBe(true);
      expect(isReadonly(result.total)).toBe(true);
      expect(isReadonly(result.list)).toBe(true);
      expect(isReadonly(result.loading)).toBe(true);
      expect(isReadonly(result.error)).toBe(true);
      expect(isReadonly(result.data)).toBe(true);
      expect(isReadonly(result.params)).toBe(true);

      scope.stop();
    });

    it('manual mode should not trigger service until run is called', async () => {
      const service = vi.fn(async () => ({ list: [], total: 0 }));
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

    it('refresh should re-run with current pageNum, pageSize and params', async () => {
      const service = vi.fn(async (_params: TestUserQuery) => ({
        list: [{ id: 1, name: 'Refreshed' }],
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
          pageNum: 1,
          keyword: 'find_me',
        }),
      );

      scope.stop();
    });

    it('mutate should allow local optimistic updates', async () => {
      const service = vi.fn(async () => ({
        list: [{ id: 1, name: 'Before' }],
        total: 1,
      }));
      const scope = effectScope();

      let result!: ReturnType<typeof usePagination<TestUser>>;

      scope.run(() => {
        result = usePagination(service);
      });

      await vi.runAllTimersAsync();
      expect(result.list.value[0]?.name).toBe('Before');

      result.mutate(prev => ({
        list: [{ id: 1, name: 'Mutated' }],
        total: prev?.total ?? 1,
      }));

      expect(result.list.value[0]?.name).toBe('Mutated');

      scope.stop();
    });

    it('should debounce requests when debounceInterval is configured', async () => {
      const service = vi.fn(async () => ({ list: [], total: 0 }));
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
          pageNum: 4,
        }),
      );

      scope.stop();
    });

    it('should cancel in-flight request on scope disposal', async () => {
      const service = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return { list: [], total: 0 };
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

  describe('Seam: Sorting & changeSort', () => {
    it('should initialize with sortField and sortAsc as undefined by default', async () => {
      const service = vi.fn(async (_params: PageQuery) => ({ list: [], total: 0 }));
      const scope = effectScope();
      let result!: ReturnType<typeof usePagination<TestUser>>;

      scope.run(() => {
        result = usePagination(service);
      });

      expect(result.sortField.value).toBeUndefined();
      expect(result.sortAsc.value).toBeUndefined();
      expect(isReadonly(result.sortField)).toBe(true);
      expect(isReadonly(result.sortAsc)).toBe(true);

      await vi.runAllTimersAsync();
      expect(service).toHaveBeenCalledWith(
        expect.objectContaining({
          pageNum: 1,
          pageSize: 10,
          sortField: undefined,
          sortAsc: undefined,
        }),
      );

      scope.stop();
    });

    it('should initialize with defaultSortField and defaultSortAsc options', async () => {
      const service = vi.fn(async (_params: PageQuery) => ({ list: [], total: 0 }));
      const scope = effectScope();
      let result!: ReturnType<typeof usePagination<TestUser>>;

      scope.run(() => {
        result = usePagination(service, {
          defaultSortField: () => 'createTime',
          defaultSortAsc: () => false,
        });
      });

      expect(result.sortField.value).toBe('createTime');
      expect(result.sortAsc.value).toBe(false);

      await vi.runAllTimersAsync();
      expect(service).toHaveBeenCalledWith(
        expect.objectContaining({
          sortField: 'createTime',
          sortAsc: false,
        }),
      );

      scope.stop();
    });

    it('should update sortField/sortAsc, reset pageNum to 1 and trigger request on changeSort', async () => {
      const service = vi.fn(async (_params: PageQuery) => ({ list: [], total: 0 }));
      const scope = effectScope();
      let result!: ReturnType<typeof usePagination<TestUser>>;

      scope.run(() => {
        result = usePagination(service, { defaultPageNum: 3 });
      });

      await vi.runAllTimersAsync();
      expect(result.pageNum.value).toBe(3);

      // 切换排序为 age 升序
      await result.changeSort('age', true);
      expect(result.sortField.value).toBe('age');
      expect(result.sortAsc.value).toBe(true);
      expect(result.pageNum.value).toBe(1);

      expect(service).toHaveBeenLastCalledWith(
        expect.objectContaining({
          pageNum: 1,
          sortField: 'age',
          sortAsc: true,
        }),
      );

      // 切换为 age 降序
      await result.changeSort('age', false);
      expect(result.sortField.value).toBe('age');
      expect(result.sortAsc.value).toBe(false);
      expect(result.pageNum.value).toBe(1);

      expect(service).toHaveBeenLastCalledWith(
        expect.objectContaining({
          pageNum: 1,
          sortField: 'age',
          sortAsc: false,
        }),
      );

      // 清除排序
      await result.changeSort(undefined);
      expect(result.sortField.value).toBeUndefined();
      expect(result.sortAsc.value).toBeUndefined();

      expect(service).toHaveBeenLastCalledWith(
        expect.objectContaining({
          pageNum: 1,
          sortField: undefined,
          sortAsc: undefined,
        }),
      );

      scope.stop();
    });

    it('should restore sortField and sortAsc to initial state on reset()', async () => {
      const service = vi.fn(async (_params: PageQuery) => ({ list: [], total: 0 }));
      const scope = effectScope();
      let result!: ReturnType<typeof usePagination<TestUser>>;

      scope.run(() => {
        result = usePagination(service, {
          defaultSortField: 'id',
          defaultSortAsc: true,
        });
      });

      await vi.runAllTimersAsync();
      expect(result.sortField.value).toBe('id');
      expect(result.sortAsc.value).toBe(true);

      // 调整为别的排序
      await result.changeSort('createTime', false);
      expect(result.sortField.value).toBe('createTime');
      expect(result.sortAsc.value).toBe(false);

      // 执行 reset()
      await result.reset();
      expect(result.sortField.value).toBe('id');
      expect(result.sortAsc.value).toBe(true);
      expect(result.pageNum.value).toBe(1);

      expect(service).toHaveBeenLastCalledWith(
        expect.objectContaining({
          pageNum: 1,
          sortField: 'id',
          sortAsc: true,
        }),
      );

      scope.stop();
    });
  });

  describe('Seam: refreshDeps in usePagination', () => {
    it('should reset pageNum to 1 and re-fetch when refreshDeps changes', async () => {
      const service = vi.fn(async (_params: PageQuery) => ({ list: [], total: 0 }));
      const scope = effectScope();
      let result!: ReturnType<typeof usePagination<TestUser>>;

      const deptRef = ref(101);

      scope.run(() => {
        result = usePagination(service, {
          defaultPageNum: 4,
          refreshDeps: () => deptRef.value,
        });
      });

      await vi.runAllTimersAsync();
      expect(service).toHaveBeenCalledTimes(1);
      expect(result.pageNum.value).toBe(4);

      // 依赖变化
      deptRef.value = 102;
      await vi.runAllTimersAsync();

      expect(service).toHaveBeenCalledTimes(2);
      expect(result.pageNum.value).toBe(1);
      expect(service).toHaveBeenLastCalledWith(
        expect.objectContaining({
          pageNum: 1,
        }),
      );

      scope.stop();
    });

    it('should not re-fetch when refreshDeps changes if ready is false', async () => {
      const isReady = ref(false);
      const deptRef = ref(101);
      const service = vi.fn(async (_params: PageQuery) => ({ list: [], total: 0 }));
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
