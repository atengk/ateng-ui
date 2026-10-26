<script setup lang="ts">
/**
 * AtengVideoGrid 多路分屏协同矩阵组件。
 *
 * 支持 1/4/9/16 对称宫格及 1+5/1+7 广播级主从分屏布局，
 * 内置选路聚焦、双击独占放大、主次码流自适应、多路音频互斥与自动轮巡调度。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useVideoGrid } from '../composables/useVideoGrid';
import AtengVideoPlayer from './AtengVideoPlayer.vue';
import type {
  UseVideoGridReturn,
  VideoGridDisplayItem,
  VideoGridEmits,
  VideoGridLayout,
  VideoGridProps,
  VideoGridTourOptions,
} from '../types';

const props = withDefaults(defineProps<VideoGridProps>(), {
  layout: '2x2',
  activeId: null,
  autoSubStream: true,
  audioExclusive: true,
  themeColor: '#38bdf8',
  gap: 4,
});

const emit = defineEmits<VideoGridEmits>();

defineSlots<{
  /**
   * 通道顶部标头插槽（常用于展示通道名称、码率、录像状态）。
   */
  'channel-header'?: (props: {
    channel: VideoGridDisplayItem;
    isActive: boolean;
    isMaximized: boolean;
  }) => unknown;
  /**
   * 通道自定义浮层插槽。
   */
  'channel-overlay'?: (props: {
    channel: VideoGridDisplayItem;
    isActive: boolean;
    isMaximized: boolean;
  }) => unknown;
  /**
   * 通道列表为空时的缺省插槽。
   */
  empty?: () => unknown;
}>();

const containerRef = ref<HTMLDivElement | null>(null);

// 初始化无头状态机
const gridState: UseVideoGridReturn = useVideoGrid({
  channels: () => props.channels,
  layout: () => props.layout,
  activeId: () => props.activeId,
  autoSubStream: () => props.autoSubStream,
  audioExclusive: () => props.audioExclusive,
});

// 计算网格 CSS 样式类
const gridLayoutClass = computed(() => {
  if (gridState.maximizedChannelId.value !== null) {
    return 'at-video-grid--maximized';
  }
  switch (gridState.layout.value) {
    case '1x1':
      return 'at-video-grid--1x1';
    case '2x2':
      return 'at-video-grid--2x2';
    case '3x3':
      return 'at-video-grid--3x3';
    case '4x4':
      return 'at-video-grid--4x4';
    case '1+5':
      return 'at-video-grid--1-5';
    case '1+7':
      return 'at-video-grid--1-7';
    default:
      return 'at-video-grid--2x2';
  }
});

// 计算单路主从布局单元格样式（处理 1+5 与 1+7 的首路大屏定位）
const getCellLayoutClass = (index: number): string => {
  if (gridState.maximizedChannelId.value !== null) {
    return 'at-video-grid__cell--maximized';
  }
  if (index === 0) {
    if (gridState.layout.value === '1+5') {
      return 'at-video-grid__cell--master-1-5';
    }
    if (gridState.layout.value === '1+7') {
      return 'at-video-grid__cell--master-1-7';
    }
  }
  return '';
};

// 选路点击事件
const handleCellClick = (channel: VideoGridDisplayItem): void => {
  gridState.selectChannel(channel.id);
  emit('channel-select', channel);
  emit('channelSelect', channel);
};

// 双击独占放大 / 还原事件
const handleCellDblClick = (channel: VideoGridDisplayItem): void => {
  const willMaximize = gridState.maximizedChannelId.value !== channel.id;
  gridState.toggleMaximize(channel.id);

  if (willMaximize) {
    emit('channel-maximize', channel);
    emit('channelMaximize', channel);
  } else {
    emit('channel-restore');
    emit('channelRestore');
  }
};

// 监听 ESC 键退出独占放大
const handleKeyDown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape' && gridState.maximizedChannelId.value !== null) {
    gridState.restoreGrid();
    emit('channel-restore');
    emit('channelRestore');
  }
};

// 监听状态机 layout 变更对外派发
watch(
  () => gridState.layout.value,
  newLayout => {
    emit('layout-change', newLayout);
    emit('layoutChange', newLayout);
  },
);

// 监听轮巡状态变更对外派发
watch(
  () => gridState.isTouring.value,
  touring => {
    emit('tour-change', touring);
  },
);

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown);
});

