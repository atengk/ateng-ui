<script setup lang="ts">
/**
 * AtengFormCanvasLeaf 画布叶子控件预览桩组件。
 *
 * 在设计态呈现基础输入控件的外观轮廓，屏蔽原生输入指针事件以保障点击精准选中。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import type { FormWidget } from '../types';

interface Props {
  widget: FormWidget;
  colon?: boolean;
}

withDefaults(defineProps<Props>(), {
  colon: true,
});
</script>

<template>
  <div class="at-canvas-leaf">
    <div class="at-canvas-leaf__label">
      <span v-if="widget.rules?.some(r => r.required)" class="at-canvas-leaf__required">*</span>
      <span>{{ widget.label || widget.type }}</span>
      <span v-if="colon" class="at-canvas-leaf__colon">:</span>
    </div>

    <div class="at-canvas-leaf__field">
      <input
        v-if="widget.type === 'input'"
        class="at-canvas-leaf__input"
        :placeholder="widget.placeholder || '请输入...'"
        disabled
      />
      <textarea
        v-else-if="widget.type === 'textarea'"
        class="at-canvas-leaf__textarea"
        :placeholder="widget.placeholder || '请输入多行文本...'"
        disabled
        rows="2"
      />
      <select v-else-if="widget.type === 'select'" class="at-canvas-leaf__select" disabled>
        <option>请选择 ({{ widget.options?.length || 2 }} 项)</option>
      </select>
      <div v-else-if="widget.type === 'checkbox'" class="at-canvas-leaf__checkbox-group">
        <label
          v-for="opt in widget.options || [{ label: '选项1' }]"
          :key="opt.label"
          class="at-canvas-leaf__opt"
        >
          <input type="checkbox" disabled />
          <span>{{ opt.label }}</span>
        </label>
      </div>
      <div v-else-if="widget.type === 'radio'" class="at-canvas-leaf__radio-group">
        <label
          v-for="opt in widget.options || [{ label: '选项1' }]"
          :key="opt.label"
          class="at-canvas-leaf__opt"
        >
          <input type="radio" disabled />
          <span>{{ opt.label }}</span>
        </label>
      </div>
      <div v-else class="at-canvas-leaf__fallback">
        <span>[{{ widget.type }} 控件]</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.at-canvas-leaf {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  pointer-events: none;
}

.at-canvas-leaf__label {
  font-size: 13px;
  color: var(--el-text-color-regular, #606266);
}

.at-canvas-leaf__required {
  color: var(--el-color-danger, #f56c6c);
  margin-right: 2px;
}

.at-canvas-leaf__field {
  width: 100%;
}

.at-canvas-leaf__input,
.at-canvas-leaf__textarea,
.at-canvas-leaf__select {
  width: 100%;
  box-sizing: border-box;
  padding: 6px 10px;
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-radius: 4px;
  background: var(--el-fill-color-blank, #ffffff);
  font-size: 13px;
  color: var(--el-text-color-primary, #303133);
}

.at-canvas-leaf__checkbox-group,
.at-canvas-leaf__radio-group {
  display: flex;
  gap: 12px;
  font-size: 13px;
}

.at-canvas-leaf__opt {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
