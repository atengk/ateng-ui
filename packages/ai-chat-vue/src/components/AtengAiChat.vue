<script setup lang="ts">
/**
 * @atengk/ai-chat-vue 统领表现容器组件。
 *
 * 集成视口智能滚动锚定、新消息悬浮气泡、打字机节流协同与多插槽扩展机制。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref, watch, nextTick } from 'vue';
import type { AtengAiChatProps, AtengAiChatEmits, ChatMessage } from '../types';
import AtengChatMessage from './AtengChatMessage.vue';
import AtengChatInput from './AtengChatInput.vue';
import { IconArrowDown } from './icons';

const props = withDefaults(defineProps<AtengAiChatProps>(), {
  messages: () => [],
  isStreaming: false,
  placeholder: '请输入您的问题，Enter 发送，Shift+Enter 换行...',
  disabled: false,
  height: '600px',
  scrollThreshold: 60,
  typewriterSpeed: 0,
});

const emit = defineEmits<AtengAiChatEmits>();

defineSlots<{
  header?: () => unknown;
  messages?: (props: { messages: ChatMessage[] }) => unknown;
  'message-item'?: (props: { message: ChatMessage; index: number }) => unknown;
  'code-block'?: (props: { language: string; code: string; isStreaming?: boolean }) => unknown;
  'unread-badge'?: (props: { scrollToBottom: () => void }) => unknown;
  input?: () => unknown;
  footer?: () => unknown;
}>();

const messagesContainerRef = ref<HTMLDivElement | null>(null);
const isAnchored = ref(true);
const showUnreadBadge = ref(false);

/**
 * 监听视口滚动，动态计算当前距离容器底部的距离。
 * 若 Delta <= threshold，则认定处于锚定态并隐藏未读气泡；
 * 若 Delta > threshold，则解除锚定态。
 */
const onScroll = (): void => {
  const el = messagesContainerRef.value;
  if (!el) {
    return;
  }
  const delta = el.scrollHeight - el.scrollTop - el.clientHeight;
  const threshold = props.scrollThreshold ?? 60;
  if (delta <= threshold) {
    isAnchored.value = true;
    showUnreadBadge.value = false;
  } else {
    isAnchored.value = false;
  }
};

/**
 * 滚动至视口底部，重新建立锚定并关闭未读气泡。
 *
 * @param smooth 是否平滑滚动动画
 */
const scrollToBottom = (smooth = false): void => {
  const el = messagesContainerRef.value;
  if (el) {
    if (smooth && typeof el.scrollTo === 'function') {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: 'smooth',
      });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }
  isAnchored.value = true;
  showUnreadBadge.value = false;
};

// 监听消息增量或正文变化
watch(
  () => props.messages,
  () => {
    if (isAnchored.value) {
      nextTick(() => {
        scrollToBottom();
      });
    } else {
      showUnreadBadge.value = true;
    }
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
  isAnchored,
  showUnreadBadge,
  messagesContainerRef,
});
</script>

<template>
  <div class="at-ai-chat" :style="{ height: props.height }">
    <!-- 头部插槽 -->
    <slot name="header" />

    <!-- 消息流视口与相对定位包装层 -->
    <div class="at-ai-chat__viewport-wrapper">
      <div ref="messagesContainerRef" class="at-ai-chat__messages" @scroll="onScroll">
        <slot name="messages" :messages="props.messages">
          <template v-for="(msg, index) in props.messages" :key="msg.id">
            <slot name="message-item" :message="msg" :index="index">
              <AtengChatMessage :message="msg" :is-last="index === props.messages.length - 1">
                <template #code-block="slotProps">
                  <slot name="code-block" v-bind="slotProps" />
                </template>
              </AtengChatMessage>
            </slot>
          </template>
        </slot>
      </div>

      <!-- 悬浮新消息气泡胶囊 -->
      <Transition name="at-ai-chat-fade">
        <div v-if="showUnreadBadge" class="at-ai-chat__unread-badge-container">
          <slot name="unread-badge" :scroll-to-bottom="() => scrollToBottom(true)">
            <button type="button" class="at-ai-chat__unread-badge" @click="scrollToBottom(true)">
              <span>有新消息</span>
              <IconArrowDown class="at-ai-chat__unread-icon" />
            </button>
          </slot>
        </div>
      </Transition>
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
