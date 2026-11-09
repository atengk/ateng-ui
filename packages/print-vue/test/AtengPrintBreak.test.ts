/**
 * AtengPrintBreak 组件单元测试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AtengPrintBreak from '../src/components/AtengPrintBreak.vue';

describe('AtengPrintBreak', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('成功渲染强制物理分页断点节点', () => {
    const wrapper = mount(AtengPrintBreak);

    const el = wrapper.find('.at-print-break');
    expect(el.exists()).toBe(true);
    expect(el.attributes('aria-hidden')).toBe('true');

    wrapper.unmount();
  });
});
