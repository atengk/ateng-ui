/**
 * 企业级弹性分栏布局容器类型契约。
 *
 * @author Ateng
 * @since 2026-10-22
 */

/**
 * 分栏方向。
 */
export type AtengSplitDirection = 'horizontal' | 'vertical';

/**
 * 折叠把手面向的目标分栏。
 * 'first'（默认，收起首栏左/上）| 'second'（收起次栏右/下）| 'both'（渲染双向把手）。
 */
export type AtengSplitCollapseTarget = 'first' | 'second' | 'both';

/**
 * AtengSplitLayout 属性契约。
 */
export interface AtengSplitLayoutProps {
  /**
   * 分栏方向：'horizontal'（水平左右分栏，默认）| 'vertical'（垂直上下分栏）。
   */
  direction?: AtengSplitDirection;

  /**
   * 首栏主尺寸（支持受控 v-model）。
   * 支持纯数字像素（如 260）或字符串（如 '260px'、'30%'）。
   */
  modelValue?: number | string;

  /**
   * 默认初始尺寸，默认 '260px'。
   */
  defaultSize?: number | string;

  /**
   * 首栏最小尺寸限制，防止过度压缩。
   * 默认 '120px'。
   */
  min?: number | string;

  /**
   * 首栏最大尺寸限制，防止挤占主体。
   * 默认 '80%'。
   */
  max?: number | string;

  /**
   * 分割线中间是否渲染一键折叠把手。
   * 默认 true。
   */
  collapsible?: boolean;

  /**
   * 折叠把手面向的目标栏：'first'（首栏）| 'second'（次栏）| 'both'（双向把手）。
   * 默认 'first'。
   */
  collapseTarget?: AtengSplitCollapseTarget;

  /**
   * 是否处于首栏折叠状态（支持受控 v-model:collapsed）。
   * 默认 false。
   */
  collapsed?: boolean;

  /**
   * 折叠后的首栏尺寸。
   * 默认 0。
   */
  collapseSize?: number | string;

  /**
   * 是否处于次栏折叠状态（支持受控 v-model:secondCollapsed）。
   * 默认 false。
   */
  secondCollapsed?: boolean;

  /**
   * 折叠后的次栏尺寸。
   * 默认 0。
   */
  secondCollapseSize?: number | string;

  /**
   * 本地存储持久化 Key。
   * 若提供，将在用户拖拽调宽或折叠时自动记忆，并在页面重新加载时自动还原。
   */
  storageKey?: string;

  /**
   * 是否禁用拖拽调宽。
   * 默认 false。
   */
  disabled?: boolean;
}

/**
 * AtengSplitLayout 事件契约。
 */
export interface AtengSplitLayoutEmits {
  /**
   * 尺寸更新时触发（双向绑定）。
   */
  (e: 'update:modelValue', size: number | string): void;

  /**
   * 首栏折叠状态更新时触发（双向绑定）。
   */
  (e: 'update:collapsed', val: boolean): void;

  /**
   * 次栏折叠状态更新时触发（双向绑定）。
   */
  (e: 'update:secondCollapsed', val: boolean): void;

  /**
   * 拖拽调整大小时实时派发（单位 px）。
   */
  (e: 'resize', size: number): void;

  /**
   * 首栏折叠状态发生切换时派发。
   */
  (e: 'collapse', val: boolean): void;

  /**
   * 次栏折叠状态发生切换时派发。
   */
  (e: 'secondCollapse', val: boolean): void;
}
