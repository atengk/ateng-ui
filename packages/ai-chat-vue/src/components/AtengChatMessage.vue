<script setup lang="ts">
/**
 * @atengk/ai-chat-vue 消息气泡展示组件。
 *
 * 集成思考链、工具调用卡片、Artifact 产物卡片、多模态附件预览、
 * 原位编辑模式、推荐追问胶囊与消息审计条。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref, computed } from 'vue';
import type {
  AtengChatMessageProps,
  AtengChatMessageEmits,
  ReasoningContent,
  ToolCallPayload,
  ArtifactPayload,
  ChatAttachment,
} from '../types';
import AtengMarkdownRenderer from './AtengMarkdownRenderer.vue';
import AtengReasoningBlock from './AtengReasoningBlock.vue';
import AtengToolCallCard from './AtengToolCallCard.vue';
import AtengArtifactCard from './AtengArtifactCard.vue';
import AtengMessageToolbar from './AtengMessageToolbar.vue';
import { IconRotateCcw } from './icons';

const props = withDefaults(defineProps<AtengChatMessageProps>(), {
  isLast: false,
  isStreaming: false,
  speechEnabled: true,
  exportEnabled: true,
});

const emit = defineEmits<AtengChatMessageEmits>();

defineSlots<{
  avatar?: (props: { role: string }) => unknown;
  reasoning?: (props: { reasoning: ReasoningContent }) => unknown;
  'tool-call'?: (props: { toolCall: ToolCallPayload }) => unknown;
  artifact?: (props: { artifact: ArtifactPayload }) => unknown;
  content?: (props: { content: string }) => unknown;
  'code-block'?: (props: { language: string; code: string; isStreaming?: boolean }) => unknown;
  attachments?: (props: { attachments: ChatAttachment[] }) => unknown;
  toolbar?: (props: { message: AtengChatMessageProps['message'] }) => unknown;
  'suggested-questions'?: (props: { questions: string[]; select: (q: string) => void }) => unknown;
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

// 原位编辑逻辑
const isEditing = ref(false);
const editDraft = ref('');

const onStartEdit = (_messageId: string, currentContent: string): void => {
  isEditing.value = true;
  editDraft.value = currentContent;
};

const onCancelEdit = (): void => {
  isEditing.value = false;
  editDraft.value = '';
};

const onSaveEdit = (): void => {
  const trimmed = editDraft.value.trim();
  if (trimmed && trimmed !== props.message.content) {
    emit('editMessage', props.message.id, trimmed);
  }
  isEditing.value = false;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
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

    <!-- 消息主体区 -->
    <div class="at-ai-chat__message-body">
      <!-- 多模态附件预览区 -->
      <slot
        v-if="props.message.attachments && props.message.attachments.length > 0"
        name="attachments"
        :attachments="props.message.attachments"
      >
        <div class="at-ai-chat__message-attachments">
          <template v-for="att in props.message.attachments" :key="att.id">
            <!-- 图片附件卡片 -->
            <div
              v-if="att.type === 'image'"
              class="at-ai-chat__attachment-preview-card at-ai-chat__attachment-preview-card--image"
            >
              <img
                :src="att.thumbnailUrl || att.url"
                :alt="att.name"
                class="at-ai-chat__attachment-img"
              />
            </div>
            <!-- 文件/音频附件卡片 -->
            <div
              v-else
              class="at-ai-chat__attachment-preview-card at-ai-chat__attachment-preview-card--file"
            >
              <span class="at-ai-chat__attachment-preview-icon">📄</span>
              <div class="at-ai-chat__attachment-preview-meta">
                <span class="at-ai-chat__attachment-preview-name" :title="att.name">{{
                  att.name
                }}</span>
                <span class="at-ai-chat__attachment-preview-size">{{
                  formatFileSize(att.size)
                }}</span>
              </div>
            </div>
          </template>
        </div>
      </slot>

      <!-- 思考链展示区 -->
      <template v-if="props.message.reasoning">
        <slot name="reasoning" :reasoning="props.message.reasoning">
          <AtengReasoningBlock
            v-if="props.message.reasoning.text || props.message.reasoning.isStreaming"
            :reasoning="props.message.reasoning"
          />
        </slot>
      </template>

      <!-- 工具调用展示区 -->
      <div
        v-if="props.message.toolCalls && props.message.toolCalls.length > 0"
        class="at-ai-chat__tool-calls"
      >
        <template v-for="toolCall in props.message.toolCalls" :key="toolCall.callId">
          <slot name="tool-call" :tool-call="toolCall">
            <AtengToolCallCard
              :tool-call="toolCall"
              @approve="emit('approveTool', $event)"
              @reject="(callId, reason) => emit('rejectTool', callId, reason)"
            />
          </slot>
        </template>
      </div>

      <!-- Artifact 产物卡片展示区 -->
      <div
        v-if="props.message.artifacts && props.message.artifacts.length > 0"
        class="at-ai-chat__artifacts"
      >
        <template v-for="artifact in props.message.artifacts" :key="artifact.identifier">
          <slot name="artifact" :artifact="artifact">
            <AtengArtifactCard :artifact="artifact" @click="emit('openArtifact', artifact)" />
          </slot>
        </template>
      </div>

      <!-- 气泡正文区或原位编辑区 -->
      <div v-if="isEditing" class="at-ai-chat__bubble at-ai-chat__bubble--editing">
        <textarea
          v-model="editDraft"
          class="at-ai-chat__edit-textarea"
          rows="3"
          placeholder="修改提问内容..."
        />
        <div class="at-ai-chat__edit-actions">
          <button
            type="button"
            class="at-ai-chat__edit-btn at-ai-chat__edit-btn--cancel"
            @click="onCancelEdit"
          >
            取消
          </button>
          <button
            type="button"
            class="at-ai-chat__edit-btn at-ai-chat__edit-btn--save"
            :disabled="!editDraft.trim()"
            @click="onSaveEdit"
          >
            保存并提交
          </button>
        </div>
      </div>

      <div
        v-else
        class="at-ai-chat__bubble"
        :class="{ 'at-ai-chat__bubble--error': props.message.status === 'error' }"
      >
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

      <!-- 异常状态标红与原位重试自愈按钮 -->
      <div v-if="props.message.status === 'error'" class="at-ai-chat__error-retry-card">
        <span class="at-ai-chat__error-retry-text">
          ⚠️ {{ props.message.error || '网络连接中断或服务异常' }}
        </span>
        <button
          type="button"
          class="at-ai-chat__error-retry-btn"
          title="重新尝试此请求"
          @click="emit('regenerate', props.message.id)"
        >
          <IconRotateCcw class="at-ai-chat__error-retry-icon" />
          <span>重新尝试此请求</span>
        </button>
      </div>

      <!-- 操作审计条 -->
      <slot name="toolbar" :message="props.message">
        <AtengMessageToolbar
          v-if="
            !isEditing &&
            (props.message.content ||
              (props.message.attachments && props.message.attachments.length > 0))
          "
          :message="props.message"
          :is-last="props.isLast"
          :is-streaming="props.isStreaming"
          :speech-enabled="props.speechEnabled"
          :export-enabled="props.exportEnabled"
          @regenerate="emit('regenerate', $event)"
          @edit="onStartEdit"
          @feedback="emit('feedback', $event)"
        />
      </slot>

      <!-- 推荐追问问题胶囊 (动态平滑滚动推荐气泡) -->
      <slot
        v-if="
          isAssistant &&
          props.message.suggestedQuestions &&
          props.message.suggestedQuestions.length > 0
        "
        name="suggested-questions"
        :questions="props.message.suggestedQuestions"
        :select="(q: string) => emit('clickSuggestedQuestion', q)"
      >
        <div class="at-ai-chat__suggested-questions">
          <button
            v-for="question in props.message.suggestedQuestions"
            :key="question"
            type="button"
            class="at-ai-chat__suggested-question-btn"
            @click="emit('clickSuggestedQuestion', question)"
          >
            <span class="at-ai-chat__suggested-question-spark">✨</span>
            <span class="at-ai-chat__suggested-question-text">{{ question }}</span>
          </button>
        </div>
      </slot>

      <!-- 附加扩展插槽 -->
      <slot name="extra" />
    </div>
  </div>
</template>
