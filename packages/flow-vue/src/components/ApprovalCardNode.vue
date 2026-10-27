<script setup lang="ts">
/**
 * ApprovalCardNode 预设高颜值审批卡片 Vue SFC 节点。
 *
 * 依据 ADR-0033 与工单 #168，作为 VueNodeRegistry 的标准化开箱即用卡片图元：
 * 1. 呈现头像徽标、节点名称、类型胶囊、审批人/候选角色与办理进度条；
 * 2. 具备四态胶囊指示（pending/processing/approved/rejected）；
 * 3. 内部快捷动作（快速通过/驳回）实时调用 updateProperty 回写数据模型；
 * 4. 独立命名空间 .at-flow-approval-card 与 <style scoped>，零外部 UI 强依赖。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { computed } from 'vue';
import type { ApprovalCardNodeProps } from '../types';

defineOptions({
  name: 'ApprovalCardNode',
});

const props = withDefaults(defineProps<ApprovalCardNodeProps>(), {
  lf: undefined,
  model: undefined,
  graph: undefined,
  updateProperty: undefined,
  updateProperties: undefined,
  disabled: false,
});

// 提取节点属性与安全保底
const properties = computed<Record<string, unknown>>(() => props.node.properties ?? {});

const title = computed<string>(() => {
  if (typeof props.node.text === 'string' && props.node.text.trim()) {
    return props.node.text;
  }
  return String(properties.value.name || '审批任务');
});

const assignee = computed<string>(() => {
  return String(properties.value.assignee || properties.value.candidateUsers || '待分配办理人');
});

const status = computed<string>(() => {
  return String(properties.value.status || properties.value.executionStatus || 'pending');
});

const progress = computed<number>(() => {
  const p = Number(properties.value.progress ?? 0);
  return Math.min(100, Math.max(0, Number.isFinite(p) ? p : 0));
});

const statusLabel = computed<string>(() => {
  switch (status.value) {
    case 'approved':
    case 'completed':
      return '已通过';
    case 'rejected':
      return '已驳回';
    case 'processing':
      return '审批中';
    case 'terminated':
      return '已终止';
    case 'pending':
    default:
      return '待处理';
  }
});

const statusClass = computed<string>(() => {
  switch (status.value) {
    case 'approved':
    case 'completed':
      return 'at-flow-card__badge--success';
    case 'rejected':
      return 'at-flow-card__badge--danger';
    case 'processing':
      return 'at-flow-card__badge--primary';
    case 'terminated':
      return 'at-flow-card__badge--muted';
    case 'pending':
    default:
      return 'at-flow-card__badge--warning';
  }
});

const handleQuickApprove = (e: MouseEvent) => {
  e.stopPropagation();
  if (props.disabled) return;
  props.updateProperties?.({
    status: 'approved',
    progress: 100,
    approveTime: new Date().toISOString(),
  });
};

const handleQuickReject = (e: MouseEvent) => {
  e.stopPropagation();
  if (props.disabled) return;
  props.updateProperties?.({
    status: 'rejected',
    progress: 100,
    rejectTime: new Date().toISOString(),
  });
};
</script>

<template>
  <div class="at-flow-approval-card" :class="{ 'is-disabled': disabled }">
    <!-- 卡片顶部标题栏 -->
    <div class="at-flow-card__header">
      <div class="at-flow-card__avatar">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path
            d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
          />
        </svg>
      </div>
      <span class="at-flow-card__title" :title="title">{{ title }}</span>
      <span class="at-flow-card__badge" :class="statusClass">{{ statusLabel }}</span>
    </div>

    <!-- 卡片主体内容 -->
    <div class="at-flow-card__body">
      <div class="at-flow-card__meta">
        <span class="at-flow-card__meta-label">审批人:</span>
        <span class="at-flow-card__meta-value" :title="assignee">{{ assignee }}</span>
      </div>

      <!-- 进度指示条 -->
      <div v-if="progress > 0" class="at-flow-card__progress">
        <div class="at-flow-card__progress-bar" :style="{ width: `${progress}%` }"></div>
      </div>
    </div>

    <!-- 底部快捷操作条（仅在未禁用时展示） -->
    <div v-if="!disabled" class="at-flow-card__footer" @mousedown.stop>
      <button
        class="at-flow-card__btn at-flow-card__btn--approve"
        title="标记通过"
        @click="handleQuickApprove"
      >
        ✓ 通过
      </button>
      <button
        class="at-flow-card__btn at-flow-card__btn--reject"
        title="快速驳回"
        @click="handleQuickReject"
      >
        ✕ 驳回
      </button>
    </div>
  </div>
</template>

<style scoped>
.at-flow-approval-card {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 10px 12px;
  background-color: var(--at-flow-card-bg, #ffffff);
  border: 1px solid var(--at-flow-card-border, #e2e8f0);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  transition: all 0.2s ease-in-out;
  cursor: grab;
  user-select: none;
}

.at-flow-approval-card:hover {
  border-color: var(--at-flow-card-hover-border, #3b82f6);
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.15);
  transform: translateY(-1px);
}

.at-flow-approval-card.is-disabled {
  cursor: default;
  background-color: #f8fafc;
}

.at-flow-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.at-flow-card__avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background-color: #eff6ff;
  color: #3b82f6;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.at-flow-card__title {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.at-flow-card__badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 500;
  white-space: nowrap;
}

.at-flow-card__badge--warning {
  background-color: #fef3c7;
  color: #d97706;
}

.at-flow-card__badge--primary {
  background-color: #eff6ff;
  color: #2563eb;
}

.at-flow-card__badge--success {
  background-color: #dcfce7;
  color: #16a34a;
}

.at-flow-card__badge--danger {
  background-color: #fee2e2;
  color: #dc2626;
}

.at-flow-card__badge--muted {
  background-color: #f1f5f9;
  color: #64748b;
}

.at-flow-card__body {
  margin: 6px 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.at-flow-card__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}

.at-flow-card__meta-label {
  color: #64748b;
}

.at-flow-card__meta-value {
  color: #334155;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.at-flow-card__progress {
  width: 100%;
  height: 4px;
  background-color: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
  margin-top: 2px;
}

.at-flow-card__progress-bar {
  height: 100%;
  background-color: #3b82f6;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.at-flow-card__footer {
  display: flex;
  align-items: center;
  gap: 6px;
  border-top: 1px dashed #f1f5f9;
  padding-top: 6px;
}

.at-flow-card__btn {
  flex: 1;
  padding: 3px 0;
  font-size: 10px;
  border-radius: 4px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background-color 0.15s;
  background-color: #f8fafc;
  color: #475569;
}

.at-flow-card__btn--approve:hover {
  background-color: #dcfce7;
  color: #15803d;
  border-color: #bbf7d0;
}

.at-flow-card__btn--reject:hover {
  background-color: #fee2e2;
  color: #b91c1c;
  border-color: #fecaca;
}
</style>
