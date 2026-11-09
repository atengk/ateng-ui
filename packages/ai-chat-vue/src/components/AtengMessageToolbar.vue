<script setup lang="ts">
/**
 * @atengk/ai-chat-vue 消息操作审计条组件。
 *
 * 集成复制、重新生成、用户提问编辑、点赞/点踩反馈 SPI、
 * Web Speech 朗读与 Markdown/JSON 导出等功能。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref, computed, onUnmounted } from 'vue';
import type { AtengMessageToolbarProps, AtengMessageToolbarEmits, MessageFeedback } from '../types';
import {
  IconCopy,
  IconCheck,
  IconRotateCcw,
  IconEdit,
  IconThumbsUp,
  IconThumbsDown,
  IconVolume2,
  IconVolumeX,
  IconDownload,
} from './icons';

const props = withDefaults(defineProps<AtengMessageToolbarProps>(), {
  isLast: false,
  isStreaming: false,
  speechEnabled: true,
  exportEnabled: true,
});

const emit = defineEmits<AtengMessageToolbarEmits>();

// 1. 复制状态
const copied = ref(false);
let copyTimer: ReturnType<typeof setTimeout> | null = null;

const onCopy = async (): Promise<void> => {
  if (!props.message.content) return;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(props.message.content);
    }
    copied.value = true;
    emit('copy', props.message.content);
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copied.value = false;
      copyTimer = null;
    }, 2000);
  } catch {
    // 降级兜底
    copied.value = true;
    emit('copy', props.message.content);
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copied.value = false;
      copyTimer = null;
    }, 2000);
  }
};

// 2. 重新生成
const onRegenerate = (): void => {
  if (props.isStreaming) return;
  emit('regenerate', props.message.id);
};

// 3. 用户消息编辑
const onEdit = (): void => {
  emit('edit', props.message.id, props.message.content);
};

// 4. 评价反馈（点赞/点踩）
const currentFeedback = ref<'up' | 'down' | null>(null);
const showDislikePanel = ref(false);
const dislikeTags = ['答非所问', '内容截断', '事实有误', '格式混乱', '生成太慢'];
const selectedTags = ref<string[]>([]);
const customReason = ref('');

const onThumbUp = (): void => {
  if (currentFeedback.value === 'up') {
    currentFeedback.value = null;
    return;
  }
  currentFeedback.value = 'up';
  showDislikePanel.value = false;
  const feedback: MessageFeedback = {
    messageId: props.message.id,
    type: 'up',
    timestamp: Date.now(),
  };
  emit('feedback', feedback);
};

const onThumbDownClick = (): void => {
  if (currentFeedback.value === 'down') {
    currentFeedback.value = null;
    showDislikePanel.value = false;
    return;
  }
  showDislikePanel.value = !showDislikePanel.value;
};

const toggleTag = (tag: string): void => {
  const idx = selectedTags.value.indexOf(tag);
  if (idx !== -1) {
    selectedTags.value.splice(idx, 1);
  } else {
    selectedTags.value.push(tag);
  }
};

const submitDislike = (): void => {
  currentFeedback.value = 'down';
  showDislikePanel.value = false;
  const feedback: MessageFeedback = {
    messageId: props.message.id,
    type: 'down',
    tags: [...selectedTags.value],
    reason: customReason.value.trim() || undefined,
    timestamp: Date.now(),
  };
  emit('feedback', feedback);
};

const cancelDislike = (): void => {
  showDislikePanel.value = false;
};

// 5. Web Speech 语音朗读
const isSpeaking = ref(false);
const speechSupported = computed(() => {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
});

const onToggleSpeech = (): void => {
  if (!speechSupported.value || !props.message.content) return;

  if (isSpeaking.value) {
    window.speechSynthesis.cancel();
    isSpeaking.value = false;
  } else {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(props.message.content);
    utterance.onend = () => {
      isSpeaking.value = false;
    };
    utterance.onerror = () => {
      isSpeaking.value = false;
    };
    window.speechSynthesis.speak(utterance);
    isSpeaking.value = true;
    emit('speak', props.message.id, props.message.content);
  }
};

// 6. 导出
const showExportMenu = ref(false);

const exportMarkdown = (): void => {
  showExportMenu.value = false;
  const roleLabel = props.message.role === 'user' ? '用户提问' : 'AI 回复';
  const timeStr = new Date(props.message.createdAt).toLocaleString();
  const mdContent = `# ${roleLabel} (${timeStr})\n\n${props.message.content}\n`;
  downloadBlob(mdContent, `message-${props.message.id}.md`, 'text/markdown;charset=utf-8');
  emit('export', 'markdown', props.message);
};

const exportJson = (): void => {
  showExportMenu.value = false;
  const jsonContent = JSON.stringify(props.message, null, 2);
  downloadBlob(jsonContent, `message-${props.message.id}.json`, 'application/json;charset=utf-8');
  emit('export', 'json', props.message);
};

const downloadBlob = (content: string, filename: string, mime: string): void => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// 生命周期防线清理
onUnmounted(() => {
  if (copyTimer) {
    clearTimeout(copyTimer);
    copyTimer = null;
  }
  if (speechSupported.value && isSpeaking.value) {
    window.speechSynthesis.cancel();
    isSpeaking.value = false;
  }
});
</script>

<template>
  <div class="at-ai-chat__toolbar">
    <!-- 复制操作 -->
    <button
      type="button"
      class="at-ai-chat__toolbar-btn"
      :class="{ 'is-active': copied }"
      :title="copied ? '已复制' : '复制正文'"
      @click="onCopy"
    >
      <IconCheck v-if="copied" />
      <IconCopy v-else />
    </button>

    <!-- 重新生成 (仅 assistant 角色可见) -->
    <button
      v-if="props.message.role === 'assistant'"
      type="button"
      class="at-ai-chat__toolbar-btn"
      :disabled="props.isStreaming"
      title="重新生成"
      @click="onRegenerate"
    >
      <IconRotateCcw />
    </button>

    <!-- 原位编辑 (仅 user 角色可见) -->
    <button
      v-if="props.message.role === 'user'"
      type="button"
      class="at-ai-chat__toolbar-btn"
      title="编辑提问"
      @click="onEdit"
    >
      <IconEdit />
    </button>

    <!-- 评价点赞 (仅 assistant 角色可见) -->
    <button
      v-if="props.message.role === 'assistant'"
      type="button"
      class="at-ai-chat__toolbar-btn"
      :class="{ 'is-active': currentFeedback === 'up' }"
      title="赞同此回答"
      @click="onThumbUp"
    >
      <IconThumbsUp />
    </button>

    <!-- 评价点踩 (仅 assistant 角色可见) -->
    <button
      v-if="props.message.role === 'assistant'"
      type="button"
      class="at-ai-chat__toolbar-btn"
      :class="{ 'is-active': currentFeedback === 'down' || showDislikePanel }"
      title="批评此回答"
      @click="onThumbDownClick"
    >
      <IconThumbsDown />
    </button>

    <!-- 语音朗读 -->
    <button
      v-if="props.speechEnabled && speechSupported"
      type="button"
      class="at-ai-chat__toolbar-btn"
      :class="{ 'is-active': isSpeaking }"
      :title="isSpeaking ? '停止朗读' : '语音朗读'"
      @click="onToggleSpeech"
    >
      <IconVolumeX v-if="isSpeaking" />
      <IconVolume2 v-else />
    </button>

    <!-- 导出菜单触发 -->
    <div v-if="props.exportEnabled" class="at-ai-chat__toolbar-dropdown-anchor">
      <button
        type="button"
        class="at-ai-chat__toolbar-btn"
        :class="{ 'is-active': showExportMenu }"
        title="导出消息"
        @click="showExportMenu = !showExportMenu"
      >
        <IconDownload />
      </button>

      <!-- 导出轻量下拉菜单 -->
      <div v-if="showExportMenu" class="at-ai-chat__toolbar-menu">
        <button type="button" class="at-ai-chat__toolbar-menu-item" @click="exportMarkdown">
          导出 Markdown (.md)
        </button>
        <button type="button" class="at-ai-chat__toolbar-menu-item" @click="exportJson">
          导出 JSON (.json)
        </button>
      </div>
    </div>

    <!-- 点踩理由反馈浮层 -->
    <div v-if="showDislikePanel" class="at-ai-chat__feedback-panel">
      <div class="at-ai-chat__feedback-title">请告诉我们不足之处：</div>
      <div class="at-ai-chat__feedback-tags">
        <button
          v-for="tag in dislikeTags"
          :key="tag"
          type="button"
          class="at-ai-chat__feedback-tag"
          :class="{ 'is-selected': selectedTags.includes(tag) }"
          @click="toggleTag(tag)"
        >
          {{ tag }}
        </button>
      </div>
      <textarea
        v-model="customReason"
        class="at-ai-chat__feedback-textarea"
        placeholder="补充更详细的说明（可选）..."
        rows="2"
      />
      <div class="at-ai-chat__feedback-actions">
        <button
          type="button"
          class="at-ai-chat__feedback-btn at-ai-chat__feedback-btn--cancel"
          @click="cancelDislike"
        >
          取消
        </button>
        <button
          type="button"
          class="at-ai-chat__feedback-btn at-ai-chat__feedback-btn--submit"
          @click="submitDislike"
        >
          提交反馈
        </button>
      </div>
    </div>
  </div>
</template>
