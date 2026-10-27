/**
 * @atengk/video-player-vue 点播深水区特性单元测试：
 * 1. 键盘全局快捷键体系与逐帧微调步进 (Keyboard Hotkeys & Frame Stepping)
 * 2. 本地播放历史记忆续播 (Playback Resume & History)
 * 3. 进度条时间轴 Hover 缩略图预览卡片 (Thumbnails & VTT)
 * 4. 时间轴事件打点高亮与点击快速跳帧 (Timeline Markers & Fast Jump)
 *
 * 恪守全自洽单测 3 项铁律：DOM 严格还原、响应式与存储零污染、100% 离线自洽。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { effectScope, nextTick } from 'vue';
import { AtengVideoPlayer } from '../src/components';
import { formatVideoTime, useVideoPlaybackHistory, useVideoPlayer } from '../src/composables';
import { ArtplayerEngine } from '../src/engine/ArtplayerEngine';
import type { VideoMarkerItem } from '../src/types';

describe('工单 #144 点播深水区特性测试套件', () => {
  let wrapper: VueWrapper | null = null;
  let originalSrcDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    localStorage.clear();

    // 1. 模拟 HTMLMediaElement 在 happy-dom 下的能力
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.load = vi.fn();

    // 2. 拦截 happy-dom 针对 src 赋值时错误同步触发 canplay
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
    localStorage.clear();
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

  describe('1. 格式化工具与时间计算', () => {
    it('formatVideoTime 应准确将秒数转为标准时分秒', () => {
      expect(formatVideoTime(0)).toBe('00:00');
      expect(formatVideoTime(5)).toBe('00:05');
      expect(formatVideoTime(65)).toBe('01:05');
      expect(formatVideoTime(83)).toBe('01:23');
      expect(formatVideoTime(3600)).toBe('01:00:00');
      expect(formatVideoTime(3665)).toBe('01:01:05');
      expect(formatVideoTime(-10)).toBe('00:00');
      expect(formatVideoTime(NaN)).toBe('00:00');
    });
  });

  describe('2. 键盘全局快捷键体系与逐帧微调步进', () => {
    it('ArtplayerEngine 应支持 step 相对快进/快退以及 stepFrame 逐帧步进', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const engine = new ArtplayerEngine(container, {
        url: 'https://example.com/video.mp4',
      });

      const seekSpy = vi.spyOn(engine, 'seek');

      // 模拟当前时间 10 秒
      Object.defineProperty(engine, 'currentTime', {
        get: () => 10,
        configurable: true,
      });

      // 快进 5 秒
      engine.step(5);
      expect(seekSpy).toHaveBeenCalledWith(15);

      // 快退 3 秒
      engine.step(-3);
      expect(seekSpy).toHaveBeenCalledWith(7);

      // 单帧前进 (默认 30fps，向前 1 帧 = 1/30 ≈ 0.0333s)
      engine.stepFrame(1, 30);
      expect(seekSpy).toHaveBeenCalledWith(10 + 1 / 30);

      // 单帧后退 (向前 -1 帧)
      engine.stepFrame(-1, 30);
      expect(seekSpy).toHaveBeenCalledWith(10 - 1 / 30);

      engine.destroy();
      container.remove();
    });

    it('键盘事件触发时应正确调用对应的快捷键控制', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const engine = new ArtplayerEngine(container, {
        url: 'https://example.com/video.mp4',
        hotkey: true,
      });

      const toggleSpy = vi.spyOn(engine, 'toggle');
      const stepSpy = vi.spyOn(engine, 'step');
      const volSpy = vi.spyOn(engine, 'setVolume');
      const fullSpy = vi.spyOn(engine, 'toggleFullscreen');
      const muteSpy = vi.spyOn(engine, 'setMuted');
      const stepFrameSpy = vi.spyOn(engine, 'stepFrame');

      // 1. 空格键 -> toggle 播放/暂停
      container.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      expect(toggleSpy).toHaveBeenCalled();

      // 2. 左右方向键 -> 快退/快进 5s
      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      expect(stepSpy).toHaveBeenCalledWith(-5);

      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      expect(stepSpy).toHaveBeenCalledWith(5);

      // 3. 上下方向键 -> 音量调节
      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      expect(volSpy).toHaveBeenCalled();

      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      expect(volSpy).toHaveBeenCalled();

      // 4. F 键 -> 全屏
      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
      expect(fullSpy).toHaveBeenCalled();

      // 5. M 键 -> 静音
      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true }));
      expect(muteSpy).toHaveBeenCalled();

      // 6. [ 和 ] -> 逐帧微调
      container.dispatchEvent(new KeyboardEvent('keydown', { key: '[', bubbles: true }));
      expect(stepFrameSpy).toHaveBeenCalledWith(-1);

      container.dispatchEvent(new KeyboardEvent('keydown', { key: ']', bubbles: true }));
      expect(stepFrameSpy).toHaveBeenCalledWith(1);

      engine.destroy();
      container.remove();
    });

    it('当焦点在输入框中敲击按键时应被防御性忽略', () => {
      const container = document.createElement('div');
      const input = document.createElement('input');
      container.appendChild(input);
      document.body.appendChild(container);

      const engine = new ArtplayerEngine(container, {
        url: 'https://example.com/video.mp4',
        hotkey: true,
      });

      const toggleSpy = vi.spyOn(engine, 'toggle');

      input.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      expect(toggleSpy).not.toHaveBeenCalled();

      engine.destroy();
      container.remove();
    });
  });

  describe('3. 本地播放历史记忆续播', () => {
    it('useVideoPlaybackHistory 应支持进度保存、读取、恢复与清除', () => {
      const testUrl = 'https://example.com/history-test.mp4';
      const history = useVideoPlaybackHistory(() => testUrl, {
        enabled: true,
        minTime: 5,
        maxTimeThreshold: 5,
        autoPlay: true,
        showPrompt: true,
      });

      // 初始无记录
      expect(history.hasResumePoint.value).toBe(false);
      expect(history.resumeTime.value).toBe(0);

      // 模拟模拟引擎
      const mockEngine = {
        seek: vi.fn(),
        play: vi.fn().mockResolvedValue(undefined),
      } as unknown as ArtplayerEngine;

      // 首次保存进度：小于 minTime (5s) 的跳过
      history.saveProgress(3, 100);
      expect(history.checkAndApplyResume(mockEngine, 100)).toBeNull();

      // 保存大于 5s 的有效进度 (45s)
      // 为模拟绕过 1s 节流，直接向 localStorage 写入合法结构
      localStorage.setItem(
        `at_video_resume_${testUrl}`,
        JSON.stringify({ time: 45, updatedAt: Date.now() }),
      );

      // 再次检查并恢复进度
      const restored = history.checkAndApplyResume(mockEngine, 100);
      expect(restored).toBe(45);
      expect(mockEngine.seek).toHaveBeenCalledWith(45);
      expect(mockEngine.play).toHaveBeenCalled();
      expect(history.hasResumePoint.value).toBe(true);
      expect(history.resumeTime.value).toBe(45);
      expect(history.formattedResumeTime.value).toBe('00:45');
      expect(history.showPrompt.value).toBe(true);

      // 手动关闭提示条
      history.closePrompt();
      expect(history.showPrompt.value).toBe(false);

      // 清除历史
      history.clearHistory();
      expect(history.hasResumePoint.value).toBe(false);
      expect(localStorage.getItem(`at_video_resume_${testUrl}`)).toBeNull();
    });

    it('AtengVideoPlayer 组件开启 autoResume 时应恢复进度并展示重新播放卡片', async () => {
      const videoUrl = 'https://example.com/resume-player.mp4';
      localStorage.setItem(
        `at_video_resume_${videoUrl}`,
        JSON.stringify({ time: 85, updatedAt: Date.now() }),
      );

      wrapper = mount(AtengVideoPlayer, {
        props: {
          url: videoUrl,
          autoResume: true,
          autoPlayResume: false,
        },
      });

      await nextTick();
      const vm = wrapper.vm as unknown as {
        engine:
          | (ArtplayerEngine & {
              handlers?: { onReady?: (eng: unknown) => void };
            })
          | null;
      };

      // 触发 ready 事件以模拟引擎加载完毕
      if (vm.engine?.handlers?.onReady) {
        vm.engine.handlers.onReady(vm.engine);
      }
      await nextTick();

      // 应派发 resume 事件
      expect(wrapper.emitted('resume')).toBeTruthy();
      expect(wrapper.emitted('resume')?.[0]).toEqual([85]);

      // 页面应呈现记忆续播提示条
      const banner = wrapper.find('.at-video-player__resume-banner');
      expect(banner.exists()).toBe(true);
      expect(banner.text()).toContain('已恢复上次播放进度 01:25');

      // 点击重新播放按钮
      const replayBtn = wrapper.find('.at-video-player__resume-btn');
      expect(replayBtn.exists()).toBe(true);
      const seekSpy = vi.spyOn(vm.engine!, 'seek');

      await replayBtn.trigger('click');
      expect(seekSpy).toHaveBeenCalledWith(0);
      expect(wrapper.find('.at-video-player__resume-banner').exists()).toBe(false);
    });
  });

  describe('4. 缩略图配置与时间轴打点', () => {
    it('AtengVideoPlayer 应正确传递 thumbnails 缩略图配置', async () => {
      wrapper = mount(AtengVideoPlayer, {
        props: {
          url: 'https://example.com/thumbnails-test.mp4',
          thumbnails: {
            url: 'https://example.com/thumbnails.jpg',
            number: 100,
            column: 10,
            width: 160,
            height: 90,
          },
        },
      });

      await nextTick();
      const vm = wrapper.vm as unknown as {
        engine:
          | (ArtplayerEngine & {
              rawInstance?: { option: { thumbnails?: Record<string, unknown> } };
            })
          | null;
      };
      expect(vm.engine).toBeTruthy();
      const rawArt = vm.engine?.rawInstance;
      expect(rawArt?.option.thumbnails).toEqual({
        url: 'https://example.com/thumbnails.jpg',
        number: 100,
        column: 10,
        width: 160,
        height: 90,
        scale: 1,
      });
    });

    it('AtengVideoPlayer 应正确渲染 markers 并在点击打点时跳帧及触发 marker-click', async () => {
      const markers: VideoMarkerItem[] = [
        { time: 15, text: '精彩进球', color: '#f59e0b' },
        { time: 45, text: '高光瞬间', color: '#10b981' },
      ];

      wrapper = mount(AtengVideoPlayer, {
        props: {
          url: 'https://example.com/markers-test.mp4',
          markers,
        },
      });

      await nextTick();
      const vm = wrapper.vm as unknown as {
        engine:
          | (ArtplayerEngine & {
              rawInstance?: {
                option: { highlight?: Array<{ time: number; text: string }> };
                emit(event: string, ...args: unknown[]): void;
              };
            })
          | null;
      };
      const rawArt = vm.engine?.rawInstance;

      // 验证 Artplayer highlight 映射
      expect(rawArt?.option.highlight).toEqual([
        { time: 15, text: '精彩进球' },
        { time: 45, text: '高光瞬间' },
      ]);

      const artContainer = wrapper.find('.at-video-player__art-container');
      let highlightDiv = artContainer.element.querySelector<HTMLElement>('.art-progress-highlight');
      if (!highlightDiv) {
        highlightDiv = document.createElement('div');
        highlightDiv.className = 'art-progress-highlight';
        highlightDiv.innerText = '精彩进球';
        artContainer.element.appendChild(highlightDiv);
      }

      // 触发 ready 注入颜色
      rawArt?.emit('ready');
      expect(['#f59e0b', 'rgb(245, 158, 11)']).toContain(highlightDiv.style.backgroundColor);

      // 模拟点击打点
      const seekSpy = vi.spyOn(vm.engine!, 'seek');
      highlightDiv.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(seekSpy).toHaveBeenCalledWith(15);
      expect(wrapper.emitted('marker-click')).toBeTruthy();
      expect(wrapper.emitted('marker-click')?.[0]).toEqual([markers[0]]);
      expect(wrapper.emitted('markerClick')).toBeTruthy();
      expect(wrapper.emitted('markerClick')?.[0]).toEqual([markers[0]]);
    });

    it('useVideoPlaybackHistory 在 effectScope 销毁时应闭环清理定时器', () => {
      const scope = effectScope();
      let historyState: ReturnType<typeof useVideoPlaybackHistory> | null = null;
      scope.run(() => {
        historyState = useVideoPlaybackHistory('https://example.com/timer-test.mp4', {
          enabled: true,
          showPrompt: true,
          promptDuration: 5000,
        });
      });
      expect(historyState).toBeTruthy();

      // 存入历史并恢复以唤起浮层
      localStorage.setItem(
        'at_video_resume_https://example.com/timer-test.mp4',
        JSON.stringify({ time: 30, updatedAt: Date.now() }),
      );
      historyState?.checkAndApplyResume(
        { seek: vi.fn(), play: vi.fn().mockResolvedValue(undefined) } as unknown as ArtplayerEngine,
        100,
      );
      expect(historyState?.showPrompt.value).toBe(true);

      // 销毁作用域，触发 onScopeDispose
      scope.stop();
      expect(historyState?.showPrompt.value).toBe(false);
    });

    it('useVideoPlayer 应完整透出记忆续播状态与关闭方法', () => {
      const container = document.createElement('div');
      const player = useVideoPlayer({
        container,
        url: 'https://example.com/resume-hook.mp4',
        autoResume: true,
      });

      expect(player.showResumePrompt).toBeDefined();
      expect(player.resumeTime).toBeDefined();
      expect(player.formattedResumeTime).toBeDefined();
      expect(typeof player.closeResumePrompt).toBe('function');
      player.destroy();
    });
  });
});
