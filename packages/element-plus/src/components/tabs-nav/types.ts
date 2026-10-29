/**
 * AtengTabsNav 企业级多标签页导航组件类型契约。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import type { TabItem } from '@atengk/vue';

export type { TabItem };

/**
 * 标签外观风格类型。
 */
export type TabsStyle = 'card' | 'pill' | 'line';

/**
 * 标签栏快捷操作与上下文菜单指令类型。
 */
export type TabCommand =
  'refresh' | 'close' | 'closeOthers' | 'closeLeft' | 'closeRight' | 'closeAll';

/**
 * AtengTabsNav 属性契约。
 */
export interface AtengTabsNavProps {
  /**
   * 当前激活标签的 key（支持 v-model）。
   * @default ''
   */
  modelValue?: string;

  /**
   * 标签页列表数据（支持 v-model:tabs）。
   * @default []
   */
  tabs?: TabItem[];

  /**
   * 视觉风格类型：
   * - 'card': 经典独立卡片边框形态
   * - 'pill': 柔和圆角胶囊形态
   * - 'line': 极简底边下划线形态
   * @default 'card'
   */
  styleType?: TabsStyle;

  /**
   * 标签栏高度。支持纯数字（默认补齐 px）或带单位字符串。
   * @default '38px'
   */
  height?: number | string;

  /**
   * 是否显示标签图标。
   * @default true
   */
  showIcon?: boolean;

  /**
   * 全局是否允许关闭标签。
   * @default true
   */
  closable?: boolean;

  /**
   * 是否开启原生拖拽排序。
   * @default true
   */
  draggable?: boolean;

  /**
   * 是否开启右键上下文快捷菜单。
   * @default true
   */
  contextMenu?: boolean;

  /**
   * 是否显示右侧快捷操作下拉菜单。
   * @default true
   */
  showQuickActions?: boolean;

  /**
   * 是否显示内容最大化按钮。
   * @default true
   */
  showMaximize?: boolean;

  /**
   * 当前是否处于最大化状态（支持 v-model:isMaximized）。
   * @default false
   */
  isMaximized?: boolean;
}

/**
 * AtengTabsNav 事件契约。
 */
export interface AtengTabsNavEmits {
  /**
   * 激活标签更新（v-model）。
   */
  (e: 'update:modelValue', key: string): void;

  /**
   * 标签列表变更（v-model:tabs）。
   */
  (e: 'update:tabs', tabs: TabItem[]): void;

  /**
   * 点击标签时触发。
   */
  (e: 'tabClick', tab: TabItem): void;

  /**
   * 点击标签关闭图标时触发。
   */
  (e: 'tabClose', key: string, tab: TabItem): void;

  /**
   * 标签刷新时触发。
   */
  (e: 'tabRefresh', key: string, tab: TabItem): void;

  /**
   * 拖拽完成改变标签顺序时触发。
   */
  (e: 'tabOrderChange', newTabs: TabItem[]): void;

  /**
   * 最大化状态切换时派发。
   */
  (e: 'maximizeChange', isMaximized: boolean): void;

  /**
   * 双向绑定更新最大化状态（v-model:isMaximized）。
   */
  (e: 'update:isMaximized', isMaximized: boolean): void;
}

/**
 * AtengTabsNav 插槽契约。
 */
export interface AtengTabsNavSlots {
  /**
   * 自定义标签项渲染插槽。
   */
  tab?: (scope: { tab: TabItem; active: boolean; index: number }) => unknown;

  /**
   * 前置内容插槽。
   */
  prefix?: () => unknown;

  /**
   * 后置内容插槽。
   */
  suffix?: () => unknown;

  /**
   * 快捷操作区右侧扩展插槽。
   */
  extra?: () => unknown;
}
