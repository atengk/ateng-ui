/**
 * AtengFlowToolbar 工具栏组件单元测试。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import AtengFlowToolbar from '../src/components/AtengFlowToolbar.vue';

describe('AtengFlowToolbar', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
  });

  it('应该正常渲染工具栏按钮与禁用状态', () => {
    wrapper = mount(AtengFlowToolbar, {
      props: {
        canUndo: false,
        canRedo: true,
      },
    });

    expect(wrapper.classes()).toContain('at-flow-toolbar');

    // 撤销按钮应该被禁用，重做按钮可用
    const buttons = wrapper.findAll('button');
    const undoBtn = buttons.find(b => b.attributes('aria-label') === '撤销');
    const redoBtn = buttons.find(b => b.attributes('aria-label') === '重做');

    expect(undoBtn?.attributes('disabled')).toBeDefined();
    expect(redoBtn?.attributes('disabled')).toBeUndefined();
  });

  it('点击视口缩放控制动作应派发对应事件', async () => {
    wrapper = mount(AtengFlowToolbar);

    const zoomInBtn = wrapper.find('button[aria-label="放大"]');
    const zoomOutBtn = wrapper.find('button[aria-label="缩小"]');
    const resetZoomBtn = wrapper.find('button[aria-label="实际比例"]');
    const fitViewBtn = wrapper.find('button[aria-label="居中"]');

    await zoomInBtn.trigger('click');
    expect(wrapper.emitted('zoom-in')).toBeTruthy();

    await zoomOutBtn.trigger('click');
    expect(wrapper.emitted('zoom-out')).toBeTruthy();

    await resetZoomBtn.trigger('click');
    expect(wrapper.emitted('reset-zoom')).toBeTruthy();

    await fitViewBtn.trigger('click');
    expect(wrapper.emitted('fit-view')).toBeTruthy();
  });

  it('点击自动排版按钮应派发 layout 事件并携带方向', async () => {
    wrapper = mount(AtengFlowToolbar);

    const buttons = wrapper.findAll('.at-flow-toolbar__btn');
    const lrBtn = buttons.find(b => b.text().includes('水平整理'));
    const tbBtn = buttons.find(b => b.text().includes('垂直整理'));

    expect(lrBtn).toBeDefined();
    expect(tbBtn).toBeDefined();

    await lrBtn!.trigger('click');
    expect(wrapper.emitted('layout')?.[0]).toEqual(['LR']);

    await tbBtn!.trigger('click');
    expect(wrapper.emitted('layout')?.[1]).toEqual(['TB']);
  });

  it('点击网格与小地图切换按钮应派发 toggle 事件', async () => {
    wrapper = mount(AtengFlowToolbar);

    const buttons = wrapper.findAll('.at-flow-toolbar__btn');
    const gridBtn = buttons.find(b => b.text().includes('网格'));
    const miniMapBtn = buttons.find(b => b.text().includes('小地图'));

    await gridBtn!.trigger('click');
    expect(wrapper.emitted('toggle-grid')?.[0]).toEqual([false]); // 默认 true -> false

    await miniMapBtn!.trigger('click');
    expect(wrapper.emitted('toggle-minimap')?.[0]).toEqual([true]); // 默认 false -> true
  });

  it('清空操作应唤起二次确认弹窗，取消不派发，确定才派发 clear 事件', async () => {
    wrapper = mount(AtengFlowToolbar);

    const clearBtn = wrapper.find('.at-flow-toolbar__btn--danger');
    expect(wrapper.find('.at-flow-toolbar__popover').exists()).toBe(false);

    // 1. 点击清空按钮唤起确认弹窗
    await clearBtn.trigger('click');
    expect(wrapper.find('.at-flow-toolbar__popover').exists()).toBe(true);
    expect(wrapper.emitted('clear')).toBeFalsy();

    // 2. 点击取消按钮收起弹窗且不派发
    const cancelBtn = wrapper
      .findAll('.at-flow-toolbar__popover-btn')
      .find(b => b.text() === '取消');
    await cancelBtn!.trigger('click');
    expect(wrapper.find('.at-flow-toolbar__popover').exists()).toBe(false);
    expect(wrapper.emitted('clear')).toBeFalsy();

    // 3. 再次打开并点击确定清空
    await clearBtn.trigger('click');
    const confirmBtn = wrapper
      .findAll('.at-flow-toolbar__popover-btn')
      .find(b => b.text() === '确定清空');
    await confirmBtn!.trigger('click');
    expect(wrapper.find('.at-flow-toolbar__popover').exists()).toBe(false);
    expect(wrapper.emitted('clear')).toBeTruthy();
  });

  it('支持通过 #left 与 #extra 插槽插入自定义操作', () => {
    wrapper = mount(AtengFlowToolbar, {
      slots: {
        left: '<span class="custom-title">流程图标题</span>',
        extra: '<button class="custom-save">保存草稿</button>',
      },
    });

    expect(wrapper.find('.custom-title').exists()).toBe(true);
    expect(wrapper.find('.custom-save').exists()).toBe(true);
  });
});
