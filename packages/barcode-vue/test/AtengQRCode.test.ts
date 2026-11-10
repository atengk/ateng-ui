/**
 * @atengk/barcode-vue AtengQRCode 组件单元测试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import AtengQRCode from '../src/components/AtengQRCode.vue';

describe('AtengQRCode.vue', () => {
  let wrapper: VueWrapper<unknown> | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
  });

  it('正常挂载并渲染二维码根节点与画布容器', async () => {
    wrapper = mount(AtengQRCode, {
      props: {
        value: 'https://atengk.com/test',
        preset: 'standard',
        width: 160,
        height: 160,
      },
    });

    await new Promise(resolve => setTimeout(resolve, 80));

    expect(wrapper.classes()).toContain('at-qrcode');
    const canvasBox = wrapper.find('.at-qrcode__canvas');
    expect(canvasBox.exists()).toBe(true);
    expect(canvasBox.attributes('style')).toContain('width: 160px');
    expect(canvasBox.attributes('style')).toContain('height: 160px');
  });

  it('支持切换至 tech-blue 渐变预设并发出 render-success 事件', async () => {
    wrapper = mount(AtengQRCode, {
      props: {
        value: 'https://atengk.com/tech',
        preset: 'tech-blue',
      },
    });

    await new Promise(resolve => setTimeout(resolve, 80));

    expect(wrapper.emitted('render-success')).toBeTruthy();
  });

  it('支持 SVG 模式渲染', async () => {
    wrapper = mount(AtengQRCode, {
      props: {
        value: 'https://atengk.com/svg-mode',
        preset: 'elegant-dots',
        type: 'svg',
      },
    });

    await new Promise(resolve => setTimeout(resolve, 80));

    expect(wrapper.find('svg').exists()).toBe(true);
  });

  it('通过 defineExpose 暴露 getRawInstance、exportAsImage 与 download', async () => {
    wrapper = mount(AtengQRCode, {
      props: {
        value: 'https://atengk.com/expose',
        preset: 'classy',
      },
    });

    await new Promise(resolve => setTimeout(resolve, 80));

    const vm = wrapper.vm as unknown as {
      getRawInstance: () => unknown;
      exportAsImage: (opts?: unknown) => Promise<unknown>;
      download: (opts?: unknown) => Promise<void>;
      refresh: () => Promise<void>;
    };

    expect(typeof vm.getRawInstance).toBe('function');
    expect(typeof vm.exportAsImage).toBe('function');
    expect(typeof vm.download).toBe('function');
    expect(typeof vm.refresh).toBe('function');

    expect(vm.getRawInstance()).toBeDefined();

    // 测试导出
    const exported = await vm.exportAsImage({ format: 'png' });
    expect(typeof exported).toBe('string');
  });

  it('支持渲染默认默认插槽（额外描述信息）', async () => {
    wrapper = mount(AtengQRCode, {
      props: {
        value: 'https://atengk.com/slot',
      },
      slots: {
        default: '<span class="test-desc">微信扫码关注公众号</span>',
      },
    });

    await new Promise(resolve => setTimeout(resolve, 80));

    expect(wrapper.find('.test-desc').text()).toBe('微信扫码关注公众号');
  });
});
