/**
 * AtengPrintSheet 组件单元测试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AtengPrintSheet from '../src/components/AtengPrintSheet.vue';

describe('AtengPrintSheet', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('默认以 A4 纸张、10mm 内边距与阴影样式正确挂载', () => {
    const wrapper = mount(AtengPrintSheet, {
      slots: {
        default: '<div class="content">测试发票单据</div>',
      },
    });

    const sheet = wrapper.find('.at-print-sheet');
    expect(sheet.exists()).toBe(true);
    expect(sheet.classes()).toContain('at-print-sheet--shadow');
    expect(sheet.attributes('style')).toContain('width: 210mm');
    expect(sheet.attributes('style')).toContain('min-height: 297mm');
    expect(sheet.attributes('style')).toContain('padding: 10mm');
    expect(wrapper.text()).toContain('测试发票单据');

    wrapper.unmount();
  });

  it('支持切换至 A5 与热敏卷纸预设', async () => {
    const wrapper = mount(AtengPrintSheet, {
      props: {
        preset: 'receipt-80',
      },
    });

    const sheet = wrapper.find('.at-print-sheet');
    expect(sheet.classes()).toContain('at-print-sheet--continuous');
    expect(sheet.attributes('style')).toContain('width: 80mm');
    expect(sheet.attributes('style')).toContain('min-height: auto');

    await wrapper.setProps({ preset: 'a5' });
    expect(sheet.attributes('style')).toContain('width: 148mm');
    expect(sheet.attributes('style')).toContain('min-height: 210mm');

    wrapper.unmount();
  });

  it('支持自定义缩放比例 scale 与套打偏移 offsetX/offsetY', () => {
    const wrapper = mount(AtengPrintSheet, {
      props: {
        scale: 0.8,
        offsetX: 2,
        offsetY: -3,
      },
    });

    const sheet = wrapper.find('.at-print-sheet');
    const style = sheet.attributes('style') || '';
    expect(style).toContain('translate(2mm, -3mm)');
    expect(style).toContain('scale(0.8)');

    wrapper.unmount();
  });

  it('插槽正确注入作用域参数 { pageIndex, totalPages, dimensions }', () => {
    const wrapper = mount(AtengPrintSheet, {
      props: { preset: 'a4' },
      slots: {
        default: `
          <template #default="{ pageIndex, totalPages, dimensions }">
            <span class="slot-info">第 {{ pageIndex }} 页 / 共 {{ totalPages }} 页 ({{ dimensions.width }})</span>
          </template>
        `,
      },
    });

    expect(wrapper.find('.slot-info').text()).toBe('第 1 页 / 共 1 页 (210mm)');
    wrapper.unmount();
  });

  it('显式暴露 sheetRef 与 dimensions 实例属性', () => {
    const wrapper = mount(AtengPrintSheet, {
      props: { preset: 'continuous-241-140' },
    });

    const vm = wrapper.vm as unknown as {
      sheetRef: HTMLElement;
      dimensions: { width: string; height: string };
    };
    expect(vm.sheetRef).toBeDefined();
    expect(vm.dimensions.width).toBe('241mm');
    expect(vm.dimensions.height).toBe('140mm');

    wrapper.unmount();
  });
});
