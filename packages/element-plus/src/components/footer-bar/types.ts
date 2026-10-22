/**
 * 企业级吸底操作栏组件类型契约。
 *
 * @author Ateng
 * @since 2026-10-22
 */

/**
 * AtengFooterBar 定位模式。
 */
export type AtengFooterBarPosition = 'sticky' | 'fixed';

/**
 * AtengFooterBar 属性契约。
 */
export interface AtengFooterBarProps {
  /**
   * 定位模式：'sticky'（吸附在当前滚动容器底部，默认）| 'fixed'（悬浮在屏幕视口底部）。
   */
  position?: AtengFooterBarPosition;

  /**
   * 在 fixed 模式下，是否在文档流末尾渲染等高占位垫块，彻底防止底部数据被悬浮操作栏遮挡。
   * 默认 true。
   */
  placeholder?: boolean;

  /**
   * 操作栏高度。
   * 默认 56（即 56px）。
   */
  height?: number | string;

  /**
   * 定位层级。
   * 默认 99。
   */
  zIndex?: number;

  /**
   * 是否显示顶部分割线。
   * 默认 true。
   */
  bordered?: boolean;

  /**
   * 在 fixed 模式下距窗口左侧的偏移量（通常用于避让系统侧边栏宽度）。
   * 默认 'auto'。
   */
  leftOffset?: number | string;

  /**
   * 是否开启父级/目标容器智能对齐与尺寸避让。
   * 开启后在 fixed 模式下基于 ResizeObserver 动态计算 left 与 width，自适应侧边栏折叠与容器尺寸变化。
   * 默认 false。
   */
  autoOffset?: boolean;

  /**
   * 智能对齐的目标容器选择器（CSS Selector）或 DOM 节点。
   * 未显式指定时，默认向上寻找最近的 '.at-page-container' 容器，或 fallback 至父容器。
   */
  target?: string | HTMLElement;
}
