<script setup lang="ts">
/**
 * AtengFormStencil 物料面板组件。
 *
 * 遵循 ADR-0044 规约，按“基础输入、高级扩展、布局排版、数据集合”分类呈现可用图元，
 * 支持 SortableJS 拖拽源配置与一键点击快速添加。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref, onMounted, onUnmounted } from 'vue';
import Sortable from 'sortablejs';
import type { StencilItem, FormWidgetCategory } from '../types';

interface Props {
  /** 允许展示的物料分类 */
  categories?: FormWidgetCategory[];
  /** 禁用拖拽或添加 */
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  categories: () => ['basic', 'advanced', 'layout', 'collection'],
  disabled: false,
});

const emit = defineEmits<{
  add: [item: StencilItem];
  dragstart: [item: StencilItem, evt: DragEvent];
}>();

/** 预设物料字典 */
const defaultStencilItems: StencilItem[] = [
  // 1. 基础输入
  { type: 'input', label: '单行文本', icon: '📝', category: 'basic' },
  { type: 'textarea', label: '多行文本', icon: '📄', category: 'basic' },
  { type: 'input-number', label: '数字计数', icon: '🔢', category: 'basic' },
  { type: 'select', label: '下拉选择', icon: '🔽', category: 'basic' },
  { type: 'checkbox', label: '复选框', icon: '☑️', category: 'basic' },
  { type: 'radio', label: '单选框', icon: '🔘', category: 'basic' },
  { type: 'switch', label: '开关切换', icon: '🔛', category: 'basic' },
  { type: 'date-picker', label: '日期选择', icon: '📅', category: 'basic' },

  // 2. 高级扩展生态物料
  { type: 'rate', label: '评分星级', icon: '⭐', category: 'advanced' },
  { type: 'slider', label: '滑块条', icon: '🎚️', category: 'advanced' },
  { type: 'rich-editor', label: '富文本创作', icon: '🖋️', category: 'advanced' },
  { type: 'code-editor', label: '代码编辑器', icon: '💻', category: 'advanced' },
  { type: 'signature', label: '手写签名板', icon: '✍️', category: 'advanced' },
  { type: 'chunk-upload', label: '切片上传', icon: '📦', category: 'advanced' },

  // 3. 布局排版
  {
    type: 'grid',
    label: '栅格排版',
    icon: '🔲',
    category: 'layout',
    isContainer: true,
    containerType: 'layout',
  },
  {
    type: 'card',
    label: '卡片分组',
    icon: '🃏',
    category: 'layout',
    isContainer: true,
    containerType: 'layout',
  },

  // 4. 数据集合
  {
    type: 'subform',
    label: '明细子表单',
    icon: '📑',
    category: 'collection',
    isCollection: true,
    containerType: 'data',
  },
];

const categoryMeta: Record<FormWidgetCategory, { title: string; desc: string }> = {
  basic: { title: '基础输入控件', desc: '文本、数字、选择等原子项' },
  advanced: { title: '高级生态物料', desc: '富文本、代码、签名、切片上传' },
  layout: { title: '布局排版容器', desc: '栅格布局、卡片分组等几何结构' },
  collection: { title: '数据集合容器', desc: '明细子表单与多行记录项' },
};

/** 分类过滤后的物料集 */
const getItemsByCategory = (category: FormWidgetCategory): StencilItem[] => {
  return defaultStencilItems.filter(item => item.category === category);
};

// SortableJS 实例池管理（确保 onUnmounted 100% 销毁）
const listRefs = ref<HTMLElement[]>([]);
const sortableInstances: Sortable[] = [];

const setListRef = (el: unknown): void => {
  if (el && el instanceof HTMLElement) {
    if (!listRefs.value.includes(el)) {
      listRefs.value.push(el);
    }
  }
};

onMounted(() => {
  listRefs.value.forEach(containerEl => {
    try {
      const instance = new Sortable(containerEl, {
        group: {
          name: 'at-form-widgets',
          pull: 'clone',
          put: false,
        },
        sort: false,
        animation: 150,
        ghostClass: 'at-stencil-ghost',
        setData(dataTransfer, dragEl) {
          const widgetType = dragEl.getAttribute('data-widget-type');
          if (widgetType && dataTransfer) {
            dataTransfer.setData('text/plain', widgetType);
            dataTransfer.setData('application/json', JSON.stringify({ type: widgetType }));
          }
        },
      });
      sortableInstances.push(instance);
    } catch {
      // 容灾捕获（例如在非标准无 DOM 虚拟测试环境下）
    }
  });
});

onUnmounted(() => {
  sortableInstances.forEach(instance => {
    try {
      instance.destroy();
    } catch {
      // ignore
    }
  });
  sortableInstances.length = 0;
  listRefs.value = [];
});

const handleItemClick = (item: StencilItem): void => {
  if (props.disabled) return;
  emit('add', item);
};

const handleDragStart = (item: StencilItem, evt: DragEvent): void => {
  if (props.disabled) return;
  if (evt.dataTransfer) {
    evt.dataTransfer.setData('text/plain', item.type);
    evt.dataTransfer.setData('application/json', JSON.stringify(item));
  }
  emit('dragstart', item, evt);
};
</script>

<template>
  <div class="at-form-stencil">
    <div v-for="cat in categories" :key="cat" class="at-form-stencil__section">
      <div class="at-form-stencil__header">
        <span class="at-form-stencil__title">{{ categoryMeta[cat]?.title || cat }}</span>
        <span class="at-form-stencil__desc">{{ categoryMeta[cat]?.desc }}</span>
      </div>

      <div :ref="setListRef" class="at-form-stencil__list" :data-category="cat">
        <div
          v-for="item in getItemsByCategory(cat)"
          :key="item.type"
          class="at-form-stencil__item"
          :class="{ 'is-disabled': disabled }"
          :data-widget-type="item.type"
          :draggable="!disabled"
          @click="handleItemClick(item)"
          @dragstart="handleDragStart(item, $event)"
        >
          <span class="at-form-stencil__icon">{{ item.icon }}</span>
          <span class="at-form-stencil__label">{{ item.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.at-form-stencil {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 12px;
  background-color: var(--el-bg-color, #ffffff);
  user-select: none;
}

.at-form-stencil__section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.at-form-stencil__header {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-bottom: 4px;
  border-bottom: 1px dashed var(--el-border-color-lighter, #ebeef5);
}

.at-form-stencil__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
}

.at-form-stencil__desc {
  font-size: 11px;
  color: var(--el-text-color-secondary, #909399);
}

.at-form-stencil__list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  min-height: 38px;
}

.at-form-stencil__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 4px;
  font-size: 12px;
  color: var(--el-text-color-regular, #606266);
  background: var(--el-fill-color-blank, #ffffff);
  border: 1px solid var(--el-border-color-light, #e4e7ed);
  cursor: grab;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.at-form-stencil__item:hover:not(.is-disabled) {
  border-color: var(--el-color-primary, #409eff);
  color: var(--el-color-primary, #409eff);
  background-color: var(--el-color-primary-light-9, #ecf5ff);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
}

.at-form-stencil__item:active:not(.is-disabled) {
  cursor: grabbing;
}

.at-form-stencil__item.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.at-form-stencil__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  width: 18px;
  height: 18px;
}

.at-form-stencil__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.at-stencil-ghost {
  opacity: 0.4;
  border: 1px dashed var(--el-color-primary, #409eff);
}
</style>
