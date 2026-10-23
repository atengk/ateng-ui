<script setup lang="ts">
/**
 * AtengLoading 声明式零遮罩轻量包裹组件。
 *
 * 核心特性：
 * 1. 默认 mode="shimmer" (Zero-Overlay)，仅在顶沿流动 2px 极光流线，内容 50% 虚化完全可见，0 遮罩；
 * 2. 支持 mode="dots" (三点微波浪) 与 mode="skeleton" (骨架屏) 多态切换；
 * 3. 内部自动接入 @atengk/vue 的 useAntiFlicker 工业级防闪烁时序状态机 (150ms 静默 / 300ms 最小展示)。
 *
 * @author Ateng
 * @since 2026-10-23
 */

import { computed } from 'vue';
import { useAntiFlicker } from '@atengk/vue';

export interface AtengLoadingProps {
  /**
   * 是否处于加载状态。
   * @default false
   */
  loading?: boolean;

  /**
   * 视觉动效形态模式。
   * - 'shimmer': 顶沿 2px 极光流线 (Zero-Overlay 首选，0 遮罩，内容可见)；
   * - 'dots': 居中三点微波浪 (纯单色轻微半透，0 高斯模糊)；
   * - 'skeleton': 骨架屏占位。
   *
   * @default 'shimmer'
   */
  mode?: 'shimmer' | 'dots' | 'skeleton';

  /**
   * 防闪烁静默延迟保护窗口（毫秒）。
   * @default 150
   */
  delay?: number;

  /**
   * 最小持续展示时间（毫秒）。
   * @default 300
   */
  minDuration?: number;

  /**
   * 加载文字提示（主要用于 mode="dots"）。
   */
  text?: string;
}

const props = withDefaults(defineProps<AtengLoadingProps>(), {
  loading: false,
  mode: 'shimmer',
  delay: 150,
  minDuration: 300,
  text: '',
});

// 接入无头防闪烁时序状态机
const isPending = useAntiFlicker(
  computed(() => props.loading),
  {
    delay: props.delay,
    minDuration: props.minDuration,
  },
);

defineExpose({
  isPending,
});
</script>

<template>
  <div class="at-loading-container">
    <!-- 业务核心内容 (shimmer 模式下微弱半透虚化) -->
    <div
      class="at-loading__content"
      :class="{ 'is-loading-shimmer': isPending && mode === 'shimmer' }"
    >
      <slot />
    </div>

    <!-- 1. 顶沿 2px 极光流线 (Zero-Overlay 首选) -->
    <div v-if="isPending && mode === 'shimmer'" class="at-loading-shimmer-track" aria-hidden="true">
      <div class="at-loading-shimmer-flow" />
    </div>

    <!-- 2. 三点微波浪 (Wave Dots) -->
    <div v-else-if="isPending && mode === 'dots'" class="at-loading-overlay" aria-hidden="true">
      <div class="at-loader-wave-dots"><span /><span /><span /></div>
      <span v-if="text" class="at-loading-text">{{ text }}</span>
    </div>

    <!-- 3. 骨架屏占位 (Skeleton) -->
    <div
      v-else-if="isPending && mode === 'skeleton'"
      class="at-loading-skeleton"
      aria-hidden="true"
    >
      <div class="at-loading-skeleton__item is-title" />
      <div class="at-loading-skeleton__item is-row-1" />
      <div class="at-loading-skeleton__item is-row-2" />
      <div class="at-loading-skeleton__item is-row-3" />
    </div>
  </div>
</template>

<style scoped>
.at-loading-skeleton__item.is-title {
  height: 18px;
  width: 45%;
}

.at-loading-skeleton__item.is-row-1 {
  height: 12px;
  width: 85%;
}

.at-loading-skeleton__item.is-row-2 {
  height: 12px;
  width: 70%;
}

.at-loading-skeleton__item.is-row-3 {
  height: 12px;
  width: 55%;
}
</style>
