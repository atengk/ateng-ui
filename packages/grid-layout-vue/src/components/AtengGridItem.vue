<script setup lang="ts" generic="T = Record<string, unknown>">
/**
 * @atengk/grid-layout-vue 单个网格项组件。
 *
 * 遵循 ADR-0045，承载网格项渲染、几何尺寸注入与内容隔离。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { computed, inject, onMounted, onUnmounted, provide, ref, toRef, watch } from 'vue';
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

const emit = defineEmits<{
  (e: 'resize', size: { width: number; height: number }): void;
}>();

const itemRef = toRef(props, 'item');
const isLocked = computed(() => Boolean(props.item.locked || props.item.static));
const isDragging = computed(() =>
  Boolean(
    gridLayoutContext?.activeDraggingId.value &&
    String(gridLayoutContext.activeDraggingId.value) === String(props.item.id),
  ),
);
const isResizing = computed(() =>
  Boolean(
    gridLayoutContext?.activeResizingId.value &&
    String(gridLayoutContext.activeResizingId.value) === String(props.item.id),
  ),
);

const isMaximized = computed(() =>
  Boolean(
    gridLayoutContext?.maximizedId.value &&
    String(gridLayoutContext.maximizedId.value) === String(props.item.id),
  ),
);

const isCollapsed = computed(() =>
  Boolean(
    gridLayoutContext?.collapsedIds.value &&
    gridLayoutContext.collapsedIds.value.has(String(props.item.id)),
  ),
);

const toggleMaximize = (): void => {
  gridLayoutContext?.toggleMaximize(props.item.id);
};

const maximize = (): void => {
  gridLayoutContext?.maximize(props.item.id);
};

const restore = (): void => {
  gridLayoutContext?.restore(props.item.id);
};

const toggleCollapse = (): void => {
  gridLayoutContext?.toggleCollapse(props.item.id);
};

const collapse = (): void => {
  gridLayoutContext?.collapse(props.item.id);
};

const expand = (): void => {
  gridLayoutContext?.expand(props.item.id);
};

const pixelWidth = ref(0);
const pixelHeight = ref(0);
const resizeCallbacks = new Set<(size: { width: number; height: number }) => void>();

let itemResizeObserver: ResizeObserver | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const onResize = (cb: (size: { width: number; height: number }) => void): (() => void) => {
  resizeCallbacks.add(cb);
  if (pixelWidth.value > 0 && pixelHeight.value > 0) {
    cb({ width: pixelWidth.value, height: pixelHeight.value });
  }
  return () => {
    resizeCallbacks.delete(cb);
  };
};

const triggerSizeBroadcast = (w: number, h: number): void => {
  pixelWidth.value = w;
  pixelHeight.value = h;
  emit('resize', { width: w, height: h });
  for (const cb of resizeCallbacks) {
    try {
      cb({ width: w, height: h });
    } catch (err) {
      console.error('Grid item onResize callback error:', err);
    }
  }
};

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

onMounted(() => {
  if (gridLayoutContext?.gridInstance.value && elRef.value) {
    const grid = gridLayoutContext.gridInstance.value;
    const node = (elRef.value as unknown as { gridstackNode?: unknown }).gridstackNode;
    if (!node) {
      grid.makeWidget(elRef.value);
    }
  }

  if (typeof ResizeObserver !== 'undefined' && elRef.value) {
    itemResizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      const w = Math.round(entry.contentRect.width);
      const h = Math.round(entry.contentRect.height);
      if (w <= 0 || h <= 0) {
        return;
      }

      if (isResizing.value || isDragging.value) {
        pixelWidth.value = w;
        pixelHeight.value = h;
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(() => {
          triggerSizeBroadcast(w, h);
        }, 100);
      } else {
        triggerSizeBroadcast(w, h);
      }
    });

    itemResizeObserver.observe(elRef.value);
  }
});

onUnmounted(() => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (itemResizeObserver) {
    itemResizeObserver.disconnect();
    itemResizeObserver = null;
  }
  resizeCallbacks.clear();

  if (gridLayoutContext?.gridInstance.value && elRef.value) {
    const grid = gridLayoutContext.gridInstance.value;
    const node = (elRef.value as unknown as { gridstackNode?: unknown }).gridstackNode;
    if (node) {
      grid.removeWidget(elRef.value, false, false);
    }
  }
});

// 向上向子树提供 GridItemContext 契约
provide(GRID_ITEM_KEY, {
  item: itemRef,
  isDragging,
  isResizing,
  isLocked,
  isMaximized,
  isCollapsed,
  pixelWidth,
  pixelHeight,
  onResize,
  toggleMaximize,
  toggleCollapse,
  maximize,
  restore,
  collapse,
  expand,
} as unknown as GridItemContext<Record<string, unknown>>);

defineExpose({
  el: elRef,
  item: itemRef,
  isDragging,
  isResizing,
  isLocked,
  isMaximized,
  isCollapsed,
  pixelWidth,
  pixelHeight,
  onResize,
  toggleMaximize,
  toggleCollapse,
  maximize,
  restore,
  collapse,
  expand,
});
</script>

<template>
  <div
    ref="elRef"
    class="grid-stack-item at-grid-item"
    :class="{
      'at-grid-item--maximized': isMaximized,
      'at-grid-item--collapsed': isCollapsed,
    }"
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
        :is-maximized="isMaximized"
        :is-collapsed="isCollapsed"
        :toggle-maximize="toggleMaximize"
        :toggle-collapse="toggleCollapse"
        :maximize="maximize"
        :restore="restore"
        :collapse="collapse"
        :expand="expand"
      />
    </div>
  </div>
</template>

<style scoped>
.at-grid-item {
  box-sizing: border-box;
}

.at-grid-item--maximized {
  z-index: 10;
}

.at-grid-item--collapsed .at-grid-item__content {
  overflow: hidden;
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
