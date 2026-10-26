/**
 * @atengk/video-player-vue 基础单路播放容器与无头状态机单元测试。
 *
 * 恪守全自洽单测 3 项铁律：DOM 严格还原、响应式零污染、100% 离线自洽。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import { AtengVideoPlayer } from '../src/components';
import { useVideoPlayer } from '../src/composables';

describe('AtengVideoPlayer 单路播放器基石测试', () => {
  let wrapper: VueWrapper | null = null;
  let originalSrcDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    // 1. 模拟 HTMLMediaElement 在 happy-dom 下的原生缺失能力
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.load = vi.fn();

    // 2. 拦截 happy-dom 针对 src 赋值时错误同步触发 canplay 导致 Artplayer 插件未初始化完成的缺陷
    originalSrcDescriptor = Object.getOwnPropertyDescriptor(
      window.HTMLMediaElement.prototype,
      'src',
    );
    Object.defineProperty(window.HTMLMediaElement.prototype, 'src', {
      set(val: string) {
        this.setAttribute('src', val);
        // 真实浏览器是异步微任务/定时触发 canplay，而不是同步打入
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

  it('1. 应成功挂载播放容器并渲染核心 DOM 结构', async () => {
    wrapper = mount(AtengVideoPlayer, {
      props: {
        url: 'https://example.com/test.mp4',
        poster: 'https://example.com/poster.jpg',
        title: '测试视频',
      },
    });

    expect(wrapper.classes()).toContain('at-video-player');
    const artContainer = wrapper.find('.at-video-player__art-container');
    expect(artContainer.exists()).toBe(true);
  });

  it('2. 应正确渲染自定义插槽内容 (#top, #bottom, #watermark, #default)', async () => {
    wrapper = mount(AtengVideoPlayer, {
      props: {
        url: 'https://example.com/test.mp4',
        title: '自定义标题',
      },
      slots: {
        top: '<div class="custom-top">顶部状态条</div>',
        bottom: '<div class="custom-bottom">底部工具栏</div>',
        watermark: '<div class="custom-watermark">工号007水印</div>',
        default: '<div class="custom-default">自由图层</div>',
      },
    });

    expect(wrapper.find('.custom-top').exists()).toBe(true);
    expect(wrapper.find('.custom-top').text()).toBe('顶部状态条');
    expect(wrapper.find('.custom-bottom').exists()).toBe(true);
    expect(wrapper.find('.custom-watermark').exists()).toBe(true);
    expect(wrapper.find('.custom-default').exists()).toBe(true);
  });

  it('3. 宿主组件 defineExpose 应向外暴露完备的控制门面', async () => {
    wrapper = mount(AtengVideoPlayer, {
      props: {
        url: 'https://example.com/test.mp4',
      },
    });

    const vm = wrapper.vm as unknown as {
      play: () => Promise<void>;
      pause: () => void;
      toggle: () => void;
      seek: (time: number) => void;
      setVolume: (vol: number) => void;
      setMuted: (muted: boolean) => void;
      setPlaybackRate: (rate: number) => void;
      screenshot: () => Promise<string>;
      enterFullscreen: () => void;
      exitFullscreen: () => void;
      destroy: () => void;
    };
    expect(typeof vm.play).toBe('function');
    expect(typeof vm.pause).toBe('function');
    expect(typeof vm.toggle).toBe('function');
    expect(typeof vm.seek).toBe('function');
    expect(typeof vm.setVolume).toBe('function');
    expect(typeof vm.setMuted).toBe('function');
    expect(typeof vm.setPlaybackRate).toBe('function');
    expect(typeof vm.screenshot).toBe('function');
    expect(typeof vm.enterFullscreen).toBe('function');
    expect(typeof vm.exitFullscreen).toBe('function');
    expect(typeof vm.destroy).toBe('function');
  });

  it('4. useVideoPlayer 无头状态机应提供纯响应式状态控制与销毁清理', async () => {
    const TestComponent = defineComponent({
      setup() {
        const containerRef = ref<HTMLDivElement | null>(null);
        const player = useVideoPlayer({
          container: containerRef,
          url: 'https://example.com/sample.mp4',
          autoplay: false,
        });
        return {
          containerRef,
          ...player,
        };
      },
      render() {
        return h('div', { ref: 'containerRef', class: 'test-container' });
      },
    });

    wrapper = mount(TestComponent);
    await nextTick();

    const vm = wrapper.vm as unknown as {
      playing: boolean;
      currentTime: number;
      volume: number;
      muted: boolean;
      playbackRate: number;
      play: () => Promise<void>;
      pause: () => void;
      seek: (time: number) => void;
      setVolume: (vol: number) => void;
      setMuted: (muted: boolean) => void;
      setPlaybackRate: (rate: number) => void;
    };
    expect(vm.playing).toBe(false);
    expect(vm.currentTime).toBe(0);
    expect(typeof vm.play).toBe('function');
    expect(typeof vm.pause).toBe('function');
    expect(typeof vm.seek).toBe('function');

    // 测试状态方法调用不崩溃
    vm.setVolume(0.5);
    expect(vm.volume).toBe(0.5);

    vm.setMuted(true);
    expect(vm.muted).toBe(true);

    vm.setPlaybackRate(1.5);
    expect(vm.playbackRate).toBe(1.5);

    // 卸载组件触发 onScopeDispose 确定性销毁
    wrapper.unmount();
    wrapper = null;
    expect(document.body.innerHTML).toBe('');
  });
});
