/**
 * @atengk/grid-layout-vue useGridLayout 无头状态机。
 *
 * 遵循 ADR-0045，提供网格布局数据流、原子互斥锁与底层 GridStack 驱动器绑定接口。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref, shallowRef } from 'vue';
import type { GridStack } from 'gridstack';
import type { GridLayoutItem, UseGridLayoutOptions, UseGridLayoutReturn } from '../types';

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
      layout.value.push({ ...item });
    }
  };

  /**
   * 依据 ID 移除网格项。
   */
  const removeItem = (id: string | number): void => {
    const index = layout.value.findIndex(item => String(item.id) === String(id));
    if (index !== -1) {
      layout.value.splice(index, 1);
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
  };

  return {
    layout,
    gridInstance,
    isInternalUpdating,
    editable,
    float,
    showGridLines,
    setFloat,
    setEditable,
    setShowGridLines,
    setLayout,
    addItem,
    removeItem,
    updateItem,
    tidyLayout,
    destroy,
  };
}
