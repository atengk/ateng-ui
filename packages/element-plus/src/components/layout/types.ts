/**
 * 纯无状态基础布局架构套件类型契约。
 *
 * @author Ateng
 * @since 2026-10-25
 */

import type { InjectionKey } from 'vue';

/**
 * 布局排列方向。
 */
export type AtengLayoutDirection = 'horizontal' | 'vertical';

/**
 * 尺寸单位类型（纯数字补齐 px，支持任意单位字符串）。
 */
export type AtengLayoutSize = number | string;

/**
 * AtengLayout 属性契约。
 */
export interface AtengLayoutProps {
  /**
   * 布局排列方向。
   * 默认根据子节点是否包含 AtengAside 自动推导：包含则为 'horizontal'，否则为 'vertical'。
   */
  direction?: AtengLayoutDirection;

  /**
   * 是否显式标记包含侧边栏（优先级低于 direction）。
   * 默认 false。
   */
  hasAside?: boolean;

  /**
   * 自定义根 HTML 标签名。
   * 默认 'section'。
   */
  tag?: string;
}

/**
 * AtengLayout 插槽契约。
 */
export interface AtengLayoutSlots {
  /**
   * 布局主体内容。
   */
  default?: () => unknown;
}

/**
 * AtengHeader 属性契约。
 */
export interface AtengHeaderProps {
  /**
   * 顶栏高度。纯数字默认补齐 px，支持字符串。
   * 默认 '64px'。
   */
  height?: AtengLayoutSize;

  /**
   * 自定义背景色。
   */
  background?: string;

  /**
   * 自定义根 HTML 标签名。
   * 默认 'header'。
   */
  tag?: string;
}

/**
 * AtengHeader 插槽契约。
 */
export interface AtengHeaderSlots {
  /**
   * 顶栏主体内容。
   */
  default?: () => unknown;
}

/**
 * AtengAside 属性契约。
 */
export interface AtengAsideProps {
  /**
   * 侧边栏展开宽度。纯数字默认补齐 px，支持字符串。
   * 默认 '200px'。
   */
  width?: AtengLayoutSize;

  /**
   * 侧边栏折叠后的宽度。纯数字默认补齐 px，支持字符串。
   * 默认 '48px'。
   */
  collapsedWidth?: AtengLayoutSize;

  /**
   * 当前是否处于折叠状态（支持双向绑定 v-model:collapsed）。
   * 默认 false。
   */
  collapsed?: boolean;

  /**
   * 是否开启折叠能力（开启后若未提供自定义 trigger 插槽，将在底部渲染默认折叠触发条）。
   * 默认 false。
   */
  collapsible?: boolean;

  /**
   * 自定义背景色。
   */
  background?: string;

  /**
   * 自定义根 HTML 标签名。
   * 默认 'aside'。
   */
  tag?: string;
}

/**
 * AtengAside 事件契约。
 */
export interface AtengAsideEmits {
  /**
   * 折叠状态更新（v-model:collapsed）。
   */
  (e: 'update:collapsed', val: boolean): void;

  /**
   * 折叠/展开切换时派发。
   */
  (e: 'collapse', val: boolean): void;
}

/**
 * AtengAside 插槽契约。
 */
export interface AtengAsideSlots {
  /**
   * 侧边栏主体内容。
   */
  default?: () => unknown;

  /**
   * 自定义折叠触发器插槽。
   */
  trigger?: (scope: { collapsed: boolean; toggle: () => void }) => unknown;
}

/**
 * AtengContent 属性契约。
 */
export interface AtengContentProps {
  /**
   * 自定义背景色。
   */
  background?: string;

  /**
   * 自定义根 HTML 标签名。
   * 默认 'main'。
   */
  tag?: string;
}

/**
 * AtengContent 插槽契约。
 */
export interface AtengContentSlots {
  /**
   * 主体内容。
   */
  default?: () => unknown;
}

/**
 * AtengFooter 属性契约。
 */
export interface AtengFooterProps {
  /**
   * 底栏高度。纯数字默认补齐 px，支持字符串。
   * 默认 '48px'。
   */
  height?: AtengLayoutSize;

  /**
   * 自定义背景色。
   */
  background?: string;

  /**
   * 自定义根 HTML 标签名。
   * 默认 'footer'。
   */
  tag?: string;
}

/**
 * AtengFooter 插槽契约。
 */
export interface AtengFooterSlots {
  /**
   * 底栏主体内容。
   */
  default?: () => unknown;
}

/**
 * 布局内部 Aside 动态注册协议接口。
 */
export interface AtengLayoutContext {
  /**
   * 注册 Aside 实例。返回注销回调。
   */
  registerAside: () => () => void;
}

/**
 * 布局上下文注入 Key。
 */
export const ATENG_LAYOUT_INJECTION_KEY: InjectionKey<AtengLayoutContext> = Symbol(
  'ATENG_LAYOUT_INJECTION_KEY',
);
