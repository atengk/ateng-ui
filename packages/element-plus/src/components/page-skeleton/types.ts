/**
 * 页面骨架屏占位容器组件类型契约。
 *
 * @author Ateng
 * @since 2026-10-22
 */

/**
 * 预设骨架屏形态。
 */
export type AtengSkeletonType = 'table' | 'form' | 'detail' | 'card' | 'dashboard' | 'custom';

/**
 * AtengPageSkeleton 属性契约。
 */
export interface AtengPageSkeletonProps {
  /**
   * 是否处于加载状态。
   * 默认 true。
   */
  loading?: boolean;

  /**
   * 预设骨架屏形态：'table'（搜索表单+表格）| 'form'（栅格表单）| 'detail'（详情键值）| 'card'（卡片网格）| 'dashboard'（指标看板+双图表）| 'custom'（纯自定义）。
   * 默认 'table'。
   */
  type?: AtengSkeletonType;

  /**
   * 是否带有骨架屏波浪闪烁动效。
   * 默认 true。
   */
  animated?: boolean;

  /**
   * 模拟渲染行数。
   * 默认 5。
   */
  rows?: number;

  /**
   * 模拟渲染列数（卡片网格或表单栅格）。
   * 默认 3。
   */
  columns?: number;

  /**
   * 表格各列宽度自定义数组（支持数字 px 或字符串百分比/px，如 [120, '25%', '20%']）。
   * 仅在 type='table' 时生效。若未指定则默认使用 5 列自适应比例。
   */
  columnWidths?: (string | number)[];

  /**
   * 表格底部是否渲染模拟假分页栏骨架。
   * 默认 false。
   */
  showPagination?: boolean;

  /**
   * 表格顶部是否渲染模拟搜索筛选区骨架。
   * 默认 true。若为 false 则隐藏检索区，适应无查询区纯表格场景。
   */
  showHeader?: boolean;
}

/**
 * AtengPageSkeleton 插槽契约。
 */
export interface AtengPageSkeletonSlots {
  /**
   * 真实业务视图内容插槽（包装容器模式）。
   */
  default?: () => unknown;
  /**
   * 自定义骨架屏内容插槽。
   */
  skeleton?: () => unknown;
}
