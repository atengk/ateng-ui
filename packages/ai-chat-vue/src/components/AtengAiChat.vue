<script setup lang="ts">
/**
 * @atengk/ai-chat-vue 统领表现容器组件。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref, watch, nextTick } from 'vue';
import type { AtengAiChatProps, AtengAiChatEmits, ChatMessage } from '../types';
import AtengChatMessage from './AtengChatMessage.vue';
import AtengChatInput from './AtengChatInput.vue';

const props = withDefaults(defineProps<AtengAiChatProps>(), {
  messages: () => [],
  isStreaming: false,
  placeholder: '请输入您的问题，Enter 发送，Shift+Enter 换行...',
  disabled: false,
  height: '600px',
});

const emit = defineEmits<AtengAiChatEmits>();

defineSlots<{
  header?: () => unknown;
  messages?: (props: { messages: ChatMessage[] }) => unknown;
  'message-item'?: (props: { message: ChatMessage; index: number }) => unknown;
  input?: () => unknown;
  footer?: () => unknown;
}>();

const messagesContainerRef = ref<HTMLDivElement | null>(null);

/**
 * 平滑滚动至视口底部。
 */
const scrollToBottom = (): void => {
  if (messagesContainerRef.value) {
    messagesContainerRef.value.scrollTop = messagesContainerRef.value.scrollHeight;
  }
};

// 监听消息增量或正文变化时自动滚底
watch(
  () => props.messages,
  () => {
    nextTick(() => {
      scrollToBottom();
    });
  },
  { deep: true },
);

const onSend = (content: string): void => {
  emit('send', content);
};

const onStop = (): void => {
  emit('stop');
};

defineExpose({
  scrollToBottom,
});
</script>

<template>
  <div class="at-ai-chat" :style="{ height: props.height }">
    <!-- 头部插槽 -->
    <slot name="header" />

    <!-- 消息流视口 -->
    <div ref="messagesContainerRef" class="at-ai-chat__messages">
      <slot name="messages" :messages="props.messages">
        <template v-for="(msg, index) in props.messages" :key="msg.id">
          <slot name="message-item" :message="msg" :index="index">
            <AtengChatMessage :message="msg" :is-last="index === props.messages.length - 1" />
          </slot>
        </template>
      </slot>
    </div>

    <!-- 底部输入区插槽或默认输入器 -->
    <slot name="input">
      <AtengChatInput
        :placeholder="props.placeholder"
        :disabled="props.disabled"
        :is-streaming="props.isStreaming"
        @submit="onSend"
        @stop="onStop"
      />
    </slot>

    <!-- 页脚扩展插槽 -->
    <slot name="footer" />
  </div>
</template>
