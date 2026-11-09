/**
 * @atengk/form-designer-vue 历史快照栈与自举属性面板单元测试。
 *
 * 验证 FormHistoryStack 不可变快照管理、连续输入防抖合并、最大容量截断
 * 以及 AtengFormPropertyPanel 自举渲染、插槽扩展与 AtengFormDesignerToolbar 交互。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { FormHistoryStack } from '../src/history/FormHistoryStack';
import { createDefaultWidget } from '../src/utils/designer';
import type { FormSchema, FormWidget } from '../src/types';
import AtengFormPropertyPanel from '../src/components/AtengFormPropertyPanel.vue';
import AtengFormDesignerToolbar from '../src/components/AtengFormDesignerToolbar.vue';

const createMockSchema = (title: string, count = 1): FormSchema => ({
  version: '1.0',
  formConfig: { layout: 'vertical' },
  widgetList: Array.from({ length: count }, (_, i) =>
    createDefaultWidget('input', {
      id: `w_${title}_${i}`,
      label: `${title} ${i}`,
      modelKey: `field_${title}_${i}`,
    }),
  ),
});

describe('FormHistoryStack 不可变快照历史栈', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('初始状态判定正确', () => {
    const s0 = createMockSchema('init');
    const stack = new FormHistoryStack(s0);

    expect(stack.size).toBe(1);
    expect(stack.currentIndex).toBe(0);
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(false);
    expect(stack.current?.widgetList[0]?.id).toBe('w_init_0');

    stack.dispose();
  });

  it('支持即时压栈 (push immediate) 并对称执行 undo / redo', () => {
    const s0 = createMockSchema('step0');
    const s1 = createMockSchema('step1');
    const s2 = createMockSchema('step2');

    const stack = new FormHistoryStack(s0);
    stack.push(s1, true);
    stack.push(s2, true);

    expect(stack.size).toBe(3);
    expect(stack.canUndo).toBe(true);
    expect(stack.canRedo).toBe(false);
    expect(stack.current?.widgetList[0]?.id).toBe('w_step2_0');

    // 撤销一步
    const undo1 = stack.undo();
    expect(undo1?.widgetList[0]?.id).toBe('w_step1_0');
    expect(stack.canUndo).toBe(true);
    expect(stack.canRedo).toBe(true);

    // 撤销第二步 (回退至初始)
    const undo2 = stack.undo();
    expect(undo2?.widgetList[0]?.id).toBe('w_step0_0');
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(true);

    // 超界撤销安全保底返回 null
    expect(stack.undo()).toBeNull();

    // 重做一步
    const redo1 = stack.redo();
    expect(redo1?.widgetList[0]?.id).toBe('w_step1_0');
    expect(stack.canUndo).toBe(true);

    // 重做第二步
    const redo2 = stack.redo();
    expect(redo2?.widgetList[0]?.id).toBe('w_step2_0');
    expect(stack.canRedo).toBe(false);

    // 超界重做安全保底返回 null
    expect(stack.redo()).toBeNull();

    stack.dispose();
  });

  it('在历史回溯中压入新快照时，正确截断未来分支', () => {
    const s0 = createMockSchema('v0');
    const s1 = createMockSchema('v1');
    const s2 = createMockSchema('v2');
    const s3 = createMockSchema('v3');

    const stack = new FormHistoryStack(s0);
    stack.push(s1, true);
    stack.push(s2, true);

    // 回退到 v1
    stack.undo();
    expect(stack.current?.widgetList[0]?.id).toBe('w_v1_0');

    // 压入全新分支 v3，原 v2 应被剔除
    stack.push(s3, true);
    expect(stack.size).toBe(3);
    expect(stack.current?.widgetList[0]?.id).toBe('w_v3_0');
    expect(stack.canRedo).toBe(false);

    stack.dispose();
  });

  it('连续属性变更触发 300ms 防抖合并 (debounce merging)', () => {
    const s0 = createMockSchema('initial');
    const stack = new FormHistoryStack(s0, { debounceMs: 300 });

    // 模拟用户在 100ms 内连续打字更新 3 次
    const k1 = createMockSchema('type_a');
    const k2 = createMockSchema('type_ab');
    const k3 = createMockSchema('type_abc');

    stack.push(k1, false);
    vi.advanceTimersByTime(100);
    expect(stack.size).toBe(1); // 尚未提交

    stack.push(k2, false);
    vi.advanceTimersByTime(100);
    expect(stack.size).toBe(1);

    stack.push(k3, false);
    // 推进 300ms 触发定时器
    vi.advanceTimersByTime(300);

    // 连续打字被合并为一步快照
    expect(stack.size).toBe(2);
    expect(stack.current?.widgetList[0]?.id).toBe('w_type_abc_0');

    // 单次 undo 即可一次性回退至 initial
    const undid = stack.undo();
    expect(undid?.widgetList[0]?.id).toBe('w_initial_0');

    stack.dispose();
  });

  it('超过 maxLimit 上限时自动实施环形队列截断防御', () => {
    const s0 = createMockSchema('init');
    const stack = new FormHistoryStack(s0, { maxLimit: 3 });

    // 陆续压入 4 个新快照
    stack.push(createMockSchema('s1'), true);
    stack.push(createMockSchema('s2'), true);
    stack.push(createMockSchema('s3'), true);
    stack.push(createMockSchema('s4'), true);

    // 容量上限锁定为 3，最早的 init 与 s1 被顶出
    expect(stack.size).toBe(3);
    expect(stack.current?.widgetList[0]?.id).toBe('w_s4_0');

    // 连续撤销到尽头，验证保留的最早快照为 s2
    stack.undo(); // -> s3
    const oldest = stack.undo(); // -> s2
    expect(oldest?.widgetList[0]?.id).toBe('w_s2_0');
    expect(stack.canUndo).toBe(false);

    stack.dispose();
  });
});

describe('AtengFormPropertyPanel 属性自举面板与插槽扩展', () => {
  it('未选中任何控件时，自举渲染表单全局 FormConfig 配置', async () => {
    const wrapper = mount(AtengFormPropertyPanel, {
      props: {
        activeWidget: null,
        formConfig: { layout: 'horizontal', labelWidth: 120 },
      },
    });

    expect(wrapper.find('.at-prop-global-wrap').exists()).toBe(true);
    expect(wrapper.text()).toContain('表单全局配置');
    expect(wrapper.find('.at-prop-badge.is-global').exists()).toBe(true);

    wrapper.unmount();
  });

  it('选中控件时展示基础参数 Tab 并响应字段更新与必填切换', async () => {
    const widget: FormWidget = createDefaultWidget('input', {
      id: 'input_user',
      label: '用户名',
      modelKey: 'username',
      placeholder: '请输入用户名',
    });

    const wrapper = mount(AtengFormPropertyPanel, {
      props: {
        activeWidget: widget,
      },
    });

    expect(wrapper.find('.at-prop-badge').text()).toBe('input');
    expect(wrapper.find('.at-prop-input.is-readonly').attributes('value')).toBe('input_user');

    // 切换必填 checkbox
    const checkbox = wrapper.find('input[type="checkbox"]');
    await checkbox.setValue(true);

    expect(wrapper.emitted('update-widget')).toBeTruthy();
    const emittedPatch = wrapper.emitted('update-widget')?.[0]?.[0] as Partial<FormWidget>;
    expect(emittedPatch.rules?.[0]?.required).toBe(true);

    wrapper.unmount();
  });

  it('支持在专有扩展 Tab 中呈现自举 Schema 并透出 #custom-property 插槽', async () => {
    const cardWidget: FormWidget = createDefaultWidget('card', {
      id: 'card_box',
      label: '卡片容器',
      props: { title: '自定义标题', bordered: true },
    });

    const wrapper = mount(AtengFormPropertyPanel, {
      props: {
        activeWidget: cardWidget,
      },
      slots: {
        'custom-property': '<div class="test-custom-slot">定制插槽内容</div>',
      },
    });

    // 切换至“专用扩展” Tab
    const tabBtns = wrapper.findAll('.at-prop-tab-btn');
    await tabBtns[1].trigger('click');

    expect(wrapper.find('.test-custom-slot').exists()).toBe(true);
    expect(wrapper.find('.test-custom-slot').text()).toBe('定制插槽内容');
    expect(wrapper.find('.at-prop-bootstrap-form').exists()).toBe(true);

    wrapper.unmount();
  });
});

describe('AtengFormDesignerToolbar 顶部工具栏交互', () => {
  it('撤销重做按钮根据状态动态禁用/激活', () => {
    const wrapper = mount(AtengFormDesignerToolbar, {
      props: {
        canUndo: false,
        canRedo: true,
        viewport: 'pc',
      },
    });

    const undoBtn = wrapper.find('button[title*="撤销"]');
    const redoBtn = wrapper.find('button[title*="重做"]');

    expect(undoBtn.attributes('disabled')).toBeDefined();
    expect(redoBtn.attributes('disabled')).toBeUndefined();

    wrapper.unmount();
  });

  it('清空按钮具备二次防误触确认机制', async () => {
    const wrapper = mount(AtengFormDesignerToolbar);

    const clearBtn = wrapper.find('button[title*="清空"]');
    expect(clearBtn.text()).toContain('清空');

    // 首次点击触发确认态，但不直接触发 clear
    await clearBtn.trigger('click');
    expect(wrapper.emitted('clear')).toBeFalsy();
    expect(clearBtn.text()).toContain('确认清空');

    // 二次点击确认才触发 emit('clear')
    await clearBtn.trigger('click');
    expect(wrapper.emitted('clear')).toBeTruthy();

    wrapper.unmount();
  });

  it('全屏模式切换正确响应', async () => {
    const wrapper = mount(AtengFormDesignerToolbar, {
      props: { isFullscreen: false },
    });

    const fullscreenBtn = wrapper.find('button[title*="全屏"]');
    await fullscreenBtn.trigger('click');
    expect(wrapper.emitted('toggle-fullscreen')).toBeTruthy();

    wrapper.unmount();
  });
});
