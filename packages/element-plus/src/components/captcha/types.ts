/**
 * AtengCaptcha 验证码与防刷新倒计时按钮类型定义。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { ComputedRef } from 'vue';

export type CaptchaType = 'button' | 'image';

export type CaptchaStorageType = 'local' | 'session';

/**
 * AtengCaptcha 属性接口。
 */
export interface AtengCaptchaProps {
  /**
   * 展现形式（按钮倒计时模式 button 或图形验证码模式 image）。
   * @default 'button'
   */
  type?: CaptchaType;

  /**
   * 倒计时总秒数。
   * @default 60
   */
  seconds?: number;

  /**
   * 本地持久化缓存 key。
   * 配置后即使页面意外刷新或路由流转，依然准确根据到期物理时间戳继续倒计时。
   */
  storageKey?: string;

  /**
   * 存储介质类型（localStorage 或 sessionStorage）。
   * @default 'local'
   */
  storageType?: CaptchaStorageType;

  /**
   * 初始按钮文本。
   * @default '获取验证码'
   */
  text?: string;

  /**
   * 倒计时中展示文本（{s} 为秒数占位符）。
   * @default '{s}s 重新获取'
   */
  countdownText?: string;

  /**
   * 倒计时结束后重试文案。
   * @default '重新获取'
   */
  retryText?: string;

  /**
   * 是否禁用按钮或点击。
   * @default false
   */
  disabled?: boolean;

  /**
   * 按钮尺寸。
   * @default 'default'
   */
  size?: 'large' | 'default' | 'small';

  /**
   * Element Plus 按钮类型。
   * @default 'primary'
   */
  btnType?: '' | 'default' | 'primary' | 'success' | 'warning' | 'info' | 'danger';

  /**
   * 发送前的异步前置校验钩子。
   * 返回 false 或抛出异常将阻止倒计时启动与请求发送。
   */
  beforeSend?: () => boolean | Promise<boolean>;

  /**
   * 发送验证码的具体异步网络方法。
   */
  send?: () => Promise<void> | void;

  /**
   * 图片验证码图片地址（支持 HTTP URL 或 Base64 Data URL）。
   */
  imageSrc?: string;

  /**
   * 图片验证码宽度。
   * @default '110px'
   */
  imageWidth?: string | number;

  /**
   * 图片验证码高度。
   * @default '32px'
   */
  imageHeight?: string | number;

  /**
   * 图形验证码点击刷新回调。
   */
  refresh?: () => Promise<void> | void;

  /**
   * 根容器自定义样式类名。
   */
  customClass?: string;
}

/**
 * AtengCaptcha 事件接口。
 */
export interface AtengCaptchaEmits {
  /**
   * 倒计时启动时触发。
   */
  (e: 'start'): void;

  /**
   * 倒计时自然结束时触发。
   */
  (e: 'end'): void;

  /**
   * 每秒倒计时跳动时触发。
   */
  (e: 'change', remaining: number): void;

  /**
   * 执行前置校验或发送异常时触发。
   */
  (e: 'error', error: unknown): void;
}

/**
 * AtengCaptcha 插槽接口。
 */
export interface AtengCaptchaSlots {
  /**
   * 自定义倒计时按钮内容。
   */
  default?: (scope: {
    remaining: number;
    isCounting: boolean;
    loading: boolean;
    start: () => Promise<boolean>;
  }) => unknown;

  /**
   * 自定义图形验证码加载中占位。
   */
  loading?: () => unknown;
}

/**
 * AtengCaptcha Expose 实例接口。
 */
export interface AtengCaptchaExpose {
  /**
   * 手动触发验证码发送流程与倒计时。
   */
  start: () => Promise<boolean>;

  /**
   * 重置清空当前倒计时与本地时间戳缓存。
   */
  reset: () => void;

  /**
   * 当前剩余秒数。
   */
  remainingSeconds: ComputedRef<number>;

  /**
   * 是否正在倒计时中。
   */
  isCounting: ComputedRef<boolean>;

  /**
   * 是否处于异步发送中（loading）。
   */
  isLoading: ComputedRef<boolean>;
}

export type AtengCaptchaInstance = AtengCaptchaExpose;
