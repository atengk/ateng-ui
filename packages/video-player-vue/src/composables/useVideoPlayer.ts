/**
 * useVideoPlayer 视频播放会话生命周期与底层引擎指令控制的无头组合式 Hook。
 *
 * 遵循 Vue 3.5 响应式解构传参契约与确定性生命周期清理铁律。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import {
  computed,
  getCurrentInstance,
  getCurrentScope,
  onMounted,
  onScopeDispose,
  ref,
  shallowRef,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue';
import { ArtplayerEngine } from '../engine/ArtplayerEngine';
import { useVideoPlaybackHistory } from './useVideoPlaybackHistory';
import type {
  IVideoPlayerEngine,
  UseVideoPlayerOptions,
  UseVideoPlayerReturn,
  VideoPlayerType,
} from '../types';

export function useVideoPlayer(
  options: MaybeRefOrGetter<UseVideoPlayerOptions>,
): UseVideoPlayerReturn {
  const engine = shallowRef<IVideoPlayerEngine | null>(null);
  const playing = ref(false);
  const currentTime = ref(0);
  const duration = ref(0);
  const volume = ref(0.7);
  const muted = ref(false);
  const playbackRate = ref(1.0);
  const fullscreen = ref(false);
  const fullscreenWeb = ref(false);
  const pip = ref(false);
  const buffered = ref(0);
  const loading = ref(false);
  const error = shallowRef<unknown | null>(null);

  // 记忆续播状态机联动
  const historyState = useVideoPlaybackHistory(
    () => toValue(options).url,
    () => toValue(options).autoResume,
    () => toValue(options).autoPlayResume,
  );

  /**
   * 初始化播放引擎实例。
   */
  const init = (targetContainer?: HTMLElement | null): IVideoPlayerEngine | null => {
    // 1. 若已有引擎实例，先彻底注销释放
    destroy();

    const rawOpts = toValue(options);
    const container = targetContainer ?? (toValue(rawOpts.container) as HTMLElement | null);

    if (!container) {
      return null;
    }

    // 2. 初始状态同步
    muted.value = Boolean(rawOpts.muted);
    volume.value = rawOpts.volume ?? 0.7;

    try {
      loading.value = true;
      error.value = null;

      const newEngine = new ArtplayerEngine(container, rawOpts, {
        onReady: eng => {
          loading.value = false;
          duration.value = eng.duration;
          volume.value = eng.volume;
          muted.value = eng.muted;
          playbackRate.value = eng.playbackRate;

          // 恢复历史进度
          historyState.checkAndApplyResume(eng, eng.duration);
        },
        onPlay: () => {
          playing.value = true;
        },
        onPause: () => {
          playing.value = false;
          historyState.saveProgress(currentTime.value, duration.value);
        },
        onTimeUpdate: time => {
          currentTime.value = time;
          if (engine.value) {
            duration.value = engine.value.duration;
          }
          historyState.saveProgress(time, duration.value);
        },
        onEnded: () => {
          playing.value = false;
        },
        onError: err => {
          loading.value = false;
          error.value = err;
        },
        onFullscreen: state => {
          fullscreen.value = state;
        },
        onFullscreenWeb: state => {
          fullscreenWeb.value = state;
        },
      });

      engine.value = newEngine;
      return newEngine;
    } catch (err) {
      loading.value = false;
      error.value = err;
      return null;
    }
  };

  /**
   * 开始播放。
   */
  const play = async (): Promise<void> => {
    if (engine.value) {
      await engine.value.play();
    }
  };

  /**
   * 暂停播放。
   */
  const pause = (): void => {
    engine.value?.pause();
  };

  /**
   * 切换播放与暂停。
   */
  const toggle = (): void => {
    engine.value?.toggle();
  };

  /**
   * 精准快进/快退至指定时间。
   */
  const seek = (time: number): void => {
    engine.value?.seek(time);
    currentTime.value = time;
  };

  /**
   * 相对快进或快退指定秒数。
   */
  const step = (seconds: number): void => {
    engine.value?.step(seconds);
    if (engine.value) {
      currentTime.value = engine.value.currentTime;
    }
  };

  /**
   * 逐帧微调步进。
   */
  const stepFrame = (frames = 1, fps = 30): void => {
    engine.value?.stepFrame(frames, fps);
    if (engine.value) {
      currentTime.value = engine.value.currentTime;
    }
  };

  /**
   * 清除本地播放历史。
   */
  const clearPlaybackHistory = (): void => {
    historyState.clearHistory();
  };

  /**
   * 从头重新开始播放。
   */
  const replay = async (): Promise<void> => {
    seek(0);
    await play();
  };

  /**
   * 调整音量。
   */
  const setVolume = (vol: number): void => {
    const clamped = Math.max(0, Math.min(1, vol));
    engine.value?.setVolume(clamped);
    volume.value = clamped;
  };

  /**
   * 设置是否静音。
   */
  const setMuted = (isMuted: boolean): void => {
    engine.value?.setMuted(isMuted);
    muted.value = isMuted;
  };

  /**
   * 设置播放倍速。
   */
  const setPlaybackRate = (rate: number): void => {
    engine.value?.setPlaybackRate(rate);
    playbackRate.value = rate;
  };

  /**
   * 切换清晰度画质。
   */
  const switchQuality = async (url: string): Promise<void> => {
    if (engine.value) {
      await engine.value.switchQuality(url);
    }
  };

  /**
   * 切换播放源地址与协议类型。
   */
  const switchUrl = async (url: string, type?: VideoPlayerType): Promise<void> => {
    if (engine.value) {
      currentTime.value = 0;
      await engine.value.switchUrl(url, type);
    }
  };

  /**
   * 截取当前画面并导出为 Base64 图片。
   */
  const screenshot = async (): Promise<string> => {
    if (!engine.value) {
      return '';
    }
    return engine.value.screenshot();
  };

  /**
   * 进入原生全屏。
   */
  const enterFullscreen = (): void => {
    engine.value?.enterFullscreen();
  };

  /**
   * 退出原生全屏。
   */
  const exitFullscreen = (): void => {
    engine.value?.exitFullscreen();
  };

  /**
   * 切换原生全屏。
   */
  const toggleFullscreen = (): void => {
    engine.value?.toggleFullscreen();
  };

  /**
   * 进入网页全屏。
   */
  const enterWebFullscreen = (): void => {
    engine.value?.enterWebFullscreen();
  };

  /**
   * 退出网页全屏。
   */
  const exitWebFullscreen = (): void => {
    engine.value?.exitWebFullscreen();
  };

  /**
   * 切换网页全屏。
   */
  const toggleWebFullscreen = (): void => {
    engine.value?.toggleWebFullscreen();
  };

  /**
   * 确定性销毁播放器实例并释放资源。
   */
  const destroy = (): void => {
    if (engine.value) {
      engine.value.destroy();
      engine.value = null;
    }
    playing.value = false;
    loading.value = false;
    error.value = null;
  };

  /**
   * 重新初始化并重试加载当前流媒体。
   */
  const retry = (): void => {
    const rawOpts = toValue(options);
    const container = toValue(rawOpts.container) as HTMLElement | null;
    if (container) {
      init(container);
    }
  };

  // 监听容器或 URL 变化自动同步
  const currentUrl = computed(() => toValue(options).url);
  watch(currentUrl, newUrl => {
    if (engine.value && newUrl) {
      void switchUrl(newUrl, toValue(options).type);
    }
  });

  // 生命周期管理：组件销毁时确定性回收资源
  if (getCurrentScope()) {
    onScopeDispose(() => {
      destroy();
    });
  }

  // 挂载时尝试自动初始化（若已提供有效 DOM 容器且处于 Vue 组件挂载生命周期内）
  if (getCurrentInstance()) {
    onMounted(() => {
      const rawOpts = toValue(options);
      const container = toValue(rawOpts.container) as HTMLElement | null;
      if (container && !engine.value) {
        init(container);
      }
    });
  }

  return {
    engine,
    playing,
    currentTime,
    duration,
    volume,
    muted,
    playbackRate,
    fullscreen,
    fullscreenWeb,
    pip,
    buffered,
    loading,
    error,
    play,
    pause,
    toggle,
    seek,
    step,
    stepFrame,
    setVolume,
    setMuted,
    setPlaybackRate,
    switchQuality,
    switchUrl,
    screenshot,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
    enterWebFullscreen,
    exitWebFullscreen,
    toggleWebFullscreen,
    destroy,
    retry,
    clearPlaybackHistory,
    replay,
    showResumePrompt: historyState.showPrompt,
    resumeTime: historyState.resumeTime,
    formattedResumeTime: historyState.formattedResumeTime,
    closeResumePrompt: historyState.closePrompt,
  };
}
