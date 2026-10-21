/**
 * AtengTable 核心表格容器单元测试。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick } from 'vue';
import { ElTableColumn } from 'element-plus';
import { AtengTable, type AtengTableInstance } from '../src/components/table';

const doubleWait = async () => {
  await nextTick();
  await nextTick();
};

describe('AtengTable 组件规范与基础骨架测试', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
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
});
