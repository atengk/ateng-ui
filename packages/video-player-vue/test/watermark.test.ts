/**
 * @atengk/video-player-vue 防录屏安全水印与容器级全屏单元测试：
 * 1. AtengVideoWatermark 动态安全水印基础渲染与 Canvas 平铺
 * 2. MutationObserver DOM 审查防篡改与毫秒级自愈 (Tamper-Proof & Self-Healing)
 * 3. 动态微位移浮动算法与定时器确定性清理
 * 4. 容器级全屏穿越 (Container Fullscreen) 保证全屏水印覆盖不丢失
 *
 * 恪守全自洽单测 3 项铁律：DOM 严格还原、响应式与存储零污染、100% 离线自洽。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { AtengVideoPlayer, AtengVideoWatermark } from '../src/components';
import type { WatermarkTamperDetail } from '../src/types';

describe('工单 #145 防录屏安全水印与全屏穿越测试套件', () => {
  let wrapper: VueWrapper | null = null;
  let originalSrcDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    // 1. 模拟 HTMLMediaElement 在 happy-dom 下的能力
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.load = vi.fn();

    // 2. 模拟 HTMLCanvasElement.toDataURL
    if (typeof HTMLCanvasElement !== 'undefined') {
      HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mockWatermark');
    }

    // 3. 拦截 happy-dom 针对 src 赋值时错误同步触发 canplay
    originalSrcDescriptor = Object.getOwnPropertyDescriptor(
      window.HTMLMediaElement.prototype,
      'src',
    );
    Object.defineProperty(window.HTMLMediaElement.prototype, 'src', {
      set(val: string) {
        this.setAttribute('src', val);
        setTimeout(() => {
          this.dispatchEvent(new Event('canplay'));
        }, 0);
      },
      get() {
        return this.getAttribute('src') || '';
      },
      configurable: true,
    });
  });

  afterEach(() => {
    if (originalSrcDescriptor) {
      Object.defineProperty(window.HTMLMediaElement.prototype, 'src', originalSrcDescriptor);
    }
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  describe('1. AtengVideoWatermark 基础渲染与样式应用', () => {
    it('应正确渲染水印容器并生成平铺背景', async () => {
      wrapper = mount(AtengVideoWatermark, {
        props: {
          content: ['工号 9527', '机密资产 严禁外传'],
          fontSize: 18,
          color: '#ffffff',
          opacity: 0.2,
          rotate: -30,
          gapX: 180,
          gapY: 140,
        },
      });

      await nextTick();
      expect(wrapper.find('.at-video-watermark-wrapper').exists()).toBe(true);

      const watermarkEl = wrapper.find('.at-video-watermark');
      expect(watermarkEl.exists()).toBe(true);

      const style = (watermarkEl.element as HTMLElement).style;
      expect(style.position).toBe('absolute');
      expect(style.pointerEvents).toBe('none');
      expect(style.backgroundImage).toContain('data:image/');
      expect(style.backgroundRepeat).toBe('repeat');
    });

    it('支持单一字符串格式的 content 传入', async () => {
      wrapper = mount(AtengVideoWatermark, {
        props: {
          content: '涉密专看 截屏追责',
        },
      });

      await nextTick();
      const watermarkEl = wrapper.find('.at-video-watermark');
      expect(watermarkEl.exists()).toBe(true);
      expect((watermarkEl.element as HTMLElement).style.backgroundImage).toContain('data:image/');
    });
  });

  describe('2. MutationObserver DOM 审查防篡改与毫秒级自愈', () => {
    it('当水印节点的 display 被恶意修改为 none 时，应派发告警并就地自愈恢复', async () => {
      wrapper = mount(AtengVideoWatermark, {
        props: {
          content: '防篡改测试',
          tamperProof: true,
          floating: false,
        },
        attachTo: document.body,
      });

      await nextTick();
      const watermarkEl = wrapper.find('.at-video-watermark').element as HTMLElement;
      expect(watermarkEl.style.display).toBe('block');

      // 模拟黑客在 F12 元素面板中修改 CSS 隐藏水印
      watermarkEl.style.display = 'none';

      // 等待 MutationObserver 微任务响应
      await new Promise(resolve => setTimeout(resolve, 50));

      // 1. 应触发安全告警事件
      expect(wrapper.emitted('watermark-tampered')).toBeTruthy();
      const detail = wrapper.emitted('watermark-tampered')?.[0]?.[0] as WatermarkTamperDetail;
      expect(detail.type).toBe('style');
      expect(typeof detail.timestamp).toBe('number');

      // 2. 应就地自愈恢复为 block
      expect(watermarkEl.style.display).toBe('block');
      expect(watermarkEl.style.backgroundImage).toContain('data:image/');
    });

    it('当水印节点被恶意从 DOM 树中 remove 删除时，应派发告警并重新挂回自愈', async () => {
      wrapper = mount(AtengVideoWatermark, {
        props: {
          content: '防删除自愈测试',
          tamperProof: true,
          floating: false,
        },
        attachTo: document.body,
      });

      await nextTick();
      const wrapperEl = wrapper.find('.at-video-watermark-wrapper').element as HTMLElement;
      const watermarkEl = wrapper.find('.at-video-watermark').element as HTMLElement;
      expect(wrapperEl.contains(watermarkEl)).toBe(true);

      // 模拟黑客直接在控制台敲 delete 或 el.remove()
      watermarkEl.remove();
      expect(wrapperEl.contains(watermarkEl)).toBe(false);

      // 等待 MutationObserver 微任务响应
      await new Promise(resolve => setTimeout(resolve, 50));

      // 1. 应触发 removal 类型安全告警事件
      expect(wrapper.emitted('watermark-tampered')).toBeTruthy();
      const detail = wrapper.emitted('watermark-tampered')?.[0]?.[0] as WatermarkTamperDetail;
      expect(detail.type).toBe('removal');

      // 2. 应自动挂回父节点
      expect(wrapperEl.contains(watermarkEl)).toBe(true);
    });

    it('当水印节点的 opacity 被恶意降至极小值 (0.01) 时，应派发告警并就地自愈恢复', async () => {
      wrapper = mount(AtengVideoWatermark, {
        props: {
          content: '低透明度防篡改测试',
          opacity: 0.15,
          tamperProof: true,
          floating: false,
        },
        attachTo: document.body,
      });

      await nextTick();
      const watermarkEl = wrapper.find('.at-video-watermark').element as HTMLElement;
      expect(watermarkEl.style.opacity).toBe('1');

      // 模拟恶意黑客将透明度设为极低值 0.01 试图肉眼隐藏水印
      watermarkEl.style.opacity = '0.01';

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(wrapper.emitted('watermark-tampered')).toBeTruthy();
      expect(watermarkEl.style.opacity).toBe('1');
    });
  });

  describe('3. 动态微位移浮动算法', () => {
    it('开启 floating 时应定时产生随机位移并平滑变换', async () => {
      vi.useFakeTimers();

      wrapper = mount(AtengVideoWatermark, {
        props: {
          content: '微位移测试',
          floating: true,
          floatInterval: 1000,
          floatDistance: 20,
        },
      });

      await nextTick();
      const watermarkEl = wrapper.find('.at-video-watermark').element as HTMLElement;

      // 前进 1000ms 定时器
      vi.advanceTimersByTime(1000);
      await nextTick();

      const newTransform = watermarkEl.style.transform;
      expect(newTransform).toMatch(/translate3d\(-?\d+px,\s*-?\d+px,\s*0(px)?\)/);

      vi.useRealTimers();
    });
  });

  describe('4. 容器级全屏穿越 (Container Fullscreen)', () => {
    it('调用 enterFullscreen 时应由最外层根容器发起 requestFullscreen，保证水印浮层稳定在全屏视口内', async () => {
      wrapper = mount(AtengVideoPlayer, {
        props: {
          url: 'https://example.com/test-fullscreen.mp4',
        },
        slots: {
          watermark: `
            <div class="test-watermark-layer">
              <span>机密水印</span>
            </div>
          `,
        },
        attachTo: document.body,
      });

      await nextTick();
      const vm = wrapper.vm as unknown as {
        enterFullscreen(): Promise<void>;
        exitFullscreen(): Promise<void>;
      };
      const rootEl = wrapper.find('.at-video-player').element as HTMLElement;

      // 模拟 HTML 元素 requestFullscreen
      rootEl.requestFullscreen = vi.fn().mockResolvedValue(undefined);
      document.exitFullscreen = vi.fn().mockResolvedValue(undefined);

      // 1. 调用容器全屏
      await vm.enterFullscreen();
      expect(rootEl.requestFullscreen).toHaveBeenCalled();

      // 2. 模拟全屏状态下水印仍然牢固处于容器内
      const watermark = wrapper.find('.test-watermark-layer');
      expect(watermark.exists()).toBe(true);
      expect(rootEl.contains(watermark.element)).toBe(true);

      // 3. 模拟退出全屏
      Object.defineProperty(document, 'fullscreenElement', {
        value: rootEl,
        configurable: true,
      });

      await vm.exitFullscreen();
      expect(document.exitFullscreen).toHaveBeenCalled();
    });
  });
});
