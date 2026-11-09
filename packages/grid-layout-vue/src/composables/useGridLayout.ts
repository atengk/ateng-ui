/**
 * @atengk/grid-layout-vue useGridLayout 无头状态机。
 *
 * 遵循 ADR-0045，提供网格布局数据流、原子互斥锁与底层 GridStack 驱动器绑定接口。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { computed, ref, shallowRef, toRaw } from 'vue';
import type { GridStack } from 'gridstack';
import type { GridLayoutItem, UseGridLayoutOptions, UseGridLayoutReturn } from '../types';
import { findFirstAvailableSlot } from '../utils/autoPosition';
import { sanitizeLayout } from '../utils/sanitizer';

/**
 * 网格布局核心无头状态机。
 *
 * @param options 状态机初始化选项
 * @returns 布局状态机接口
 */
export function useGridLayout<T = Record<string, unknown>>(
  options: UseGridLayoutOptions<T> = {},
): UseGridLayoutReturn<T> {
  // 1. 响应式布局数据集合 (空安全保底 [])
  const layout = ref<GridLayoutItem<T>[]>(
    Array.isArray(options.initialLayout) ? [...options.initialLayout] : [],
  ) as UseGridLayoutReturn<T>['layout'];

  // 2. 底层 GridStack 实例浅响应引用 (避免深层响应式代理污染原生 DOM)
  const gridInstance = shallowRef<GridStack | null>(null);

  // 3. 原子更新互斥锁 (阻断 GridStack 事件与 Vue 响应式回流循环)
  const isInternalUpdating = ref(false);

  // 4. 状态标记
  const editable = ref(options.editable ?? false);
  const float = ref(options.float ?? false);
  const showGridLines = ref(options.showGridLines ?? false);
  const currentColumn = ref(options.column ?? 12);
  const cellHeight = ref(options.cellHeight ?? '80px');
  const activeDraggingId = ref<string | number | null>(null);
  const activeResizingId = ref<string | number | null>(null);

  // 5. 最大化与手风琴折叠状态机
  const maximizedId = ref<string | number | null>(null);
  const collapsedIds = ref<Set<string | number>>(new Set());

  // 原始快照缓存 (保留原始几何属性与缩放控制)
  const originalRects = new Map<
    string,
    {
      x?: number;
      y?: number;
      w?: number;
      h?: number;
      noResize?: boolean;
      noMove?: boolean;
    }
  >();
  const originalHeights = new Map<
    string,
    {
      h: number;
      noResize?: boolean;
    }
  >();

  // 6. 不可变快照历史栈与持久化机制
  const cloneData = (data: GridLayoutItem<T>[]): GridLayoutItem<T>[] => {
    try {
      if (typeof structuredClone === 'function') {
        return structuredClone(toRaw(data));
      }
    } catch {
      // 容灾降级
    }
    return JSON.parse(JSON.stringify(toRaw(data)));
  };

  const basePreset = cloneData(layout.value);
  const maxHistory = options.maxHistory ?? 20;

  const historyStack = shallowRef<GridLayoutItem<T>[][]>([cloneData(layout.value)]);
  const historyIndex = ref(0);

  const canUndo = computed(() => historyIndex.value > 0);
  const canRedo = computed(() => historyIndex.value < historyStack.value.length - 1);

  /**
   * 手动或自动记录当前布局快照。
   */
  const recordSnapshot = (): void => {
    const currentList = historyStack.value.slice(0, historyIndex.value + 1);
    currentList.push(cloneData(layout.value));
    if (currentList.length > maxHistory + 1) {
      currentList.shift();
    }
    historyStack.value = currentList;
    historyIndex.value = currentList.length - 1;
  };

  /**
   * 撤销一步布局操作。
   */
  const undo = (): void => {
    if (!canUndo.value) {
      return;
    }
    historyIndex.value--;
    const snapshot = historyStack.value[historyIndex.value];
    if (snapshot) {
      layout.value = cloneData(snapshot);
      tidyLayout();
    }
  };

  /**
   * 重做一步布局操作。
   */
  const redo = (): void => {
    if (!canRedo.value) {
      return;
    }
    historyIndex.value++;
    const snapshot = historyStack.value[historyIndex.value];
    if (snapshot) {
      layout.value = cloneData(snapshot);
      tidyLayout();
    }
  };

  /**
   * 清空历史快照栈。
   */
  const clearHistory = (): void => {
    historyStack.value = [cloneData(layout.value)];
    historyIndex.value = 0;
  };

  /**
   * 将当前布局持久化保存至 localStorage。
   */
  const saveToStorage = (key?: string): void => {
    const effectiveKey = key ?? options.storageKey;
    if (!effectiveKey || typeof localStorage === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(effectiveKey, JSON.stringify(layout.value));
    } catch (err) {
      console.error('saveToStorage failed:', err);
    }
  };

  /**
   * 从 localStorage 读取草稿并容灾清洗自愈。
   */
  const loadFromStorage = (key?: string): boolean => {
    const effectiveKey = key ?? options.storageKey;
    if (!effectiveKey || typeof localStorage === 'undefined') {
      return false;
    }
    try {
      const val = localStorage.getItem(effectiveKey);
      if (!val) {
        return false;
      }
      const parsed = JSON.parse(val);
      const clean = sanitizeLayout<T>(parsed, currentColumn.value);
      if (clean.length > 0) {
        layout.value = clean;
        recordSnapshot();
        tidyLayout();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  /**
   * 一键恢复出厂初始预设布局。
   */
  const resetLayout = (): void => {
    layout.value = cloneData(basePreset);
    recordSnapshot();
    tidyLayout();
  };

  /**
   * 批量替换布局数据。
   */
  const setLayout = (newLayout: GridLayoutItem<T>[]): void => {
    layout.value = Array.isArray(newLayout) ? [...newLayout] : [];
  };

  /**
   * 向网格中添加新项。
   */
  const addItem = (item: GridLayoutItem<T>): void => {
    if (!item || item.id === undefined || item.id === null) {
      return;
    }
    const exists = layout.value.some(existing => String(existing.id) === String(item.id));
    if (!exists) {
      const cloned = { ...item };
      if (cloned.x === undefined || cloned.y === undefined || cloned.autoPosition) {
        const slot = findFirstAvailableSlot(
          layout.value,
          cloned.w ?? 1,
          cloned.h ?? 1,
          currentColumn.value,
        );
        cloned.x = slot.x;
        cloned.y = slot.y;
        cloned.autoPosition = false;
      }
      layout.value.push(cloned);
    }
  };

  /**
   * 依据 ID 移除网格项。
   */
  const removeItem = (id: string | number): void => {
    const strId = String(id);
    if (maximizedId.value !== null && String(maximizedId.value) === strId) {
      maximizedId.value = null;
    }
    originalRects.delete(strId);
    if (collapsedIds.value.has(strId)) {
      const nextSet = new Set(collapsedIds.value);
      nextSet.delete(strId);
      collapsedIds.value = nextSet;
    }
    originalHeights.delete(strId);

    const index = layout.value.findIndex(item => String(item.id) === strId);
    if (index !== -1) {
      layout.value.splice(index, 1);
    }
  };

  /**
   * 检查指定卡片是否处于全视口最大化聚焦态。
   */
  const isMaximized = (id: string | number): boolean => {
    return maximizedId.value !== null && String(maximizedId.value) === String(id);
  };

  /**
   * 检查指定卡片是否处于手风琴折叠态。
   */
  const isCollapsed = (id: string | number): boolean => {
    return collapsedIds.value.has(String(id));
  };

  /**
   * 单卡片全视口聚焦最大化。
   */
  const maximize = (id: string | number): void => {
    const strId = String(id);
    const target = layout.value.find(item => String(item.id) === strId);
    if (!target) {
      return;
    }

    // 若当前已有其他卡片处于最大化，先将其还原
    if (maximizedId.value !== null && String(maximizedId.value) !== strId) {
      restore(maximizedId.value);
    }

    // 保存原始几何快照
    if (!originalRects.has(strId)) {
      originalRects.set(strId, {
        x: target.x,
        y: target.y,
        w: target.w,
        h: target.h,
        noResize: target.noResize,
        noMove: target.noMove,
      });
    }

    // 设置最大化全视口尺寸与坐标
    target.x = 0;
    target.y = 0;
    target.w = currentColumn.value;
    target.h = Math.max(target.h ?? 1, 8);

    maximizedId.value = id;

    // 若底层 GridStack 驱动实例存在，同步底层 DOM 节点
    if (gridInstance.value?.el) {
      const el = gridInstance.value.el.querySelector(`[gs-id="${strId}"]`) as HTMLElement | null;
      if (el) {
        gridInstance.value.update(el, {
          x: 0,
          y: 0,
          w: currentColumn.value,
          h: target.h,
        });
        tidyLayout();
      }
    }
  };

  /**
   * 还原最大化卡片至原始几何坐标与尺寸。
   */
  const restore = (id?: string | number): void => {
    const targetId = id ?? maximizedId.value;
    if (targetId === null || targetId === undefined) {
      return;
    }

    const strId = String(targetId);
    const target = layout.value.find(item => String(item.id) === strId);
    const snap = originalRects.get(strId);

    if (target && snap) {
      target.x = snap.x;
      target.y = snap.y;
      target.w = snap.w;
      target.h = snap.h;
      target.noResize = snap.noResize;
      target.noMove = snap.noMove;

      if (gridInstance.value?.el) {
        const el = gridInstance.value.el.querySelector(`[gs-id="${strId}"]`) as HTMLElement | null;
        if (el) {
          gridInstance.value.update(el, {
            x: snap.x,
            y: snap.y,
            w: snap.w,
            h: snap.h,
            noResize: snap.noResize,
            noMove: snap.noMove,
          });
          tidyLayout();
        }
      }
    }

    originalRects.delete(strId);
    if (String(maximizedId.value) === strId) {
      maximizedId.value = null;
    }
  };

  /**
   * 往返切换指定卡片最大化聚焦。
   */
  const toggleMaximize = (id: string | number): void => {
    if (isMaximized(id)) {
      restore(id);
    } else {
      maximize(id);
    }
  };

  /**
   * 手风琴收缩卡片跨度至 1 行 (并锁定 noResize，触发垂直紧凑排版)。
   */
  const collapse = (id: string | number): void => {
    const strId = String(id);
    const target = layout.value.find(item => String(item.id) === strId);
    if (!target || isCollapsed(id)) {
      return;
    }

    // 记录原始高度与缩放锁控快照
    originalHeights.set(strId, {
      h: target.h ?? 1,
      noResize: target.noResize,
    });

    target.h = 1;
    target.noResize = true;

    const nextSet = new Set(collapsedIds.value);
    nextSet.add(strId);
    collapsedIds.value = nextSet;

    if (gridInstance.value?.el) {
      const el = gridInstance.value.el.querySelector(`[gs-id="${strId}"]`) as HTMLElement | null;
      if (el) {
        gridInstance.value.update(el, {
          h: 1,
          noResize: true,
        });
        tidyLayout();
      }
    }
  };

  /**
   * 手风琴展开卡片恢复原始高度。
   */
  const expand = (id: string | number): void => {
    const strId = String(id);
    const target = layout.value.find(item => String(item.id) === strId);
    if (!target || !isCollapsed(id)) {
      return;
    }

    const snap = originalHeights.get(strId);
    if (snap) {
      target.h = snap.h;
      target.noResize = snap.noResize;
    }
    originalHeights.delete(strId);

    const nextSet = new Set(collapsedIds.value);
    nextSet.delete(strId);
    collapsedIds.value = nextSet;

    if (gridInstance.value?.el) {
      const el = gridInstance.value.el.querySelector(`[gs-id="${strId}"]`) as HTMLElement | null;
      if (el) {
        gridInstance.value.update(el, {
          h: target.h,
          noResize: target.noResize,
        });
        tidyLayout();
      }
    }
  };

  /**
   * 往返切换手风琴折叠状态。
   */
  const toggleCollapse = (id: string | number): void => {
    if (isCollapsed(id)) {
      expand(id);
    } else {
      collapse(id);
    }
  };

  /**
   * 更新指定网格项属性。
   */
  const updateItem = (id: string | number, partial: Partial<GridLayoutItem<T>>): void => {
    const target = layout.value.find(item => String(item.id) === String(id));
    if (target) {
      Object.assign(target, partial);
    }
  };

  /**
   * 动态设置自由浮动模式。
   */
  const setFloat = (val: boolean): void => {
    float.value = Boolean(val);
    if (gridInstance.value) {
      gridInstance.value.float(float.value);
    }
  };

  /**
   * 动态设置编辑态/运行态。
   */
  const setEditable = (val: boolean): void => {
    editable.value = Boolean(val);
    if (gridInstance.value) {
      gridInstance.value.setStatic(!editable.value);
    }
  };

  /**
   * 动态设置参考线显隐。
   */
  const setShowGridLines = (val: boolean): void => {
    showGridLines.value = Boolean(val);
  };

  /**
   * 动态设置栅格列数。
   */
  const setColumn = (val: number): void => {
    if (val > 0) {
      currentColumn.value = val;
      if (gridInstance.value) {
        gridInstance.value.column(val);
      }
    }
  };

  /**
   * 动态设置行高。
   */
  const setCellHeight = (val: number | string): void => {
    cellHeight.value = val;
    if (gridInstance.value) {
      gridInstance.value.cellHeight(val);
    }
  };

  /**
   * 一键垂直紧凑规整。
   */
  const tidyLayout = (): void => {
    if (gridInstance.value) {
      gridInstance.value.compact();
      // 同步最新紧凑排版后的坐标数据
      const nodes = gridInstance.value.save(false) as unknown as Array<{
        id: string | number;
        x: number;
        y: number;
        w: number;
        h: number;
      }>;
      if (Array.isArray(nodes) && nodes.length > 0) {
        isInternalUpdating.value = true;
        layout.value = layout.value.map(item => {
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
        isInternalUpdating.value = false;
      }
    }
  };

  /**
   * 销毁 GridStack 实例 (保留 DOM 节点让 Vue 自行卸载)。
   */
  const destroy = (): void => {
    if (gridInstance.value) {
      gridInstance.value.destroy(false);
      gridInstance.value = null;
    }
    maximizedId.value = null;
    collapsedIds.value = new Set();
    originalRects.clear();
    originalHeights.clear();
    clearHistory();
  };

  return {
    layout,
    gridInstance,
    isInternalUpdating,
    editable,
    float,
    showGridLines,
    activeDraggingId,
    activeResizingId,
    currentColumn,
    cellHeight,
    maximizedId,
    collapsedIds,
    canUndo,
    canRedo,
    undo,
    redo,
    recordSnapshot,
    clearHistory,
    saveToStorage,
    loadFromStorage,
    resetLayout,
    maximize,
    restore,
    toggleMaximize,
    collapse,
    expand,
    toggleCollapse,
    isMaximized,
    isCollapsed,
    setFloat,
    setEditable,
    setShowGridLines,
    setColumn,
    setCellHeight,
    setLayout,
    addItem,
    removeItem,
    updateItem,
    tidyLayout,
    destroy,
  };
}
