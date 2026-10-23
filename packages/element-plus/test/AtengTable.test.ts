/**
 * AtengTable 核心表格容器单元测试。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick, ref } from 'vue';
import { ElTableColumn, ElFormItem, ElInput } from 'element-plus';
import type { UsePaginationResult } from '@atengk/vue';
import { AtengTable, type AtengTableInstance, type AtengTableProps } from '../src/components/table';
import { AtengQueryForm } from '../src/components/query-form';

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

  it('多态缺省态：无筛选参数时渲染 status="empty"，存在活跃筛选参数时渲染 status="search" 并提供清空重置自愈按钮', async () => {
    const listState = ref<Record<string, unknown>[]>([]);
    const queryState = ref<Record<string, unknown>>({ keyword: '张三' });
    const mockPagination = createMockPagination({
      list: listState,
      total: ref(0),
      query: queryState,
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

    // 1. 存在活跃筛选参数且数据为空时，渲染 search 状态与“未找到符合条件的检索结果”
    expect(wrapper.find('.at-empty--search').exists()).toBe(true);
    expect(wrapper.text()).toContain('未找到符合条件的检索结果');

    // 2. 渲染内置“清空筛选条件”按钮
    const clearBtn = wrapper.find('.at-empty button');
    expect(clearBtn.exists()).toBe(true);
    expect(clearBtn.text()).toContain('清空筛选条件');

    // 3. 点击“清空筛选条件”按钮，自动调度 tableContext.reset()
    await clearBtn.trigger('click');
    expect(mockPagination.reset).toHaveBeenCalled();

    // 4. 重置后若查询参数已清空，回退为普通暂无数据状态
    queryState.value = {};
    await doubleWait();
    expect(wrapper.find('.at-empty--empty').exists()).toBe(true);
    expect(wrapper.find('.at-empty--search').exists()).toBe(false);
  });

  it('多态缺省态优先级：用户自定义 #empty 插槽 > 异常状态 (network-error) > 搜索空状态 (search) > 默认空状态 (empty)', async () => {
    const errorState = ref<unknown>(new Error('Query timeout'));
    const queryState = ref<Record<string, unknown>>({ status: 'active' });
    const mockPagination = createMockPagination({
      list: ref([]),
      total: ref(0),
      error: errorState,
      query: queryState,
    });

    // 1. 同时存在 error 与 query 时，优先渲染 network-error 状态
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
    expect(wrapper.find('.at-empty--network-error').exists()).toBe(true);
    expect(wrapper.find('.at-empty--search').exists()).toBe(false);

    // 2. 异常清除后，退回展示 search 状态
    errorState.value = null;
    await doubleWait();
    expect(wrapper.find('.at-empty--network-error').exists()).toBe(false);
    expect(wrapper.find('.at-empty--search').exists()).toBe(true);

    wrapper.unmount();

    // 3. 显式提供 #empty 插槽时，即便存在 error 与 query，插槽保持最高优先级
    wrapper = mount(AtengTable, {
      props: {
        pagination: mockPagination,
      },
      slots: {
        default: () => [h(ElTableColumn, { prop: 'username', label: '姓名' })],
        empty: () => h('div', { class: 'highest-priority-slot' }, '用户最高优先级空插槽'),
      },
      attachTo: document.body,
    });

    await doubleWait();
    expect(wrapper.find('.highest-priority-slot').exists()).toBe(true);
    expect(wrapper.find('.at-empty').exists()).toBe(false);
  });

  it('检索与表格深度协同自愈：在嵌套 AtengQueryForm 场景下，点击表格搜索缺省态的清空按钮自动重置表单字段并触发重刷', async () => {
    const formModel = ref({ keyword: '李四' });
    const onResetSpy = vi.fn();
    const mockPagination = createMockPagination({
      list: ref([]),
      total: ref(0),
    });

    wrapper = mount(AtengTable, {
      props: {
        pagination: mockPagination,
      },
      slots: {
        query: () =>
          h(
            AtengQueryForm,
            {
              model: formModel.value,
              onReset: onResetSpy,
            },
            {
              default: () => [
                h(ElFormItem, { prop: 'keyword', label: '关键词' }, () => [
                  h(ElInput, {
                    modelValue: formModel.value.keyword,
                    'onUpdate:modelValue': (val: string) => {
                      formModel.value.keyword = val;
                    },
                  }),
                ]),
              ],
            },
          ),
        default: () => [h(ElTableColumn, { prop: 'username', label: '姓名' })],
      },
      attachTo: document.body,
    });

    await doubleWait();

    // 1. 自动从注入的 AtengQueryForm 感知到筛选条件，并渲染 search 缺省态
    expect(wrapper.find('.at-empty--search').exists()).toBe(true);
    expect(wrapper.text()).toContain('未找到符合条件的检索结果');

    // 2. 点击清空筛选条件按钮
    const clearBtn = wrapper.find('.at-empty button');
    expect(clearBtn.exists()).toBe(true);
    expect(clearBtn.text()).toContain('清空筛选条件');
    await clearBtn.trigger('click');

    // 3. 验证触发了 pagination.reset() 与 AtengQueryForm 的 reset 回调
    expect(mockPagination.reset).toHaveBeenCalled();
    expect(onResetSpy).toHaveBeenCalled();
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
    const parsedStored = JSON.parse(stored!);
    expect(parsedStored.visible || parsedStored).toHaveProperty('id', false);

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

  it('Vue 3.5 SFC 原生泛型全链路打通：Props、Emits、Slots 与 Expose 强类型推导完整闭环', async () => {
    interface MemberItem {
      id: string;
      username: string;
      age: number;
      role: string;
    }

    const members: MemberItem[] = [
      { id: 'm1', username: '张三', age: 28, role: 'Tech Lead' },
      { id: 'm2', username: '李四', age: 32, role: 'Architect' },
    ];

    let capturedSlotRows: MemberItem[] = [];
    let capturedEmittedRows: MemberItem[] = [];

    wrapper = mount(AtengTable as unknown as new () => { $props: AtengTableProps<MemberItem> }, {
      props: {
        data: members,
        rowKey: 'id',
      },
      slots: {
        default: () => [
          h(ElTableColumn, { type: 'selection', width: 55 }),
          h(ElTableColumn, { prop: 'username', label: '成员名称' }),
        ],
        'batch-actions': (scope: { selectedRows: MemberItem[]; clearSelection: () => void }) => {
          capturedSlotRows = scope.selectedRows;
          return h(
            'button',
            { class: 'custom-batch-btn', onClick: scope.clearSelection },
            '批量操作',
          );
        },
      },
      attrs: {
        onSelectionChange: (selection: MemberItem[]) => {
          capturedEmittedRows = selection;
        },
      },
      attachTo: document.body,
    });

    await doubleWait();

    const tableEl = wrapper.findComponent({ name: 'ElTable' });
    tableEl.vm.$emit('selection-change', [members[0]]);
    await doubleWait();

    // 1. 验证插槽作用域类型与运行态数据
    expect(capturedSlotRows).toHaveLength(1);
    expect(capturedSlotRows[0].username).toBe('张三');
    expect(capturedSlotRows[0].role).toBe('Tech Lead');

    // 2. 验证事件派发类型与运行态数据
    expect(capturedEmittedRows).toHaveLength(1);
    expect(capturedEmittedRows[0].id).toBe('m1');

    // 3. 验证实例能力强类型推导与交互
    const tableInstance = wrapper.vm as unknown as {
      selectedRows: MemberItem[];
      selectedCount: number;
      getSelectionRows: () => MemberItem[];
      clearSelection: () => void;
    };
    expect(tableInstance.selectedRows[0].age).toBe(28);
    expect(tableInstance.getSelectionRows()[0].role).toBe('Tech Lead');

    // 4. 清空选中
    tableInstance.clearSelection();
    await doubleWait();
    expect(tableInstance.selectedCount).toBe(0);
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

  it('列配置纯原生 HTML5 拖拽排序与顺序持久化', async () => {
    const storageKey = 'test-table-drag-order';
    wrapper = mount(AtengTable, {
      props: {
        data: mockData,
        storageKey,
      },
      slots: {
        default: () => [
          h(ElTableColumn, { prop: 'id', label: '编号' }),
          h(ElTableColumn, { prop: 'username', label: '姓名' }),
          h(ElTableColumn, { prop: 'age', label: '年龄' }),
        ],
      },
      attachTo: document.body,
    });

    await doubleWait();

    // 点击打开列设置 Popover
    const colBtn = wrapper.find('button[aria-label="列设置"]');
    await colBtn.trigger('click');
    await doubleWait();

    const items = document.querySelectorAll('.at-table-column-setting__item');
    expect(items.length).toBe(3);

    // 抓手存在
    expect(items[0].querySelector('.at-table-column-setting__handle')).toBeTruthy();

    // 模拟拖拽：将第 2 列 (姓名, index=1) 拖到第 0 列 (index=0)
    const dragEvent = new Event('dragstart', { bubbles: true });
    items[1].dispatchEvent(dragEvent);

    const dragOverEvent = new Event('dragover', { bubbles: true });
    items[0].dispatchEvent(dragOverEvent);

    const dropEvent = new Event('drop', { bubbles: true });
    items[0].dispatchEvent(dropEvent);
    await doubleWait();

    const vm = wrapper.vm as unknown as AtengTableInstance;
    expect(vm.columns[0].prop).toBe('username');
    expect(vm.columns[1].prop).toBe('id');

    // 验证 localStorage 持久化了 order
    const stored = localStorage.getItem(storageKey);
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.order).toEqual(['username', 'id', 'age']);
    expect(wrapper.emitted('columns-change')).toBeTruthy();
  });

  it('autoHeight 视口自适应高度：开启后动态计算剩余空间并通过 el-table:height 驱动', async () => {
    // 模拟窗口高度与 DOM getBoundingClientRect
    Object.defineProperty(window, 'innerHeight', { value: 900, writable: true });

    wrapper = mount(AtengTable, {
      props: {
        data: mockData,
        autoHeight: 40,
      },
      slots: {
        default: () => [h(ElTableColumn, { prop: 'username', label: '姓名' })],
      },
      attachTo: document.body,
    });

    await doubleWait();

    // 验证 ElTable 接收到了计算后的 height 属性
    const tableEl = wrapper.findComponent({ name: 'ElTable' });
    expect(tableEl.props('height')).toBeDefined();
    expect(typeof tableEl.props('height')).toBe('number');
  });

  it('autoHeight 动态响应式切换与确定性清理', async () => {
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });

    wrapper = mount(AtengTable, {
      props: {
        data: mockData,
        autoHeight: false,
      },
      slots: {
        default: () => [h(ElTableColumn, { prop: 'username', label: '姓名' })],
      },
      attachTo: document.body,
    });

    await doubleWait();

    const tableEl = wrapper.findComponent({ name: 'ElTable' });
    // autoHeight=false 时，height 为 undefined
    expect(tableEl.props('height')).toBeUndefined();

    // 动态开启 autoHeight
    await wrapper.setProps({ autoHeight: 40 });
    await doubleWait();

    // 动态计算出高度注入 ElTable
    expect(tableEl.props('height')).toBeDefined();
    expect(typeof tableEl.props('height')).toBe('number');

    // 动态关闭 autoHeight
    await wrapper.setProps({ autoHeight: false });
    await doubleWait();

    expect(tableEl.props('height')).toBeUndefined();

    wrapper.unmount();
    wrapper = null;
  });

  it('列宽拖拽调整与本地持久化记忆：拖拽列宽后写入 localStorage，重新挂载后正确回填列宽', async () => {
    const storageKey = 'test_table_col_resize';
    localStorage.removeItem(storageKey);

    wrapper = mount(AtengTable, {
      props: {
        data: mockData,
        storageKey,
        columns: [
          { prop: 'username', label: '用户名', width: 100 },
          { prop: 'age', label: '年龄', width: 80 },
        ],
      },
      attachTo: document.body,
    });

    await doubleWait();

    // 1. 模拟 ElTable 触发 header-dragend
    const elTable = wrapper.findComponent({ name: 'ElTable' });
    expect(elTable.exists()).toBe(true);

    elTable.vm.$emit(
      'header-dragend',
      160,
      100,
      { property: 'username', label: '用户名' },
      new MouseEvent('mouseup'),
    );

    await doubleWait();

    // 2. 验证 localStorage 持久化了 widths
    const persistedRaw = localStorage.getItem(storageKey);
    expect(persistedRaw).not.toBeNull();
    const persisted = JSON.parse(persistedRaw!);
    expect(persisted.widths).toBeDefined();
    expect(persisted.widths['username']).toBe(160);

    // 3. 验证 header-dragend 派发了最新列宽与原始列宽
    const dragendEvents = wrapper.emitted('header-dragend');
    expect(dragendEvents).toBeTruthy();
    expect(dragendEvents![0][0]).toBe(160);
    expect(dragendEvents![0][1]).toBe(100);

    wrapper.unmount();
    wrapper = null;

    // 4. 重新挂载，验证列宽自动从 localStorage 回填
    wrapper = mount(AtengTable, {
      props: {
        data: mockData,
        storageKey,
        columns: [
          { prop: 'username', label: '用户名', width: 100 },
          { prop: 'age', label: '年龄', width: 80 },
        ],
      },
      attachTo: document.body,
    });

    await doubleWait();

    const vm = wrapper.vm as unknown as { columns: Array<{ prop?: string; width?: number }> };
    const userCol = vm.columns.find(c => c.prop === 'username');
    expect(userCol?.width).toBe(160);

    localStorage.removeItem(storageKey);
    wrapper.unmount();
    wrapper = null;
  });

  it('列宽防塌陷安全阈值：拖拽宽度低于 minResizeWidth 时自动保底为最小阈值', async () => {
    const storageKey = 'test_table_min_resize';
    localStorage.removeItem(storageKey);

    wrapper = mount(AtengTable, {
      props: {
        data: mockData,
        storageKey,
        minResizeWidth: 50,
        columns: [{ prop: 'username', label: '用户名', width: 100 }],
      },
      attachTo: document.body,
    });

    await doubleWait();

    const elTable = wrapper.findComponent({ name: 'ElTable' });
    // 模拟用户误拖拽至 10px
    elTable.vm.$emit(
      'header-dragend',
      10,
      100,
      { property: 'username', label: '用户名' },
      new MouseEvent('mouseup'),
    );

    await doubleWait();

    const persisted = JSON.parse(localStorage.getItem(storageKey)!);
    // 自动被保底为 minResizeWidth (50px)
    expect(persisted.widths['username']).toBe(50);

    localStorage.removeItem(storageKey);
    wrapper.unmount();
    wrapper = null;
  });

  it('列配置重置联动：点击 Popover 重置按钮时清空持久化的 widths 并恢复初始列宽', async () => {
    const storageKey = 'test_table_reset_widths';
    localStorage.removeItem(storageKey);

    // 预置已有自定义列宽
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        order: ['username', 'age'],
        visible: { username: true, age: true },
        widths: { username: 220, age: 140 },
      }),
    );

    wrapper = mount(AtengTable, {
      props: {
        data: mockData,
        storageKey,
        columns: [
          { prop: 'username', label: '用户名', width: 100 },
          { prop: 'age', label: '年龄', width: 80 },
        ],
      },
      attachTo: document.body,
    });

    await doubleWait();

    const vm = wrapper.vm as unknown as { columns: Array<{ prop?: string; width?: number }> };
    expect(vm.columns.find(c => c.prop === 'username')?.width).toBe(220);

    // 打开列设置 Popover 并点击重置按钮
    const colBtn = wrapper.find('button[aria-label="列设置"]');
    if (colBtn.exists()) {
      await colBtn.trigger('click');
      await doubleWait();
    }

    const resetBtn = (document.body.querySelector('.at-table-column-setting__header button') ||
      wrapper.find('.at-table-column-setting__header button').element) as HTMLButtonElement | null;
    expect(resetBtn).not.toBeNull();
    resetBtn?.click();
    await doubleWait();

    // localStorage 中该 key 已被清除
    expect(localStorage.getItem(storageKey)).toBeNull();

    // 列宽恢复为初始定义的 100 与 80
    expect(vm.columns.find(c => c.prop === 'username')?.width).toBe(100);
    expect(vm.columns.find(c => c.prop === 'age')?.width).toBe(80);

    wrapper.unmount();
    wrapper = null;
  });

  it('禁用列宽拖拽：enableColumnResize 为 false 时向列注入 resizable=false 且拖拽事件被拦截', async () => {
    const storageKey = 'test_table_disable_resize';
    localStorage.removeItem(storageKey);

    wrapper = mount(AtengTable, {
      props: {
        data: mockData,
        storageKey,
        enableColumnResize: false,
        columns: [
          { prop: 'username', label: '用户名', width: 100 },
          { prop: 'age', label: '年龄', width: 80 },
        ],
      },
      attachTo: document.body,
    });

    await doubleWait();

    // 验证 ElTableColumn 接收到的 resizable 属性为 false
    const columns = wrapper.findAllComponents({ name: 'ElTableColumn' });
    const userColComponent = columns.find(c => c.props('prop') === 'username');
    expect(userColComponent?.props('resizable')).toBe(false);

    const elTable = wrapper.findComponent({ name: 'ElTable' });
    elTable.vm.$emit(
      'header-dragend',
      180,
      100,
      { property: 'username', label: '用户名' },
      new MouseEvent('mouseup'),
    );

    await doubleWait();

    // 禁用时不应持久化存储
    expect(localStorage.getItem(storageKey)).toBeNull();

    localStorage.removeItem(storageKey);
    wrapper.unmount();
    wrapper = null;
  });

  describe('AtengTable 跨页多选记忆与 useSelection 深度集成测试', () => {
    it('跨页多选保持与雪花 ID 字符串安全：翻页后保留选中项并正确触发 update:selectedKeys', async () => {
      const page1Data = [
        { id: '1890123456789012345', username: '雪花用户1' },
        { id: '1890123456789012346', username: '雪花用户2' },
      ];
      const page2Data = [
        { id: '1890123456789012347', username: '雪花用户3' },
        { id: '1890123456789012348', username: '雪花用户4' },
      ];

      const pagination = createMockPagination({
        list: ref(page1Data),
      });

      wrapper = mount(AtengTable, {
        props: {
          pagination,
          reserveSelection: true,
          columns: [{ type: 'selection' }, { prop: 'username', label: '用户名' }],
        },
        attachTo: document.body,
      });

      await doubleWait();

      const elTable = wrapper.findComponent({ name: 'ElTable' });
      // 模拟第一页勾选第一行
      elTable.vm.$emit('selection-change', [page1Data[0]]);
      await doubleWait();

      // 验证已触发 update:selectedKeys 与 update:selectedRows
      expect(wrapper.emitted('update:selectedKeys')?.[0]?.[0]).toEqual(['1890123456789012345']);
      expect(wrapper.emitted('update:selectedRows')?.[0]?.[0]).toEqual([page1Data[0]]);

      const vm = wrapper.vm as unknown as AtengTableInstance;
      expect(vm.selectedCount).toBe(1);
      expect(vm.selectedRows).toEqual([page1Data[0]]);

      // 模拟换页：pagination.list 变为第二页数据
      pagination.list.value = page2Data;
      await doubleWait();

      // 验证跨页记忆：即使当前页换为 page2，已选总数仍为 1，且包含第一页的雪花 ID
      expect(vm.selectedCount).toBe(1);
      expect(vm.selectedRows[0]?.id).toBe('1890123456789012345');

      // 清空选择
      vm.clearSelection();
      await doubleWait();

      expect(vm.selectedCount).toBe(0);
      expect(vm.selectedRows).toEqual([]);
    });

    it('重置列暴露方法：实例支持 resetColumns 门面直接调用', async () => {
      const storageKey = 'test_table_reset_columns_expose';
      localStorage.setItem(storageKey, JSON.stringify({ widths: { username: 200 } }));

      wrapper = mount(AtengTable, {
        props: {
          data: mockData,
          storageKey,
          columns: [{ prop: 'username', label: '用户名', width: 100 }],
        },
        attachTo: document.body,
      });

      await doubleWait();

      const vm = wrapper.vm as unknown as AtengTableInstance;
      expect(typeof vm.resetColumns).toBe('function');
      vm.resetColumns();
      await doubleWait();

      expect(localStorage.getItem(storageKey)).toBeNull();
    });
  });
});
