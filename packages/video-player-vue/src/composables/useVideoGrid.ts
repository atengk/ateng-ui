/**
 * useVideoGrid 多路分屏协同无头响应式状态机。
 *
 * 负责分屏布局编排、选路聚焦、双击独占放大、主次码流自适应、多路音频互斥与自动轮巡调度。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { computed, getCurrentScope, onScopeDispose, ref, toValue, watch } from 'vue';
import type {
  UseVideoGridOptions,
  UseVideoGridReturn,
  VideoGridChannel,
  VideoGridDisplayItem,
  VideoGridLayout,
  VideoGridTourOptions,
} from '../types';

/**
 * 获取布局模式对应的路数容量。
 */
export function getLayoutCapacity(layout: VideoGridLayout): number {
  switch (layout) {
    case '1x1':
      return 1;
    case '2x2':
      return 4;
    case '3x3':
      return 9;
    case '4x4':
      return 16;
    case '1+5':
      return 6;
    case '1+7':
      return 8;
    default:
      return 4;
  }
}

export function useVideoGrid(options: UseVideoGridOptions = {}): UseVideoGridReturn {
  const initialChannels = toValue(options.channels) ?? [];
  const channels = ref<VideoGridChannel[]>([...initialChannels]);
  const layout = ref<VideoGridLayout>(toValue(options.layout) ?? '2x2');
  const activeChannelId = ref<string | number | null>(
    toValue(options.activeId) ?? channels.value[0]?.id ?? null,
  );
  const maximizedChannelId = ref<string | number | null>(null);
  const isTouring = ref(false);
  const tourPageIndex = ref(0);

  let tourTimer: ReturnType<typeof setInterval> | null = null;
  let activeTourPool: VideoGridChannel[] = [];
  let tourStepCallback:
    ((pageIndex: number, currentChannels: VideoGridChannel[]) => void) | undefined;

  const autoSubStream = computed(() => toValue(options.autoSubStream) ?? true);
  const audioExclusive = computed(() => toValue(options.audioExclusive) ?? true);

  // 同步外部 channels 响应式更新
  watch(
    () => toValue(options.channels),
    newChannels => {
      if (newChannels) {
        channels.value = [...newChannels];
        const first = newChannels[0];
        if (activeChannelId.value === null && first) {
          activeChannelId.value = first.id;
        }
      }
    },
    { deep: true },
  );

  // 同步外部 layout 响应式更新
  watch(
    () => toValue(options.layout),
    newLayout => {
      if (newLayout) {
        layout.value = newLayout;
      }
    },
  );

  const capacity = computed(() => getLayoutCapacity(layout.value));

  /**
   * 动态推导当前视口实际展示与加载的通道列表。
   * 落实：主次码流自适应决策 + 多路音频互斥不变量。
   */
  const displayedChannels = computed<VideoGridDisplayItem[]>(() => {
    // 1. 若当前处于独占放大模式：仅展示并加载该单路，100% 切换为主码流高清 url
    if (maximizedChannelId.value !== null) {
      const target = channels.value.find(c => c.id === maximizedChannelId.value);
      if (target) {
        return [
          {
            ...target,
            effectiveUrl: target.url,
            isMuted: Boolean(target.muted),
            isActive: true,
            isMaximized: true,
          },
        ];
      }
    }

    const cap = capacity.value;
    const sourceList =
      isTouring.value && activeTourPool.length > 0 ? activeTourPool : channels.value;
    if (sourceList.length === 0) {
      return [];
    }

    // 2. 轮巡分页或普通宫格截取
    let sliceItems: VideoGridChannel[] = [];
    if (isTouring.value) {
      const startIndex = (tourPageIndex.value * cap) % sourceList.length;
      sliceItems = sourceList.slice(startIndex, startIndex + cap);
      // 若末尾不足补齐循环
      if (sliceItems.length < cap && sourceList.length > cap) {
        const remaining = cap - sliceItems.length;
        sliceItems.push(...sourceList.slice(0, remaining));
      }
    } else {
      sliceItems = sourceList.slice(0, cap);
    }

    // 3. 计算每个通道的主次码流与音频互斥状态
    return sliceItems.map(item => {
      const isActive = item.id === activeChannelId.value;

      // 主次码流自适应：多路宫格加载 subUrl 节约带宽，单路加载高清 url
      let effectiveUrl = item.url;
      if (autoSubStream.value && cap > 1) {
        effectiveUrl = item.subUrl || item.url;
      }

      // 多路音频互斥不变量：仅激活选中的通道出声，其余全部强制静音
      let isMuted = true;
      if (audioExclusive.value) {
        isMuted = !isActive || Boolean(item.muted);
      } else {
        isMuted = Boolean(item.muted);
      }

      return {
        ...item,
        effectiveUrl,
        isMuted,
        isActive,
        isMaximized: false,
      };
    });
  });

  /**
   * 聚焦选中通道。
   */
  const selectChannel = (id: string | number): void => {
    activeChannelId.value = id;
  };

  /**
   * 双击独占放大 / 还原。
   */
  const toggleMaximize = (id?: string | number): void => {
    const targetId = id ?? activeChannelId.value;
    if (!targetId) {
      return;
    }

    if (maximizedChannelId.value === targetId) {
      restoreGrid();
    } else {
      maximizedChannelId.value = targetId;
      activeChannelId.value = targetId;
    }
  };

  /**
   * 退出独占放大恢复宫格。
   */
  const restoreGrid = (): void => {
    maximizedChannelId.value = null;
  };

  /**
   * 切换网格布局。
   */
  const setLayout = (newLayout: VideoGridLayout): void => {
    layout.value = newLayout;
    restoreGrid();
  };

  /**
   * 启动自动轮巡调度器。
   */
  const startTour = (tourOptions: VideoGridTourOptions = {}): void => {
    stopTour();

    const pool =
      tourOptions.pool && tourOptions.pool.length > 0 ? tourOptions.pool : channels.value;
    activeTourPool = [...pool];
    tourStepCallback = tourOptions.onStep;
    const interval = Math.max(tourOptions.interval ?? 10000, 1000);

    isTouring.value = true;
    tourPageIndex.value = 0;
    restoreGrid();

    tourTimer = setInterval(() => {
      nextTourPage();
    }, interval);
  };

  /**
   * 停止自动轮巡调度器。
   */
  const stopTour = (): void => {
    if (tourTimer) {
      clearInterval(tourTimer);
      tourTimer = null;
    }
    isTouring.value = false;
  };

  /**
   * 轮巡翻至下一批。
   */
  const nextTourPage = (): void => {
    const sourceList = activeTourPool.length > 0 ? activeTourPool : channels.value;
    if (sourceList.length === 0) {
      return;
    }
    const cap = capacity.value;
    const totalPages = Math.ceil(sourceList.length / cap);
    tourPageIndex.value = (tourPageIndex.value + 1) % (totalPages > 0 ? totalPages : 1);

    if (tourStepCallback) {
      const start = (tourPageIndex.value * cap) % sourceList.length;
      tourStepCallback(tourPageIndex.value, sourceList.slice(start, start + cap));
    }
  };

  /**
   * 轮巡翻至上一批。
   */
  const prevTourPage = (): void => {
    const sourceList = activeTourPool.length > 0 ? activeTourPool : channels.value;
    if (sourceList.length === 0) {
      return;
    }
    const cap = capacity.value;
    const totalPages = Math.ceil(sourceList.length / cap);
    tourPageIndex.value =
      (tourPageIndex.value - 1 + totalPages) % (totalPages > 0 ? totalPages : 1);

    if (tourStepCallback) {
      const start = (tourPageIndex.value * cap) % sourceList.length;
      tourStepCallback(tourPageIndex.value, sourceList.slice(start, start + cap));
    }
  };

  if (getCurrentScope()) {
    onScopeDispose(() => {
      stopTour();
    });
  }

  return {
    channels,
    activeChannelId,
    layout,
    maximizedChannelId,
    isTouring,
    tourPageIndex,
    capacity,
    displayedChannels,
    selectChannel,
    toggleMaximize,
    restoreGrid,
    setLayout,
    startTour,
    stopTour,
    nextTourPage,
    prevTourPage,
  };
}
