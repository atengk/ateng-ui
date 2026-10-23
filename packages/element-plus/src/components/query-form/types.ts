/**
 * AtengQueryForm 查询表单容器类型契约定义。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { Ref } from 'vue';
import type { FormInstance } from 'element-plus';
import type { UsePaginationResult } from '@atengk/vue';

/**
 * 响应式列数断点配置。
 */
export interface QueryFormResponsiveCols {
  /** 视口 < 768px */
  xs?: number;
  /** 视口 768px ~ 992px */
  sm?: number;
  /** 视口 992px ~ 1200px */
  md?: number;
  /** 视口 1200px ~ 1920px */
  lg?: number;
  /** 视口 ≥ 1920px */
  xl?: number;
}

/**
 * AtengQueryForm 属性接口。
 */
export interface AtengQueryFormProps<T = Record<string, unknown>> {
  /**
   * 表单数据模型对象。
   */
  model?: T;

  /**
   * 绑定的 @atengk/vue usePagination 异步分页状态机实例。
   * 传入后表单数据模型自动绑定 pagination.query，点击查询调用 pagination.search()，重置调用 pagination.reset()，查询 loading 自动联动。
   */
  pagination?: UsePaginationResult<T>;

  /**
   * 是否在输入框按下 Enter 键时自动触发搜索。
   * 内置输入法 IME 组合态防御（中文拼音输入按回车不触发）。
   * @default true
   */
  enterSearch?: boolean;

  /**
   * 栅格列数。支持固定数值（1~4）或响应式断点对象。
   * 默认按断点自适应（<768: 1, 768~1200: 2, 1200~1920: 3, ≥1920: 4）。
   */
  cols?: number | QueryFormResponsiveCols;

  /**
   * 是否处于折叠状态（受控属性）。
   */
  collapsed?: boolean;

  /**
   * 初始默认是否处于折叠状态（非受控模式）。
   * @default true
   */
  defaultCollapsed?: boolean;

  /**
   * 折叠状态下常驻展示的行数（每行容纳当前列数）。
   * 展开操作区将吸附在常驻展示的最后一行末尾。
   * @default 1
   */
  collapsedRows?: number;

  /**
   * 是否显示折叠/展开切换按钮。
   * @default true
   */
  showCollapse?: boolean;

  /**
   * 表单项标签宽度，透传至 ElForm。
   * @default ''
   */
  labelWidth?: string | number;

  /**
   * 标签文本对齐位置，透传至 ElForm。
   * @default 'right'
   */
  labelPosition?: 'right' | 'left' | 'top';

  /**
   * 查询按钮文案。
   * @default '查询'
   */
  searchText?: string;

  /**
   * 重置按钮文案。
   * @default '重置'
   */
  resetText?: string;

  /**
   * 收起按钮文案。
   * @default '收起'
   */
  collapseText?: string;

  /**
   * 展开按钮文案。
   * @default '展开'
   */
  expandText?: string;

  /**
   * 是否显示查询按钮。
   * @default true
   */
  showSearch?: boolean;

  /**
   * 是否显示重置按钮。
   * @default true
   */
  showReset?: boolean;

  /**
   * 点击重置按钮后是否自动触发表单查询与表格上下文重置。
   * @default true
   */
  autoSearchOnReset?: boolean;

  /**
   * 查询按钮 Loading 状态。
   * @default false
   */
  searchLoading?: boolean;

  /**
   * 表单是否处于全局禁用状态。
   * @default false
   */
  disabled?: boolean;

  /**
   * 表单项之间的水平栅格间距 (px)。
   * @default 16
   */
  gutter?: number;

  /**
   * 根容器自定义样式类名。
   */
  customClass?: string;
}

/**
 * AtengQueryForm 事件接口。
 */
export interface AtengQueryFormEmits<T = Record<string, unknown>> {
  /**
   * 折叠状态双向绑定更新事件。
   */
  (e: 'update:collapsed', val: boolean): void;

  /**
   * 折叠/展开状态变更事件。
   */
  (e: 'collapse', val: boolean): void;

  /**
   * 触发查询事件，携带当前表单数据模型。
   */
  (e: 'search', model: T): void;

  /**
   * 触发重置事件。
   */
  (e: 'reset'): void;
}

/**
 * AtengQueryForm 插槽接口。
 */
export interface AtengQueryFormSlots<T = Record<string, unknown>> {
  /**
   * 默认插槽：承载查询表单控件与 el-form-item 节点。
   */
  default?: () => unknown;

  /**
   * 操作栏插槽：允许完全自定义操作区按钮。
   */
  action?: (scope: {
    collapsed: boolean;
    toggle: () => void;
    search: () => void;
    reset: () => void;
    model?: T;
  }) => unknown;

  /**
   * 额外扩展插槽：在操作按钮旁追加自定义业务按钮。
   */
  extra?: () => unknown;
}

/**
 * AtengQueryForm 暴露的组件实例能力。
 */
export interface AtengQueryFormExpose<T = Record<string, unknown>> {
  /**
   * 底层 ElForm 原生实例引用。
   */
  formRef: Ref<FormInstance | undefined>;

  /**
   * 表单校验方法。
   */
  validate: (callback?: (valid: boolean) => void) => Promise<boolean>;

  /**
   * 清空校验提示。
   */
  clearValidate: (props?: string | string[]) => void;

  /**
   * 重置表单字段并移除校验提示。
   */
  resetFields: () => void;

  /**
   * 手动触发表单查询。
   * 支持传入覆盖或局部搜索参数。
   */
  search: (overrideModel?: T) => void;

  /**
   * 手动触发表单重置。
   */
  reset: () => void;

  /**
   * 切换折叠/展开状态。
   */
  toggleCollapse: () => void;

  /**
   * 当前折叠状态响应式引用。
   */
  collapsed: Ref<boolean>;
}

/**
 * 专有组件实例类型。
 */
export type AtengQueryFormInstance<T = Record<string, unknown>> = AtengQueryFormExpose<T>;
