<script setup lang="ts">
/**
 * AtengFormCanvasItem 画布控件单元递归渲染组件。
 *
 * 遵循 ADR-0044 规约与容器二分法：
 * 1. 负责单个控件在设计态的高亮聚焦框、拖拽锚点与操作按钮浮标；
 * 2. 区分 LayoutContainer (Grid / Card) 与 DataContainer (SubForm) 容器边界；
 * 3. 递归管理嵌套容器的内部 SortableJS 放置区与生命周期销毁。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref, computed, onMounted, onUnmounted } from 'vue';
import Sortable from 'sortablejs';
import type { FormWidget, DropValidationResult } from '../types';
import AtengFormCanvasLeaf from './AtengFormCanvasLeaf.vue';

defineOptions({
  name: 'AtengFormCanvasItem',
});

interface Props {
  widget: FormWidget;
  activeWidgetId?: string | null;
  parentId?: string | null;
  colon?: boolean;
  validateDrop: (
    source: { id?: string; type: string; isContainer?: boolean; isCollection?: boolean },
    targetParentId: string | null,
  ) => DropValidationResult;
}

const props = withDefaults(defineProps<Props>(), {
  activeWidgetId: null,
  parentId: null,
  colon: true,
});

const emit = defineEmits<{
  select: [id: string];
  'select-parent': [];
  remove: [id: string];
  copy: [id: string];
  'add-widget': [type: string, targetParentId: string | null, index?: number];
  'move-widget': [id: string, targetParentId: string | null, index: number];
  'sort-widget': [parentId: string | null, oldIndex: number, newIndex: number];
}>();

const isActive = computed(() => props.activeWidgetId === props.widget.id);
const isContainer = computed(() =>
  Boolean(
    props.widget.isContainer ||
    props.widget.isCollection ||
    props.widget.type === 'grid' ||
    props.widget.type === 'card' ||
    props.widget.type === 'subform',
  ),
);
const isGrid = computed(() => props.widget.type === 'grid');
const isCard = computed(() => props.widget.type === 'card');
const isSubForm = computed(() => props.widget.type === 'subform' || props.widget.isCollection);

// 嵌套容器 Sortable 挂载与销毁
const dropzoneRef = ref<HTMLElement | null>(null);
let sortableInstance: Sortable | null = null;

onMounted(() => {
  if (isContainer.value && dropzoneRef.value) {
    try {
      sortableInstance = new Sortable(dropzoneRef.value, {
        group: 'at-form-widgets',
        animation: 180,
        handle: '.at-canvas-drag-handle',
        ghostClass: 'at-canvas-ghost',
        chosenClass: 'at-canvas-chosen',
        dragClass: 'at-canvas-drag',
        fallbackOnBody: true,
        onMove(evt) {
          const draggedEl = evt.dragged;
          const widgetType = draggedEl.getAttribute('data-widget-type') || 'unknown';
          const widgetId = draggedEl.getAttribute('data-widget-id') || undefined;

          const validation = props.validateDrop(
            { id: widgetId, type: widgetType },
            props.widget.id,
          );
          return validation.allowed;
        },
        onAdd(evt) {
          const itemEl = evt.item;
          const widgetType = itemEl.getAttribute('data-widget-type');
          const widgetId = itemEl.getAttribute('data-widget-id');

          if (itemEl.parentNode) {
            itemEl.parentNode.removeChild(itemEl);
          }

          if (widgetType && !widgetId) {
            emit('add-widget', widgetType, props.widget.id, evt.newIndex);
          } else if (widgetId) {
            emit('move-widget', widgetId, props.widget.id, evt.newIndex ?? 0);
          }
        },
        onUpdate(evt) {
          if (typeof evt.oldIndex === 'number' && typeof evt.newIndex === 'number') {
            emit('sort-widget', props.widget.id, evt.oldIndex, evt.newIndex);
          }
        },
      });
    } catch {
      // 容灾捕获
    }
  }
});

onUnmounted(() => {
  if (sortableInstance) {
    try {
      sortableInstance.destroy();
    } catch {
      // ignore
    }
    sortableInstance = null;
  }
});

const handleSelect = (evt: MouseEvent): void => {
  evt.stopPropagation();
  emit('select', props.widget.id);
};

const handleSelectParent = (evt: MouseEvent): void => {
  evt.stopPropagation();
  emit('select-parent');
};

const handleCopy = (evt: MouseEvent): void => {
  evt.stopPropagation();
  emit('copy', props.widget.id);
};

const handleRemove = (evt: MouseEvent): void => {
  evt.stopPropagation();
  emit('remove', props.widget.id);
};
</script>

<template>
  <div
    class="at-canvas-widget"
    :class="{
      'is-active': isActive,
      'is-container': isContainer,
      'is-grid': isGrid,
      'is-card': isCard,
      'is-subform': isSubForm,
    }"
    :data-widget-id="widget.id"
    :data-widget-type="widget.type"
    @click="handleSelect"
  >
    <!-- 激活高亮边框上的操作浮标栏 -->
    <div v-if="isActive" class="at-canvas-widget__toolbar">
      <span class="at-canvas-drag-handle" title="按住拖拽排序">⋮⋮</span>
      <span class="at-canvas-widget__type-tag">{{ widget.type }}</span>
      <button
        v-if="parentId"
        type="button"
        class="at-canvas-widget__action-btn"
        title="选择上层父容器"
        @click="handleSelectParent"
      >
        ↑ 父级
      </button>
      <button
        type="button"
        class="at-canvas-widget__action-btn"
        title="复制控件"
        @click="handleCopy"
      >
        📋 复制
      </button>
      <button
        type="button"
        class="at-canvas-widget__action-btn is-danger"
        title="删除控件"
        @click="handleRemove"
      >
        🗑️ 删除
      </button>
    </div>

    <!-- 1. 栅格布局容器 (Grid) -->
    <div v-if="isGrid" class="at-canvas-grid">
      <div class="at-canvas-grid__header">
        <span class="at-canvas-grid__title">栅格布局 (Grid: {{ widget.props?.cols || 2 }} 列)</span>
      </div>
      <div
        ref="dropzoneRef"
        class="at-canvas-dropzone at-canvas-grid__body"
        :style="{
          display: 'grid',
          gridTemplateColumns: `repeat(${widget.props?.cols || 2}, 1fr)`,
          gap: `${widget.props?.gutter || 16}px`,
        }"
        :data-parent-id="widget.id"
      >
        <AtengFormCanvasItem
          v-for="child in widget.children"
          :key="child.id"
          :widget="child"
          :active-widget-id="activeWidgetId"
          :parent-id="widget.id"
          :colon="colon"
          :validate-drop="validateDrop"
          @select="emit('select', $event)"
          @select-parent="emit('select', widget.id)"
          @remove="emit('remove', $event)"
          @copy="emit('copy', $event)"
          @add-widget="(t, p, idx) => emit('add-widget', t, p, idx)"
          @move-widget="(id, p, idx) => emit('move-widget', id, p, idx)"
          @sort-widget="(p, o, n) => emit('sort-widget', p, o, n)"
        />
        <div v-if="!widget.children || widget.children.length === 0" class="at-canvas-empty-slot">
          <span>拖拽控件至栅格容器</span>
        </div>
      </div>
    </div>

    <!-- 2. 卡片分组容器 (Card) -->
    <div v-else-if="isCard" class="at-canvas-card">
      <div class="at-canvas-card__header">
        <span class="at-canvas-card__title">{{ widget.props?.title || '卡片分组' }}</span>
      </div>
      <div
        ref="dropzoneRef"
        class="at-canvas-dropzone at-canvas-card__body"
        :data-parent-id="widget.id"
      >
        <AtengFormCanvasItem
          v-for="child in widget.children"
          :key="child.id"
          :widget="child"
          :active-widget-id="activeWidgetId"
          :parent-id="widget.id"
          :colon="colon"
          :validate-drop="validateDrop"
          @select="emit('select', $event)"
          @select-parent="emit('select', widget.id)"
          @remove="emit('remove', $event)"
          @copy="emit('copy', $event)"
          @add-widget="(t, p, idx) => emit('add-widget', t, p, idx)"
          @move-widget="(id, p, idx) => emit('move-widget', id, p, idx)"
          @sort-widget="(p, o, n) => emit('sort-widget', p, o, n)"
        />
        <div v-if="!widget.children || widget.children.length === 0" class="at-canvas-empty-slot">
          <span>拖拽控件至卡片容器</span>
        </div>
      </div>
    </div>

    <!-- 3. 明细子表单容器 (SubForm) -->
    <div v-else-if="isSubForm" class="at-canvas-subform">
      <div class="at-canvas-subform__header">
        <span class="at-canvas-subform__title">
          📋 {{ widget.label || '明细子表单' }} (modelKey: {{ widget.modelKey || 'items' }})
        </span>
        <span class="at-canvas-subform__badge">DataContainer</span>
      </div>
      <div
        ref="dropzoneRef"
        class="at-canvas-dropzone at-canvas-subform__body"
        :data-parent-id="widget.id"
      >
        <AtengFormCanvasItem
          v-for="child in widget.children"
          :key="child.id"
          :widget="child"
          :active-widget-id="activeWidgetId"
          :parent-id="widget.id"
          :colon="colon"
          :validate-drop="validateDrop"
          @select="emit('select', $event)"
          @select-parent="emit('select', widget.id)"
          @remove="emit('remove', $event)"
          @copy="emit('copy', $event)"
          @add-widget="(t, p, idx) => emit('add-widget', t, p, idx)"
          @move-widget="(id, p, idx) => emit('move-widget', id, p, idx)"
          @sort-widget="(p, o, n) => emit('sort-widget', p, o, n)"
        />
        <div v-if="!widget.children || widget.children.length === 0" class="at-canvas-empty-slot">
          <span>拖拽列字段至子表单（禁止嵌套子表单）</span>
        </div>
      </div>
    </div>

    <!-- 4. 普通叶子输入控件展示桩 -->
    <AtengFormCanvasLeaf v-else :widget="widget" :colon="colon" />
  </div>
</template>

<style scoped>
.at-canvas-widget {
  position: relative;
  margin-bottom: 10px;
  border: 1px dashed var(--el-border-color, #dcdfe6);
  border-radius: 4px;
  background: var(--el-bg-color, #ffffff);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
  cursor: pointer;
}

.at-canvas-widget:hover {
  border-color: var(--el-color-primary-light-5, #a0cfff);
}

.at-canvas-widget.is-active {
  border: 2px solid var(--el-color-primary, #409eff);
  box-shadow: 0 0 0 2px var(--el-color-primary-light-8, #d9ecff);
  z-index: 2;
}

.at-canvas-widget__toolbar {
  position: absolute;
  top: -26px;
  right: -2px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--el-color-primary, #409eff);
  color: #ffffff;
  padding: 2px 6px;
  border-radius: 4px 4px 0 0;
  font-size: 11px;
  z-index: 10;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.at-canvas-drag-handle {
  cursor: grab;
  font-weight: bold;
  padding: 0 2px;
}

.at-canvas-widget__type-tag {
  background: rgba(255, 255, 255, 0.2);
  padding: 1px 4px;
  border-radius: 2px;
  font-family: monospace;
}

.at-canvas-widget__action-btn {
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 2px;
  font-size: 11px;
  line-height: 1;
}

.at-canvas-widget__action-btn:hover {
  background: rgba(255, 255, 255, 0.4);
}

.at-canvas-widget__action-btn.is-danger:hover {
  background: var(--el-color-danger, #f56c6c);
}

.at-canvas-grid,
.at-canvas-card,
.at-canvas-subform {
  padding: 12px;
}

.at-canvas-grid__header,
.at-canvas-card__header {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary, #909399);
  margin-bottom: 8px;
}

.at-canvas-subform {
  background-color: var(--el-fill-color-light, #fafafa);
}

.at-canvas-subform__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.at-canvas-subform__title {
  font-size: 13px;
  font-weight: 600;
  color: #52c41a;
}

.at-canvas-subform__badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  color: #52c41a;
}

.at-canvas-dropzone {
  min-height: 52px;
  padding: 6px;
  background: var(--el-fill-color-blank, #ffffff);
  border: 1px dashed var(--el-border-color-lighter, #e4e7ed);
  border-radius: 4px;
}

.at-canvas-empty-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  color: var(--el-text-color-placeholder, #c0c4cc);
  font-size: 12px;
}

.at-canvas-ghost {
  opacity: 0.35;
  background: var(--el-color-primary-light-9, #ecf5ff) !important;
  border: 2px dashed var(--el-color-primary, #409eff) !important;
}

.at-canvas-chosen {
  background: var(--el-color-primary-light-9, #ecf5ff);
}
</style>
