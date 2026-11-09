<script setup lang="ts">
/**
 * AtengFormDesignerToolbar 设计器顶部操作工具栏。
 *
 * 遵循 ADR-0044 规约，负责视口规格切换、历史撤销重做、清空画布与实时预览模式切换。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import type { ViewportType } from '../types';

interface Props {
  viewport?: ViewportType;
  canUndo?: boolean;
  canRedo?: boolean;
  isPreviewMode?: boolean;
}

withDefaults(defineProps<Props>(), {
  viewport: 'pc',
  canUndo: false,
  canRedo: false,
  isPreviewMode: false,
});

const emit = defineEmits<{
  'set-viewport': [viewport: ViewportType];
  undo: [];
  redo: [];
  clear: [];
  'toggle-preview': [];
}>();
</script>

<template>
  <header class="at-designer-toolbar">
    <div class="at-designer-toolbar__left">
      <span class="at-designer-toolbar__title">🛠️ 表单设计器</span>
      <div class="at-designer-viewport-switch">
        <button
          type="button"
          class="at-designer-tool-btn"
          :class="{ 'is-active': viewport === 'pc' }"
          title="PC 宽屏"
          @click="emit('set-viewport', 'pc')"
        >
          🖥️ PC
        </button>
        <button
          type="button"
          class="at-designer-tool-btn"
          :class="{ 'is-active': viewport === 'pad' }"
          title="平板 (768px)"
          @click="emit('set-viewport', 'pad')"
        >
          📱 Pad
        </button>
        <button
          type="button"
          class="at-designer-tool-btn"
          :class="{ 'is-active': viewport === 'mobile' }"
          title="移动手机仿真 (375px)"
          @click="emit('set-viewport', 'mobile')"
        >
          📲 Mobile
        </button>
      </div>
    </div>

    <div class="at-designer-toolbar__right">
      <button
        type="button"
        class="at-designer-tool-btn"
        :disabled="!canUndo"
        title="撤销 (Undo)"
        @click="emit('undo')"
      >
        ↩️ 撤销
      </button>
      <button
        type="button"
        class="at-designer-tool-btn"
        :disabled="!canRedo"
        title="重做 (Redo)"
        @click="emit('redo')"
      >
        ↪️ 重做
      </button>
      <button type="button" class="at-designer-tool-btn" title="清空画布" @click="emit('clear')">
        🗑️ 清空
      </button>
      <button type="button" class="at-designer-tool-btn is-primary" @click="emit('toggle-preview')">
        {{ isPreviewMode ? '✏️ 返回设计' : '👁️ 实时预览' }}
      </button>
    </div>
  </header>
</template>

<style scoped>
.at-designer-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: var(--el-bg-color, #ffffff);
  border-bottom: 1px solid var(--el-border-color-light, #e4e7ed);
}

.at-designer-toolbar__left,
.at-designer-toolbar__right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.at-designer-toolbar__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
  margin-right: 12px;
}

.at-designer-viewport-switch {
  display: flex;
  background: var(--el-fill-color-light, #f5f7fa);
  padding: 2px;
  border-radius: 4px;
}

.at-designer-tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 4px;
  font-size: 12px;
  color: var(--el-text-color-regular, #606266);
  cursor: pointer;
  transition: all 0.2s ease;
}

.at-designer-tool-btn:hover:not(:disabled) {
  background: var(--el-fill-color, #e4e7ed);
  color: var(--el-text-color-primary, #303133);
}

.at-designer-tool-btn.is-active {
  background: var(--el-bg-color, #ffffff);
  color: var(--el-color-primary, #409eff);
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.at-designer-tool-btn.is-primary {
  background: var(--el-color-primary, #409eff);
  color: #ffffff;
}

.at-designer-tool-btn.is-primary:hover {
  background: var(--el-color-primary-light-3, #79bbff);
}

.at-designer-tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
