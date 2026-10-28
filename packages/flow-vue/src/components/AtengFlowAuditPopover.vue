<script setup lang="ts">
/**
 * 流程运行态流转追踪器悬停审批审计浮层子组件。
 *
 * 依据 ADR-0033 与工单 #169，呈现节点审批历史、处理人意见与停留耗时，
 * 支持富文本节点标题防御性解构与默认高颜值气泡卡片。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { computed } from 'vue';
import type { FlowNode, ExecutionStatus, AuditRecord } from '../types';
import { STATUS_TEXT_MAP, STATUS_BADGE_CLASS_MAP } from '../types';

defineOptions({
  name: 'AtengFlowAuditPopover',
});

interface Props {
  /** 是否展示浮层 */
  visible: boolean;
  /** 悬停的流程节点实体 */
  node: FlowNode | null;
  /** 当前执行状态 */
  status?: ExecutionStatus;
  /** 审计记录清单 */
  auditList?: AuditRecord[];
  /** X 轴绝对像素偏移 */
  x: number;
  /** Y 轴绝对像素偏移 */
  y: number;
}

const props = withDefaults(defineProps<Props>(), {
  status: undefined,
  auditList: () => [],
});

const emit = defineEmits<{
  (e: 'mouseenter'): void;
  (e: 'mouseleave'): void;
  (e: 'close'): void;
}>();

/**
 * 防御性解构提取节点标题（规避 LogicFlow 文本对象导致的 [object Object] 渲染缺陷）。
 */
const displayTitle = computed<string>(() => {
  if (!props.node) return '';
  const text = props.node.text;
  if (typeof text === 'string') return text;
  if (typeof text === 'object' && text !== null && 'value' in text) {
    return String(text.value ?? '');
  }
  return props.node.id ?? '';
});

/**
 * 格式化状态文案。
 */
const formatStatusText = (status?: ExecutionStatus): string => {
  return status ? (STATUS_TEXT_MAP[status] ?? '待处理') : '待处理';
};

/**
 * 获取状态徽标样式类名。
 */
const getStatusBadgeClass = (status?: ExecutionStatus): string => {
  return status ? (STATUS_BADGE_CLASS_MAP[status] ?? '') : '';
};
</script>

<template>
  <Transition name="at-flow-popover">
    <div
      v-if="visible && node"
      class="at-flow-audit-popover"
      :style="{ left: `${x}px`, top: `${y}px` }"
      @mouseenter="emit('mouseenter')"
      @mouseleave="emit('mouseleave')"
    >
      <slot :node="node" :status="status" :audit-list="auditList" :close="() => emit('close')">
        <!-- 默认高颜值审批审计记录卡片 -->
        <div class="at-flow-audit-card">
          <div class="at-flow-audit-card__header">
            <div class="at-flow-audit-card__title">{{ displayTitle }}</div>
            <span v-if="status" class="at-flow-audit-badge" :class="getStatusBadgeClass(status)">
              {{ formatStatusText(status) }}
            </span>
          </div>

          <!-- 审计历史列表 -->
          <div v-if="auditList && auditList.length > 0" class="at-flow-audit-card__list">
            <div
              v-for="(audit, idx) in auditList"
              :key="audit.id || idx"
              class="at-flow-audit-item"
            >
              <div class="at-flow-audit-item__top">
                <span class="at-flow-audit-item__operator">
                  <span class="at-flow-audit-avatar">{{
                    audit.avatar || audit.operator.slice(0, 1)
                  }}</span>
                  {{ audit.operator }}
                </span>
                <span v-if="audit.time" class="at-flow-audit-item__time">{{ audit.time }}</span>
              </div>
              <div v-if="audit.comment" class="at-flow-audit-item__comment">
                “{{ audit.comment }}”
              </div>
              <div v-if="audit.duration" class="at-flow-audit-item__duration">
                停留耗时: {{ audit.duration }}
              </div>
            </div>
          </div>

          <div v-else class="at-flow-audit-card__empty">暂无历史审批意见记录</div>
        </div>
      </slot>
    </div>
  </Transition>
</template>

<style scoped>
/* 悬停审计浮层 */
.at-flow-audit-popover {
  position: absolute;
  z-index: 90;
  pointer-events: auto;
  filter: drop-shadow(0 10px 15px rgba(0, 0, 0, 0.1)) drop-shadow(0 4px 6px rgba(0, 0, 0, 0.05));
}

.at-flow-audit-card {
  width: 270px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  font-size: 13px;
  color: #1e293b;
}

.at-flow-audit-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: #f8fafc;
  border-bottom: 1px solid #f1f5f9;
}

.at-flow-audit-card__title {
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 170px;
}

.at-flow-audit-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
}

.at-flow-audit-badge--completed {
  background: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
}

.at-flow-audit-badge--processing {
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
}

.at-flow-audit-badge--rejected {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.at-flow-audit-badge--pending {
  background: #f8fafc;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.at-flow-audit-badge--terminated {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
}

.at-flow-audit-card__list {
  max-height: 220px;
  overflow-y: auto;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.at-flow-audit-item {
  border-bottom: 1px dashed #f1f5f9;
  padding-bottom: 8px;
}

.at-flow-audit-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.at-flow-audit-item__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.at-flow-audit-item__operator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  color: #334155;
}

.at-flow-audit-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #3b82f6;
  color: #ffffff;
  font-size: 11px;
}

.at-flow-audit-item__time {
  font-size: 11px;
  color: #94a3b8;
}

.at-flow-audit-item__comment {
  font-size: 12px;
  color: #475569;
  background: #f8fafc;
  padding: 4px 8px;
  border-radius: 4px;
  margin-top: 4px;
  line-height: 1.4;
}

.at-flow-audit-item__duration {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 4px;
}

.at-flow-audit-card__empty {
  padding: 16px 12px;
  text-align: center;
  color: #94a3b8;
  font-size: 12px;
}

/* 浮层淡入淡出动效 */
.at-flow-popover-enter-active,
.at-flow-popover-leave-active {
  transition:
    opacity 0.18s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

.at-flow-popover-enter-from,
.at-flow-popover-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
