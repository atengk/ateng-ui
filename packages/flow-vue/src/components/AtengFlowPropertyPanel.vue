<script setup lang="ts">
/**
 * AtengFlowPropertyPanel 流程元素属性配置抽屉/面板。
 *
 * 为画布选中的节点或连线提供基础元数据、流转条件表达式与审批人配置表单，
 * 支持通过纯原生无依赖方式安全回写业务属性。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { computed } from 'vue';
import { NODE_TYPE_LABEL_MAP } from '../presets';
import type {
  AtengFlowPropertyPanelProps,
  AtengFlowPropertyPanelEmits,
  AtengFlowPropertyPanelSlots,
  AtengFlowPropertyPanelExpose,
} from '../types';

defineOptions({
  name: 'AtengFlowPropertyPanel',
});

const props = withDefaults(defineProps<AtengFlowPropertyPanelProps>(), {
  element: null,
  disabled: false,
  title: undefined,
  width: '320px',
});

const emit = defineEmits<AtengFlowPropertyPanelEmits>();
defineSlots<AtengFlowPropertyPanelSlots>();

const panelTitle = computed(() => {
  if (props.title) return props.title;
  if (!props.element) return '属性配置';
  if (props.element.elementType === 'node') {
    return '节点属性';
  }
  return '连线属性';
});

const EDGE_TYPE_LABEL_MAP: Record<string, string> = {
  polyline: '正交平滑折线',
  line: '直线',
  bezier: '贝塞尔曲线',
};

const typeLabel = computed(() => {
  if (!props.element) return '';
  return (
    NODE_TYPE_LABEL_MAP[props.element.type] ||
    EDGE_TYPE_LABEL_MAP[props.element.type] ||
    props.element.type
  );
});

const isTaskNode = computed(() => {
  if (!props.element || props.element.elementType !== 'node') return false;
  return props.element.type === 'user-task' || props.element.type.includes('task');
});

const isEdge = computed(() => {
  if (!props.element) return false;
  return props.element.elementType === 'edge';
});

const handlePropertyInput = (key: string, e: Event) => {
  const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  emit('update:property', key, target.value);
};

const handleClose = () => {
  emit('close');
};

defineExpose<AtengFlowPropertyPanelExpose>({
  getElement: () => props.element,
});
</script>

<template>
  <div v-if="element" class="at-flow-property-panel">
    <!-- 面板顶部标题栏 -->
    <slot name="header" :element="element" :close="handleClose">
      <header class="at-flow-property-panel__header">
        <div class="at-flow-property-panel__title-wrap">
          <span class="at-flow-property-panel__title">{{ panelTitle }}</span>
          <span class="at-flow-property-panel__badge" :class="`is-${element.elementType}`">
            {{ typeLabel }}
          </span>
        </div>
        <button
          type="button"
          class="at-flow-property-panel__close"
          title="关闭属性面板"
          aria-label="关闭"
          @click="handleClose"
        >
          &times;
        </button>
      </header>
    </slot>

    <!-- 面板表单内容体 -->
    <div class="at-flow-property-panel__body">
      <!-- 基础信息 -->
      <section class="at-flow-property-panel__section">
        <h4 class="at-flow-property-panel__section-title">基础属性</h4>
        <div class="at-flow-property-panel__item">
          <label class="at-flow-property-panel__label">元素 ID</label>
          <input
            type="text"
            class="at-flow-property-panel__input is-readonly"
            :value="element.id"
            readonly
            title="元素全局唯一标识（只读）"
          />
        </div>

        <div class="at-flow-property-panel__item">
          <label class="at-flow-property-panel__label">显示名称</label>
          <input
            type="text"
            class="at-flow-property-panel__input"
            :value="element.name"
            :disabled="disabled"
            placeholder="请输入节点或连线名称"
            @input="handlePropertyInput('name', $event)"
          />
        </div>

        <div class="at-flow-property-panel__item">
          <label class="at-flow-property-panel__label">备注说明</label>
          <textarea
            class="at-flow-property-panel__textarea"
            :value="(element.properties.description as string) || ''"
            :disabled="disabled"
            rows="3"
            placeholder="添加业务备注或处理规则说明"
            @input="handlePropertyInput('description', $event)"
          />
        </div>
      </section>

      <!-- 连线专属条件配置 -->
      <section v-if="isEdge" class="at-flow-property-panel__section">
        <h4 class="at-flow-property-panel__section-title">流转条件</h4>
        <div class="at-flow-property-panel__item">
          <label class="at-flow-property-panel__label">条件表达式</label>
          <input
            type="text"
            class="at-flow-property-panel__input"
            :value="(element.properties.condition as string) || ''"
            :disabled="disabled"
            placeholder="例如: ${days > 3} 或 status == 'OK'"
            @input="handlePropertyInput('condition', $event)"
          />
          <span class="at-flow-property-panel__hint">
            当来自排他网关时，满足此表达式的分支将被优先流转。
          </span>
        </div>
      </section>

      <!-- 审批任务专属配置 -->
      <section v-if="isTaskNode" class="at-flow-property-panel__section">
        <h4 class="at-flow-property-panel__section-title">审批配置</h4>
        <div class="at-flow-property-panel__item">
          <label class="at-flow-property-panel__label">审批人 / 角色</label>
          <input
            type="text"
            class="at-flow-property-panel__input"
            :value="(element.properties.assignee as string) || ''"
            :disabled="disabled"
            placeholder="如: admin, ${initiator}, role:manager"
            @input="handlePropertyInput('assignee', $event)"
          />
        </div>

        <div class="at-flow-property-panel__item">
          <label class="at-flow-property-panel__label">审批模式</label>
          <select
            class="at-flow-property-panel__select"
            :value="(element.properties.approvalMode as string) || 'single'"
            :disabled="disabled"
            @change="handlePropertyInput('approvalMode', $event)"
          >
            <option value="single">单人办理 / 或签（一人通过即可）</option>
            <option value="countersign">会签（所有审批人必须全员通过）</option>
          </select>
        </div>
      </section>

      <!-- 额外插槽 -->
      <slot name="extra" :element="element" />
    </div>

    <!-- 面板底部状态栏 -->
    <slot name="footer" :element="element" :close="handleClose">
      <footer class="at-flow-property-panel__footer">
        <span class="at-flow-property-panel__status">已实时自动同步</span>
        <button type="button" class="at-flow-property-panel__btn" @click="handleClose">完成</button>
      </footer>
    </slot>
  </div>
</template>

<style scoped>
.at-flow-property-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  background-color: var(--at-flow-bg, #ffffff);
  border-left: 1px solid var(--at-flow-border, #e2e8f0);
  font-family: var(
    --at-flow-font-family,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    sans-serif
  );
  color: var(--at-flow-text, #1e293b);
  overflow: hidden;
}

.at-flow-property-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--at-flow-border, #e2e8f0);
  background-color: #fafbfc;
}

.at-flow-property-panel__title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

.at-flow-property-panel__title {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.at-flow-property-panel__badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: #f1f5f9;
  color: #475569;
  white-space: nowrap;
}

.at-flow-property-panel__badge.is-node {
  background-color: #eff6ff;
  color: #2563eb;
}

.at-flow-property-panel__badge.is-edge {
  background-color: #f0fdf4;
  color: #16a34a;
}

.at-flow-property-panel__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 18px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.at-flow-property-panel__close:hover {
  background-color: #e2e8f0;
  color: #0f172a;
}

.at-flow-property-panel__body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.at-flow-property-panel__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.at-flow-property-panel__section-title {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.at-flow-property-panel__item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.at-flow-property-panel__label {
  font-size: 13px;
  font-weight: 500;
  color: #334155;
}

.at-flow-property-panel__input,
.at-flow-property-panel__select,
.at-flow-property-panel__textarea {
  box-sizing: border-box;
  width: 100%;
  padding: 8px 10px;
  font-size: 13px;
  border: 1px solid var(--at-flow-border, #cbd5e1);
  border-radius: 6px;
  background-color: #ffffff;
  color: #0f172a;
  outline: none;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.at-flow-property-panel__input:focus,
.at-flow-property-panel__select:focus,
.at-flow-property-panel__textarea:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
}

.at-flow-property-panel__input.is-readonly {
  background-color: #f8fafc;
  color: #64748b;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  cursor: default;
}

.at-flow-property-panel__textarea {
  resize: vertical;
  min-height: 60px;
}

.at-flow-property-panel__hint {
  font-size: 11px;
  color: #94a3b8;
  line-height: 1.4;
}

.at-flow-property-panel__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-top: 1px solid var(--at-flow-border, #e2e8f0);
  background-color: #fafbfc;
}

.at-flow-property-panel__status {
  font-size: 12px;
  color: #10b981;
}

.at-flow-property-panel__btn {
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 500;
  color: #ffffff;
  background-color: #3b82f6;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.at-flow-property-panel__btn:hover {
  background-color: #2563eb;
}
</style>
