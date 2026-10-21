/**
 * 企业级弹窗容器组件类型契约。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { VNode } from 'vue';

/**
 * AtengDialog 属性契约。
 */
export interface AtengDialogProps {
  /**
   * 是否显示弹窗（支持 v-model）。
   */
  modelValue: boolean;

  /**
   * 弹窗标题。
   */
  title?: string;

  /**
   * 弹窗宽度，默认 '50%'。
   */
  width?: string | number;

  /**
   * 是否受控处于全屏状态。
   */
  fullscreen?: boolean;

  /**
   * 是否在 Header 显示全屏切换图标，默认 true。
   */
  showFullscreen?: boolean;

  /**
   * 是否支持拖拽，默认 true。
   */
  draggable?: boolean;

  /**
   * 内容滚动区域最大高度，默认 'calc(100vh - 160px)'。
   */
  maxHeight?: string | number;

  /**
   * 确定按钮文案，默认 '确定'。
   */
  confirmText?: string;

  /**
   * 取消按钮文案，默认 '取消'。
   */
  cancelText?: string;

  /**
   * 是否展示确定按钮，默认 true。
   */
  showConfirm?: boolean;

  /**
   * 是否展示取消按钮，默认 true。
   */
  showCancel?: boolean;

  /**
   * 确定按钮 loading 状态（受控模式）。
   */
  confirmLoading?: boolean;

  /**
   * 确认前置钩子函数。若返回 Promise，将自动锁定确定按钮并进入 loading 态。
   */
  beforeConfirm?: () => Promise<boolean | void> | boolean | void;

  /**
   * 是否在点击遮罩层时关闭，默认 false（防止误触丢失表单）。
   */
  closeOnClickModal?: boolean;

  /**
   * 是否可通过按下 ESC 键关闭，默认 true（Loading 锁期间强制禁用）。
   */
  closeOnPressEscape?: boolean;

  /**
   * 是否在关闭时销毁弹窗内部元素，默认 false。
   */
  destroyOnClose?: boolean;

  /**
   * 是否将弹窗挂载至 body 根节点，默认 true。
   */
  appendToBody?: boolean;

  /**
   * 弹窗自定义类名。
   */
  customClass?: string;
}

/**
 * AtengDialog 事件契约。
 */
export interface AtengDialogEmits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'update:fullscreen', value: boolean): void;
  (e: 'confirm'): void;
  (e: 'cancel'): void;
  (e: 'success'): void;
  (e: 'open'): void;
  (e: 'opened'): void;
  (e: 'close'): void;
  (e: 'closed'): void;
  (e: 'fullscreenChange', fullscreen: boolean): void;
}

/**
 * AtengDialog 插槽契约。
 */
export interface AtengDialogSlots {
  default?: () => VNode[];
  header?: () => VNode[];
  footer?: () => VNode[];
  title?: () => VNode[];
}

/**
 * AtengDialog 暴露方法契约。
 */
export interface AtengDialogExpose {
  /**
   * 切换全屏状态。
   */
  toggleFullscreen: () => void;

  /**
   * 触发确定提交。
   */
  confirm: () => Promise<void>;

  /**
   * 触发取消关闭。
   */
  cancel: () => void;
}