defineExpose({
  gridState,
  selectChannel: (id: string | number) => gridState.selectChannel(id),
  toggleMaximize: (id?: string | number) => gridState.toggleMaximize(id),
  restoreGrid: () => gridState.restoreGrid(),
  setLayout: (layout: VideoGridLayout) => gridState.setLayout(layout),
  startTour: (tourOptions?: VideoGridTourOptions) => gridState.startTour(tourOptions),
  stopTour: () => gridState.stopTour(),
  nextTourPage: () => gridState.nextTourPage(),
  prevTourPage: () => gridState.prevTourPage(),
});
</script>

<template>
  <div
    ref="containerRef"
    class="at-video-grid"
    :class="gridLayoutClass"
    :style="{
      '--at-grid-theme-color': themeColor,
      gap: `${gap}px`,
    }"
  >
    <!-- 空通道缺省视图 -->
    <div v-if="gridState.displayedChannels.value.length === 0" class="at-video-grid__empty">
      <slot name="empty">
        <div class="at-video-grid__empty-box">
          <span class="empty-icon">📺</span>
          <p class="empty-text">暂无监控通道接入</p>
        </div>
      </slot>
    </div>

    <!-- 通道分屏渲染单元 -->
    <div
      v-for="(item, index) in gridState.displayedChannels.value"
      :key="item.id"
      class="at-video-grid__cell"
      :class="[
        getCellLayoutClass(index),
        {
          'at-video-grid__cell--active': item.isActive,
        },
      ]"
      data-testid="at-video-grid-cell"
      @click="handleCellClick(item)"
      @dblclick="handleCellDblClick(item)"
    >
      <!-- 通道顶部标头插槽 -->
      <div v-if="$slots['channel-header']" class="at-video-grid__cell-header">
        <slot
          name="channel-header"
          :channel="item"
          :is-active="item.isActive"
          :is-maximized="item.isMaximized"
        ></slot>
      </div>

      <!-- 核心单路播放器实例 -->
      <div class="at-video-grid__cell-player">
        <AtengVideoPlayer
          :url="item.effectiveUrl"
          :poster="item.poster"
          :title="item.title"
          :is-live="item.isLive !== false"
          :type="item.type"
          :auth="item.auth"
          :muted="item.isMuted"
          :theme="themeColor"
          :mini-progress-bar="false"
        />
      </div>

      <!-- 通道自定义浮层插槽 -->
      <div v-if="$slots['channel-overlay']" class="at-video-grid__cell-overlay">
        <slot
          name="channel-overlay"
          :channel="item"
          :is-active="item.isActive"
          :is-maximized="item.isMaximized"
        ></slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.at-video-grid {
  display: grid;
  width: 100%;
  height: 100%;
  min-height: 240px;
  background-color: #0b0f19;
  box-sizing: border-box;
  overflow: hidden;
  user-select: none;
}

/* 1x1 单画面 */
.at-video-grid--1x1 {
  grid-template-columns: 1fr;
  grid-template-rows: 1fr;
}

/* 2x2 对称4宫格 */
.at-video-grid--2x2 {
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
}

/* 3x3 对称9宫格 */
.at-video-grid--3x3 {
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
}

/* 4x4 对称16宫格 */
.at-video-grid--4x4 {
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(4, 1fr);
}

/* 1+5 主从分屏（第1路占据2x2，其余5路占1x1） */
.at-video-grid--1-5 {
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
}

.at-video-grid__cell--master-1-5 {
  grid-column: 1 / 3;
  grid-row: 1 / 3;
}

/* 1+7 主从分屏（第1路占据3x3，其余7路占1x1） */
.at-video-grid--1-7 {
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(4, 1fr);
}

.at-video-grid__cell--master-1-7 {
  grid-column: 1 / 4;
  grid-row: 1 / 4;
}

/* 独占放大模式 */
.at-video-grid--maximized {
  grid-template-columns: 1fr;
  grid-template-rows: 1fr;
}

.at-video-grid__cell {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #000000;
  overflow: hidden;
  border-radius: 2px;
  cursor: pointer;
  transition: outline-color 0.15s ease;
  box-sizing: border-box;
  outline: 1px solid rgba(255, 255, 255, 0.08);
}

/* 激活聚焦选路高亮边框 */
.at-video-grid__cell--active {
  outline: 2px solid var(--at-grid-theme-color, #38bdf8);
  outline-offset: -1px;
  z-index: 10;
}

.at-video-grid__cell-player {
  width: 100%;
  height: 100%;
}

.at-video-grid__cell-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
  pointer-events: none;
}

.at-video-grid__cell-overlay {
  position: absolute;
  inset: 0;
  z-index: 15;
  pointer-events: none;
}

.at-video-grid__empty {
  grid-column: 1 / -1;
  grid-row: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
}

.at-video-grid__empty-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.empty-icon {
  font-size: 36px;
}

.empty-text {
  margin: 0;
  font-size: 14px;
}
</style>
