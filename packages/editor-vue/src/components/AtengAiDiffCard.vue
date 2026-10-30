<script setup lang="ts">
/**
 * @atengk/editor-vue 行内原位增删对比审阅卡片组件 (AiDiffCard)。
 *
 * 遵循 L2 专用扩展层与纯原生设计规范：
 * 1. 采用绿色背景高亮新增文本、红色划线标示删除内容，清晰呈现增删对比；
 * 2. 提供【替换选区】、【插入下方】与【放弃重试】三态闭环操作状态机；
 * 3. 严格遵循插槽倒置，允许业务端 100% 自定义审阅卡片外观。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { computed } from 'vue';
import type { AtengAiDiffCardProps, AtengAiDiffCardEmits } from '../types';
import { computeTextDiff } from '../utils';

defineOptions({
  name: 'AtengAiDiffCard',
});

const props = withDefaults(defineProps<AtengAiDiffCardProps>(), {
  originalText: '',
  newText: '',
  isStreaming: false,
  visible: true,
});

const emit = defineEmits<AtengAiDiffCardEmits>();

// 计算增删比对分块
const diffChunks = computed(() => {
  return computeTextDiff(props.originalText ?? '', props.newText ?? '');
});

const handleAcceptReplace = (): void => {
  emit('acceptReplace', props.newText ?? '');
};

const handleAcceptAppend = (): void => {
  emit('acceptAppend', props.newText ?? '');
};

const handleDiscard = (): void => {
  emit('discard');
};
</script>

<template>
  <div
    v-if="props.visible"
    class="at-ai-diff-card"
    :class="{ 'is-streaming': props.isStreaming }"
    role="region"
    aria-label="AI 智能创作行内对比审阅卡片"
  >
    <!-- 卡片头部插槽 -->
    <slot name="diff-header" :is-streaming="props.isStreaming">
      <div class="at-ai-diff-card__header">
        <div class="at-ai-diff-card__title">
          <span class="at-ai-diff-card__title-icon">✨</span>
          <span class="at-ai-diff-card__title-text">AI 建议审阅与对比</span>
        </div>
        <div class="at-ai-diff-card__badge">
          <span
            v-if="props.isStreaming"
            class="at-ai-diff-card__badge-tag at-ai-diff-card__badge-tag--streaming"
          >
            打字生成中...
          </span>
          <span v-else class="at-ai-diff-card__badge-tag at-ai-diff-card__badge-tag--ready">
            待审阅
          </span>
        </div>
      </div>
    </slot>

    <!-- 比对内容插槽 -->
    <slot
      name="diff-content"
      :diff-chunks="diffChunks"
      :original-text="props.originalText"
      :new-text="props.newText"
    >
      <div class="at-ai-diff-card__body">
        <!-- 流式未决态或对比态展示 -->
        <div class="at-ai-diff-card__diff-view">
          <template v-for="(chunk, idx) in diffChunks" :key="idx">
            <span
              v-if="chunk.type === 'added'"
              class="at-diff-chunk at-diff-chunk--added"
              title="新增内容"
            >
              {{ chunk.value }}
            </span>
            <span
              v-else-if="chunk.type === 'removed'"
              class="at-diff-chunk at-diff-chunk--removed"
              title="将被替换/删除的内容"
            >
              {{ chunk.value }}
            </span>
            <span v-else class="at-diff-chunk at-diff-chunk--unchanged">
              {{ chunk.value }}
            </span>
          </template>

          <span v-if="props.isStreaming" class="at-ai-diff-card__streaming-cursor">|</span>
        </div>
      </div>
    </slot>

    <!-- 卡片操作底部插槽 -->
    <slot
      name="diff-footer"
      :is-streaming="props.isStreaming"
      :accept-replace="handleAcceptReplace"
      :accept-append="handleAcceptAppend"
      :discard="handleDiscard"
    >
      <div class="at-ai-diff-card__footer">
        <div class="at-ai-diff-card__footer-actions">
          <button
            type="button"
            class="at-ai-diff-btn at-ai-diff-btn--replace"
            :disabled="props.isStreaming || !props.newText"
            @click="handleAcceptReplace"
          >
            ✅ 替换选区
          </button>
          <button
            type="button"
            class="at-ai-diff-btn at-ai-diff-btn--append"
            :disabled="props.isStreaming || !props.newText"
            @click="handleAcceptAppend"
          >
            📥 插入下方
          </button>
          <button
            type="button"
            class="at-ai-diff-btn at-ai-diff-btn--discard"
            @click="handleDiscard"
          >
            🗑️ 放弃重试
          </button>
        </div>
      </div>
    </slot>
  </div>
</template>

<style scoped>
.at-ai-diff-card {
  background: var(--at-editor-toolbar-bg, #ffffff);
  border: 1px solid var(--at-editor-primary, #409eff);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.15);
  margin: 10px 0;
  padding: 12px 16px;
  box-sizing: border-box;
}

.at-ai-diff-card.is-streaming {
  border-style: dashed;
}

.at-ai-diff-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--at-editor-border-color, #ebeef5);
  padding-bottom: 8px;
  margin-bottom: 10px;
}

.at-ai-diff-card__title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--at-editor-text-color, #303133);
}

.at-ai-diff-card__title-icon {
  font-size: 14px;
}

.at-ai-diff-card__badge-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.at-ai-diff-card__badge-tag--streaming {
  background-color: rgba(230, 162, 60, 0.15);
  color: #e6a23c;
}

.at-ai-diff-card__badge-tag--ready {
  background-color: rgba(103, 194, 58, 0.15);
  color: #67c23a;
}

.at-ai-diff-card__body {
  font-size: 13px;
  line-height: 1.6;
  color: var(--at-editor-text-color, #303133);
  padding: 4px 0 10px;
}

.at-ai-diff-card__diff-view {
  word-break: break-word;
}

/* 绿色高亮新增内容 */
.at-diff-chunk--added {
  background-color: rgba(103, 194, 58, 0.18);
  color: #529b2e;
  border-radius: 2px;
  padding: 1px 3px;
  font-weight: 500;
}

