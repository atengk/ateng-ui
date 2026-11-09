<script setup lang="ts" generic="T = Record<string, unknown>">
/**
 * @atengk/grid-layout-vue 外部物料库图元组件。
 *
 * 遵循 ADR-0045，承载外部物料声明、尺寸预定义与拖拽入网格管道对接。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { computed } from 'vue';
import type { GridLayoutItem } from '../types';

const props = withDefaults(
  defineProps<{
    /** 物料元数据与预设跨度配置 */
    item: Partial<GridLayoutItem<T>>;
    /** 辅助克隆函数模式 (默认 'clone') */
    helper?: 'clone' | ((event: Event) => HTMLElement);
  }>(),
  {
    helper: 'clone',
  },
);

const payloadString = computed(() => {
  if (props.item.data !== undefined) {
    try {
      return JSON.stringify(props.item.data);
    } catch {
      return undefined;
    }
  }
  return undefined;
});
</script>

<template>
  <div
    class="grid-stack-item at-grid-palette-item"
    :gs-w="item.w ?? 1"
    :gs-h="item.h ?? 1"
    :gs-min-w="item.minW"
    :gs-min-h="item.minH"
    :gs-max-w="item.maxW"
    :gs-max-h="item.maxH"
    :data-payload="payloadString"
    :data-gs-w="item.w ?? 1"
    :data-gs-h="item.h ?? 1"
    :data-gs-min-w="item.minW"
    :data-gs-min-h="item.minH"
    :data-gs-max-w="item.maxW"
    :data-gs-max-h="item.maxH"
  >
    <div class="grid-stack-item-content at-grid-palette-item__content">
      <slot :item="item" />
    </div>
  </div>
</template>

<style scoped>
.at-grid-palette-item {
  box-sizing: border-box;
  cursor: grab;
  user-select: none;
}

.at-grid-palette-item:active {
  cursor: grabbing;
}

.at-grid-palette-item__content {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
}
</style>
