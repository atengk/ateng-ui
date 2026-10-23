/**
 * AtengWatermark 组件单元测试。
 *
 * @author Ateng
 * @since 2026-10-23
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { AtengWatermark } from '../src/components/watermark';

describe('AtengWatermark 组件测试', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
  });

  it('基础渲染：包含默认槽内容与水印遮罩', () => {
    wrapper = mount(AtengWatermark, {
      props: {
        content: '机密资产',
      },
      slots: {
        default: '<div class="test-content">核心业务数据</div>',
      },
      attachTo: document.body,
    });

    expect(wrapper.classes()).toContain('at-watermark');
    expect(wrapper.find('.test-content').exists()).toBe(true);

    const mask = wrapper.find('.at-watermark__mask');
    expect(mask.exists()).toBe(true);

    const maskEl = mask.element as HTMLElement;
    expect(maskEl.style.position).toBe('absolute');
    expect(maskEl.style.pointerEvents).toBe('none');
    expect(maskEl.style.zIndex).toBe('9');
    expect(maskEl.style.backgroundImage).toContain('data:image/');
  });

  it('多行文本与自定义样式参数', () => {
    wrapper = mount(AtengWatermark, {
      props: {
        content: ['内部机密', '工号 10086', '2026-10-23'],
        width: 300,
        height: 180,
        rotate: -30,
        zIndex: 99,
        gap: [80, 80],
        font: {
          color: 'rgba(255, 0, 0, 0.2)',
          fontSize: 16,
          fontWeight: 'bold',
        },
      },
      attachTo: document.body,
    });

    const maskEl = wrapper.find('.at-watermark__mask').element as HTMLElement;
    expect(maskEl.style.zIndex).toBe('99');
    expect(maskEl.style.backgroundImage).toContain('data:image/');
  });

  it('全屏模式：启用 full 属性', () => {
    wrapper = mount(AtengWatermark, {
      props: {
        content: '全屏水印',
        full: true,
      },
      attachTo: document.body,
    });

    expect(wrapper.classes()).toContain('at-watermark--full');
    const maskEl = wrapper.find('.at-watermark__mask').element as HTMLElement;
    expect(maskEl.style.position).toBe('fixed');
  });

  it('主动防篡改守卫：篡改 style 属性时微任务自动自愈', async () => {
    wrapper = mount(AtengWatermark, {
      props: {
        content: '防篡改数据',
        antiTamper: true,
      },
      attachTo: document.body,
    });

    const maskEl = wrapper.find('.at-watermark__mask').element as HTMLElement;
    expect(maskEl.style.display).toBe('block');

    // 模拟恶意用户在 DevTools 中注入 display: none
    maskEl.style.display = 'none';
    maskEl.style.opacity = '0';

    // 等待 MutationObserver 微任务执行自愈
    await new Promise(resolve => setTimeout(resolve, 50));
    await nextTick();

    expect(maskEl.style.display).toBe('block');
    expect(maskEl.style.opacity).toBe('1');
  });

  it('主动防篡改守卫：删除遮罩 DOM 节点时自动重新挂载', async () => {
    wrapper = mount(AtengWatermark, {
      props: {
        content: '防删除水印',
        antiTamper: true,
      },
      attachTo: document.body,
    });

    const containerEl = wrapper.element as HTMLElement;
    const maskEl = wrapper.find('.at-watermark__mask').element as HTMLElement;

    expect(containerEl.contains(maskEl)).toBe(true);

    // 模拟恶意用户在 DevTools 中删除水印节点
    maskEl.remove();
    expect(containerEl.contains(maskEl)).toBe(false);

    // 等待 MutationObserver 微任务自愈
    await new Promise(resolve => setTimeout(resolve, 50));
    await nextTick();

    expect(containerEl.contains(maskEl)).toBe(true);
    expect(maskEl.style.backgroundImage).toContain('data:image/');
  });

  it('响应式更新：动态修改 content 触发重绘', async () => {
    wrapper = mount(AtengWatermark, {
      props: {
        content: '初始文本',
      },
      attachTo: document.body,
    });

    const oldBg = (wrapper.find('.at-watermark__mask').element as HTMLElement).style
      .backgroundImage;

    await wrapper.setProps({
      content: '更新后的水印文本',
    });
    await nextTick();

    const newBg = (wrapper.find('.at-watermark__mask').element as HTMLElement).style
      .backgroundImage;
    expect(newBg).toContain('data:image/');
    expect(newBg).not.toBe(oldBg);
  });

  it('组件卸载时确定性销毁', () => {
    wrapper = mount(AtengWatermark, {
      props: {
        content: '销毁测试',
      },
      attachTo: document.body,
    });

    expect(() => {
      wrapper?.unmount();
      wrapper = null;
    }).not.toThrow();
  });
});
