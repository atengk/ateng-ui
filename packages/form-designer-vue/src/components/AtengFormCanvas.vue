<script setup lang="ts">
/**
 * AtengFormCanvas 中央拖拽画板组件。
 *
 * 遵循 ADR-0044 规约：
 * 1. 负责多端视口仿真（PC 100%、Pad 768px、Mobile 375px 真实手机壳仿真）；
 * 2. 挂载根级 SortableJS 拖拽放置与吸附排序；
 * 3. 递归渲染整棵表单 AST 控件树，协调活动控件选中态与类型守卫拦截。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref, onMounted, onUnmounted } from 'vue';
import Sortable from 'sortablejs';
import type { FormSchema, ViewportType, DropValidationResult } from '../types';
import AtengFormCanvasItem from './AtengFormCanvasItem.vue';

interface Props {
  /** 表单三段式 AST Schema 结构 */
  schema: FormSchema;
  /** 当前活动选中控件的唯一标识 */
  activeWidgetId?: string | null;
  /** 画板视口类型 */
  viewport?: ViewportType;
  /** 拖拽守卫校验函数 */
  validateDrop: (
    source: { id?: string; type: string; isContainer?: boolean; isCollection?: boolean },
    targetParentId: string | null,
  ) => DropValidationResult;
}

const props = withDefaults(defineProps<Props>(), {
  activeWidgetId: null,
  viewport: 'pc',
});

const emit = defineEmits<{
  'select-widget': [id: string | null];
  'select-parent': [];
  'add-widget': [type: string, targetParentId: string | null, index?: number];
  'remove-widget': [id: string];
  'copy-widget': [id: string];
  'move-widget': [id: string, targetParentId: string | null, index: number];
  'sort-widget': [parentId: string | null, oldIndex: number, newIndex: number];
}>();

const rootDropzoneRef = ref<HTMLElement | null>(null);
let rootSortable: Sortable | null = null;

onMounted(() => {
  if (rootDropzoneRef.value) {
    try {
      rootSortable = new Sortable(rootDropzoneRef.value, {
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

          // 根节点永远允许
          const validation = props.validateDrop({ id: widgetId, type: widgetType }, null);
          return validation.allowed;
        },
        onAdd(evt) {
          const itemEl = evt.item;
          const widgetType = itemEl.getAttribute('data-widget-type');
          const widgetId = itemEl.getAttribute('data-widget-id');

          // 从 DOM 中移出该克隆节点，由 Vue 响应式驱动真实 DOM 渲染
          if (itemEl.parentNode) {
            itemEl.parentNode.removeChild(itemEl);
          }

          if (widgetType && !widgetId) {
            emit('add-widget', widgetType, null, evt.newIndex);
          } else if (widgetId) {
            emit('move-widget', widgetId, null, evt.newIndex ?? 0);
          }
        },
        onUpdate(evt) {
          if (typeof evt.oldIndex === 'number' && typeof evt.newIndex === 'number') {
            emit('sort-widget', null, evt.oldIndex, evt.newIndex);
          }
        },
      });
    } catch {
      // 容灾捕获
    }
  }
});

onUnmounted(() => {
  if (rootSortable) {
    try {
      rootSortable.destroy();
    } catch {
      // ignore
    }
    rootSortable = null;
  }
});

const handleCanvasClick = (evt: MouseEvent): void => {
  // 点击空白区域时取消选中
  if (evt.target === evt.currentTarget) {
    emit('select-widget', null);
  }
};
</script>

