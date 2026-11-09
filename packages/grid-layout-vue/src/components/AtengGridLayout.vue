<script setup lang="ts" generic="T = Record<string, unknown>">
/**
 * @atengk/grid-layout-vue 网格布局顶层统领容器。
 *
 * 遵循 ADR-0045，挂载 GridStack 10.x 引擎，维护双向 JSON 布局数据流与原子更新互斥锁。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { computed, nextTick, onMounted, onUnmounted, provide, ref, watch } from 'vue';
import { GridStack, type DDDragInOpt, type GridStackNode, type GridStackOptions } from 'gridstack';
import { GRID_LAYOUT_KEY, resolveResponsiveColumns } from '../constants';
import { useGridLayout } from '../composables/useGridLayout';
import type { GridLayoutItem, GridResponsiveBreakpoints, UseGridLayoutReturn } from '../types';

const props = withDefaults(
  defineProps<{
    /** 响应式双向绑定的布局数据数组 */
    layout?: GridLayoutItem<T>[];
    /** 栅格总列数 (默认 12) */
    column?: number;
    /** 网格行高 (默认 '80px') */
    cellHeight?: number | string;
    /** 间隙尺寸 (默认 10) */
    margin?: number | string;
    /** 是否开启自由浮动 (默认 false，即开启垂直重力紧凑) */
    float?: boolean;
    /** 是否处于编辑态 (默认 false，运行态禁用拖拽缩放) */
    editable?: boolean;
    /** 是否展示纯 CSS 背景参考网格虚线 (默认 false) */
    showGridLines?: boolean;
    /** 拖拽手柄选择器 */
    handle?: string;
    /** 是否开启容器尺寸响应式断点 (默认 false) */
    responsive?: boolean;
    /** 响应式断点映射配置 */
    breakpoints?: GridResponsiveBreakpoints;
    /** 外部可拖入网格的元素选择器 (默认 '.at-grid-palette-item, .at-grid-drag-in-source, [data-drag-in]') */
    dragIn?: string;
    /** 外部拖入选项配置 */
    dragInOptions?: DDDragInOpt;
    /** 是否允许整张卡片任意位置拖拽 (默认 false，即必须通过 handle 手柄拖拽，保护卡片内部点击与文本选中) */
    draggableEntireItem?: boolean;
    /** 外部自定义控制器 (可选，双向驱动) */
    controller?: UseGridLayoutReturn<T>;
    /** 底层透传的原生 GridStack 选项 */
    gridOptions?: GridStackOptions;
  }>(),
  {
    layout: () => [],
    column: 12,
    cellHeight: '80px',
    margin: 10,
    float: false,
    editable: false,
    showGridLines: false,
    handle: '.at-grid-drag-handle, .at-grid-item__header',
    responsive: false,
    breakpoints: undefined,
    dragIn: '.at-grid-palette-item, .at-grid-drag-in-source, [data-drag-in]',
    dragInOptions: () => ({
      handle: '.at-grid-palette-item__content, .at-grid-palette-item, .at-grid-drag-in-source',
      helper: 'clone',
      appendTo: 'body',
    }),
    draggableEntireItem: false,
    controller: undefined,
    gridOptions: () => ({}),
  },
);

const emit = defineEmits<{
  (e: 'update:layout', layout: GridLayoutItem<T>[]): void;
  (e: 'change', layout: GridLayoutItem<T>[]): void;
  (e: 'dragstart', id: string | number): void;
  (e: 'dragstop', id: string | number): void;
  (e: 'resizestart', id: string | number): void;
  (e: 'resizestop', id: string | number): void;
  (e: 'breakpointChange', payload: { width: number; column: number }): void;
  (e: 'dropItem', item: GridLayoutItem<T>): void;
}>();

const containerRef = ref<HTMLElement | null>(null);
const internalController =
  props.controller ??
  useGridLayout<T>({
    initialLayout: props.layout,
    column: props.column,
    cellHeight: props.cellHeight,
    float: props.float,
    editable: props.editable,
    showGridLines: props.showGridLines,
    handle: props.handle,
    gridOptions: props.gridOptions,
  });

const gridInstance = internalController.gridInstance;
const isInternalUpdating = internalController.isInternalUpdating;
const currentColumn = internalController.currentColumn;
const currentCellHeight = internalController.cellHeight;

let resizeObserver: ResizeObserver | null = null;

const updateResponsiveLayout = (width: number): void => {
  if (width <= 0) {
    return;
  }
  const targetCol = resolveResponsiveColumns(width, props.breakpoints, props.column);
  if (targetCol !== currentColumn.value) {
    currentColumn.value = targetCol;
    if (gridInstance.value) {
      gridInstance.value.column(targetCol);
    }
    emit('breakpointChange', { width, column: targetCol });
  }
};

const setupResizeObserver = (): void => {
  if (typeof ResizeObserver === 'undefined' || !containerRef.value) {
    return;
  }
  if (!props.responsive && !props.breakpoints) {
    return;
  }

  resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      updateResponsiveLayout(entry.contentRect.width);
    }
  });

  resizeObserver.observe(containerRef.value);
};

// 向上提供全局网格上下文
provide(
  GRID_LAYOUT_KEY,
  internalController as unknown as UseGridLayoutReturn<Record<string, unknown>>,
);

/**
 * 监听 GridStack 节点坐标与尺寸变更。
 */
const handleGridChange = (_event: Event, nodes: GridStackNode[]): void => {
  if (isInternalUpdating.value || !Array.isArray(nodes) || nodes.length === 0) {
    return;
  }

  isInternalUpdating.value = true;
  const currentList = Array.isArray(props.layout) ? props.layout : [];

  const nextLayout = currentList.map(item => {
    const matched = nodes.find(n => String(n.id) === String(item.id));
    if (matched) {
      return {
        ...item,
        x: matched.x,
        y: matched.y,
        w: matched.w,
        h: matched.h,
      };
    }
    return item;
  });

  emit('update:layout', nextLayout);
  emit('change', nextLayout);

  nextTick(() => {
    isInternalUpdating.value = false;
  });
};

