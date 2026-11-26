/**
 * AtengTable 核心表格容器类型契约定义。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { ComputedRef, ShallowRef } from 'vue';
import type { TableInstance } from 'element-plus';
import type { PageQuery } from '@atengk/core';
import type { UsePaginationResult, UseSelectionResult } from '@atengk/vue';

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
 * 表格容器表面外观模式。
 * - `'card'`：独立表格表面卡片形态，具备圆角、边框与默认内边距（默认）
 * - `'plain'`：扁平无框形态，剥离表面背景/边框/内边距，适配嵌套在 ElCard 或弹窗内的场景
 */
export type TableSurface = 'card' | 'plain';

/**
 * 分页栏主轴分布模式。
 * - `'between'`：总条数居左、其余分页控件靠右两端对齐（默认）
 * - `'end'`：全部控件靠右对齐
 */
export type TablePaginationAlign = 'between' | 'end';

/**
 * 视口高度自适应绑定模式。
 * - `'fixed'`：绑定 ElTable 的 `height`，始终撑满剩余视口高度（默认，保持向后兼容）
 * - `'max'`：绑定 ElTable 的 `max-height`，少数据时随内容收缩，超出视口可用高度时封顶并表内滚动
 */
export type TableAutoHeightMode = 'fixed' | 'max';

/**
 * AtengTable 属性接口。
 *
 * @template T 表格行数据实体模型类型
 * @template TParams 分页检索查询参数类型（需兼容 `PageQuery`）
 */
export interface AtengTableProps<
  T extends object = Record<string, unknown>,
  TParams extends PageQuery = PageQuery,
> {
  /**
   * 显示的数据。
   * @default []
   */
  data?: T[];

  /**
   * 绑定的 @atengk/vue usePagination 状态机实例（双轨绑定模式）。
   */
  pagination?: UsePaginationResult<T, TParams>;

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
   * 是否开启视口高度自适应，自动计算表格可用高度。
   * 若为 number 则表示自定义距离视口底部的预留像素（含 0px）。
   * @default false
   */
  autoHeight?: boolean | number;

  /**
   * 视口高度自适应绑定模式（仅在开启 autoHeight 时生效）。
   * - `'fixed'`：绑定 ElTable 的 `height`，始终撑满剩余视口高度（默认，保持向后兼容）
   * - `'max'`：绑定 ElTable 的 `max-height`，少数据时随内容收缩，超出视口可用高度时封顶并表内滚动
   * @default 'fixed'
   */
  autoHeightMode?: TableAutoHeightMode;

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
  current?: number;

  /**
   * 每页条数（离散分页模式）。
   * @default 10
   */
  size?: number;

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
   * 是否显示底部分页条。未指定时若有 pagination 或 total（且非空或已关闭 hidePaginationOnEmpty）则自动为 true。
   * 显式传入 true 或 false 时拥有最高优先级。
   */
  showPagination?: boolean;

  /**
   * 表格容器外观表面模式（card 独立卡片表面 / plain 扁平无框）。
   * @default 'card'
   */
  surface?: TableSurface;

  /**
   * 底部分页栏主轴分布方式（between 左右两端分布 / end 整体右对齐）。
   * @default 'between'
   */
  paginationAlign?: TablePaginationAlign;

  /**
   * 是否启用基于根容器宽度的窄容器响应式分页降级（<640px 降级 pagerCount 并隐藏 jumper，<480px 进一步隐藏 sizes 并切换小尺寸）。
   * @default true
   */
  responsivePagination?: boolean;

  /**
   * 桌面端默认页码按钮数量（必须为 5~21 之间的奇数，窄容器下将自动收敛至 5）。
   * @default 7
   */
  paginationPagerCount?: number;

  /**
   * 当 total 为 0 且未显式覆盖 showPagination 时，是否自动隐藏底部分页栏。
   * @default true
   */
  hidePaginationOnEmpty?: boolean;

  /**
   * 当数据仅有单页（总页数 <= 1）时，是否自动从布局中收敛隐藏冗余的 jumper 跳页控件。
   * @default true
   */
  hideJumperOnSinglePage?: boolean;

  /**
   * 是否在有多选选中项时显示底部悬浮批量操作栏。
   * @default true
   */
  showBatchBar?: boolean;

  /**
   * 是否开启跨页多选记忆保持。
   * 为 true 时，翻页或调整分页大小将自动保留之前选中的数据行，配合 rowKey 唯一标识生效。
   * @default false
   */
  reserveSelection?: boolean;

  /**
   * 绑定的 @atengk/vue useSelection 跨页多选状态机实例（外部独立受控模式）。
   */
  selection?: UseSelectionResult<T>;

  /**
   * 当前选中的数据行主键集合（支持 v-model:selectedKeys）。
   */
  selectedKeys?: (string | number)[];

  /**
   * 当前选中的数据行实体集合（支持 v-model:selectedRows）。
   */
  selectedRows?: T[];

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
 *
 * @template T 表格行数据实体模型类型
 */
export interface AtengTableEmits<T extends object = Record<string, unknown>> {
  /**
   * 多选项改变事件。
   */
  (e: 'selection-change', selection: T[]): void;

  /**
   * 多选项双向更新事件（支持 v-model:selectedRows）。
   */
  (e: 'update:selectedRows', selection: T[]): void;

  /**
   * 选中的唯一键集合更新事件（支持 v-model:selectedKeys）。
   */
  (e: 'update:selectedKeys', keys: string[]): void;

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
   * 页码更新事件（支持 v-model:current）。
   */
  (e: 'update:current', current: number): void;

  /**
   * 每页条数更新事件（支持 v-model:size）。
   */
  (e: 'update:size', size: number): void;

  /**
   * 分页参数联合变动事件。
   */
  (e: 'pagination-change', data: { current: number; size: number }): void;

  /**
   * 单独页码变动事件。
   */
  (e: 'page-change', current: number): void;

  /**
   * 单独每页条数变动事件。
   */
  (e: 'size-change', size: number): void;

  /**
   * 展开行或树形节点展开状态变化事件。
   */
  (e: 'expand-change', row: T, expandedRows: T[]): void;
  (e: 'expand-change', row: T, expanded: boolean): void;
}

/**
 * AtengTable 插槽接口。
 *
 * @template T 表格行数据实体模型类型
 */
export interface AtengTableSlots<T extends object = Record<string, unknown>> {
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
 *
 * @template T 表格行数据实体模型类型
 */
export interface AtengTableExpose<T extends object = Record<string, unknown>> {
  /**
   * 底层 ElTable 原生组件实例引用。
   */
  tableRef: ShallowRef<TableInstance | undefined>;

  /**
   * 当前表格生效的列元数据列表。
   */
  columns: ComputedRef<TableColumnConfig[]>;

  /**
   * 当前所有选中的数据行主键集合。
   */
  selectedKeys?: ComputedRef<string[]>;

  /**
   * 当前绑定的跨页多选状态机实例（若已开启）。
   */
  selection?: UseSelectionResult<T>;

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
   * 重置列配置至初始默认状态（清空本地持久化存储并还原列排序、显隐与列宽）。
   */
  resetColumns: () => void;

  /**
   * 触发表格数据刷新。
   */
  refresh: () => Promise<unknown> | void;
}

/**
 * 专有组件实例类型。
 *
 * @template T 表格行数据实体模型类型
 */
export type AtengTableInstance<T extends object = Record<string, unknown>> = AtengTableExpose<T>;
