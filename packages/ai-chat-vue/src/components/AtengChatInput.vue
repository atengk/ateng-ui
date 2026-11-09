<script setup lang="ts">
/**
 * @atengk/ai-chat-vue 输入框与发送控制组件。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref, watch } from 'vue';
import type { AtengChatInputProps, AtengChatInputEmits } from '../types';
import { IconSend, IconStop } from './icons';

const props = withDefaults(defineProps<AtengChatInputProps>(), {
  modelValue: '',
  placeholder: '请输入您的问题，Enter 发送，Shift+Enter 换行...',
  disabled: false,
  isStreaming: false,
});

const emit = defineEmits<AtengChatInputEmits>();

defineSlots<{
  prefix?: () => unknown;
  suffix?: () => unknown;
  actions?: () => unknown;
}>();

const text = ref<string>(props.modelValue);

watch(
  () => props.modelValue,
  val => {
    if (val !== text.value) {
      text.value = val;
    }
  },
);

const onInput = (e: Event): void => {
  const target = e.target as HTMLTextAreaElement;
  text.value = target.value;
  emit('update:modelValue', target.value);
};

const onSubmit = (): void => {
  if (props.disabled || props.isStreaming) return;
  const trimmed = text.value.trim();
  if (!trimmed) return;

  emit('submit', trimmed);
  text.value = '';
  emit('update:modelValue', '');
};

const onStop = (): void => {
  emit('stop');
};

const onKeydown = (e: KeyboardEvent): void => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    onSubmit();
  }
};
</script>

<template>
  <div class="at-ai-chat__input-area">
    <div class="at-ai-chat__input-box">
      <!-- 前置插槽 -->
      <slot name="prefix" />

      <!-- 自适应文本域 -->
      <textarea
        :value="text"
        :placeholder="props.placeholder"
        :disabled="props.disabled"
        rows="1"
        class="at-ai-chat__textarea"
        @input="onInput"
        @keydown="onKeydown"
      />

      <!-- 后置操作插槽或默认按钮 -->
      <slot name="actions">
        <!-- 停止按钮 -->
        <button
          v-if="props.isStreaming"
          type="button"
          class="at-ai-chat__btn at-ai-chat__btn--stop"
          title="停止生成"
          @click="onStop"
        >
          <IconStop />
        </button>

        <!-- 发送按钮 -->
        <button
          v-else
          type="button"
          class="at-ai-chat__btn at-ai-chat__btn--send"
          :disabled="props.disabled || !text.trim()"
          title="发送消息"
          @click="onSubmit"
        >
          <IconSend />
        </button>
      </slot>

      <!-- 后置插槽 -->
      <slot name="suffix" />
    </div>
  </div>
</template>
