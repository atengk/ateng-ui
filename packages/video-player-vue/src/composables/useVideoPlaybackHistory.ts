/**
 * 本地播放历史与记忆续播响应式状态机。
 *
 * 负责记录播放时间戳至本地 Storage，并在再次打开时自动恢复进度或弹出提示卡片。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { computed, ref, toValue, type ComputedRef, type MaybeRefOrGetter, type Ref } from 'vue';
import type { IVideoPlayerEngine, VideoPlaybackHistoryOptions } from '../types';

/**
 * 格式化秒数为时分秒（如 '01:23' 或 '01:02:15'）。
 */
export function formatVideoTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '00:00';
  }
  const sec = Math.floor(seconds);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  const pad = (num: number): string => (num < 10 ? `0${num}` : `${num}`);

  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
}

/**
 * 本地存储条目数据结构。
 */
interface StorageRecord {
  time: number;
  updatedAt: number;
}

export interface UseVideoPlaybackHistoryReturn {
  /**
   * 是否存在可用的历史续播进度点。
   */
  hasResumePoint: Ref<boolean>;
  /**
   * 恢复的播放进度时间戳（秒）。
   */
  resumeTime: Ref<number>;
  /**
   * 格式化后的时间文案（如 '02:30'）。
   */
  formattedResumeTime: ComputedRef<string>;
  /**
   * 是否展示续播提示卡片。
   */
  showPrompt: Ref<boolean>;
  /**
   * 关闭续播提示卡片。
   */
  closePrompt: () => void;
  /**
   * 检查并应用续播进度到播放引擎。
   *
   * @param engine 目标播放引擎
   * @param duration 媒体总时长
   * @returns 若成功恢复返回恢复的时间戳秒数，否则返回 null
   */
  checkAndApplyResume: (engine: IVideoPlayerEngine, duration?: number) => number | null;
  /**
   * 保存当前播放进度至本地存储。
   *
   * @param currentTime 当前播放时间戳
   * @param duration 媒体总时长
   */
  saveProgress: (currentTime: number, duration?: number) => void;
  /**
   * 清除当前视频的本地续播缓存。
   */
  clearHistory: () => void;
}

/**
 * 播放历史记忆续播 Hook。
 *
 * @param urlGetter 视频流地址
 * @param optionsGetter 续播配置或开关
 * @param autoPlayResumeGetter 恢复后是否自动开始播放
 */