/* 红色删除线标示删除内容 */
.at-diff-chunk--removed {
  background-color: rgba(245, 108, 108, 0.15);
  color: #c45656;
  text-decoration: line-through;
  border-radius: 2px;
  padding: 1px 3px;
  margin-right: 2px;
}

.at-diff-chunk--unchanged {
  color: var(--at-editor-text-color, #303133);
}

.at-ai-diff-card__streaming-cursor {
  display: inline-block;
  color: var(--at-editor-primary, #409eff);
  font-weight: 700;
  animation: blink 0.8s infinite;
  margin-left: 2px;
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

.at-ai-diff-card__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  border-top: 1px solid var(--at-editor-border-color, #ebeef5);
  padding-top: 10px;
}

.at-ai-diff-card__footer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.at-ai-diff-btn {
  border: none;
  padding: 5px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.15s ease;
}

.at-ai-diff-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.at-ai-diff-btn--replace {
  background-color: #67c23a;
  color: #ffffff;
}

.at-ai-diff-btn--replace:hover:not(:disabled) {
  background-color: #529b2e;
}

.at-ai-diff-btn--append {
  background-color: var(--at-editor-primary, #409eff);
  color: #ffffff;
}

.at-ai-diff-btn--append:hover:not(:disabled) {
  background-color: #337ecc;
}

.at-ai-diff-btn--discard {
  background-color: transparent;
  color: var(--at-editor-text-color-secondary, #909399);
  border: 1px solid var(--at-editor-border-color, #dcdfe6);
}

.at-ai-diff-btn--discard:hover {
  background-color: var(--at-editor-hover-bg, #f2f3f5);
  color: var(--at-editor-text-color, #303133);
}
</style>
