/**
 * vPrintNoSplit 防撕裂指令单元测试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect, afterEach } from 'vitest';
import { defineComponent } from 'vue';
import { mount, VueWrapper } from '@vue/test-utils';
import { vPrintNoSplit } from '../src/directives/vPrintNoSplit';

describe('vPrintNoSplit 指令', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
  });

  it('挂载时向宿主元素注入防切断样式与类名标记', () => {
    const Comp = defineComponent({
      directives: { printNoSplit: vPrintNoSplit },
      template: '<div v-print-no-split id="target">不可截断块</div>',
    });

    wrapper = mount(Comp);
    const target = wrapper.find('#target');

    expect(target.classes()).toContain('at-print-no-split');
    expect(target.attributes('data-print-no-split')).toBe('true');
    expect(target.element.style.breakInside).toBe('avoid');
  });

  it('卸载时清理类名与标记属性', () => {
    const Comp = defineComponent({
      directives: { printNoSplit: vPrintNoSplit },
      props: { show: Boolean },
      template: '<div v-if="show" v-print-no-split id="target">内容</div>',
    });

    wrapper = mount(Comp, { props: { show: true } });
    const el = wrapper.find('#target').element as HTMLElement;
    expect(el.classList.contains('at-print-no-split')).toBe(true);

    // 触发卸载指令
    vPrintNoSplit.unmounted?.(el, {} as never, null as never, null as never);
    expect(el.classList.contains('at-print-no-split')).toBe(false);
    expect(el.hasAttribute('data-print-no-split')).toBe(false);
  });
});
