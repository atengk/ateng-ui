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
}
