<script setup lang="ts">
/**
 * @atengk/form-designer-vue 卡片排版容器控件 (AtengFormCard)。
 *
 * 遵循 ADR-0044 规约，属于 LayoutContainer 布局容器：
 * 为子表单项提供模块化卡片包裹、标题与边框分割，内部字段平铺绑定至根 formData。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { computed } from 'vue';
import type { FormWidget } from '../types';

interface Props {
  widget: FormWidget;
  disabled?: boolean;
  readonly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  readonly: false,
});

const title = computed(() => {
  return (props.widget.props?.title as string) || props.widget.label || '';
});

const isBordered = computed(() => {
  return props.widget.props?.bordered !== false;
});
</script>

<template>
  <div class="at-form-card" :class="{ 'is-bordered': isBordered }">
    <div v-if="title" class="at-form-card-header">
      <div class="at-form-card-title">{{ title }}</div>
    </div>
    <div class="at-form-card-body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.at-form-card {
  width: 100%;
  background-color: var(--at-form-card-bg, #ffffff);
  border-radius: 8px;
  box-sizing: border-box;
  margin-bottom: 16px;
  transition: box-shadow 0.2s;
}

.at-form-card.is-bordered {
  border: 1px solid var(--at-form-border-color, #e2e8f0);
}

.at-form-card-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--at-form-border-color, #e2e8f0);
  background-color: var(--at-form-header-bg, #f8fafc);
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}

.at-form-card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--at-form-text-color, #1e293b);
  display: flex;
  align-items: center;
  gap: 8px;
}

.at-form-card-body {
  padding: 16px;
  box-sizing: border-box;
}
</style>