onMounted(() => {
  if (!containerRef.value) {
    return;
  }

  const effectiveHandle = props.draggableEntireItem ? undefined : props.handle;

  const options: GridStackOptions = {
    column: props.column,
    cellHeight: props.cellHeight,
    margin: props.margin,
    float: props.float,
    staticGrid: !props.editable,
    handle: effectiveHandle,
    animate: true,
    ...props.gridOptions,
  };

  const grid = GridStack.init(options, containerRef.value);
  gridInstance.value = grid;

  if (props.dragIn && typeof GridStack.setupDragIn === 'function') {
    GridStack.setupDragIn(props.dragIn, props.dragInOptions);
  }

  setupResizeObserver();

  grid.on('change', (event: Event, items: GridStackNode[]) => {
    handleGridChange(event, items);
  });

  grid.on('dropped', (_event: Event, _prevNode: GridStackNode, newNode: GridStackNode) => {
    if (!newNode) {
      return;
    }

    let parsedData: unknown = undefined;
    if (newNode.el) {
      const payloadStr =
        newNode.el.getAttribute('data-payload') ||
        newNode.el.querySelector('[data-payload]')?.getAttribute('data-payload');
      if (payloadStr) {
        try {
          parsedData = JSON.parse(payloadStr);
        } catch {
          parsedData = undefined;
        }
      }
    }

    const newId =
      newNode.id || 'grid-item-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);

    const newItem: GridLayoutItem<T> = {
      id: newId,
      x: newNode.x,
      y: newNode.y,
      w: newNode.w ?? 1,
      h: newNode.h ?? 1,
      minW: newNode.minW,
      minH: newNode.minH,
      maxW: newNode.maxW,
      maxH: newNode.maxH,
      data: parsedData as T,
    };

    if (newNode.el) {
      grid.removeWidget(newNode.el, true, false);
    }

    const currentList = Array.isArray(props.layout) ? [...props.layout] : [];
    const nextList = [...currentList, newItem];
    emit('update:layout', nextList);
    emit('change', nextList);
    emit('dropItem', newItem);
  });

  grid.on('dragstart', (_event: Event, el: HTMLElement) => {
    const id = el.getAttribute('gs-id');
    internalController.activeDraggingId.value = id;
    if (id) {
      emit('dragstart', id);
    }
  });

  grid.on('dragstop', (_event: Event, el: HTMLElement) => {
    internalController.activeDraggingId.value = null;
    const id = el.getAttribute('gs-id');
    if (id) {
      emit('dragstop', id);
    }
  });

  grid.on('resizestart', (_event: Event, el: HTMLElement) => {
    const id = el.getAttribute('gs-id');
    internalController.activeResizingId.value = id;
    if (id) {
      emit('resizestart', id);
    }
  });

  grid.on('resizestop', (_event: Event, el: HTMLElement) => {
    internalController.activeResizingId.value = null;
    const id = el.getAttribute('gs-id');
    if (id) {
      emit('resizestop', id);
    }
  });
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (gridInstance.value) {
    // 依据 ADR-0045，严格保留 DOM 节点让 Vue 自行安全卸载，杜绝 double-unmount 崩溃
    gridInstance.value.destroy(false);
    gridInstance.value = null;
  }
});

// 监听响应式配置热切换
watch([() => props.responsive, () => props.breakpoints], ([newResponsive, newBreakpoints]) => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (newResponsive || newBreakpoints) {
    setupResizeObserver();
  }
});

// 监听可编辑态热切换
watch(
  () => props.editable,
  val => {
    if (gridInstance.value) {
      gridInstance.value.setStatic(!val);
    }
  },
);

// 监听浮动模式热切换
watch(
  () => props.float,
  val => {
    if (gridInstance.value) {
      gridInstance.value.float(val);
      if (!val) {
        internalController.tidyLayout();
      }
    }
  },
);

// 监听列数切换
watch(
  () => props.column,
  val => {
    if (val && !props.responsive && !props.breakpoints) {
      internalController.setColumn(val);
    }
  },
);

// 监听行高切换
watch(
  () => props.cellHeight,
  val => {
    if (val) {
      internalController.setCellHeight(val);
    }
  },
);

const gridStyle = computed(() => {
  const heightVal =
    typeof currentCellHeight.value === 'number'
      ? `${currentCellHeight.value}px`
      : currentCellHeight.value === 'auto'
        ? '80px'
        : String(currentCellHeight.value);
  return {
    '--at-grid-columns': String(currentColumn.value),
    '--at-grid-cell-height': heightVal,
  };
});

defineExpose({
  grid: gridInstance,
  controller: internalController,
  container: containerRef,
  currentColumn,
  cellHeight: currentCellHeight,
  setColumn: internalController.setColumn,
  setCellHeight: internalController.setCellHeight,
  setFloat: internalController.setFloat,
  setEditable: internalController.setEditable,
  setShowGridLines: internalController.setShowGridLines,
  tidy: internalController.tidyLayout,
  tidyLayout: internalController.tidyLayout,
});
</script>

<template>
  <div
    ref="containerRef"
    class="grid-stack at-grid-layout"
    :class="{
      'at-grid-layout--grid-lines': showGridLines,
      'at-grid-layout--editable': editable,
    }"
    :style="gridStyle"
  >
    <slot />
  </div>
</template>

<style scoped>
.at-grid-layout {
  position: relative;
  width: 100%;
  box-sizing: border-box;
}
</style>
