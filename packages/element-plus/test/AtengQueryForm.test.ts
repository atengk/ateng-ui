/**
 * AtengQueryForm 查询表单容器单元测试。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, defineComponent, reactive } from 'vue';
import { ElFormItem, ElInput } from 'element-plus';
import { AtengQueryForm, type AtengQueryFormInstance } from '../src/components/query-form';
import { ATENG_TABLE_CONTEXT_KEY, type AtengTableContext } from '../src/components/shared/context';

describe('AtengQueryForm 组件规范与交互测试', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
  });

  it('基础渲染：正确呈现表单容器、插槽子项与操作按钮区', () => {
    wrapper = mount(AtengQueryForm, {
      props: {
        model: { username: 'admin' },
      },
      slots: {
        default: () => [
          h(ElFormItem, { label: '用户名' }, () => h(ElInput, { modelValue: 'admin' })),
        ],
      },
      attachTo: document.body,
    });

    expect(wrapper.classes()).toContain('at-query-form');
    expect(wrapper.find('.at-query-form__grid').exists()).toBe(true);
    expect(wrapper.find('.at-query-form__actions').exists()).toBe(true);
    expect(wrapper.find('.at-query-form__search-btn').text()).toContain('查询');
    expect(wrapper.find('.at-query-form__reset-btn').text()).toContain('重置');
  });

  it('折叠与展开：在多项表单中正确隐藏多余子项，并支持一键切换', async () => {
    wrapper = mount(AtengQueryForm, {
      props: {
        cols: 3, // 每行 3 列，首行容纳 2 个项 + 1 个操作区
        defaultCollapsed: true,
      },
      slots: {
        default: () => [
          h(ElFormItem, { label: '项目1', class: 'item-1' }),
          h(ElFormItem, { label: '项目2', class: 'item-2' }),
          h(ElFormItem, { label: '项目3', class: 'item-3' }),
          h(ElFormItem, { label: '项目4', class: 'item-4' }),
        ],
      },
      attachTo: document.body,
    });

    // 默认折叠：前 2 项可见，第 3、4 项隐藏 (display: none)
    const items = wrapper.findAll('.at-query-form__item');
    expect(items.length).toBe(4);
    expect(items[0].isVisible()).toBe(true);
    expect(items[1].isVisible()).toBe(true);
    expect(items[2].isVisible()).toBe(false);
    expect(items[3].isVisible()).toBe(false);

    // 存在展开按钮
    const collapseBtn = wrapper.find('.at-query-form__collapse-btn');
    expect(collapseBtn.exists()).toBe(true);
    expect(collapseBtn.text()).toContain('展开');

    // 点击展开
    await collapseBtn.trigger('click');
    expect(collapseBtn.text()).toContain('收起');
    expect(items[2].isVisible()).toBe(true);
    expect(items[3].isVisible()).toBe(true);

    // 派发了 collapse 与 update:collapsed 事件
    expect(wrapper.emitted('collapse')?.[0]).toEqual([false]);
    expect(wrapper.emitted('update:collapsed')?.[0]).toEqual([false]);
  });

  it('边界保护：当总表单项无需折叠（<= C - 1）时，不渲染折叠切换按钮', () => {
    wrapper = mount(AtengQueryForm, {
      props: {
        cols: 3,
      },
      slots: {
        default: () => [h(ElFormItem, { label: '项目1' }), h(ElFormItem, { label: '项目2' })],
      },
      attachTo: document.body,
    });

    const collapseBtn = wrapper.find('.at-query-form__collapse-btn');
    expect(collapseBtn.exists()).toBe(false);
  });

  it('操作交互：点击查询派发 @search，点击重置派发 @reset 并清空表单', async () => {
    const formData = reactive({ name: 'ateng' });
    wrapper = mount(AtengQueryForm, {
      props: {
        model: formData,
      },
      attachTo: document.body,
    });

    const searchBtn = wrapper.find('.at-query-form__search-btn');
    const resetBtn = wrapper.find('.at-query-form__reset-btn');

    await searchBtn.trigger('click');
    expect(wrapper.emitted('search')).toBeTruthy();
    expect(wrapper.emitted('search')?.[0]).toEqual([{ name: 'ateng' }]);

    await resetBtn.trigger('click');
    expect(wrapper.emitted('reset')).toBeTruthy();
  });

  it('上下文感知：当存在 AtengTable 上下文时，自动调度 search 与 reset 门面', async () => {
    const mockSearch = vi.fn();
    const mockReset = vi.fn();
    const tableContext: AtengTableContext = {
      search: mockSearch,
      reset: mockReset,
    };

    const HostComponent = defineComponent({
      components: { AtengQueryForm },
      setup() {
        return {
          model: { keyword: 'test' },
        };
      },
      template: `
        <AtengQueryForm :model="model" />
      `,
    });

    wrapper = mount(HostComponent, {
      global: {
        provide: {
          [ATENG_TABLE_CONTEXT_KEY as symbol]: tableContext,
        },
      },
      attachTo: document.body,
    });

    const searchBtn = wrapper.find('.at-query-form__search-btn');
    const resetBtn = wrapper.find('.at-query-form__reset-btn');

    await searchBtn.trigger('click');
    expect(mockSearch).toHaveBeenCalledWith({ keyword: 'test' });

    await resetBtn.trigger('click');
    expect(mockReset).toHaveBeenCalled();
  });

  it('实例暴露：defineExpose 正确对外提供 formRef、validate、toggleCollapse 等能力', () => {
    wrapper = mount(AtengQueryForm, {
      props: {
        model: {},
      },
      attachTo: document.body,
    });

    const vm = wrapper.vm as unknown as AtengQueryFormInstance;
    expect(vm.formRef).toBeDefined();
    expect(typeof vm.validate).toBe('function');
    expect(typeof vm.resetFields).toBe('function');
    expect(typeof vm.toggleCollapse).toBe('function');
    expect(typeof vm.search).toBe('function');
    expect(typeof vm.reset).toBe('function');
  });
});
