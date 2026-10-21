/**
 * AtengExcelExport 流式导出按钮组件类型定义。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { ComputedRef } from 'vue';

export type ExcelExportMode = 'button' | 'dropdown';
export type ExcelExportType = 'all' | 'selected';

/**
 * AtengExcelExport 属性契约。
 */
export interface AtengExcelExportProps {
  /**
   * 导出请求调用动作。
   * 入参接收当前检索条件（全量导出）或选中 ID/行集合（选中导出）。
   */
  action?: (params: Record<string, unknown>) => Promise<unknown>;

  /**
   * 导出的默认文件名（可选，未指定时由后端 Header 或当前时间戳生成）。
   */
  filename?: string;

  /**
   * 独立传入的静态或受控请求参数（优先级高于表格自动感知）。
   */
  params?: Record<string, unknown>;

  /**
   * 独立传入的选中项主键列表。
   */
  selectedIds?: (string | number)[];

  /**
   * 交互形态：纯单按钮（button）或多模下拉菜单（dropdown）。
   * @default 'button'
   */
  mode?: ExcelExportMode;

  /**
   * 按钮主题类型。
   * @default 'primary'
   */
  type?: '' | 'default' | 'primary' | 'success' | 'warning' | 'info' | 'danger';

  /**
   * 按钮尺寸。
   */
  size?: 'large' | 'default' | 'small';

  /**
   * 是否朴素按钮。
   */
  plain?: boolean;

  /**
   * 是否圆角按钮。
   */
  round?: boolean;

  /**
   * 按钮显示文案。
   * @default '导出数据'
   */
  text?: string;

  /**
   * 是否禁用导出按钮。
   * @default false
   */
  disabled?: boolean;

  /**
   * 外部受控 loading 覆盖。
   */
  loading?: boolean;

  /**
   * 根容器自定义样式类名。
   */
  customClass?: string;
}

/**
 * AtengExcelExport 事件契约。
 */
export interface AtengExcelExportEmits {
  /**
   * 导出开始前触发。
   */
  (e: 'export-start', mode: ExcelExportType): void;

  /**
   * 导出请求成功完成后触发。
   */
  (e: 'export-success', result: unknown): void;

  /**
   * 导出发生异常或被拦截时触发。
   */
  (e: 'export-error', error: unknown): void;
}

/**
 * AtengExcelExport 插槽契约。
 */
export interface AtengExcelExportSlots {
  /**
   * 按钮内部自定义内容插槽。
   */
  default?: (scope: { loading: boolean }) => unknown;
}

/**
 * AtengExcelExport 暴露能力实例。
 */
export interface AtengExcelExportExpose {
  /**
   * 手动触发导出逻辑。
   */
  triggerExport: (exportType?: ExcelExportType) => Promise<void>;

  /**
   * 当前是否处于导出 Loading 锁中。
   */
  isLoading: ComputedRef<boolean>;
}

/**
 * 组件 Ref 专有实例类型。
 */
export type AtengExcelExportInstance = AtengExcelExportExpose;
