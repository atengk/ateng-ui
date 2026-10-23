/**
 * 企业级结构化卡片面板组件类型契约。
 *
 * @author Ateng
 * @since 2026-10-22
 */

import type { Component, StyleValue, InjectionKey, Ref, ComputedRef } from 'vue';

/**
 * 卡片阴影显示时机。
 */
export type AtengCardShadow = 'always' | 'hover' | 'never';

/**
 * 卡片头部页签布局方位。
 */
export type AtengCardTabsPosition = 'top' | 'bottom';

/**
 * AtengCard 属性契约。
 */
export interface AtengCardProps {
  /**
   * 卡片唯一标识键（用于 AtengCardGroup 编排折叠）。
   */
  name?: string | number;

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
   * 是否在右上角显示局部刷新按钮。
   * 默认 false。
   */
  showRefresh?: boolean;

  /**
   * 局部刷新按钮气泡提示文案。
   * 默认 '刷新'。
   */
  refreshTooltip?: string;

  /**
   * 页签插槽布局方位。
   * 'top': 单行紧凑模式，与标题处于同一行；
   * 'bottom': 次行沉降模式，独占标题栏下方第二行，更适合宽幅页签。
   * 默认 'top'。
   */
  tabsPosition?: AtengCardTabsPosition;

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

  /**
   * 点击局部刷新按钮时派发。
   */
  (e: 'refresh'): void;
}

/**
 * AtengCardGroup 属性契约。
 */
export interface AtengCardGroupProps {
  /**
   * 当前展开的卡片标识数组（支持双向绑定 v-model:activeKeys）。
   */
  activeKeys?: (string | number)[];

  /**
   * 兼容标准 v-model 语法绑定的展开键数组。
   */
  modelValue?: (string | number)[];

  /**
   * 是否开启手风琴模式（单开互斥，展开某卡片时自动收起其他卡片）。
   * 默认 false。
   */
  accordion?: boolean;

  /**
   * 纵向卡片之间的垂直间距。
   * 默认 '16px'。
   */
  gutter?: string | number;
}

/**
 * AtengCardGroup 事件契约。
 */
export interface AtengCardGroupEmits {
  /**
   * 展开卡片键数组更新（v-model:activeKeys）。
   */
  (e: 'update:activeKeys', keys: (string | number)[]): void;

  /**
   * 展开卡片键数组更新（v-model）。
   */
  (e: 'update:modelValue', keys: (string | number)[]): void;

  /**
   * 展开卡片发生变化时派发。
   */
  (e: 'change', keys: (string | number)[]): void;
}

/**
 * AtengCardGroup 上下文注入总线契约。
 */
export interface AtengCardGroupContext {
  /**
   * 当前展开的卡片 key 响应式数组。
   */
  activeKeys: Ref<(string | number)[]>;

  /**
   * 是否开启手风琴互斥模式。
   */
  accordion: ComputedRef<boolean>;

  /**
   * 子卡片注册机制（返回确定性注销回调）。
   *
   * @param key 卡片唯一标识键
   * @param setCollapsed 子卡片折叠状态更新函数
   * @returns 注销清理函数
   */
  registerCard: (key: string | number, setCollapsed: (val: boolean) => void) => () => void;

  /**
   * 切换卡片展开/收起状态。
   *
   * @param key 卡片唯一标识键
   * @param expanded 目标展开状态（可选）
   */
  toggleCard: (key: string | number, expanded?: boolean) => void;

  /**
   * 判断指定卡片是否处于展开状态。
   *
   * @param key 卡片唯一标识键
   */
  isCardExpanded: (key: string | number) => boolean;
}

/**
 * AtengCardGroup 上下文 InjectionKey。
 */
export const ATENG_CARD_GROUP_INJECTION_KEY: InjectionKey<AtengCardGroupContext> =
  Symbol('AtengCardGroup');
