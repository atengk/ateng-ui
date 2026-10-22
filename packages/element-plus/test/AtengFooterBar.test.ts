/**
 * AtengFooterBar 组件单元测试。
 *
 * @author Ateng
 * @since 2026-10-22
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { AtengFooterBar } from '../src/components/footer-bar';

describe('AtengFooterBar 组件测试', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('基础渲染：默认 sticky 模式，包含操作按钮与边框', () => {
    wrapper = mount(AtengFooterBar, {
      slots: {
        default: '<button class="submit-btn">提交</button>',
        extra: '<span class="status-tip">已自动保存草稿</span>',
      },
      attachTo: document.body,
    });

    const bar = wrapper.find('.at-footer-bar');
    expect(bar.exists()).toBe(true);
    expect(bar.classes()).toContain('is-sticky');
    expect(bar.classes()).toContain('is-bordered');
    expect(wrapper.find('.submit-btn').exists()).toBe(true);
    expect(wrapper.find('.status-tip').exists()).toBe(true);
  });

  it('fixed 模式与防遮挡占位垫块 (placeholder)', () => {
    wrapper = mount(AtengFooterBar, {
      props: {
        position: 'fixed',
        placeholder: true,
        height: 60,
      },
      attachTo: document.body,
    });

    const bar = wrapper.find('.at-footer-bar');
    expect(bar.classes()).toContain('is-fixed');
    expect(bar.attributes('style')).toContain('position: fixed');

    // 占位垫块
    const placeholder = wrapper.find('.at-footer-bar__placeholder');
    expect(placeholder.exists()).toBe(true);
    expect(placeholder.attributes('style')).toContain('height: 60px');
  });

  it('关闭 placeholder 时不渲染占位块', () => {
    wrapper = mount(AtengFooterBar, {
      props: {
        position: 'fixed',
        placeholder: false,
      },
      attachTo: document.body,
    });

    expect(wrapper.find('.at-footer-bar__placeholder').exists()).toBe(false);
  });

  it('智能对齐：开启 autoOffset 时，通过 target 动态测量并设置 left 与 width', async () => {
    const container = document.createElement('div');
    container.className = 'custom-layout-main';
    document.body.appendChild(container);

    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      left: 220,
      top: 0,
      right: 1220,
      bottom: 900,
      width: 1000,
      height: 900,
      x: 220,
      y: 0,
      toJSON: () => {},
    });

    wrapper = mount(AtengFooterBar, {
      props: {
        position: 'fixed',
        autoOffset: true,
        target: '.custom-layout-main',
      },
      attachTo: document.body,
    });

    await nextTick();
    const bar = wrapper.find('.at-footer-bar');
    expect(bar.attributes('style')).toContain('left: 220px');
    expect(bar.attributes('style')).toContain('width: 1000px');
  });

  it('智能对齐：未显式传 target 时，自动向上寻找 .at-page-container 或父容器', async () => {
    const parent = document.createElement('div');
    parent.className = 'at-page-container';
    document.body.appendChild(parent);

    vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue({
      left: 180,
      top: 0,
      right: 980,
      bottom: 700,
      width: 800,
      height: 700,
      x: 180,
      y: 0,
      toJSON: () => {},
    });

    wrapper = mount(AtengFooterBar, {
      props: {
        position: 'fixed',
        autoOffset: true,
      },
      attachTo: parent,
    });

    await nextTick();
    const bar = wrapper.find('.at-footer-bar');
    expect(bar.attributes('style')).toContain('left: 180px');
    expect(bar.attributes('style')).toContain('width: 800px');
  });

  it('智能对齐：容器 Resize 触发回调后，平滑更新 left 与 width', async () => {
    let roCallback: () => void = () => {};
    class MockResizeObserver {
      constructor(callback: () => void) {
        roCallback = callback;
      }
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }

    const originalRO = window.ResizeObserver;
    window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

    try {
      const container = document.createElement('div');
      container.className = 'resizable-container';
      document.body.appendChild(container);

      let currentLeft = 200;
      let currentWidth = 800;

      vi.spyOn(container, 'getBoundingClientRect').mockImplementation(() => ({
        left: currentLeft,
        top: 0,
        right: currentLeft + currentWidth,
        bottom: 600,
        width: currentWidth,
        height: 600,
        x: currentLeft,
        y: 0,
        toJSON: () => {},
      }));

      wrapper = mount(AtengFooterBar, {
        props: {
          position: 'fixed',
          autoOffset: true,
          target: '.resizable-container',
        },
        attachTo: document.body,
      });

      await nextTick();
      const bar = wrapper.find('.at-footer-bar');
      expect(bar.attributes('style')).toContain('left: 200px');
      expect(bar.attributes('style')).toContain('width: 800px');

      // 模拟侧边栏折叠：left 变为 64，width 变为 936
      currentLeft = 64;
      currentWidth = 936;
      roCallback();

      // 推进 requestAnimationFrame
      await new Promise(resolve => requestAnimationFrame(resolve));
      await nextTick();

      expect(bar.attributes('style')).toContain('left: 64px');
      expect(bar.attributes('style')).toContain('width: 936px');
    } finally {
      window.ResizeObserver = originalRO;
    }
  });

  it('确定性生命周期清理：组件销毁时断开 ResizeObserver 监听', async () => {
    const disconnectSpy = vi.fn();
    const observeSpy = vi.fn();

    class MockResizeObserver {
      observe = observeSpy;
      unobserve = vi.fn();
      disconnect = disconnectSpy;
    }

    const originalRO = window.ResizeObserver;
    window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

    try {
      wrapper = mount(AtengFooterBar, {
        props: {
          position: 'fixed',
          autoOffset: true,
        },
        attachTo: document.body,
      });

      await nextTick();
      expect(observeSpy).toHaveBeenCalled();

      wrapper.unmount();
      wrapper = null;
      expect(disconnectSpy).toHaveBeenCalled();
    } finally {
      window.ResizeObserver = originalRO;
    }
  });
});
