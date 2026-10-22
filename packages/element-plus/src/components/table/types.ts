/**
 * AtengTable 核心表格容器类型契约定义。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { ComputedRef, ShallowRef } from 'vue';
import type { TableInstance } from 'element-plus';
import type { UsePaginationResult } from '@atengk/vue';

/**
 * 表格列配置元数据接口。
 */
export interface TableColumnConfig {
  /**
   * 对应列内容的字段名。
   */
  prop?: string;

  /**
   * 列头显示的标题。
   */
  label?: string;

  /**
   * 对应列的宽度。
   */
  width?: string | number;

  /**
   * 对应列的最小宽度。
   */
  minWidth?: string | number;

  /**
   * 列是否固定在左侧或右侧。
   */
  fixed?: boolean | 'left' | 'right';

  /**
   * 对应列是否可以排序。
   */
  sortable?: boolean | 'custom';

  /**
   * 对齐方式。
   */
  align?: 'left' | 'center' | 'right';

  /**
   * 特殊列类型（多选、序号、展开行等）。
   */
  type?: 'default' | 'selection' | 'index' | 'expand';

  /**
   * 列是否显示，默认为 true。
   */
  visible?: boolean;

  /**
   * 其他透传扩展属性。
   */
  [key: string]: unknown;
}

/**
 * 表格行高密度类型。
 */
export type TableDensity = 'large' | 'default' | 'small';

/**
 * 内置工具栏原子工具项。
 */
export type TableToolItem = 'refresh' | 'density' | 'stripe' | 'column-setting' | 'fullscreen';

/**
 * AtengTable 属性接口。
 */
export interface AtengTableProps<T = Record<string, unknown>> {
  /**
   * 显示的数据。
   * @default []
   */
  data?: T[];

  /**
   * 绑定的 @atengk/vue usePagination 状态机实例（双轨绑定模式）。
   */
  pagination?: UsePaginationResult<T>;

  /**
   * 表格列配置数组（纯数据配置列模式）。
   * @default []
   */
  columns?: TableColumnConfig[];

  /**
   * 行数据的唯一标识字段或 Getter 函数（Snowflake 字符串 ID 友好）。
   * @default 'id'
   */
  rowKey?: string | ((row: T) => string);

  /**
   * 是否带有纵向边框。
   * @default true
   */
  border?: boolean;

  /**
   * 是否为斑马纹表格。
   * @default false
   */
  stripe?: boolean;

  /**
   * 表格密度。
   * @default 'default'
   */
  density?: TableDensity;

  /**
   * 是否显示工具栏，或指定启用的原子工具列表。
   * @default true
   */
  tools?: boolean | TableToolItem[];

  /**
   * 用户列配置本地持久化 Storage 键名。
   */
  storageKey?: string;

  /**
   * 是否启用表头拖拽调整列宽与本地持久化记忆。
   * @default true
   */
  enableColumnResize?: boolean;

  /**
   * 列宽拖拽调整的最小安全宽度（px），防止列被意外折叠坍塌。
   * @default 40
   */
  minResizeWidth?: number;

  /**
   * 是否开启视口高度自适应，自动计算表格高度撑满屏幕剩余空间。
   * 若为 number 则表示自定义距离视口底部的预留像素。
   * @default false
   */
  autoHeight?: boolean | number;

  /**
   * 外部受控 Loading 状态。
   */
  loading?: boolean;

  /**
   * 总记录数（离散分页模式）。
   */
  total?: number;

  /**
   * 当前页码（离散分页模式）。
   * @default 1
   */
  pageNum?: number;

  /**
   * 每页条数（离散分页模式）。
   * @default 10
   */
  pageSize?: number;

  /**
   * 每页条数选择器的选项列表。
   * @default [10, 20, 50, 100]
   */
  pageSizes?: number[];

  /**
   * 分页组件布局配置。
   * @default 'total, sizes, prev, pager, next, jumper'
   */
  paginationLayout?: string;

  /**
   * 是否显示底部分页条。未指定时若有 pagination 或 total 则自动为 true。
   */
  showPagination?: boolean;

  /**
   * 是否在有多选选中项时显示底部悬浮批量操作栏。
   * @default true
   */
  showBatchBar?: boolean;

  /**
   * 外部受控异常错误对象（离散模式）。
   */
  error?: unknown;

  /**
   * 空数据时的自定义文案。
   */
  emptyDescription?: string;

