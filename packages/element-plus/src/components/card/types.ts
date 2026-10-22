/**
 * 企业级结构化卡片面板组件类型契约。
 *
 * @author Ateng
 * @since 2026-10-22
 */

import type { Component, StyleValue } from 'vue';

/**
 * 卡片阴影显示时机。
 */
export type AtengCardShadow = 'always' | 'hover' | 'never';

/**
 * AtengCard 属性契约。
 */
export interface AtengCardProps {
  /**
   * 卡片标题。
   */
  title?: string;

  /**
   * 卡片副标题。
   */
  subTitle?: string;

  /**
   * 标题左侧前置图标组件。
   */
  icon?: Component;

  /**
   * 标题后方问号气泡提示文案。
   */
  tooltip?: string;

  /**
   * 是否显示边框。
   * 默认 true。
   */
  bordered?: boolean;

  /**
   * 阴影显示时机：'always' | 'hover' | 'never'。
   * 默认 'never'。
   */
  shadow?: AtengCardShadow;

  /**
   * 头部与主体之间是否显示分割线。
   * 默认 true。
   */
  headerDivider?: boolean;

  /**
   * 是否支持一键折叠收起。
   * 默认 false。
   */
  collapsible?: boolean;

  /**
   * 是否处于折叠状态（支持双向绑定 v-model:collapsed）。
   * 默认 false。
   */
  collapsed?: boolean;

  /**
   * 是否支持视口最大化全屏。
   * 默认 false。
   */
  fullscreenable?: boolean;

  /**
   * 是否处于全屏状态（支持双向绑定 v-model:fullscreen）。
   * 默认 false。
   */
  fullscreen?: boolean;

  /**
   * 全屏时是否锁定 body 滚动，防止底层背景穿透滚动。
   * 采用模块级引用计数机制，多卡片并发或嵌套时安全还原。
   * 默认 true。
   */
  lockScroll?: boolean;

  /**
   * 是否允许通过按 ESC 快捷键退出全屏。
   * 默认 true。
   */
  escExit?: boolean;

  /**
   * 是否处于加载遮罩状态。
   * 默认 false。
   */
  loading?: boolean;

  /**
   * 内容区域内边距。
   * 默认 '16px'。
   */
  bodyPadding?: string | number;

  /**
   * 内容区自定义 Class。
   */
  bodyClass?: string;

  /**
   * 内容区自定义 Style。
   */
  bodyStyle?: StyleValue;
}

/**
 * AtengCard 事件契约。
 */
export interface AtengCardEmits {
  /**
   * 折叠状态更新（v-model:collapsed）。
   */
  (e: 'update:collapsed', val: boolean): void;

  /**
   * 全屏状态更新（v-model:fullscreen）。
   */
  (e: 'update:fullscreen', val: boolean): void;

  /**
   * 折叠切换时派发。
   */
  (e: 'collapse', val: boolean): void;

  /**
   * 全屏切换时派发。
   */
  (e: 'fullscreen', val: boolean): void;
}
