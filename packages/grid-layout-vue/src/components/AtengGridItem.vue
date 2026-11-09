<script setup lang="ts" generic="T = Record<string, unknown>">
/**
 * @atengk/grid-layout-vue 单个网格项组件。
 *
 * 遵循 ADR-0045，承载网格项渲染、几何尺寸注入与内容隔离。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { computed, inject, provide, ref, toRef, watch } from 'vue';
import { GRID_ITEM_KEY, GRID_LAYOUT_KEY } from '../constants';
import type { GridItemContext, GridLayoutItem } from '../types';

const props = withDefaults(
  defineProps<{
    /** 当前网格项数据对象 */
    item: GridLayoutItem<T>;
  }>(),
  {},
);

const gridLayoutContext = inject(GRID_LAYOUT_KEY, null);
const elRef = ref<HTMLElement | null>(null);
const isDragging = ref(false);
const isResizing = ref(false);
const pixelWidth = ref(0);
const pixelHeight = ref(0);

const itemRef = toRef(props, 'item');
const isLocked = computed(() => Boolean(props.item.locked || props.item.static));

// 响应式监听锁控与可调整性变更并同步底层 GridStack 节点
watch(
  () => [props.item.locked, props.item.static, props.item.noResize, props.item.noMove],
  () => {
    if (gridLayoutContext?.gridInstance.value && elRef.value) {
      gridLayoutContext.gridInstance.value.update(elRef.value, {
        locked: isLocked.value,
        noResize: Boolean(props.item.noResize),
        noMove: Boolean(props.item.noMove),
      });
    }
  },
);

// 向上向子树提供 GridItemContext 契约
provide(GRID_ITEM_KEY, {
  item: itemRef,
  isDragging,
  isResizing,
  isLocked,
  pixelWidth,
  pixelHeight,
} as unknown as GridItemContext<Record<string, unknown>>);

defineExpose({
  el: elRef,
  item: itemRef,
  isDragging,
  isResizing,
  isLocked,
});
</script>

<template>
  <div
    ref="elRef"
    class="grid-stack-item at-grid-item"
    :gs-id="String(item.id)"
    :gs-x="item.x"
    :gs-y="item.y"
    :gs-w="item.w ?? 1"
    :gs-h="item.h ?? 1"
    :gs-min-w="item.minW"
    :gs-min-h="item.minH"
    :gs-max-w="item.maxW"
    :gs-max-h="item.maxH"
    :gs-locked="isLocked ? 'true' : undefined"
    :gs-no-resize="item.noResize ? 'true' : undefined"
    :gs-no-move="item.noMove ? 'true' : undefined"
    :gs-auto-position="item.autoPosition ? 'true' : undefined"
  >
    <div class="grid-stack-item-content at-grid-item__content">
      <slot
        :item="item"
        :is-dragging="isDragging"
        :is-resizing="isResizing"
        :is-locked="isLocked"
      />
    </div>
  </div>
</template>

<style scoped>
.at-grid-item {
  box-sizing: border-box;
}

.at-grid-item__content {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  box-sizing: border-box;
}
</style>
