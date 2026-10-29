/**
 * useTabsNav 多标签页无头响应式状态机类型契约。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import type { ComputedRef, Ref } from 'vue';

/**
 * 标签页实体契约。
 */
export interface TabItem {
  /**
   * 唯一标识（通常为 route.fullPath 或唯一路径/名称）。
   */
  key: string;

  /**
   * 标签展示标题。
   */
  title: string;

  /**
   * 标签图标（组件/图标名/VNode）。
   */
  icon?: unknown;

  /**
   * 是否固定/锁定。
   * 固定标签不可被快捷动作或关闭按钮关闭，始终置顶在标签序列最前端。
   */
  affix?: boolean;

  /**
   * 是否允许被关闭。
   * 当 affix: true 时，强制为 false。未配置时默认为 true。
   */
  closable?: boolean;

  /**
   * 对应 Vue 组件名称。
   * 用于 KeepAlive :include="cachedViews" 缓存名单匹配。
   */
  componentName?: string;

  /**
   * 扩展业务元数据。
   */
  meta?: Record<string, unknown>;
}

/**
 * useTabsNav 构造配置项契约。
 */
export interface UseTabsNavOptions {
  /**
   * 初始默认标签列表。
   * @default []
   */
  defaultTabs?: TabItem[];

  /**
   * 初始激活项 key。
   * @default ''
   */
  defaultActiveKey?: string;

  /**
   * 最大允许打开标签数。
   * 达到上限时自动按 FIFO 淘汰最早打开的非固定标签。
   * 若未设置或 <= 0 则无限制。
   */
  maxTabs?: number;

  /**
   * 本地存储持久化 Key。
   * 若配置，标签变动将自动同步到 Web Storage，并支持刷新恢复。
   */
  persistKey?: string;

  /**
   * 本地持久化存储媒介类型。
   * @default 'session'
   */
  storageType?: 'session' | 'local';

  /**
   * 标签刷新时的回调钩子。
   */
  onRefresh?: (key: string) => void | Promise<void>;

  /**
   * 标签关闭时的回调钩子。
   */
  onClose?: (key: string, tab: TabItem) => void;
}

/**
 * useTabsNav 状态机返回值契约。
 */
export interface UseTabsNavReturn {
  /**
   * 当前打开的标签页列表。
   */
  tabs: Ref<TabItem[]>;

  /**
   * 当前激活标签的 key。
   */
  activeKey: Ref<string>;

  /**
   * 供给 KeepAlive :include 使用的缓存组件名称列表。
   */
  cachedViews: ComputedRef<string[]>;

  /**
   * 内容视口是否处于最大化/沉浸模式。
   */
  isMaximized: Ref<boolean>;

  /**
   * 当前正在刷新的标签 key（刷新期间为 key，未刷新时为 null）。
   */
  refreshingKey: Ref<string | null>;

  /**
   * 打开/切换标签页。若已存在相同 key，则激活并更新数据，杜绝重复；若超出 maxTabs 则自动淘汰最旧项。
   */
  openTab: (tab: TabItem) => void;

  /**
   * 关闭指定 key 的标签页。固定标签（affix: true）无法被关闭。
   */
  closeTab: (key: string) => void;

  /**
   * 关闭除目标标签以外的其他所有标签（所有 affix 固定标签均会安全保留）。
   * @param key 目标标签 key，缺省默认使用当前 activeKey
   */
  closeOthers: (key?: string) => void;

  /**
   * 关闭目标标签左侧的所有未固定标签。
   * @param key 目标标签 key，缺省默认使用当前 activeKey
   */
  closeLeft: (key?: string) => void;

  /**
   * 关闭目标标签右侧的所有未固定标签。
   * @param key 目标标签 key，缺省默认使用当前 activeKey
   */
  closeRight: (key?: string) => void;

  /**
   * 关闭所有未固定的普通标签，仅保留 affix 固定项，并自动激活首个固定标签。
   */
  closeAll: () => void;

  /**
   * 移动/排序标签位置。自动防呆：固定标签禁止移动，普通标签禁止拖动到固定标签前面。
   */
  moveTab: (fromIndex: number, toIndex: number) => void;

  /**
   * 固定/取消固定指定标签。
   */
  pinTab: (key: string, pinned?: boolean) => void;

  /**
   * 局部刷新指定标签。瞬态从 cachedViews 剔除并调度重新挂载。
   */
  refreshTab: (key?: string) => Promise<void>;

  /**
   * 显式批量替换/同步标签页列表（单向流受控更新）。
   */
  setTabs: (newTabs: TabItem[]) => void;

  /**
   * 显式设置当前激活标签 key。
   */
  setActiveKey: (key: string) => void;

  /**
   * 切换内容区最大化/还原状态。
   */
  toggleMaximize: (val?: boolean) => void;
}