  /**
   * 检索无结果时的自定义文案。
   */
  searchEmptyDescription?: string;

  /**
   * 异常状态时的自定义文案。
   */
  errorDescription?: string;

  /**
   * 根容器自定义样式类名。
   */
  customClass?: string;
}

/**
 * AtengTable 事件接口。
 */
export interface AtengTableEmits<T = Record<string, unknown>> {
  /**
   * 多选项改变事件。
   */
  (e: 'selection-change', selection: T[]): void;

  /**
   * 多选项双向更新事件（支持 v-model:selectedRows）。
   */
  (e: 'update:selectedRows', selection: T[]): void;

  /**
   * 排序改变事件。
   */
  (e: 'sort-change', data: { column: unknown; prop: string; order: string | null }): void;

  /**
   * 刷新事件。
   */
  (e: 'refresh'): void;

  /**
   * 密度改变事件。
   */
  (e: 'update:density', density: TableDensity): void;

  /**
   * 斑马纹改变事件。
   */
  (e: 'update:stripe', stripe: boolean): void;

  /**
   * 全屏状态改变事件。
   */
  (e: 'fullscreen-change', fullscreen: boolean): void;

  /**
   * 列显隐或配置变动事件。
   */
  (e: 'columns-change', columns: TableColumnConfig[]): void;

  /**
   * 表头列宽拖拽变动事件。
   *
   * @param newWidth 调整后的列宽（px），已施加防塌陷安全阈值
   * @param oldWidth 调整前的原始列宽（px）
   * @param column Element Plus 表格内部列上下文对象
   * @param event 原生鼠标事件对象
   */
  (
    e: 'header-dragend',
    newWidth: number,
    oldWidth: number,
    column: unknown,
    event: MouseEvent,
  ): void;

  /**
   * 页码更新事件（支持 v-model:pageNum）。
   */
  (e: 'update:pageNum', pageNum: number): void;

  /**
   * 每页条数更新事件（支持 v-model:pageSize）。
   */
  (e: 'update:pageSize', pageSize: number): void;

  /**
   * 分页参数联合变动事件。
   */
  (e: 'pagination-change', data: { pageNum: number; pageSize: number }): void;

  /**
   * 单独页码变动事件。
   */
  (e: 'page-change', pageNum: number): void;

  /**
   * 单独每页条数变动事件。
   */
  (e: 'size-change', pageSize: number): void;
}

/**
 * AtengTable 插槽接口。
 */
export interface AtengTableSlots<T = Record<string, unknown>> {
  /**
   * 默认插槽：放置原生 el-table-column。
   */
  default?: () => unknown;

  /**
   * 检索表单插槽：承载 AtengQueryForm。
   */
  query?: () => unknown;

  /**
   * 工具栏左侧自定义操作插槽。
   */
  'toolbar-left'?: () => unknown;

  /**
   * 工具栏右侧自定义操作插槽。
   */
  'toolbar-right'?: () => unknown;

  /**
   * 自定义表格空状态插槽。
   */
  empty?: () => unknown;

  /**
   * 自定义底部分页条插槽。
   */
  pagination?: () => unknown;

  /**
   * 插入至表格最后一行之后的内容。
   */
  append?: () => unknown;

  /**
   * 批量操作栏自定义操作插槽。
   */
  'batch-actions'?: (scope: { selectedRows: T[]; clearSelection: () => void }) => unknown;
}

/**
 * AtengTable 暴露的实例能力接口。
 */
export interface AtengTableExpose<T = Record<string, unknown>> {
  /**
   * 底层 ElTable 原生组件实例引用。
   */
  tableRef: ShallowRef<TableInstance | undefined>;

  /**
   * 当前表格生效的列元数据列表。
   */
  columns: ComputedRef<TableColumnConfig[]>;

  /**
   * 当前所有选中的数据行。
   */
  selectedRows: ComputedRef<T[]>;

  /**
   * 当前选中的数据行总数。
   */
  selectedCount: ComputedRef<number>;

  /**
   * 清空多选勾选。
   */
  clearSelection: () => void;

  /**
   * 切换某一行选中状态。
   */
  toggleRowSelection: (row: T, selected?: boolean) => void;

  /**
   * 获取当前所有选中的数据行。
   */
  getSelectionRows: () => T[];

  /**
   * 触发表格数据刷新。
   */
  refresh: () => Promise<unknown> | void;
}

/**
 * 专有组件实例类型。
 */
export type AtengTableInstance = AtengTableExpose;
