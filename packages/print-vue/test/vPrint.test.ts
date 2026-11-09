/**
 * v-print 指令单元测试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { vPrint } from '../src/directives/vPrint';
import { usePrint } from '../src/composables/usePrint';

describe('vPrint Directive', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('点击绑定指令的按钮时触发目标打印', async () => {
    const printTarget = document.createElement('div');
    printTarget.id = 'print-box';
    printTarget.textContent = '待打印区域';
    document.body.appendChild(printTarget);

    const { registerDriver } = usePrint();
    const mockPrint = vi.fn().mockResolvedValue(undefined);
    registerDriver({
      name: 'browser',
      isAvailable: async () => true,
      print: mockPrint,
    });

    const TestComponent = defineComponent({
      directives: { print: vPrint },
      template: `<button v-print="'#print-box'">一键打印</button>`,
    });

    const wrapper = mount(TestComponent);
    await wrapper.find('button').trigger('click');

    expect(mockPrint).toHaveBeenCalledWith('#print-box', expect.any(Object));
    wrapper.unmount();
  });

  it('支持对象传参形式（target + options）', async () => {
    const { registerDriver } = usePrint();
    const mockPrint = vi.fn().mockResolvedValue(undefined);
    registerDriver({
      name: 'browser',
      isAvailable: async () => true,
      print: mockPrint,
    });

    const TestComponent = defineComponent({
      directives: { print: vPrint },
      template: `<button v-print="{ target: '#print-area', extraCss: '.test {}' }">打印</button>`,
    });

    const wrapper = mount(TestComponent);
    await wrapper.find('button').trigger('click');

    expect(mockPrint).toHaveBeenCalledWith('#print-area', { extraCss: '.test {}' });
    wrapper.unmount();
  });

  it('组件卸载时正确移除 click 事件监听器', () => {
    const TestComponent = defineComponent({
      directives: { print: vPrint },
      template: `<button v-print="'#target'">打印</button>`,
    });

    const wrapper = mount(TestComponent);
    const button = wrapper.find('button').element as HTMLElement & {
      __atengPrintHandler__?: unknown;
    };
    expect(button.__atengPrintHandler__).toBeDefined();

    wrapper.unmount();
    expect(button.__atengPrintHandler__).toBeUndefined();
  });
});
