/**
 * @atengk/video-player-vue 外挂多轨字幕响应式状态机。
 *
 * 管理当前字幕轨道、多语言切换、Cue 解析与时间同步。
 * 纯无头设计，零 UI 依赖。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import {
  computed,
  ref,
  shallowRef,
  toValue,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref,
  type ShallowRef,
} from 'vue';
import { findCurrentCue, parseSubtitle } from './SubtitleParser';
import type { VideoSubtitleCue, VideoSubtitleItem, VideoSubtitleStyle } from './types';

/**
 * useVideoSubtitles 状态机返回值契约。
 */
export interface UseVideoSubtitlesReturn {
  /**
   * 规范化的字幕轨道列表。
   */
  subtitles: ComputedRef<VideoSubtitleItem[]>;
  /**
   * 当前激活的字幕 ID。为 null 表示已关闭字幕。
   */
  activeSubtitleId: Ref<string | null>;
  /**
   * 当前激活的字幕轨道对象。
   */
  activeSubtitle: ComputedRef<VideoSubtitleItem | null>;
  /**
   * 当前激活字幕的完整 Cue 片元列表。
   */
  cues: ShallowRef<VideoSubtitleCue[]>;
  /**
   * 当前播放时刻命中的字幕片元。
   */
  currentCue: ShallowRef<VideoSubtitleCue | null>;
  /**
   * 当前时刻应展示的字幕纯文本。
   */
  currentText: ComputedRef<string>;
  /**
   * 字幕是否处于可见开启状态。
   */
  isVisible: Ref<boolean>;
  /**
   * 当前字幕样式配置。
   */
  style: Ref<VideoSubtitleStyle>;
  /**
   * 状态机初始化（自动选中 default 或首个字幕并解析）。
   */
  init: () => Promise<void>;
  /**
   * 切换当前激活的字幕轨道（传 null 关闭字幕）。
   */
  switchSubtitle: (idOrLang: string | null) => Promise<void>;
  /**
   * 开关字幕显隐。
   */
  toggleVisible: (visible?: boolean) => void;
  /**
   * 更新当前播放进度以驱动字幕文字匹配。
   */
  updateCurrentTime: (time: number) => void;
  /**
   * 更新字幕样式。
   */
  setStyle: (newStyle: Partial<VideoSubtitleStyle>) => void;
}

/**
 * 外挂多轨字幕响应式管理 Hook。
 *
 * @param subtitlesInput 字幕列表（响应式 Ref、Getter 或静态数组）
 * @param defaultId 默认选中的字幕 ID
 */
export function useVideoSubtitles(
  subtitlesInput: MaybeRefOrGetter<VideoSubtitleItem[]>,
  defaultId?: MaybeRefOrGetter<string | null | undefined>,
): UseVideoSubtitlesReturn {
  const subtitles = computed<VideoSubtitleItem[]>(() => {
    const list = toValue(subtitlesInput);
    return Array.isArray(list) ? list : [];
  });

  const activeSubtitleId = ref<string | null>(null);
  const cues = shallowRef<VideoSubtitleCue[]>([]);
  const currentCue = shallowRef<VideoSubtitleCue | null>(null);
  const isVisible = ref(true);

  const style = ref<VideoSubtitleStyle>({
    fontSize: '20px',
    color: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
    bottom: '40px',
  });

  const activeSubtitle = computed<VideoSubtitleItem | null>(() => {
    if (!activeSubtitleId.value) {
      return null;
    }
    return (
      subtitles.value.find(
        s => s.id === activeSubtitleId.value || s.lang === activeSubtitleId.value,
      ) || null
    );
  });

  const currentText = computed<string>(() => {
    if (!isVisible.value || !currentCue.value) {
      return '';
    }
    return currentCue.value.text;
  });

  /**
   * 加载并解析指定字幕内容。
   */
  const loadCues = async (item: VideoSubtitleItem): Promise<VideoSubtitleCue[]> => {
    // 1. 若直接提供内联 content，优先解析
    if (item.content) {
      return parseSubtitle(item.content, item.type);
    }

    // 2. 若提供 URL，通过 fetch 请求字幕文本
    if (item.url && typeof window !== 'undefined' && typeof window.fetch === 'function') {
      try {
        const response = await fetch(item.url);
        if (!response.ok) {
          return [];
        }
        const text = await response.text();
        return parseSubtitle(text, item.type);
      } catch {
        return [];
      }
    }

    return [];
  };

  /**
   * 切换字幕轨道。
   */
  const switchSubtitle = async (idOrLang: string | null): Promise<void> => {
    if (idOrLang === null || idOrLang === '') {
      activeSubtitleId.value = null;
      cues.value = [];
      currentCue.value = null;
      return;
    }

    const matched = subtitles.value.find(s => s.id === idOrLang || s.lang === idOrLang);
    if (!matched) {
      activeSubtitleId.value = null;
      cues.value = [];
      currentCue.value = null;
      return;
    }

    activeSubtitleId.value = matched.id;
    const parsedCues = await loadCues(matched);
    cues.value = parsedCues;
  };

  /**
   * 初始化状态机。
   */
  const init = async (): Promise<void> => {
    const list = subtitles.value;
    if (list.length === 0) {
      activeSubtitleId.value = null;
      cues.value = [];
      return;
    }

    const explicitDefault = toValue(defaultId);
    let target = list.find(s => s.id === explicitDefault || s.lang === explicitDefault);

    if (!target) {
      target = list.find(s => s.default) || list[0];
    }

    if (target) {
      await switchSubtitle(target.id);
    }
  };

  const toggleVisible = (visible?: boolean): void => {
    isVisible.value = typeof visible === 'boolean' ? visible : !isVisible.value;
  };

  const updateCurrentTime = (time: number): void => {
    if (!isVisible.value || cues.value.length === 0) {
      currentCue.value = null;
      return;
    }
    currentCue.value = findCurrentCue(cues.value, time);
  };

  const setStyle = (newStyle: Partial<VideoSubtitleStyle>): void => {
    style.value = {
      ...style.value,
      ...newStyle,
    };
  };

  // 监听字幕列表变化
  watch(
    () => subtitles.value,
    async newList => {
      if (newList.length === 0) {
        await switchSubtitle(null);
      } else if (activeSubtitleId.value && !newList.some(s => s.id === activeSubtitleId.value)) {
        await init();
      }
    },
    { deep: true },
  );

  return {
    subtitles,
    activeSubtitleId,
    activeSubtitle,
    cues,
    currentCue,
    currentText,
    isVisible,
    style,
    init,
    switchSubtitle,
    toggleVisible,
    updateCurrentTime,
    setStyle,
  };
}
