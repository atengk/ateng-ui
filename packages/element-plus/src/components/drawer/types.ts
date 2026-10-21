/**
 * 企业级抽屉交互容器组件类型契约。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { VNode } from 'vue';

/**
 * 抽屉尺寸语义断点或自定义大小。
 */
export type AtengDrawerSize = 'small' | 'default' | 'large' | string | number;

/**
 * AtengDrawer 属性契约。
 */
export interface AtengDrawerProps {
  /**
   * 是否显示抽屉（支持 v-model）。
   */
  modelValue: boolean;

  /**
   * 抽屉标题。
   */
  title?: string;

  /**
   * 抽屉尺寸：支持 'small' (360px)、'default' (500px)、'large' (720px) 或自定义像素/百分比。
   * 移动端屏幕 (< 768px) 自动全宽 100%。
   * @default 'default'
   */
  size?: AtengDrawerSize;

  /**
   * 抽屉打开方向：'rtl' | 'ltr' | 'ttb' | 'btt'。
   * @default 'rtl'
   */
  direction?: 'rtl' | 'ltr' | 'ttb' | 'btt';

  /**
   * 是否展示头部 Header。
   * @default true
   */
  withHeader?: boolean;

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
   * 是否在点击遮罩层时关闭，默认 false。
   */
  closeOnClickModal?: boolean;

  /**
   * 是否可通过按下 ESC 键关闭，默认 true。
   */
  closeOnPressEscape?: boolean;

  /**
   * 是否在关闭时销毁内部元素，默认 false。
   */
  destroyOnClose?: boolean;

  /**
   * 是否将抽屉挂载至 body 根节点，默认 true。
   */
  appendToBody?: boolean;

  /**
   * 抽屉自定义类名。
   */
  customClass?: string;
}

/**
 * AtengDrawer 事件契约。
 */
export interface AtengDrawerEmits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'confirm'): void;
  (e: 'cancel'): void;
  (e: 'success'): void;
  (e: 'open'): void;
  (e: 'opened'): void;
  (e: 'close'): void;
  (e: 'closed'): void;
}

/**
 * AtengDrawer 插槽契约。
 */
export interface AtengDrawerSlots {
  default?: () => VNode[];
  header?: () => VNode[];
  footer?: () => VNode[];
  title?: () => VNode[];
}

/**
 * AtengDrawer 暴露方法契约。
 */
export interface AtengDrawerExpose {
  confirm: () => Promise<void>;
  cancel: () => void;
}
