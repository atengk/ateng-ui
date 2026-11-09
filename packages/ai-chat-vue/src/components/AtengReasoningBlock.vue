<script setup lang="ts">
/**
 * @atengk/ai-chat-vue 深度思考过程折叠展示组件。
 *
 * 支持思考中骨架屏脉冲动效、秒级计时、自动折叠与随时展开查阅。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref, computed, watch } from 'vue';
import type { ReasoningContent } from '../types';
import { IconBrain, IconChevronDown } from './icons';

interface Props {
  /**
   * 思考过程领域实体。
   */
  reasoning?: ReasoningContent;

  /**
   * 标题提示文案。
   */
  title?: string;

  /**
   * 受控是否折叠状态。
   */
  collapsed?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  reasoning: undefined,
  title: '深度思考过程',
  collapsed: undefined,
});

const emit = defineEmits<{
  (e: 'update:collapsed', value: boolean): void;
  (e: 'toggle', value: boolean): void;
}>();

defineSlots<{
  title?: () => unknown;
  content?: (props: { text: string }) => unknown;
}>();

// 内部折叠状态（优先遵循 props.collapsed，其次遵循 props.reasoning?.collapsed，默认在非流式时折叠）
const internalCollapsed = ref<boolean>(props.collapsed ?? props.reasoning?.collapsed ?? false);

watch(
  () => props.collapsed,
  val => {
    if (val !== undefined && val !== internalCollapsed.value) {
      internalCollapsed.value = val;
    }
  },
);

watch(
  () => props.reasoning?.collapsed,
  val => {
    if (val !== undefined && props.collapsed === undefined) {
      internalCollapsed.value = val;
    }
  },
);

const isCollapsed = computed(() => internalCollapsed.value);

const toggleCollapse = (): void => {
  const nextVal = !internalCollapsed.value;
  internalCollapsed.value = nextVal;
  emit('update:collapsed', nextVal);
  emit('toggle', nextVal);
};

const timerText = computed(() => {
  const r = props.reasoning;
  if (!r) return '';

  if (r.isStreaming) {
    if (r.elapsedMs && r.elapsedMs > 0) {
      return `正在思考中 (${(r.elapsedMs / 1000).toFixed(1)}s)...`;
    }
    return '正在思考中...';
  }

  if (r.elapsedMs && r.elapsedMs > 0) {
    return `已深度思考 ${(r.elapsedMs / 1000).toFixed(1)} 秒`;
  }
  return '思考完成';
});
</script>

<template>
  <div v-if="props.reasoning" class="at-ai-chat__reasoning">
    <!-- 思考栏头部 -->
    <div
      class="at-ai-chat__reasoning-header"
      role="button"
      tabindex="0"
      :aria-expanded="!isCollapsed"
      @click="toggleCollapse"
      @keydown.enter.space.prevent="toggleCollapse"
    >
      <div class="at-ai-chat__reasoning-title-group">
        <IconBrain />
        <span class="at-ai-chat__reasoning-title">
          <slot name="title">{{ props.title }}</slot>
        </span>
        <span v-if="timerText" class="at-ai-chat__reasoning-timer">
          {{ timerText }}
        </span>
      </div>

      <span
        class="at-ai-chat__reasoning-arrow"
        :class="{ 'at-ai-chat__reasoning-arrow--expanded': !isCollapsed }"
      >
        <IconChevronDown />
      </span>
    </div>

    <!-- 思考展开正文 -->
    <div v-if="!isCollapsed" class="at-ai-chat__reasoning-body">
      <!-- 思考中骨架屏动效（尚未产生首批思考字符） -->
      <div
        v-if="props.reasoning.isStreaming && !props.reasoning.text"
        class="at-ai-chat__reasoning-skeleton"
        aria-label="思考中骨架屏"
      >
        <div class="at-ai-chat__reasoning-skeleton-line" />
        <div class="at-ai-chat__reasoning-skeleton-line" />
        <div class="at-ai-chat__reasoning-skeleton-line" />
      </div>

      <!-- 思考正文纯文本 -->
      <slot v-else name="content" :text="props.reasoning.text">
        <span>{{ props.reasoning.text }}</span>
        <span v-if="props.reasoning.isStreaming" class="at-ai-chat__cursor" aria-hidden="true" />
      </slot>
    </div>
  </div>
</template>
