<script setup lang="ts">
/**
 * AtengStreamText 面向 AI 与 SSE 的轻量级流式打字机呈现组件。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref, computed, watch, onUnmounted, nextTick } from 'vue';
import { ElButton, ElMessage } from 'element-plus';
import { IconCopy } from './icons';
import type {
  AtengStreamTextProps,
  AtengStreamTextEmits,
  AtengStreamTextSlots,
  AtengStreamTextExpose,
} from './types';

const props = withDefaults(defineProps<AtengStreamTextProps>(), {
  text: '',
  speed: 30,
  cursor: true,
  cursorChar: '|',
  showCopy: false,
  customClass: '',
});

const emit = defineEmits<AtengStreamTextEmits>();
defineSlots<AtengStreamTextSlots>();

// 内部响应式状态
const displayedText = ref<string>('');
const isTyping = ref<boolean>(false);
const streamCompleted = ref<boolean>(false);
let timer: ReturnType<typeof setInterval> | null = null;

// 获取当前目标全量文本
const targetFullText = computed<string>(() => {
  if (props.stream) {
    return props.stream.text.value || '';
  }
  return props.text || '';
});

// 计算是否完成全部输出
const isFinished = computed<boolean>(() => {
  if (props.stream) {
    return Boolean(
      props.stream.isFinished.value && displayedText.value.length >= targetFullText.value.length,
    );
  }
  return displayedText.value.length >= targetFullText.value.length && streamCompleted.value;
});

// 清理定时器
function stopTimer(): void {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
  isTyping.value = false;
}

// 逐字输出步进
function stepTypewriter(): void {
  const target = targetFullText.value;
  const currentLen = displayedText.value.length;

  if (currentLen < target.length) {
    displayedText.value = target.slice(0, currentLen + 1);
  }

  if (displayedText.value.length >= target.length) {
    // 文本已追平
    stopTimer();
    const isStreamDone = props.stream ? props.stream.isFinished.value : true;
    if (isStreamDone) {
      streamCompleted.value = true;
      emit('finished', displayedText.value);
    }
  }
}

// 调度打字机
function scheduleTyping(): void {
  if (props.speed <= 0) {
    displayedText.value = targetFullText.value;
    streamCompleted.value = true;
    emit('finished', displayedText.value);
    return;
  }

  if (timer === null && displayedText.value.length < targetFullText.value.length) {
    isTyping.value = true;
    streamCompleted.value = false;
    timer = setInterval(stepTypewriter, props.speed);
  }
}

// 立即跳过打字动画吐出全量文本
function flush(): void {
  stopTimer();
  displayedText.value = targetFullText.value;
  streamCompleted.value = true;
  emit('finished', displayedText.value);
}

// 重新启动打字动画
function restart(): void {
  stopTimer();
  displayedText.value = '';
  streamCompleted.value = false;
  nextTick(() => {
    scheduleTyping();
  });
}

// 复制文本到剪贴板
async function handleCopy(): Promise<boolean> {
  const textToCopy = displayedText.value || targetFullText.value;
  if (!textToCopy) {
    return false;
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(textToCopy);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = textToCopy;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    ElMessage.success('已复制到剪贴板');
    emit('copy', textToCopy);
    return true;
  } catch {
    ElMessage.error('复制失败');
    return false;
  }
}

// 监听目标文本变动
watch(
  () => targetFullText.value,
  (newVal, oldVal) => {
    if (props.speed <= 0) {
      displayedText.value = newVal;
      streamCompleted.value = true;
      emit('finished', newVal);
      return;
    }

    if (newVal.length < (oldVal?.length || 0)) {
      // 文本被外部重置截断
      displayedText.value = newVal;
      stopTimer();
    } else {
      scheduleTyping();
    }
  },
  { immediate: true },
);

// 监听 stream 的 isFinished 标志
if (props.stream) {
  watch(
    () => props.stream?.isFinished.value,
    finished => {
      if (finished && displayedText.value.length >= targetFullText.value.length) {
        streamCompleted.value = true;
        emit('finished', displayedText.value);
      }
    },
  );
}

// 确定性清理
onUnmounted(() => {
  stopTimer();
});

defineExpose<AtengStreamTextExpose>({
  currentText: computed(() => displayedText.value),
  isFinished,
  flush,
  restart,
  copy: handleCopy,
});
</script>

<template>
  <div :class="['at-stream-text', customClass, { 'at-stream-text--finished': isFinished }]">
    <div class="at-stream-text__content">
      <slot :text="displayedText" :is-finished="isFinished">
        <span class="at-stream-text__body">{{ displayedText }}</span>
      </slot>

      <!-- 闪烁光标 -->
      <slot name="cursor" :is-finished="isFinished">
        <span
          v-if="cursor"
          :class="['at-stream-text__cursor', { 'at-stream-text__cursor--hidden': isFinished }]"
        >
          {{ cursorChar }}
        </span>
      </slot>
    </div>

    <!-- 顶部/右上角操作栏 -->
    <div v-if="showCopy || $slots.actions" class="at-stream-text__actions">
      <slot name="actions" :text="displayedText" :is-finished="isFinished" :copy="handleCopy">
        <ElButton
          v-if="showCopy"
          class="at-stream-text__copy-btn"
          size="small"
          text
          :icon="IconCopy"
          title="复制文本"
          @click="handleCopy"
        />
      </slot>
    </div>
  </div>
</template>

<style scoped lang="scss">
.at-stream-text {
  position: relative;
  display: inline-flex;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
  font-family: inherit;
  color: var(--el-text-color-primary);
  line-height: 1.6;

  &__content {
    flex: 1;
    word-break: break-word;
    white-space: pre-wrap;
  }

  &__body {
    display: inline;
  }

  &__cursor {
    display: inline-block;
    margin-left: 2px;
    font-weight: 600;
    color: var(--el-color-primary);
    animation: at-stream-cursor-blink 1s infinite ease-in-out;
    transition: opacity 0.3s ease;

    &--hidden {
      opacity: 0;
      animation: none;
    }
  }

  &__actions {
    margin-left: 8px;
    flex-shrink: 0;
  }

  &__copy-btn {
    padding: 2px 6px;
    color: var(--el-text-color-secondary);

    &:hover {
      color: var(--el-color-primary);
    }
  }
}

@keyframes at-stream-cursor-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}
</style>
