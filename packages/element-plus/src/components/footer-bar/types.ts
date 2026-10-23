/**
 * 企业级吸底操作栏组件类型契约。
 *
 * @author Ateng
 * @since 2026-10-22
 */

import type { Ref, ComputedRef } from 'vue';

/**
 * AtengFooterBar 定位模式。
 */
export type AtengFooterBarPosition = 'sticky' | 'fixed';

/**
 * 操作栏按钮主题类型。
 */
export type FooterBarButtonType = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default';

/**
 * 结构化操作按钮配置契约。
 */
export interface FooterBarActionItem {
  /**
   * 唯一标识 key。
   */
  key?: string;

  /**
   * 按钮展示文本。
   */
  label: string;

  /**
   * 按钮主题类型，默认为 'default'。
   */
  type?: FooterBarButtonType;

  /**
   * 是否为朴素按钮。
   */
  plain?: boolean;

  /**
   * 是否禁用。
   */
  disabled?: boolean;

  /**
   * 是否处于加载状态。
   */
  loading?: boolean;

  /**
   * 点击事件回调，支持异步 Promise。
   */
  onClick?: (e: MouseEvent) => void | Promise<unknown>;
}

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

  /**
   * 是否显示提交/保存按钮。若传入 onSubmit 则默认为 true。
   */
  showSubmit?: boolean;

  /**
   * 提交按钮文本，默认为 "提交"。
   */
  submitText?: string;

  /**
   * 提交按钮主题类型，默认为 "primary"。
   */
  submitType?: FooterBarButtonType;

  /**
   * 外部受控的提交按钮 Loading 状态。
   * 当显式传入布尔值时将强制覆盖组件内部自动 loading 状态机。
   */
  submitLoading?: boolean;

  /**
   * 提交按钮绑定的异步执行函数或回调。
   * 若返回 Promise，按钮将自动进入 Loading 互斥防重锁状态直至 Promise 决议。
   */
  onSubmit?: (e: MouseEvent) => void | Promise<unknown>;

  /**
   * 是否显示重置按钮。若传入 onReset 则默认为 true。
   */
  showReset?: boolean;

  /**
   * 重置按钮文本，默认为 "重置"。
   */
  resetText?: string;

  /**
   * 重置按钮点击回调。
   */
  onReset?: (e: MouseEvent) => void | Promise<unknown>;

  /**
   * 是否显示取消/返回按钮。若传入 onCancel 则默认为 true。
   */
  showCancel?: boolean;

  /**
   * 取消按钮文本，默认为 "取消"。
   */
  cancelText?: string;

  /**
   * 取消按钮点击回调。
   */
  onCancel?: (e: MouseEvent) => void | Promise<unknown>;

  /**
   * 结构化操作按钮配置列表。
   */
  actions?: FooterBarActionItem[];
}

/**
 * AtengFooterBar 事件契约。
 */
export interface AtengFooterBarEmits {
  (e: 'submit', event: MouseEvent): void;
  (e: 'submit-error', error: unknown): void;
  (e: 'reset', event: MouseEvent): void;
  (e: 'cancel', event: MouseEvent): void;
}

/**
 * AtengFooterBar 插槽契约。
 */
export interface AtengFooterBarSlots {
  /**
   * 右侧操作按钮区域插槽。
   */
  default?: () => unknown;
  /**
   * 左侧辅助信息与统计展示插槽。
   */
  extra?: () => unknown;
}

/**
 * AtengFooterBar 实例对外暴露门面。
 */
export interface AtengFooterBarExpose {
  /**
   * 操作栏根 DOM 节点引用。
   */
  barRef: Ref<HTMLElement | null>;
  /**
   * 手动触发测量并更新吸底对齐与尺寸偏移。
   */
  updateOffset: () => void;
  /**
   * 响应式提交按钮 Loading 状态。
   */
  submitLoading: ComputedRef<boolean>;
  /**
   * 编程式触发提交操作。
   */
  submit: (e?: MouseEvent) => Promise<void>;
  /**
   * 编程式触发重置操作。
   */
  reset: (e?: MouseEvent) => void;
  /**
   * 编程式触发取消操作。
   */
  cancel: (e?: MouseEvent) => void;
}
