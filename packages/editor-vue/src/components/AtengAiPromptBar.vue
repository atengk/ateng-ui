<script setup lang="ts">
/**
 * @atengk/editor-vue 空白行沉浸式 AI 创作输入条组件。
 *
 * 遵循 L2 专用扩展层与纯原生设计规范：
 * 在空行处提供一键沉浸式唤起面板，支持输入自然语言创作指令并驱动流式生成。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { ref } from 'vue';
import type { AtengAiPromptBarProps } from '../types';

defineOptions({
  name: 'AtengAiPromptBar',
});

const props = withDefaults(defineProps<AtengAiPromptBarProps>(), {
  editor: null,
  disabled: false,
  isStreaming: false,
});

const emit = defineEmits<{
  (e: 'submitPrompt', prompt: string): void;
  (e: 'close'): void;
}>();

const inputVal = ref<string>('');

const handleSubmit = (): void => {
  const p = inputVal.value.trim();
  if (!p || props.disabled || props.isStreaming) return;

  emit('submitPrompt', p);
  inputVal.value = '';
};

const handleCancel = (): void => {
  inputVal.value = '';
  emit('close');
};
</script>

<template>
  <div class="at-ai-prompt-bar" role="region" aria-label="AI 智能创作输入条">
    <div class="at-ai-prompt-bar__inner">
      <span class="at-ai-prompt-bar__icon">✨</span>
      <input
        v-model="inputVal"
        type="text"
        class="at-ai-prompt-bar__input"
        :disabled="props.disabled || props.isStreaming"
        placeholder="告诉 AI 接下来想创作什么（按 Enter 生成，Esc 退出）..."
        @keydown.enter.prevent="handleSubmit"
        @keydown.esc.prevent="handleCancel"
      />
      <div class="at-ai-prompt-bar__actions">
        <button
          type="button"
          class="at-ai-prompt-bar__btn at-ai-prompt-bar__btn--submit"
          :disabled="!inputVal.trim() || props.disabled || props.isStreaming"
          @click="handleSubmit"
        >
          <span v-if="props.isStreaming">生成中...</span>
          <span v-else>生成 ↵</span>
        </button>
        <button
          type="button"
          class="at-ai-prompt-bar__btn at-ai-prompt-bar__btn--close"
          :disabled="props.disabled"
          @click="handleCancel"
        >
          取消
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.at-ai-prompt-bar {
  padding: 8px 12px;
  background: var(--at-editor-toolbar-bg, #ffffff);
  border: 1px solid var(--at-editor-primary, #409eff);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.12);
  margin: 6px 0;
  box-sizing: border-box;
}

.at-ai-prompt-bar__inner {
  display: flex;
  align-items: center;
  gap: 8px;
}

.at-ai-prompt-bar__icon {
  font-size: 16px;
  user-select: none;
}

.at-ai-prompt-bar__input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 13px;
  color: var(--at-editor-text-color, #303133);
  padding: 4px 0;
}

.at-ai-prompt-bar__actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.at-ai-prompt-bar__btn {
  border: none;
  background: transparent;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.at-ai-prompt-bar__btn--submit {
  background-color: var(--at-editor-primary, #409eff);
  color: #ffffff;
}

.at-ai-prompt-bar__btn--submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.at-ai-prompt-bar__btn--close {
  color: var(--at-editor-text-color-secondary, #909399);
}

.at-ai-prompt-bar__btn--close:hover {
  background-color: var(--at-editor-hover-bg, #f2f3f5);
  color: var(--at-editor-text-color, #303133);
}
</style>