<template>
  <div class="at-form-canvas" :class="[`is-${viewport}`]" @click="handleCanvasClick">
    <!-- 仿真视口容器外壳 -->
    <div
      class="at-form-canvas__viewport-frame"
      :class="[`is-${viewport}`]"
      @click="handleCanvasClick"
    >
      <!-- 移动端手机仿真听筒/前置相机刘海条 -->
      <div v-if="viewport === 'mobile'" class="at-form-canvas__mobile-notch">
        <span class="at-form-canvas__mobile-camera" />
        <span class="at-form-canvas__mobile-speaker" />
      </div>

      <!-- 表单画板主体卡片 -->
      <div class="at-form-canvas__body">
        <div
          ref="rootDropzoneRef"
          class="at-canvas-root-dropzone"
          :class="{ 'is-empty': schema.widgetList.length === 0 }"
        >
          <AtengFormCanvasItem
            v-for="widget in schema.widgetList"
            :key="widget.id"
            :widget="widget"
            :active-widget-id="activeWidgetId"
            :colon="schema.formConfig?.colon !== false"
            :validate-drop="validateDrop"
            @select="emit('select-widget', $event)"
            @select-parent="emit('select-parent')"
            @remove="emit('remove-widget', $event)"
            @copy="emit('copy-widget', $event)"
            @add-widget="(t, p, idx) => emit('add-widget', t, p, idx)"
            @move-widget="(id, p, idx) => emit('move-widget', id, p, idx)"
            @sort-widget="(p, o, n) => emit('sort-widget', p, o, n)"
          />

          <!-- 根画板空白引导占位 -->
          <div v-if="schema.widgetList.length === 0" class="at-form-canvas__empty-guide">
            <div class="at-form-canvas__empty-icon">
              <svg
                viewBox="0 0 24 24"
                width="36"
                height="36"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M12 8v8M8 12h8" />
              </svg>
            </div>
            <p class="at-form-canvas__empty-title">从左侧面板拖拽或点击物料添加表单控件</p>
            <p class="at-form-canvas__empty-subtitle">支持栅格排版、卡片分组与明细子表单嵌套</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.at-form-canvas {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 24px;
  background-color: var(--el-bg-color-page, #f5f7fa);
  overflow-y: auto;
  min-height: 100%;
  box-sizing: border-box;
}

.at-form-canvas__viewport-frame {
  width: 100%;
  background: var(--el-bg-color, #ffffff);
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-sizing: border-box;
}

/* PC 宽屏 */
.at-form-canvas__viewport-frame.is-pc {
  max-width: 100%;
}

/* Pad 平板 */
.at-form-canvas__viewport-frame.is-pad {
  max-width: 768px;
  border: 8px solid #262626;
  border-radius: 16px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.15);
}

/* 移动端手机仿真 */
.at-form-canvas__viewport-frame.is-mobile {
  max-width: 375px;
  border: 10px solid #1f1f1f;
  border-radius: 36px;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.2);
  padding-bottom: 24px;
}

.at-form-canvas__viewport-frame.is-mobile :deep(.at-canvas-widget-node) {
  flex: 0 0 100% !important;
  max-width: 100% !important;
}

.at-form-canvas__mobile-notch {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 24px;
  background: #1f1f1f;
  margin: -1px -1px 12px -1px;
  border-bottom-left-radius: 14px;
  border-bottom-right-radius: 14px;
  width: 140px;
  margin-left: auto;
  margin-right: auto;
}

.at-form-canvas__mobile-camera {
  width: 6px;
  height: 6px;
  background: #333333;
  border-radius: 50%;
}

.at-form-canvas__mobile-speaker {
  width: 36px;
  height: 4px;
  background: #333333;
  border-radius: 2px;
}

.at-form-canvas__body {
  padding: 16px;
  min-height: 480px;
}

.at-canvas-root-dropzone {
  min-height: 440px;
  box-sizing: border-box;
}

.at-canvas-root-dropzone.is-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed var(--el-border-color-light, #e4e7ed);
  border-radius: 6px;
}

.at-form-canvas__empty-guide {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--el-text-color-secondary, #909399);
  padding: 32px;
  text-align: center;
  user-select: none;
}

.at-form-canvas__empty-icon {
  color: var(--el-text-color-placeholder, #c0c4cc);
}

.at-form-canvas__empty-title {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-regular, #606266);
}

.at-form-canvas__empty-subtitle {
  margin: 0;
  font-size: 12px;
  color: var(--el-text-color-placeholder, #a8abb2);
}
</style>
