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
