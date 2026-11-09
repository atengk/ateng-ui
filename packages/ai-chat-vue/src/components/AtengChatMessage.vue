<script setup lang="ts">
/**
 * @atengk/ai-chat-vue 消息气泡展示组件。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { computed } from 'vue';
import type { AtengChatMessageProps, ReasoningContent } from '../types';
import AtengMarkdownRenderer from './AtengMarkdownRenderer.vue';
import AtengReasoningBlock from './AtengReasoningBlock.vue';

const props = defineProps<AtengChatMessageProps>();

defineSlots<{
  avatar?: (props: { role: string }) => unknown;
  reasoning?: (props: { reasoning: ReasoningContent }) => unknown;
  content?: (props: { content: string }) => unknown;
  'code-block'?: (props: { language: string; code: string; isStreaming?: boolean }) => unknown;
  extra?: () => unknown;
}>();

const isUser = computed(() => props.message.role === 'user');
const isAssistant = computed(() => props.message.role === 'assistant');

const avatarText = computed(() => {
  if (isUser.value) return '我';
  if (isAssistant.value) return 'AI';
  if (props.message.role === 'system') return '系';
  return '工';
});
</script>

<template>
  <div
    class="at-ai-chat__message-wrapper"
    :class="{
      'at-ai-chat__message-wrapper--user': isUser,
      'at-ai-chat__message-wrapper--assistant': !isUser,
    }"
  >
    <!-- 头像区 -->
    <div class="at-ai-chat__avatar">
      <slot name="avatar" :role="props.message.role">
        {{ avatarText }}
      </slot>
    </div>

    <!-- 消息气泡区 -->
    <div class="at-ai-chat__message-body">
      <!-- 思考链展示区 -->
      <template v-if="props.message.reasoning">
        <slot name="reasoning" :reasoning="props.message.reasoning">
          <AtengReasoningBlock
            v-if="props.message.reasoning.text || props.message.reasoning.isStreaming"
            :reasoning="props.message.reasoning"
          />
        </slot>
      </template>

      <div class="at-ai-chat__bubble">
        <slot name="content" :content="props.message.content">
          <AtengMarkdownRenderer
            :content="props.message.content"
            :is-streaming="props.message.status === 'streaming'"
          >
            <template #code-block="slotProps">
              <slot name="code-block" v-bind="slotProps" />
            </template>
          </AtengMarkdownRenderer>
          <span
            v-if="props.message.status === 'streaming'"
            class="at-ai-chat__cursor"
            aria-hidden="true"
          />
        </slot>
      </div>

      <!-- 附加扩展插槽 -->
      <slot name="extra" />
    </div>
  </div>
</template>
