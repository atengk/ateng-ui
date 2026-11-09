<script setup lang="ts">
/**
 * @atengk/ai-chat-vue 工具调用卡片组件。
 *
 * 遵循 L2 零 Element Plus 依赖纯净律，采用纯原生 CSS 变量驱动，
 * 支持三态全生命周期展示、JSON 入参折叠查看与人机协同审批 (HITL) 交互。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref, computed } from 'vue';
import type { AtengToolCallCardProps, AtengToolCallCardEmits } from '../types';
import {
  IconTool,
  IconLoading,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconChevronDown,
} from './icons';

const props = withDefaults(defineProps<AtengToolCallCardProps>(), {
  disabled: false,
  defaultExpanded: false,
});

const emit = defineEmits<AtengToolCallCardEmits>();

defineSlots<{
  header?: (props: { toolCall: AtengToolCallCardProps['toolCall'] }) => unknown;
  args?: (props: { arguments: Record<string, unknown> }) => unknown;
  result?: (props: { result: unknown }) => unknown;
  approval?: (props: {
    callId: string;
    approve: () => void;
    reject: (reason?: string) => void;
  }) => unknown;
}>();

const isExpanded = ref(props.defaultExpanded);
const rejectionReason = ref('');

const toggleExpand = (): void => {
  isExpanded.value = !isExpanded.value;
};

const stateText = computed<string>(() => {
  switch (props.toolCall.state) {
    case 'calling':
      return '调用中...';
    case 'executing':
      return '正在执行...';
    case 'awaiting_approval':
      return '等待审批';
    case 'success':
      return '调用成功';
    case 'error':
      return '调用失败';
    case 'rejected':
      return '已拒绝';
    default:
      return '就绪';
  }
});

const stateClass = computed<string>(() => {
  switch (props.toolCall.state) {
    case 'calling':
    case 'executing':
      return 'at-tool-card--running';
    case 'awaiting_approval':
      return 'at-tool-card--awaiting';
    case 'success':
      return 'at-tool-card--success';
    case 'error':
      return 'at-tool-card--error';
    case 'rejected':
      return 'at-tool-card--rejected';
    default:
      return '';
  }
});

const formattedArgs = computed<string>(() => {
  try {
    return JSON.stringify(props.toolCall.arguments, null, 2);
  } catch {
    return String(props.toolCall.arguments);
  }
});

const formattedResult = computed<string>(() => {
  if (props.toolCall.result === undefined) return '';
  if (typeof props.toolCall.result === 'object' && props.toolCall.result !== null) {
    try {
      return JSON.stringify(props.toolCall.result, null, 2);
    } catch {
      return String(props.toolCall.result);
    }
  }
  return String(props.toolCall.result);
});

const handleApprove = (): void => {
  if (props.disabled) return;
  emit('approve', props.toolCall.callId);
};

const handleReject = (): void => {
  if (props.disabled) return;
  emit('reject', props.toolCall.callId, rejectionReason.value.trim() || undefined);
};
</script>

<template>
  <div class="at-tool-card" :class="stateClass">
    <!-- 头部区域 -->
    <div class="at-tool-card__header">
      <slot name="header" :tool-call="props.toolCall">
        <div class="at-tool-card__title-group">
          <!-- 状态图标 -->
          <span class="at-tool-card__icon" aria-hidden="true">
            <IconLoading
              v-if="props.toolCall.state === 'calling' || props.toolCall.state === 'executing'"
            />
            <IconAlertTriangle v-else-if="props.toolCall.state === 'awaiting_approval'" />
            <IconCheck v-else-if="props.toolCall.state === 'success'" />
            <IconX
              v-else-if="props.toolCall.state === 'error' || props.toolCall.state === 'rejected'"
            />
            <IconTool v-else />
          </span>

          <span class="at-tool-card__name">{{ props.toolCall.name }}</span>
          <span class="at-tool-card__badge">{{ stateText }}</span>
        </div>
      </slot>

      <button
        type="button"
        class="at-tool-card__toggle-btn"
        :aria-expanded="isExpanded"
        @click="toggleExpand"
      >
        <span>{{ isExpanded ? '收起详情' : '查看详情' }}</span>
        <IconChevronDown
          class="at-tool-card__chevron"
          :class="{ 'at-tool-card__chevron--expanded': isExpanded }"
        />
      </button>
    </div>

    <!-- 人机协同审批区域 (HITL: awaiting_approval) -->
    <div v-if="props.toolCall.state === 'awaiting_approval'" class="at-tool-card__approval">
      <slot
        name="approval"
        :call-id="props.toolCall.callId"
        :approve="handleApprove"
        :reject="handleReject"
      >
        <div class="at-tool-card__approval-notice">
          <span>⚠️ 该工具执行涉及敏感操作，需要您进行人工审批授权。</span>
        </div>
        <div class="at-tool-card__approval-form">
          <input
            v-model="rejectionReason"
            type="text"
            class="at-tool-card__reject-input"
            placeholder="输入拒批原因（可选）"
            :disabled="props.disabled"
            @keydown.enter="handleReject"
          />
          <div class="at-tool-card__btn-group">
            <button
              type="button"
              class="at-tool-card__btn at-tool-card__btn--approve"
              :disabled="props.disabled"
              @click="handleApprove"
            >
              允许执行
            </button>
            <button
              type="button"
              class="at-tool-card__btn at-tool-card__btn--reject"
              :disabled="props.disabled"
              @click="handleReject"
            >
              拒绝执行
            </button>
          </div>
        </div>
      </slot>
    </div>

    <!-- 错误异常条目 -->
    <div
      v-if="props.toolCall.state === 'error' && props.toolCall.error"
      class="at-tool-card__alert at-tool-card__alert--error"
    >
      <strong>调用异常：</strong>{{ props.toolCall.error }}
    </div>

    <!-- 拒批理由条目 -->
    <div
      v-if="props.toolCall.state === 'rejected' && props.toolCall.rejectionReason"
      class="at-tool-card__alert at-tool-card__alert--rejected"
    >
      <strong>已驳回：</strong>{{ props.toolCall.rejectionReason }}
    </div>

    <!-- 折叠参数与结果详情面板 -->
    <div v-if="isExpanded" class="at-tool-card__body">
      <!-- 参数 -->
      <div class="at-tool-card__section">
        <div class="at-tool-card__section-label">调用入参：</div>
        <slot name="args" :arguments="props.toolCall.arguments">
          <pre class="at-tool-card__code"><code>{{ formattedArgs }}</code></pre>
        </slot>
      </div>

      <!-- 执行结果 (当成功时展示) -->
      <div
        v-if="props.toolCall.state === 'success' && formattedResult"
        class="at-tool-card__section"
      >
        <div class="at-tool-card__section-label">执行结果：</div>
        <slot name="result" :result="props.toolCall.result">
          <pre class="at-tool-card__code"><code>{{ formattedResult }}</code></pre>
        </slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.at-tool-card {
  margin: 8px 0;
  border-radius: 8px;
  border: 1px solid var(--at-chat-border, #e2e8f0);
  background-color: var(--at-chat-surface, #f8fafc);
  font-family: inherit;
  font-size: 13px;
  color: var(--at-chat-text-primary, #0f172a);
  transition: all 0.2s ease;
  overflow: hidden;
}

.at-tool-card--running {
  border-color: rgba(37, 99, 235, 0.4);
  background-color: rgba(37, 99, 235, 0.03);
}

.at-tool-card--awaiting {
  border-color: rgba(217, 119, 6, 0.6);
  background-color: rgba(254, 243, 199, 0.3);
}

.at-tool-card--success {
  border-color: rgba(16, 185, 129, 0.3);
}

.at-tool-card--error {
  border-color: rgba(239, 68, 68, 0.4);
  background-color: rgba(254, 226, 226, 0.2);
}

.at-tool-card--rejected {
  border-color: rgba(100, 116, 139, 0.4);
  background-color: rgba(241, 245, 249, 0.5);
  opacity: 0.9;
}

.at-tool-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  gap: 8px;
}

.at-tool-card__title-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.at-tool-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--at-chat-text-secondary, #64748b);
  flex-shrink: 0;
}

.at-tool-card--running .at-tool-card__icon {
  color: #2563eb;
}

.at-tool-card--awaiting .at-tool-card__icon {
  color: #d97706;
}

.at-tool-card--success .at-tool-card__icon {
  color: #10b981;
}

.at-tool-card--error .at-tool-card__icon {
  color: #ef4444;
}

.at-tool-card--rejected .at-tool-card__icon {
  color: #64748b;
}

.at-tool-card__name {
  font-weight: 600;
  font-family: monospace;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.at-tool-card__badge {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 10px;
  background-color: var(--at-chat-border, #e2e8f0);
  color: var(--at-chat-text-secondary, #64748b);
  white-space: nowrap;
}

.at-tool-card--running .at-tool-card__badge {
  background-color: rgba(37, 99, 235, 0.15);
  color: #2563eb;
}

.at-tool-card--awaiting .at-tool-card__badge {
  background-color: rgba(217, 119, 6, 0.2);
  color: #b45309;
  font-weight: 500;
}

.at-tool-card--success .at-tool-card__badge {
  background-color: rgba(16, 185, 129, 0.15);
  color: #059669;
}

.at-tool-card--error .at-tool-card__badge {
  background-color: rgba(239, 68, 68, 0.15);
  color: #dc2626;
}

.at-tool-card--rejected .at-tool-card__badge {
  background-color: rgba(100, 116, 139, 0.15);
  color: #475569;
}

.at-tool-card__toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  font-size: 12px;
  color: var(--at-chat-text-secondary, #64748b);
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.at-tool-card__toggle-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: var(--at-chat-text-primary, #0f172a);
}

.at-tool-card__chevron {
  transition: transform 0.2s ease;
}

.at-tool-card__chevron--expanded {
  transform: rotate(180deg);
}

.at-tool-card__approval {
  padding: 10px 12px;
  border-top: 1px dashed rgba(217, 119, 6, 0.4);
  background-color: rgba(254, 243, 199, 0.4);
}

.at-tool-card__approval-notice {
  font-size: 12px;
  color: #b45309;
  margin-bottom: 8px;
}

.at-tool-card__approval-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.at-tool-card__reject-input {
  width: 100%;
  box-sizing: border-box;
  padding: 6px 10px;
  border-radius: 4px;
  border: 1px solid var(--at-chat-border, #cbd5e1);
  background-color: var(--at-chat-bg, #ffffff);
  color: var(--at-chat-text-primary, #0f172a);
  font-size: 12px;
  outline: none;
}

.at-tool-card__reject-input:focus {
  border-color: #2563eb;
}

.at-tool-card__btn-group {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.at-tool-card__btn {
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 4px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}

.at-tool-card__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.at-tool-card__btn--approve {
  background-color: #10b981;
  color: #ffffff;
}

.at-tool-card__btn--approve:hover:not(:disabled) {
  background-color: #059669;
}

.at-tool-card__btn--reject {
  background-color: transparent;
  border-color: var(--at-chat-border, #cbd5e1);
  color: var(--at-chat-text-secondary, #64748b);
}

.at-tool-card__btn--reject:hover:not(:disabled) {
  background-color: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  border-color: #fca5a5;
}

.at-tool-card__alert {
  padding: 6px 12px;
  font-size: 12px;
  border-top: 1px solid var(--at-chat-border, #e2e8f0);
}

.at-tool-card__alert--error {
  color: #dc2626;
  background-color: rgba(254, 226, 226, 0.4);
}

.at-tool-card__alert--rejected {
  color: #64748b;
  background-color: rgba(241, 245, 249, 0.6);
}

.at-tool-card__body {
  padding: 10px 12px;
  border-top: 1px solid var(--at-chat-border, #e2e8f0);
  background-color: var(--at-chat-bg, #ffffff);
}

.at-tool-card__section {
  margin-bottom: 8px;
}

.at-tool-card__section:last-child {
  margin-bottom: 0;
}

.at-tool-card__section-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--at-chat-text-muted, #94a3b8);
  margin-bottom: 4px;
  text-transform: uppercase;
}

.at-tool-card__code {
  margin: 0;
  padding: 8px 10px;
  border-radius: 4px;
  background-color: var(--at-chat-surface, #f8fafc);
  border: 1px solid var(--at-chat-border, #e2e8f0);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.5;
  color: var(--at-chat-text-primary, #0f172a);
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

:global(.at-ai-chat__spin) {
  animation: at-ai-chat-spin 1s linear infinite;
}

@keyframes at-ai-chat-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
