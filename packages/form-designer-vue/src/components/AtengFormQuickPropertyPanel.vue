<script setup lang="ts">
/**
 * AtengFormQuickPropertyPanel 快速属性检视面板。
 *
 * 遵循 ADR-0044 规约，负责快速查看并编辑当前活动控件的 ID、标签、键名、占位符与必填约束。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { computed } from 'vue';
import type { FormWidget } from '../types';

interface Props {
  activeWidget?: FormWidget | null;
}

const props = withDefaults(defineProps<Props>(), {
  activeWidget: null,
});

const emit = defineEmits<{
  'update-property': [key: string, value: unknown];
}>();

const isRequired = computed(() => {
  return Boolean(props.activeWidget?.rules?.some(r => r.required));
});
</script>

<template>
  <aside class="at-designer-sidebar is-right">
    <div class="at-designer-prop-header">
      <span class="at-designer-prop-title">
        {{ activeWidget ? '⚙️ 控件属性' : '📋 表单配置' }}
      </span>
      <span v-if="activeWidget" class="at-designer-prop-tag">
        {{ activeWidget.type }}
      </span>
    </div>

    <div v-if="activeWidget" class="at-designer-prop-body">
      <div class="at-designer-prop-row">
        <label class="at-designer-prop-label">控件 ID</label>
        <input class="at-designer-prop-input" :value="activeWidget.id" readonly />
      </div>

      <div v-if="!activeWidget.isContainer" class="at-designer-prop-row">
        <label class="at-designer-prop-label">字段键名 (modelKey)</label>
        <input
          class="at-designer-prop-input"
          :value="activeWidget.modelKey"
          @input="emit('update-property', 'modelKey', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <div class="at-designer-prop-row">
        <label class="at-designer-prop-label">展示标签 (label)</label>
        <input
          class="at-designer-prop-input"
          :value="activeWidget.label"
          @input="emit('update-property', 'label', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <div v-if="!activeWidget.isContainer" class="at-designer-prop-row">
        <label class="at-designer-prop-label">占位提示 (placeholder)</label>
        <input
          class="at-designer-prop-input"
          :value="activeWidget.placeholder"
          @input="emit('update-property', 'placeholder', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <div v-if="!activeWidget.isContainer" class="at-designer-prop-row is-inline">
        <label class="at-designer-prop-label">是否必填</label>
        <input
          type="checkbox"
          :checked="isRequired"
          @change="emit('update-property', 'required', ($event.target as HTMLInputElement).checked)"
        />
      </div>

      <!-- 栅格专属属性 -->
      <div v-if="activeWidget.type === 'grid'" class="at-designer-prop-row">
        <label class="at-designer-prop-label">栅格列数 (cols)</label>
        <input
          type="number"
          class="at-designer-prop-input"
          min="1"
          max="6"
          :value="activeWidget.props?.cols || 2"
          @change="
            emit('update-property', 'props.cols', Number(($event.target as HTMLInputElement).value))
          "
        />
      </div>

      <!-- 卡片专属属性 -->
      <div v-if="activeWidget.type === 'card'" class="at-designer-prop-row">
        <label class="at-designer-prop-label">卡片标题 (title)</label>
        <input
          class="at-designer-prop-input"
          :value="activeWidget.props?.title || ''"
          @input="emit('update-property', 'props.title', ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>

    <div v-else class="at-designer-prop-empty">
      <span class="at-designer-prop-empty-tip">未选中任何控件</span>
      <span class="at-designer-prop-empty-desc">在画布或大纲树中点击控件以查看或修改属性</span>
    </div>
  </aside>
</template>

<style scoped>
.at-designer-sidebar.is-right {
  width: 280px;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color, #ffffff);
  border-left: 1px solid var(--el-border-color-light, #e4e7ed);
  overflow-y: auto;
  box-sizing: border-box;
}

.at-designer-prop-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--el-border-color-light, #e4e7ed);
  background: var(--el-fill-color-lighter, #fafafa);
}

.at-designer-prop-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
}

.at-designer-prop-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  background: var(--el-color-primary-light-9, #ecf5ff);
  color: var(--el-color-primary, #409eff);
  font-family: monospace;
}

.at-designer-prop-body {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.at-designer-prop-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.at-designer-prop-row.is-inline {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.at-designer-prop-label {
  font-size: 12px;
  color: var(--el-text-color-regular, #606266);
}

.at-designer-prop-input {
  height: 28px;
  padding: 0 8px;
  font-size: 12px;
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-radius: 4px;
  outline: none;
  background: var(--el-bg-color, #ffffff);
  color: var(--el-text-color-primary, #303133);
}

.at-designer-prop-input:focus {
  border-color: var(--el-color-primary, #409eff);
}

.at-designer-prop-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 40px 16px;
  color: var(--el-text-color-placeholder, #c0c4cc);
  text-align: center;
}

.at-designer-prop-empty-tip {
  font-size: 13px;
  color: var(--el-text-color-secondary, #909399);
}

.at-designer-prop-empty-desc {
  font-size: 11px;
}
</style>
