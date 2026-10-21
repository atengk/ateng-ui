/**
 * AtengTable 核心表格容器单元测试。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick, ref } from 'vue';
import { ElTableColumn } from 'element-plus';
import type { UsePaginationResult } from '@atengk/vue';
import { AtengTable, type AtengTableInstance } from '../src/components/table';

const doubleWait = async () => {
  await nextTick();
  await nextTick();
};

const createMockPagination = (overrides?: Record<string, unknown>) => {
  const pageNum = ref(1);
  const pageSize = ref(10);
  const total = ref(100);
  const list = ref([
    { id: '1001', username: '张三', age: 25 },
    { id: '1002', username: '李四', age: 30 },
  ]);
  const loading = ref(false);
  const error = ref<unknown>(null);
  const changePage = vi.fn(async (page: number) => {
    pageNum.value = page;
    return undefined;
  });
  const changePageSize = vi.fn(async (size: number) => {
    pageSize.value = size;
    pageNum.value = 1;
    return undefined;
  });
  const changeSort = vi.fn(async () => {
    pageNum.value = 1;
    return undefined;
  });
  const refresh = vi.fn(async () => undefined);

  return {
    pageNum,
    pageSize,
    total,
    list,
    loading,
    error,
    changePage,
    changePageSize,
    changeSort,
    refresh,
    search: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  } as unknown as UsePaginationResult<Record<string, unknown>>;
};

describe('AtengTable 组件规范与基础骨架测试', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
    localStorage.clear();
  });

  const mockData = [
    { id: '1001', username: '张三', age: 25, role: '工程师' },
    { id: '1002', username: '李四', age: 30, role: '架构师' },
  ];

  it('基础渲染与原生透传：正确渲染表格主体并透传数据与属性', async () => {
    wrapper = mount(AtengTable, {
      props: {
        data: mockData,
        border: true,
        stripe: true,
        rowKey: 'id',
      },
      slots: {
        default: () => [
          h(ElTableColumn, { prop: 'id', label: 'ID', width: 80 }),
          h(ElTableColumn, { prop: 'username', label: '用户名' }),
        ],
      },
      attachTo: document.body,
    });

    await doubleWait();

    expect(wrapper.classes()).toContain('at-table');
    expect(wrapper.find('.el-table').exists()).toBe(true);

    const text = wrapper.text();
    expect(text).toContain('张三');
    expect(text).toContain('李四');
  });

  it('VNode 渐进混合列解析：正确从默认插槽中提取列元数据', () => {
    wrapper = mount(AtengTable, {
      props: {
        data: mockData,
      },
      slots: {
        default: () => [
          h(ElTableColumn, { prop: 'id', label: '编号', width: 100, fixed: 'left' }),
          h(ElTableColumn, { prop: 'username', label: '姓名', minWidth: 120, sortable: true }),
        ],
      },
      attachTo: document.body,
    });

    const vm = wrapper.vm as unknown as AtengTableInstance;
    expect(vm.columns).toBeDefined();

    const cols = vm.columns;
    expect(cols.length).toBe(2);
    expect(cols[0].prop).toBe('id');
    expect(cols[0].label).toBe('编号');
    expect(cols[0].width).toBe(100);
    expect(cols[0].fixed).toBe('left');

    expect(cols[1].prop).toBe('username');
    expect(cols[1].label).toBe('姓名');
    expect(cols[1].minWidth).toBe(120);
    expect(cols[1].sortable).toBe(true);
  });

  it('属性列合并：支持通过 :columns 属性传入列定义并合并渲染', async () => {
    wrapper = mount(AtengTable, {
      props: {
        data: mockData,
        columns: [
          { prop: 'age', label: '年龄', width: 80 },
          { prop: 'role', label: '角色' },
        ],
      },
      slots: {
        default: () => [h(ElTableColumn, { prop: 'username', label: '姓名' })],
      },
      attachTo: document.body,
    });

    await doubleWait();

    const vm = wrapper.vm as unknown as AtengTableInstance;
    const cols = vm.columns;
    // 包含 2 个属性列 + 1 个插槽列
    expect(cols.length).toBe(3);

    const text = wrapper.text();
    expect(text).toContain('年龄');
    expect(text).toContain('角色');
    expect(text).toContain('姓名');
    expect(text).toContain('工程师');
  });

  it('Query 插槽支持：支持渲染顶部检索表单插槽', () => {
    wrapper = mount(AtengTable, {
      props: {
        data: mockData,
      },
      slots: {
        query: () => h('div', { class: 'custom-query-form' }, '搜索区'),
        default: () => [h(ElTableColumn, { prop: 'username', label: '姓名' })],
      },
      attachTo: document.body,
    });

    const queryArea = wrapper.find('.at-table__query');
    expect(queryArea.exists()).toBe(true);
    expect(queryArea.text()).toContain('搜索区');
  });

  it('实例暴露：defineExpose 正确对外提供 tableRef 与核心门面', () => {
    wrapper = mount(AtengTable, {
      props: {
        data: mockData,
        rowKey: 'id',
      },
      slots: {
        default: () => [h(ElTableColumn, { prop: 'username', label: '姓名' })],
      },
      attachTo: document.body,
    });

    const vm = wrapper.vm as unknown as AtengTableInstance;
    expect(vm.tableRef).toBeDefined();
    expect(typeof vm.clearSelection).toBe('function');
    expect(typeof vm.toggleRowSelection).toBe('function');
    expect(typeof vm.getSelectionRows).toBe('function');
    expect(typeof vm.refresh).toBe('function');
  });

  it('双轨分页绑定：正确绑定 usePagination 并在翻页与修改条数时调度状态机方法', async () => {
    const mockPagination = createMockPagination();

    wrapper = mount(AtengTable, {
      props: {
        pagination: mockPagination,
      },
      slots: {
        default: () => [h(ElTableColumn, { prop: 'username', label: '姓名' })],
      },
      attachTo: document.body,
    });

    await doubleWait();

    // 验证底部分页器被渲染
    const paginationComp = wrapper.findComponent({ name: 'ElPagination' });
    expect(paginationComp.exists()).toBe(true);

    // 验证表格行数据绑定自 pagination.list
    const text = wrapper.text();
    expect(text).toContain('张三');
    expect(text).toContain('李四');

    // 模拟触发翻页
    paginationComp.vm.$emit('current-change', 3);
    await doubleWait();

    expect(mockPagination.changePage).toHaveBeenCalledWith(3);
    expect(wrapper.emitted('page-change')?.[0]).toEqual([3]);
    expect(wrapper.emitted('update:pageNum')?.[0]).toEqual([3]);

    // 模拟触发修改每页条数
    paginationComp.vm.$emit('size-change', 20);
    await doubleWait();

    expect(mockPagination.changePageSize).toHaveBeenCalledWith(20);
    expect(wrapper.emitted('size-change')?.[0]).toEqual([20]);
    expect(wrapper.emitted('update:pageSize')?.[0]).toEqual([20]);
  });

  it('服务端排序联动：监听 ElTable 的 sort-change 并自动转换为 changeSort', async () => {
    const mockPagination = createMockPagination();

    wrapper = mount(AtengTable, {
      props: {
        pagination: mockPagination,
      },
      slots: {
        default: () => [h(ElTableColumn, { prop: 'age', label: '年龄', sortable: 'custom' })],
      },
      attachTo: document.body,
    });

    await doubleWait();

    const tableEl = wrapper.findComponent({ name: 'ElTable' });
    expect(tableEl.exists()).toBe(true);

    // 1. 模拟升序
    tableEl.vm.$emit('sort-change', { column: {}, prop: 'age', order: 'ascending' });
    await doubleWait();
    expect(mockPagination.changeSort).toHaveBeenCalledWith('age', true);
    expect(wrapper.emitted('sort-change')).toBeTruthy();

    // 2. 模拟降序
    tableEl.vm.$emit('sort-change', { column: {}, prop: 'age', order: 'descending' });
    await doubleWait();
    expect(mockPagination.changeSort).toHaveBeenCalledWith('age', false);

    // 3. 模拟取消排序
    tableEl.vm.$emit('sort-change', { column: {}, prop: 'age', order: null });
    await doubleWait();
    expect(mockPagination.changeSort).toHaveBeenCalledWith(undefined, undefined);
  });

  it('离散分页逃生门：无 pagination 时支持离散属性与 showPagination 控制', async () => {
    wrapper = mount(AtengTable, {
      props: {
        data: mockData,
        total: 50,
        pageNum: 2,
        pageSize: 10,
      },
      slots: {
        default: () => [h(ElTableColumn, { prop: 'username', label: '姓名' })],
      },
      attachTo: document.body,
    });

    await doubleWait();

    // 当有 total 时默认展示分页条
    expect(wrapper.find('.el-pagination').exists()).toBe(true);

    // 显式关闭分页
    await wrapper.setProps({ showPagination: false });
    await doubleWait();
    expect(wrapper.find('.el-pagination').exists()).toBe(false);
  });

  it('空状态与异常态：数据为空且未加载时渲染 AtengEmpty，异常态带有重试按钮', async () => {
    const errorState = ref<unknown>(new Error('Network Failed'));
    const listState = ref<Record<string, unknown>[]>([]);
    const mockPagination = createMockPagination({
      list: listState,
      total: ref(0),
      error: errorState,
    });

    wrapper = mount(AtengTable, {
      props: {
        pagination: mockPagination,
      },
      slots: {
        default: () => [h(ElTableColumn, { prop: 'username', label: '姓名' })],
      },
      attachTo: document.body,
    });

    await doubleWait();

    // 1. 存在 error 时，渲染 network-error 状态
    expect(wrapper.find('.at-empty--network-error').exists()).toBe(true);
    const retryBtn = wrapper.find('.at-empty button');
    expect(retryBtn.exists()).toBe(true);
    expect(retryBtn.text()).toContain('重试');

    // 点击重试按钮
    await retryBtn.trigger('click');
    expect(mockPagination.refresh).toHaveBeenCalled();
    expect(wrapper.emitted('refresh')).toBeTruthy();

    // 2. 无 error 且无数据时，渲染 empty 状态
    errorState.value = null;
    await doubleWait();

    expect(wrapper.find('.at-empty--empty').exists()).toBe(true);
  });

  it('自定义 empty 插槽：优先渲染用户传入的 empty 插槽内容', async () => {
    wrapper = mount(AtengTable, {
      props: {
        data: [],
      },
      slots: {
        default: () => [h(ElTableColumn, { prop: 'username', label: '姓名' })],
        empty: () => h('div', { class: 'custom-empty-slot' }, '自定义暂无数据内容'),
      },
      attachTo: document.body,
    });

    await doubleWait();

    expect(wrapper.find('.custom-empty-slot').exists()).toBe(true);
    expect(wrapper.text()).toContain('自定义暂无数据内容');
    expect(wrapper.find('.at-empty').exists()).toBe(false);
  });

  it('企业级工具栏：默认渲染工具栏并在 tools 禁用或指定子集时自适应', async () => {
    wrapper = mount(AtengTable, {
      props: {
        data: mockData,
      },
      slots: {
        default: () => [h(ElTableColumn, { prop: 'username', label: '姓名' })],
      },
      attachTo: document.body,
    });

    await doubleWait();

    // 默认工具栏存在
    expect(wrapper.find('.at-table__toolbar').exists()).toBe(true);
    expect(wrapper.find('.at-table__tools').exists()).toBe(true);
    expect(wrapper.findAll('.at-table__tool-btn').length).toBe(5);

    // 仅启用 refresh 和 stripe
    await wrapper.setProps({ tools: ['refresh', 'stripe'] });
    await doubleWait();
    expect(wrapper.findAll('.at-table__tool-btn').length).toBe(2);

    // 完全禁用工具栏
    await wrapper.setProps({ tools: false });
    await doubleWait();
    expect(wrapper.find('.at-table__toolbar').exists()).toBe(false);
  });

  it('工具栏交互：刷新、密度切换与斑马纹联动', async () => {
    wrapper = mount(AtengTable, {
      props: {
        data: mockData,
        density: 'default',
        stripe: false,
      },
      slots: {
        default: () => [h(ElTableColumn, { prop: 'username', label: '姓名' })],
      },
      attachTo: document.body,
    });

    await doubleWait();

    // 1. 刷新按钮
    const refreshBtn = wrapper.find('button[aria-label="刷新"]');
    expect(refreshBtn.exists()).toBe(true);
    await refreshBtn.trigger('click');
    expect(wrapper.emitted('refresh')).toBeTruthy();

    // 2. 斑马纹按钮切换
    const stripeBtn = wrapper.find('button[aria-label="斑马纹"]');
    expect(stripeBtn.exists()).toBe(true);
    expect(stripeBtn.classes()).not.toContain('is-active');

    await stripeBtn.trigger('click');
    await doubleWait();
    expect(stripeBtn.classes()).toContain('is-active');
    expect(wrapper.emitted('update:stripe')?.[0]).toEqual([true]);

    // 再次点击取消斑马纹
    await stripeBtn.trigger('click');
    await doubleWait();
    expect(stripeBtn.classes()).not.toContain('is-active');
    expect(wrapper.emitted('update:stripe')?.[1]).toEqual([false]);
  });

  it('工具栏全屏与 ESC 退出键盘事件监听', async () => {
    wrapper = mount(AtengTable, {
      props: {
        data: mockData,
      },
      slots: {
        default: () => [h(ElTableColumn, { prop: 'username', label: '姓名' })],
      },
      attachTo: document.body,
    });

    await doubleWait();

    const fullscreenBtn = wrapper.find('button[aria-label="全屏"]');
    expect(fullscreenBtn.exists()).toBe(true);

    // 点击切换为全屏
    await fullscreenBtn.trigger('click');
    await doubleWait();
    expect(wrapper.classes()).toContain('at-table--fullscreen');
    expect(wrapper.emitted('fullscreen-change')?.[0]).toEqual([true]);

    // 按下 ESC 键退出全屏
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await doubleWait();
    expect(wrapper.classes()).not.toContain('at-table--fullscreen');
    expect(wrapper.emitted('fullscreen-change')?.[1]).toEqual([false]);
  });

  it('列配置 Popover 与本地 localStorage 持久化', async () => {
    const storageKey = 'test-table-storage-columns';
    wrapper = mount(AtengTable, {
      props: {
        data: mockData,
        storageKey,
      },
      slots: {
        default: () => [
          h(ElTableColumn, { prop: 'id', label: '编号' }),
          h(ElTableColumn, { prop: 'username', label: '姓名' }),
        ],
      },
      attachTo: document.body,
    });

    await doubleWait();

    const colBtn = wrapper.find('button[aria-label="列设置"]');
    expect(colBtn.exists()).toBe(true);

    // 验证初始列均显示
    const vm = wrapper.vm as unknown as AtengTableInstance;
    expect(vm.columns.length).toBe(2);
    expect(vm.columns[0].visible).toBe(true);

    // 模拟取消勾选第一列 (编号)
    const checkboxes = wrapper.findAllComponents({ name: 'ElCheckbox' });
    // 寻找 label 匹配 '编号' 的 checkbox
    const idCheckbox = checkboxes.find(c => {
      const text = c.text();
      return text.includes('编号');
    });
    expect(idCheckbox).toBeDefined();

    idCheckbox!.vm.$emit('update:modelValue', false);
    idCheckbox!.vm.$emit('change', false);
    await doubleWait();

    // 验证 localStorage 记录了更新
    const stored = localStorage.getItem(storageKey);
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!)).toHaveProperty('id', false);

    // 验证当前生效列元数据中的 id 列 visible 已更新为 false
    expect(vm.columns[0].visible).toBe(false);

    // 点击重置按钮
    const resetBtn = wrapper.find('.at-table-column-setting__header button');
    if (resetBtn.exists()) {
      await resetBtn.trigger('click');
      await doubleWait();
      // 验证 localStorage 被清空，列恢复可见
      expect(localStorage.getItem(storageKey)).toBeNull();
      expect(vm.columns[0].visible).toBe(true);
    }
  });

  it('跨页多选与底部粘滞悬浮条：多选变更时动态滑出批量操作栏并派发事件', async () => {
    wrapper = mount(AtengTable, {
      props: {
        data: mockData,
        rowKey: 'id',
      },
      slots: {
        default: () => [
          h(ElTableColumn, { type: 'selection', width: 55 }),
          h(ElTableColumn, { prop: 'username', label: '姓名' }),
        ],
      },
      attachTo: document.body,
    });

    await doubleWait();

    // 初始状态下无选中项，批量悬浮条不渲染
    expect(wrapper.find('.at-table__batch-bar').exists()).toBe(false);

    const tableEl = wrapper.findComponent({ name: 'ElTable' });
    expect(tableEl.exists()).toBe(true);

    // 模拟选中两行
    const selectedItems = [mockData[0], mockData[1]];
    tableEl.vm.$emit('selection-change', selectedItems);
    await doubleWait();

    // 验证批量悬浮条已滑出
    const batchBar = wrapper.find('.at-table__batch-bar');
    expect(batchBar.exists()).toBe(true);
    expect(batchBar.text()).toContain('已选择 2 项');

    // 验证实例暴露的状态
    const vm = wrapper.vm as unknown as AtengTableInstance;
    expect(vm.selectedCount).toBe(2);
    expect(vm.selectedRows.length).toBe(2);

    // 验证事件派发
    expect(wrapper.emitted('selection-change')?.[0]).toEqual([selectedItems]);
    expect(wrapper.emitted('update:selectedRows')?.[0]).toEqual([selectedItems]);
  });

  it('清空勾选与批量操作插槽：支持点击清空按钮与自定义 batch-actions 作用域插槽', async () => {
    wrapper = mount(AtengTable, {
      props: {
        data: mockData,
        rowKey: 'id',
      },
      slots: {
        default: () => [
          h(ElTableColumn, { type: 'selection', width: 55 }),
          h(ElTableColumn, { prop: 'username', label: '姓名' }),
        ],
        'batch-actions': ({ selectedRows, clearSelection }) =>
          h(
            'button',
            {
              class: 'custom-batch-delete-btn',
              onClick: () => clearSelection(),
            },
            `批量删除 (${(selectedRows as unknown[]).length})`,
          ),
      },
      attachTo: document.body,
    });

    await doubleWait();

    const tableEl = wrapper.findComponent({ name: 'ElTable' });
    tableEl.vm.$emit('selection-change', [mockData[0]]);
    await doubleWait();

    // 验证批量操作插槽正确渲染
    const customBtn = wrapper.find('.custom-batch-delete-btn');
    expect(customBtn.exists()).toBe(true);
    expect(customBtn.text()).toContain('批量删除 (1)');

    // 触发清空
    const clearBtn = wrapper.find('.at-table__batch-bar-clear');
    expect(clearBtn.exists()).toBe(true);
    await clearBtn.trigger('click');
    await doubleWait();

    // 验证清空后批量条隐藏
    expect(wrapper.find('.at-table__batch-bar').exists()).toBe(false);
    const vm = wrapper.vm as unknown as AtengTableInstance;
    expect(vm.selectedCount).toBe(0);
    expect(vm.selectedRows.length).toBe(0);
  });

  it('批量悬浮条开关：支持通过 showBatchBar: false 显式关闭', async () => {
    wrapper = mount(AtengTable, {
      props: {
        data: mockData,
        rowKey: 'id',
        showBatchBar: false,
      },
      slots: {
        default: () => [
          h(ElTableColumn, { type: 'selection', width: 55 }),
          h(ElTableColumn, { prop: 'username', label: '姓名' }),
        ],
      },
      attachTo: document.body,
    });

    await doubleWait();

    const tableEl = wrapper.findComponent({ name: 'ElTable' });
    tableEl.vm.$emit('selection-change', [mockData[0]]);
    await doubleWait();

    // 即使有选中项，也不展示批量条
    expect(wrapper.find('.at-table__batch-bar').exists()).toBe(false);
  });
});
