/**
 * @atengk/grid-layout-vue 类型契约定义。
 *
 * 遵循 ADR-0045，定义强类型泛型 GridLayoutItem<T>、配置项与状态机类型。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import type { GridStack, GridStackOptions } from 'gridstack';
import type { Ref, ShallowRef } from 'vue';

/**
 * 网格布局项泛型接口。
 */
export interface GridLayoutItem<T = Record<string, unknown>> {
  /** 布局项唯一标识符 (主键) */
  id: string | number;
  /** 网格 X 坐标 (列索引，从 0 开始；缺省或 autoPosition 时由引擎自动寻空) */
  x?: number;
  /** 网格 Y 坐标 (行索引，从 0 开始；缺省或 autoPosition 时由引擎自动寻空) */
  y?: number;
  /** 网格宽度跨度 (占据的列数，默认 1) */
  w?: number;
  /** 网格高度跨度 (占据的行数，默认 1) */
  h?: number;
  /** 最小允许宽度跨度 */
  minW?: number;
  /** 最小允许高度跨度 */
  minH?: number;
  /** 最大允许宽度跨度 */
  maxW?: number;
  /** 最大允许高度跨度 */
  maxH?: number;
  /** 是否锁定位置与尺寸 (禁止任何移动与缩放) */
  locked?: boolean;
  /** 是否禁止调整尺寸 */
  noResize?: boolean;
  /** 是否禁止拖拽移动 */
  noMove?: boolean;
  /** 是否标记为静态项 (脱离拖拽计算，但参与碰撞阻挡) */
  static?: boolean;
  /** 是否开启自动寻找空位插入 (当 x, y 缺省或为 true 时生效) */
  autoPosition?: boolean;
  /** 业务自定义强类型载荷数据 */
  data?: T;
}

/**
 * 响应式多列断点映射配置。
 */
export interface GridResponsiveBreakpoints {
  /** 超小屏断点 (默认 < 576px，列数 1) */
  xs?: number;
  /** 小屏断点 (默认 < 768px，列数 2) */
  sm?: number;
  /** 中屏断点 (默认 < 992px，列数 6) */
  md?: number;
  /** 大屏断点 (默认 >= 1200px，列数 12) */
  lg?: number;
}

/**
 * useGridLayout 状态机初始化选项。
 */
export interface UseGridLayoutOptions<T = Record<string, unknown>> {
  /** 初始布局项集合 */
  initialLayout?: GridLayoutItem<T>[];
  /** 列数 (默认 12) */
  column?: number;
  /** 默认行高 (默认 '80px') */
  cellHeight?: number | string;
  /** 是否允许自由浮动 (默认 false，即开启垂直紧凑吸附) */
  float?: boolean;
  /** 是否处于编辑态 (默认 false，即运行态) */
  editable?: boolean;
  /** 是否展示辅助参考线 (默认 false) */
  showGridLines?: boolean;
  /** 拖拽手柄选择器 (默认 '.at-grid-drag-handle, .at-grid-item__header') */
  handle?: string;
  /** 是否开启响应式容器断点 */
  responsive?: boolean;
  /** 响应式断点配置 */
  breakpoints?: GridResponsiveBreakpoints;
  /** 底层 GridStack 原生选项透传 */
  gridOptions?: GridStackOptions;
}

/**
 * useGridLayout 状态机返回值接口。
 */
export interface UseGridLayoutReturn<T = Record<string, unknown>> {
  /** 响应式布局数据流 */
  layout: Ref<GridLayoutItem<T>[]>;
  /** 底层 GridStack 驱动器实例引用 */
  gridInstance: ShallowRef<GridStack | null>;
  /** 是否正在执行内部更新 (原子互斥锁) */
  isInternalUpdating: Ref<boolean>;
  /** 是否处于编辑态 */
  editable: Ref<boolean>;
  /** 是否允许自由浮动 */
  float: Ref<boolean>;
  /** 是否展示参考线 */
  showGridLines: Ref<boolean>;
  /** 当前栅格列数 */
  currentColumn: Ref<number>;
  /** 当前行高配置 */
  cellHeight: Ref<number | string>;
  /** 动态切换浮动模式 */
  setFloat: (val: boolean) => void;
  /** 动态切换编辑态 */
  setEditable: (val: boolean) => void;
  /** 动态切换参考线显隐 */
  setShowGridLines: (val: boolean) => void;
  /** 动态切换列数 */
  setColumn: (val: number) => void;
  /** 动态切换行高 */
  setCellHeight: (val: number | string) => void;
  /** 批量更新布局 */
  setLayout: (newLayout: GridLayoutItem<T>[]) => void;
  /** 添加布局项 */
  addItem: (item: GridLayoutItem<T>) => void;
  /** 移除布局项 */
  removeItem: (id: string | number) => void;
  /** 更新指定布局项 */
  updateItem: (id: string | number, partial: Partial<GridLayoutItem<T>>) => void;
  /** 一键规整消除空洞 */
  tidyLayout: () => void;
  /** 销毁实例 */
  destroy: () => void;
}

/**
 * GridItemContext 依赖注入契约。
 */
export interface GridItemContext<T = Record<string, unknown>> {
  /** 当前项数据 */
  item: Ref<GridLayoutItem<T>>;
  /** 是否正在拖拽中 */
  isDragging: Ref<boolean>;
  /** 是否正在调整尺寸中 */
  isResizing: Ref<boolean>;
  /** 是否处于锁定态 */
  isLocked: Ref<boolean>;
  /** 像素宽度 */
  pixelWidth: Ref<number>;
  /** 像素高度 */
  pixelHeight: Ref<number>;
}
