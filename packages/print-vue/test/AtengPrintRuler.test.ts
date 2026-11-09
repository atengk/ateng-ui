/**
 * AtengPrintRuler 组件单元测试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AtengPrintRuler from '../src/components/AtengPrintRuler.vue';

describe('AtengPrintRuler', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('成功挂载横纵向标尺与角标标识', () => {
    const wrapper = mount(AtengPrintRuler, {
      props: {
        width: 100,
        height: 100,
      },
      slots: {
        default: '<div id="test-canvas">排版画板</div>',
      },
    });

    expect(wrapper.find('.at-print-ruler-corner').text()).toBe('mm');
    expect(wrapper.find('.at-print-ruler-top').exists()).toBe(true);
    expect(wrapper.find('.at-print-ruler-left').exists()).toBe(true);
    expect(wrapper.find('#test-canvas').text()).toBe('排版画板');

    wrapper.unmount();
  });

  it('鼠标在内容区滑动时正确计算并显示十字交叉准星与坐标气泡', async () => {
    const wrapper = mount(AtengPrintRuler, {
      props: {
        width: 100,
        height: 100,
        showCrosshair: true,
      },
    });

    const contentArea = wrapper.find('.at-print-ruler-content');

    // 模拟鼠标移入与移动事件
    await contentArea.trigger('mousemove', {
      clientX: 50,
      clientY: 50,
    });

    expect(wrapper.find('.at-print-crosshair-x').exists()).toBe(true);
    expect(wrapper.find('.at-print-crosshair-y').exists()).toBe(true);
    expect(wrapper.find('.at-print-coord-badge').exists()).toBe(true);

    // 鼠标移出后十字准星隐藏
    await contentArea.trigger('mouseleave');
    expect(wrapper.find('.at-print-crosshair-x').exists()).toBe(false);

    wrapper.unmount();
  });

  it('支持开启背景网格辅助线 gridLines', () => {
    const wrapper = mount(AtengPrintRuler, {
      props: {
        gridLines: true,
      },
    });

    expect(wrapper.find('.at-print-ruler-content--grid').exists()).toBe(true);
    wrapper.unmount();
  });
});
