<script setup lang="ts">
/**
 * @atengk/form-designer-vue 栅格排版容器控件 (AtengFormGrid)。
 *
 * 遵循 ADR-0044 规约，属于 LayoutContainer 布局容器：
 * 仅负责页面几何排版与列宽分割，内部子控件平铺绑定至根 formData。
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

const cols = computed(() => {
  const c = Number(props.widget.props?.cols);
  return c > 0 ? c : 2;
});

const gutter = computed(() => {
  const g = Number(props.widget.props?.gutter);
  return g >= 0 ? g : 16;
});
</script>

<template>
  <div
    class="at-form-grid"
    :style="{
      gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      gap: `${gutter}px`,
    }"
  >
    <slot />
  </div>
</template>

<style scoped>
.at-form-grid {
  display: grid;
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 16px;
}

@media (max-width: 768px) {
  .at-form-grid {
    grid-template-columns: 1fr !important;
  }
}
</style>
