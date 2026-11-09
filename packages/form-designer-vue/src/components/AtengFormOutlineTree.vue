<script setup lang="ts">
/**
 * AtengFormOutlineTree 图层大纲树组件。
 *
 * 遵循 ADR-0044 规约，以树状大纲展示表单各层级节点，
 * 支持深层嵌套控件快速精准选中、重命名、复制与删除联动。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref } from 'vue';
import type { FormWidget } from '../types';

defineOptions({
  name: 'AtengFormOutlineTree',
});

interface Props {
  /** 当前层级表单控件节点列表 */
  widgets?: FormWidget[];
  /** 当前活动选中的控件唯一标识 */
  activeWidgetId?: string | null;
  /** 嵌套深度层级（用于缩进呈现） */
  depth?: number;
}

const _props = withDefaults(defineProps<Props>(), {
  widgets: () => [],
  activeWidgetId: null,
  depth: 0,
});

const emit = defineEmits<{
  select: [id: string];
  remove: [id: string];
  copy: [id: string];
  rename: [id: string, newLabel: string];
}>();

// 维护折叠状态
const collapsedMap = ref<Record<string, boolean>>({});

// 维护正在重命名中的节点状态
const editingId = ref<string | null>(null);
const editingLabel = ref<string>('');

const toggleCollapse = (id: string, evt: MouseEvent): void => {
  evt.stopPropagation();
  collapsedMap.value[id] = !collapsedMap.value[id];
};

const handleSelect = (id: string): void => {
  emit('select', id);
};

const handleRemove = (id: string, evt: MouseEvent): void => {
  evt.stopPropagation();
  emit('remove', id);
};

const handleCopy = (id: string, evt: MouseEvent): void => {
  evt.stopPropagation();
  emit('copy', id);
};

const startRename = (widget: FormWidget, evt: MouseEvent): void => {
  evt.stopPropagation();
  editingId.value = widget.id;
  editingLabel.value = widget.label || widget.type;
};

const confirmRename = (id: string): void => {
  if (editingId.value === id) {
    const trimmed = editingLabel.value.trim();
    if (trimmed) {
      emit('rename', id, trimmed);
    }
    editingId.value = null;
  }
};

const cancelRename = (): void => {
  editingId.value = null;
};
</script>

<template>
  <div class="at-form-outline" :class="{ 'is-root': depth === 0 }">
    <!-- 根节点空状态提示 -->
    <div v-if="depth === 0 && widgets.length === 0" class="at-form-outline__empty">
      <span class="at-form-outline__empty-text">画布暂无控件节点</span>
      <span class="at-form-outline__empty-sub">点击或拖拽左侧物料进行添加</span>
    </div>

    <!-- 树节点列表 -->
    <div v-for="widget in widgets" :key="widget.id" class="at-form-outline__node">
      <div
        class="at-form-outline__item"
        :class="{
          'is-active': activeWidgetId === widget.id,
          'is-container': widget.isContainer || widget.isCollection,
        }"
        :style="{ paddingLeft: `${8 + depth * 16}px` }"
        @click="handleSelect(widget.id)"
      >
        <!-- 容器折叠箭头 -->
        <span
          v-if="
            (widget.children && widget.children.length > 0) ||
            widget.isContainer ||
            widget.isCollection
          "
          class="at-form-outline__arrow"
          :class="{ 'is-collapsed': collapsedMap[widget.id] }"
          @click="toggleCollapse(widget.id, $event)"
        >
          <svg
            viewBox="0 0 24 24"
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
        <span v-else class="at-form-outline__arrow-placeholder" />

        <!-- 控件类型徽标 -->
        <span class="at-form-outline__badge" :data-type="widget.type">
          {{ widget.type }}
        </span>

        <!-- 控件名称或行内重命名输入框 -->
        <div class="at-form-outline__label-box" @dblclick="startRename(widget, $event)">
          <input
            v-if="editingId === widget.id"
            v-model="editingLabel"
            class="at-form-outline__input"
            autofocus
            @blur="confirmRename(widget.id)"
            @keydown.enter="confirmRename(widget.id)"
            @keydown.esc="cancelRename"
            @click.stop
          />
          <span v-else class="at-form-outline__label" :title="widget.label || widget.type">
            {{ widget.label || widget.type }}
          </span>
          <span v-if="widget.modelKey && editingId !== widget.id" class="at-form-outline__key">
            ({{ widget.modelKey }})
          </span>
        </div>

        <!-- 悬停操作浮动栏 -->
        <div class="at-form-outline__actions">
          <button
            type="button"
            class="at-form-outline__btn"
            title="重命名 (可双击)"
            @click="startRename(widget, $event)"
          >
            ✏️
          </button>
          <button
            type="button"
            class="at-form-outline__btn"
            title="复制"
            @click="handleCopy(widget.id, $event)"
          >
            📋
          </button>
          <button
            type="button"
            class="at-form-outline__btn is-danger"
            title="删除"
            @click="handleRemove(widget.id, $event)"
          >
            🗑️
          </button>
        </div>
      </div>

      <!-- 递归渲染子树 -->
      <div
        v-if="widget.children && widget.children.length > 0 && !collapsedMap[widget.id]"
        class="at-form-outline__children"
      >
        <AtengFormOutlineTree
          :widgets="widget.children"
          :active-widget-id="activeWidgetId"
          :depth="depth + 1"
          @select="emit('select', $event)"
          @remove="emit('remove', $event)"
          @copy="emit('copy', $event)"
          @rename="(id, label) => emit('rename', id, label)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.at-form-outline {
  display: flex;
  flex-direction: column;
  user-select: none;
}

