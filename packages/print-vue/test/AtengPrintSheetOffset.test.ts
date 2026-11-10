/**
 * AtengPrintSheet 物理套打偏移校准单元测试。
 *
 * 验证 offsetX 与 offsetY 属性在屏幕与打印态下的样式换算。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import AtengPrintSheet from '../src/components/AtengPrintSheet.vue';

describe('AtengPrintSheet 物理套打偏移', () => {
  let wrapper: VueWrapper<unknown> | null = null;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
  });

  it('应用 offsetX 与 offsetY 毫米偏移平移样式', () => {
    wrapper = mount(AtengPrintSheet, {
      props: {
        preset: 'a4',
        offsetX: 2.5,
        offsetY: -1.5,
      },
      slots: {
        default: '<div class="content">套打内容</div>',
      },
    });

    const sheet = wrapper.find('.at-print-sheet');
    expect(sheet.exists()).toBe(true);

    const style = sheet.attributes('style') || '';
    expect(style).toContain('translate(2.5mm, -1.5mm)');
  });
});
