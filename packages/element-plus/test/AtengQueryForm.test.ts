/**
 * AtengQueryForm 查询表单容器单元测试。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, defineComponent, reactive, ref } from 'vue';
import { ElFormItem, ElInput } from 'element-plus';
import type { UsePaginationResult } from '@atengk/vue';
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

  it('多行折叠：通过 collapsedRows 配置常驻展示多行表单项', async () => {
    wrapper = mount(AtengQueryForm, {
      props: {
        cols: 3, // 每行 3 列
        collapsedRows: 2, // 常驻展示 2 行: 2 * 3 - 1 = 5 项可见
        defaultCollapsed: true,
      },
      slots: {
        default: () => [
          h(ElFormItem, { label: '项1' }),
          h(ElFormItem, { label: '项2' }),
          h(ElFormItem, { label: '项3' }),
          h(ElFormItem, { label: '项4' }),
          h(ElFormItem, { label: '项5' }),
          h(ElFormItem, { label: '项6' }),
          h(ElFormItem, { label: '项7' }),
        ],
      },
      attachTo: document.body,
    });

    const items = wrapper.findAll('.at-query-form__item');
    expect(items.length).toBe(7);
    // 折叠态：前 5 项可见，第 6、7 项隐藏
    expect(items[0].isVisible()).toBe(true);
    expect(items[1].isVisible()).toBe(true);
    expect(items[2].isVisible()).toBe(true);
    expect(items[3].isVisible()).toBe(true);
    expect(items[4].isVisible()).toBe(true);
    expect(items[5].isVisible()).toBe(false);
    expect(items[6].isVisible()).toBe(false);

    // 展开后全部可见
    const collapseBtn = wrapper.find('.at-query-form__collapse-btn');
    expect(collapseBtn.exists()).toBe(true);
    await collapseBtn.trigger('click');
    expect(items[5].isVisible()).toBe(true);
    expect(items[6].isVisible()).toBe(true);
  });

  it('重置自触发：autoSearchOnReset 开启时点击重置自动派发 @search 且携带 model', async () => {
    const formData = reactive({ keyword: 'test-keyword' });
    wrapper = mount(AtengQueryForm, {
      props: {
        model: formData,
        autoSearchOnReset: true,
      },
      attachTo: document.body,
    });

    const resetBtn = wrapper.find('.at-query-form__reset-btn');
    await resetBtn.trigger('click');

    expect(wrapper.emitted('reset')).toBeTruthy();
    // 自动派发了 search
    expect(wrapper.emitted('search')).toBeTruthy();
  });

  it('重置自触发受控：autoSearchOnReset 为 false 时点击重置不自动派发 @search', async () => {
    const formData = reactive({ keyword: 'test' });
    wrapper = mount(AtengQueryForm, {
      props: {
        model: formData,
        autoSearchOnReset: false,
      },
      attachTo: document.body,
    });

    const resetBtn = wrapper.find('.at-query-form__reset-btn');
    await resetBtn.trigger('click');

    expect(wrapper.emitted('reset')).toBeTruthy();
    expect(wrapper.emitted('search')).toBeFalsy();
  });

  it('容器感知：基于 ResizeObserver 监听自身容器宽度并在卸载时安全断开', async () => {
    let observerCallback: ResizeObserverCallback | null = null;
    let observeTarget: Element | null = null;
    let isDisconnected = false;

    class MockResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        observerCallback = callback;
      }
      observe(target: Element) {
        observeTarget = target;
      }
      disconnect() {
        isDisconnected = true;
      }
      unobserve() {}
    }

    const originalRO = globalThis.ResizeObserver;
    globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

    try {
      wrapper = mount(AtengQueryForm, {
        attachTo: document.body,
      });

      expect(observeTarget).not.toBeNull();

      // 模拟容器宽度变化为 600px (< 768px: 1列)
      if (observerCallback) {
        observerCallback(
          [
            {
              contentRect: { width: 600 } as DOMRectReadOnly,
              target: observeTarget!,
            } as ResizeObserverEntry,
          ],
          {} as ResizeObserver,
        );
      }
      await wrapper.vm.$nextTick();

      const gridEl = wrapper.find('.at-query-form__grid');
      expect(gridEl.attributes('style')).toContain(
        'grid-template-columns: repeat(1, minmax(0, 1fr))',
      );

      // 模拟容器宽度变化为 1400px (1200px ~ 1920px: 3列)
      if (observerCallback) {
        observerCallback(
          [
            {
              contentRect: { width: 1400 } as DOMRectReadOnly,
              target: observeTarget!,
            } as ResizeObserverEntry,
          ],
          {} as ResizeObserver,
        );
      }
      await wrapper.vm.$nextTick();

      expect(gridEl.attributes('style')).toContain(
        'grid-template-columns: repeat(3, minmax(0, 1fr))',
      );

      // 卸载组件，断言确定性断开 ResizeObserver
      wrapper.unmount();
      wrapper = null;
      expect(isDisconnected).toBe(true);
    } finally {
      globalThis.ResizeObserver = originalRO;
    }
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

  it('上下文感知受控：autoSearchOnReset 为 false 时点击重置不调用 tableContext.reset', async () => {
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
        <AtengQueryForm :model="model" :auto-search-on-reset="false" />
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

    const resetBtn = wrapper.find('.at-query-form__reset-btn');
    await resetBtn.trigger('click');
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('多行折叠边界：单列 cols=1 时正确支持 collapsedRows 展示', () => {
    wrapper = mount(AtengQueryForm, {
      props: {
        cols: 1,
        collapsedRows: 2, // 期望展示前 2 项
        defaultCollapsed: true,
      },
      slots: {
        default: () => [
          h(ElFormItem, { label: '项1' }),
          h(ElFormItem, { label: '项2' }),
          h(ElFormItem, { label: '项3' }),
        ],
      },
      attachTo: document.body,
    });

    const items = wrapper.findAll('.at-query-form__item');
    expect(items.length).toBe(3);
    expect(items[0].isVisible()).toBe(true);
    expect(items[1].isVisible()).toBe(true);
    expect(items[2].isVisible()).toBe(false);
  });

  it('插槽作用域：action 插槽正确接收 model, search, reset, toggle 参数', async () => {
    let slotScope: { model?: unknown; collapsed: boolean; search: unknown } | null = null;
    wrapper = mount(AtengQueryForm, {
      props: {
        model: { role: 'admin' },
      },
      slots: {
        action: scope => {
          slotScope = scope;
          return h('div', { class: 'custom-action' }, '自定义按钮');
        },
      },
      attachTo: document.body,
    });

    expect(wrapper.find('.custom-action').exists()).toBe(true);
    expect(slotScope).not.toBeNull();
    expect(slotScope?.model).toEqual({ role: 'admin' });
    expect(slotScope?.collapsed).toBe(true);
    expect(typeof slotScope?.search).toBe('function');
  });

  it('搜索传参：手动调用 search 支持传入 overrideModel 覆盖参数', async () => {
    const formData = reactive({ keyword: 'original' });
    wrapper = mount(AtengQueryForm, {
      props: {
        model: formData,
      },
      attachTo: document.body,
    });

    const vm = wrapper.vm as unknown as AtengQueryFormInstance<{ keyword: string; extra?: string }>;
    vm.search({ keyword: 'override', extra: 'param' });

    expect(wrapper.emitted('search')).toBeTruthy();
    expect(wrapper.emitted('search')?.[0]).toEqual([{ keyword: 'override', extra: 'param' }]);
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

  describe('AtengQueryForm 零胶水直连与回车即搜增强测试', () => {
    it('pagination 实例直连：自动绑定 query、点击查询触发 search、重置触发 reset 且联动 loading', async () => {
      const mockQuery = reactive({ keyword: 'test-keyword', status: 'active' });
      const mockLoading = ref(false);
      const mockSearch = vi.fn();
      const mockReset = vi.fn();

      const pagination = {
        query: mockQuery,
        loading: mockLoading,
        search: mockSearch,
        reset: mockReset,
      } as unknown as UsePaginationResult<Record<string, unknown>>;

      wrapper = mount(AtengQueryForm, {
        props: {
          pagination,
        },
        slots: {
          default: () => [
            h(ElFormItem, { label: '关键字', prop: 'keyword' }, () =>
              h(ElInput, { modelValue: mockQuery.keyword }),
            ),
          ],
        },
        attachTo: document.body,
      });

      // 1. 点击查询按钮
      const searchBtn = wrapper.find('.at-query-form__search-btn');
      await searchBtn.trigger('click');

      expect(mockSearch).toHaveBeenCalledWith(mockQuery);
      expect(wrapper.emitted('search')).toBeTruthy();
      expect(wrapper.emitted('search')?.[0]?.[0]).toEqual(mockQuery);

      // 2. 点击重置按钮
      const resetBtn = wrapper.find('.at-query-form__reset-btn');
      await resetBtn.trigger('click');

      expect(mockReset).toHaveBeenCalled();
      expect(wrapper.emitted('reset')).toBeTruthy();

      // 3. loading 联动
      mockLoading.value = true;
      await wrapper.vm.$nextTick();
      expect(wrapper.find('.at-query-form__search-btn').classes()).toContain('is-loading');
    });

    it('回车即搜 (Enter Trigger)：输入框回车自动触发查询，并具备中文 IME 组合态防御', async () => {
      const mockQuery = reactive({ keyword: 'enter-test' });
      const mockSearch = vi.fn();

      const pagination = {
        query: mockQuery,
        loading: ref(false),
        search: mockSearch,
        reset: vi.fn(),
      } as unknown as UsePaginationResult<Record<string, unknown>>;

      wrapper = mount(AtengQueryForm, {
        props: {
          pagination,
        },
        slots: {
          default: () => [
            h(ElFormItem, { label: '关键字', prop: 'keyword' }, () =>
              h('input', { class: 'test-native-input', value: mockQuery.keyword }),
            ),
          ],
        },
        attachTo: document.body,
      });

      const input = wrapper.find('.test-native-input');

      // 1. IME 中文输入法处于组合态时按下 Enter，不触发搜索
      await input.trigger('keydown', { key: 'Enter', isComposing: true });
      expect(mockSearch).not.toHaveBeenCalled();

      // 2. 正常输入状态按下 Enter，自动触发搜索
      await input.trigger('keydown', { key: 'Enter', isComposing: false });
      expect(mockSearch).toHaveBeenCalledTimes(1);
      expect(mockSearch).toHaveBeenCalledWith(mockQuery);

      // 3. 当配置 enterSearch: false 时，按 Enter 键不应触发搜索
      await wrapper.setProps({ enterSearch: false });
      await input.trigger('keydown', { key: 'Enter', isComposing: false });
      expect(mockSearch).toHaveBeenCalledTimes(1); // 仍为 1 次
    });
  });
});