.at-form-outline.is-root {
  padding: 8px 4px;
}

.at-form-outline__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 32px 16px;
  color: var(--el-text-color-secondary, #909399);
  text-align: center;
}

.at-form-outline__empty-text {
  font-size: 13px;
  font-weight: 500;
}

.at-form-outline__empty-sub {
  font-size: 11px;
  color: var(--el-text-color-placeholder, #c0c4cc);
}

.at-form-outline__node {
  display: flex;
  flex-direction: column;
}

.at-form-outline__item {
  display: flex;
  align-items: center;
  height: 32px;
  padding-right: 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  font-size: 12px;
  color: var(--el-text-color-primary, #303133);
}

.at-form-outline__item:hover {
  background-color: var(--el-fill-color-light, #f5f7fa);
}

.at-form-outline__item.is-active {
  background-color: var(--el-color-primary-light-9, #ecf5ff);
  color: var(--el-color-primary, #409eff);
  font-weight: 500;
}

.at-form-outline__arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-right: 4px;
  cursor: pointer;
  color: var(--el-text-color-secondary, #909399);
  transition: transform 0.2s ease;
}

.at-form-outline__arrow.is-collapsed {
  transform: rotate(-90deg);
}

.at-form-outline__arrow-placeholder {
  width: 16px;
  margin-right: 4px;
  flex-shrink: 0;
}

.at-form-outline__badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 10px;
  line-height: 14px;
  font-family: monospace;
  margin-right: 6px;
  background: var(--el-fill-color, #f0f2f5);
  color: var(--el-text-color-secondary, #909399);
  flex-shrink: 0;
}

.at-form-outline__badge[data-type='grid'],
.at-form-outline__badge[data-type='card'] {
  background-color: #e8f4ff;
  color: #1890ff;
}

.at-form-outline__badge[data-type='subform'] {
  background-color: #f6ffed;
  color: #52c41a;
}

.at-form-outline__label-box {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.at-form-outline__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.at-form-outline__key {
  font-size: 11px;
  color: var(--el-text-color-placeholder, #a8abb2);
  white-space: nowrap;
}

.at-form-outline__input {
  height: 22px;
  width: 90%;
  font-size: 12px;
  padding: 0 4px;
  border: 1px solid var(--el-color-primary, #409eff);
  border-radius: 2px;
  outline: none;
  background: var(--el-bg-color, #ffffff);
}

.at-form-outline__actions {
  display: none;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}

.at-form-outline__item:hover .at-form-outline__actions,
.at-form-outline__item.is-active .at-form-outline__actions {
  display: flex;
}

.at-form-outline__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 3px;
  font-size: 10px;
  opacity: 0.7;
}

.at-form-outline__btn:hover {
  opacity: 1;
  background: var(--el-fill-color-dark, #dcdfe6);
}
</style>