export function useVideoPlaybackHistory(
  urlGetter: MaybeRefOrGetter<string>,
  optionsGetter?: MaybeRefOrGetter<boolean | VideoPlaybackHistoryOptions | undefined>,
  autoPlayResumeGetter?: MaybeRefOrGetter<boolean | undefined>,
): UseVideoPlaybackHistoryReturn {
  const hasResumePoint = ref(false);
  const resumeTime = ref(0);
  const showPrompt = ref(false);
  let promptTimer: ReturnType<typeof setTimeout> | null = null;
  let lastSaveTimestamp = 0;

  const parsedConfig = computed<Required<VideoPlaybackHistoryOptions>>(() => {
    const raw = toValue(optionsGetter);
    const autoPlayResume = toValue(autoPlayResumeGetter);
    const url = toValue(urlGetter);

    if (raw === false || raw === undefined) {
      return {
        enabled: false,
        storageKey: `at_video_resume_${url}`,
        minTime: 5,
        maxTimeThreshold: 5,
        autoPlay: Boolean(autoPlayResume),
        showPrompt: true,
        promptDuration: 3000,
      };
    }

    if (raw === true) {
      return {
        enabled: true,
        storageKey: `at_video_resume_${url}`,
        minTime: 5,
        maxTimeThreshold: 5,
        autoPlay: Boolean(autoPlayResume),
        showPrompt: true,
        promptDuration: 3000,
      };
    }

    return {
      enabled: raw.enabled ?? true,
      storageKey: raw.storageKey ?? `at_video_resume_${url}`,
      minTime: raw.minTime ?? 5,
      maxTimeThreshold: raw.maxTimeThreshold ?? 5,
      autoPlay: raw.autoPlay ?? Boolean(autoPlayResume),
      showPrompt: raw.showPrompt ?? true,
      promptDuration: raw.promptDuration ?? 3000,
    };
  });

  const formattedResumeTime = computed(() => {
    return formatVideoTime(resumeTime.value);
  });

  /**
   * 安全获取 localStorage。
   */
  const getStorage = (): Storage | null => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    return window.localStorage;
  };

  /**
   * 关闭提示条并清理定时器。
   */
  const closePrompt = (): void => {
    showPrompt.value = false;
    if (promptTimer) {
      clearTimeout(promptTimer);
      promptTimer = null;
    }
  };

  /**
   * 检查并应用续播进度。
   */
  const checkAndApplyResume = (engine: IVideoPlayerEngine, duration?: number): number | null => {
    const config = parsedConfig.value;
    if (!config.enabled) {
      return null;
    }

    const storage = getStorage();
    if (!storage) {
      return null;
    }

    const raw = storage.getItem(config.storageKey);
    if (!raw) {
      return null;
    }

    try {
      const record = JSON.parse(raw) as StorageRecord;
      const targetTime = record.time;

      // 校验时间是否在合法续播区间内
      if (typeof targetTime !== 'number' || targetTime < config.minTime) {
        return null;
      }

      // 若已知总时长且剩余不足阈值（即将结束），则忽略并清除
      if (duration && duration > 0 && targetTime >= duration - config.maxTimeThreshold) {
        clearHistory();
        return null;
      }

      resumeTime.value = targetTime;
      hasResumePoint.value = true;

      // 执行跳转
      engine.seek(targetTime);

      // 若配置了自动播放，启动播放
      if (config.autoPlay) {
        void engine.play();
      }

      // 展示浮动提示
      if (config.showPrompt) {
        showPrompt.value = true;
        if (promptTimer) {
          clearTimeout(promptTimer);
        }
        promptTimer = setTimeout(() => {
          showPrompt.value = false;
          promptTimer = null;
        }, config.promptDuration);
      }

      return targetTime;
    } catch {
      // 容错处理，避免脏数据导致崩溃
      clearHistory();
      return null;
    }
  };

  /**
   * 保存当前播放进度（节流 1 秒）。
   */
  const saveProgress = (currentTime: number, duration?: number): void => {
    const config = parsedConfig.value;
    if (!config.enabled) {
      return;
    }

    const storage = getStorage();
    if (!storage) {
      return;
    }

    const now = Date.now();
    // 节流写入，保护存储 I/O
    if (now - lastSaveTimestamp < 1000) {
      return;
    }
    lastSaveTimestamp = now;

    // 进度小于 minTime 时不存储
    if (currentTime < config.minTime) {
      return;
    }

    // 若已经接近结尾，视为已看完并清除记录
    if (duration && duration > 0 && currentTime >= duration - config.maxTimeThreshold) {
      clearHistory();
      return;
    }

    const record: StorageRecord = {
      time: Math.floor(currentTime),
      updatedAt: now,
    };

    try {
      storage.setItem(config.storageKey, JSON.stringify(record));
    } catch {
      // 捕获 QuotaExceeded 等存储异常
    }
  };

  /**
   * 清除本地历史缓存。
   */
  const clearHistory = (): void => {
    const storage = getStorage();
    if (storage) {
      try {
        storage.removeItem(parsedConfig.value.storageKey);
      } catch {
        // 忽略异常
      }
    }
    hasResumePoint.value = false;
    resumeTime.value = 0;
    closePrompt();
  };

  return {
    hasResumePoint,
    resumeTime,
    formattedResumeTime,
    showPrompt,
    closePrompt,
    checkAndApplyResume,
    saveProgress,
    clearHistory,
  };
}
