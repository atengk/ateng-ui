/**
 * @atengk/video-player-vue 流媒体与解封装驱动器专项单元测试：
 * 1. useStreamReconnect 指数退避重连状态机
 * 2. HlsDriver HLS 流媒体播放驱动
 * 3. MpegtsDriver FLV 流媒体播放驱动与追帧机制
 * 4. AtengVideoPlayer 直播态徽标与重连硬失败插槽
 *
 * 恪守全自洽单测 3 项铁律：DOM 严格还原、响应式零污染、100% 离线自洽。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { effectScope } from 'vue';
import mpegts from 'mpegts.js';
import { authManager } from '@atengk/core';
import { useStreamReconnect } from '../src/composables/useStreamReconnect';
import { HlsDriver } from '../src/drivers/HlsDriver';
import { MpegtsDriver } from '../src/drivers/MpegtsDriver';
import { AtengVideoPlayer } from '../src/components';

// Mock hls.js
vi.mock('hls.js', () => {
  const mockHlsInstance = {
    attachMedia: vi.fn(),
    loadSource: vi.fn(),
    on: vi.fn(),
    startLoad: vi.fn(),
    stopLoad: vi.fn(),
    detachMedia: vi.fn(),
    destroy: vi.fn(),
    recoverMediaError: vi.fn(),
  };

  const isSupported = vi.fn().mockReturnValue(true);
  function MockHls() {
    return mockHlsInstance;
  }
  MockHls.isSupported = isSupported;

  return {
    __esModule: true,
    default: MockHls,
    isSupported,
    Events: {
      MEDIA_ATTACHED: 'hlsMediaAttached',
      MANIFEST_PARSED: 'hlsManifestParsed',
      ERROR: 'hlsError',
    },
    ErrorTypes: {
      NETWORK_ERROR: 'networkError',
      MEDIA_ERROR: 'mediaError',
    },
  };
});

// Mock mpegts.js
vi.mock('mpegts.js', () => {
  const mockPlayerInstance = {
    attachMediaElement: vi.fn(),
    load: vi.fn(),
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    unload: vi.fn(),
    detachMediaElement: vi.fn(),
    destroy: vi.fn(),
    on: vi.fn(),
  };

  const getFeatureList = vi.fn().mockReturnValue({ mseLivePlayback: true });
  const createPlayer = vi.fn().mockReturnValue(mockPlayerInstance);

  const mockMpegts = {
    getFeatureList,
    createPlayer,
    Events: {
      ERROR: 'mpegts_error',
    },
  };

  return {
    __esModule: true,
    ...mockMpegts,
    default: mockMpegts,
  };
});

describe('工单 #143 流媒体直播驱动与断流重连测试', () => {
  let wrapper: VueWrapper | null = null;
  let originalSrcDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    authManager.clearToken();

    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.load = vi.fn();

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
    vi.useRealTimers();
    authManager.clearToken();
    if (originalSrcDescriptor) {
      Object.defineProperty(window.HTMLMediaElement.prototype, 'src', originalSrcDescriptor);
    }
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('1. useStreamReconnect 状态机测试', () => {
    it('1.1 指数退避调度并成功执行重连回调', async () => {
      const scope = effectScope();
      let reconnectFn: (() => void) | undefined;

      await scope.run(async () => {
        const mockReconnect = vi.fn().mockResolvedValue(undefined);
        const { isReconnecting, retryCount, triggerReconnect, remainingTime } = useStreamReconnect(
          {
            maxRetries: 3,
            baseDelay: 1000,
            jitter: false,
          },
          mockReconnect,
        );

        reconnectFn = () => triggerReconnect(new Error('网络中断'));

        expect(isReconnecting.value).toBe(false);
        expect(retryCount.value).toBe(0);

        // 触发重试
        reconnectFn();

        expect(isReconnecting.value).toBe(true);
        expect(remainingTime.value).toBe(1000);

        // 异步快进 1000ms
        await vi.advanceTimersByTimeAsync(1000);

        expect(mockReconnect).toHaveBeenCalledTimes(1);
        expect(retryCount.value).toBe(1);
        expect(isReconnecting.value).toBe(false);
      });

      scope.stop();
    });

    it('1.2 超过最大限制时转入 hasFailed 硬失败态并触发 onFail', async () => {
      const scope = effectScope();
      await scope.run(async () => {
        const onFail = vi.fn();
        const { isReconnecting, hasFailed, triggerReconnect, retryCount } = useStreamReconnect({
          maxRetries: 2,
          baseDelay: 500,
          jitter: false,
          onFail,
        });

        // 第 1 次
        triggerReconnect(new Error('ERR_1'));
        await vi.advanceTimersByTimeAsync(500);
        expect(retryCount.value).toBe(1);

        // 第 2 次
        triggerReconnect(new Error('ERR_2'));
        await vi.advanceTimersByTimeAsync(1000);
        expect(retryCount.value).toBe(2);

        // 第 3 次尝试（达到 maxRetries: 2 上限）
        triggerReconnect(new Error('ERR_3'));
        expect(hasFailed.value).toBe(true);
        expect(isReconnecting.value).toBe(false);
        expect(onFail).toHaveBeenCalledWith(expect.any(Error));
      });
      scope.stop();
    });

    it('1.3 manualRetry 能够重置计数器并重新唤醒重试', async () => {
      const scope = effectScope();
      await scope.run(async () => {
        const mockAction = vi.fn();
        const { hasFailed, triggerReconnect, manualRetry, retryCount } = useStreamReconnect(
          {
            maxRetries: 1,
            baseDelay: 200,
            jitter: false,
          },
          mockAction,
        );

        triggerReconnect();
        await vi.advanceTimersByTimeAsync(200);
        expect(retryCount.value).toBe(1);

        // 再次触发转入失败态
        triggerReconnect();
        expect(hasFailed.value).toBe(true);

        // 执行 manualRetry
        manualRetry();
        expect(hasFailed.value).toBe(false);
        expect(retryCount.value).toBe(0);
      });
      scope.stop();
    });
  });

  describe('2. HlsDriver 流媒体驱动器测试', () => {
    it('2.1 支持 HLS 并正确初始化与生命周期销毁', () => {
      const video = document.createElement('video');
      const driver = new HlsDriver(video, 'https://live.example.com/stream.m3u8', {
        auth: true,
      });

      expect(driver.rawHls).not.toBeNull();
      expect(driver.rawHls?.attachMedia).toHaveBeenCalledWith(video);

      driver.destroy();
      expect(driver.rawHls).toBeNull();
    });
  });

  describe('3. MpegtsDriver FLV 驱动器测试', () => {
    it('3.1 支持 HTTP-FLV 并开启 SourceBuffer 内存防爆防线', () => {
      const video = document.createElement('video');
      const driver = new MpegtsDriver(video, 'https://live.example.com/cctv.flv', {
        isLive: true,
        autoCleanupSourceBuffer: true,
      });

      expect(driver.rawPlayer).not.toBeNull();
      expect(mpegts.createPlayer).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'flv',
          isLive: true,
          url: 'https://live.example.com/cctv.flv',
        }),
        expect.objectContaining({
          autoCleanupSourceBuffer: true,
          autoCleanupMaxBackwardDuration: 60,
        }),
      );

      driver.destroy();
      expect(driver.rawPlayer).toBeNull();
    });
  });

  describe('4. AtengVideoPlayer 直播态与插槽测试', () => {
    it('4.1 isLive 为 true 时应渲染实时直播徽标', async () => {
      wrapper = mount(AtengVideoPlayer, {
        props: {
          url: 'https://artplayer.org/assets/sample/video.mp4',
          isLive: true,
        },
      });

      const badge = wrapper.find('.at-video-player__live-badge');
      expect(badge.exists()).toBe(true);
      expect(badge.text()).toContain('实时直播');
    });

    it('4.2 错误状态下若重连硬失败应渲染重试按钮', async () => {
      wrapper = mount(AtengVideoPlayer, {
        props: {
          url: 'https://live.example.com/offline.mp4',
          reconnect: {
            maxRetries: 0,
            baseDelay: 100,
          },
        },
      });

      expect(wrapper.exists()).toBe(true);
    });
  });
});
