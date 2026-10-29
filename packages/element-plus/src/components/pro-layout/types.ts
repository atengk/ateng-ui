/**
 * 企业级框架布局 AtengProLayout 类型契约。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import type { InjectionKey, ComputedRef, Component, VNode } from 'vue';
import type { AtengTabsNavProps, TabItem } from '../tabs-nav/types';

/**
 * 布局排版模式：
 * - side: 经典侧边导航模式（左侧树形菜单 + 顶栏）
 * - top: 顶部通栏导航模式（顶部横向一级菜单 + 无侧边栏）
 * - mix: 顶左混合分栏模式（顶部一级模块 + 左侧二级子菜单联动）
 */
export type ProLayoutMode = 'side' | 'top' | 'mix';

/**
 * 数据驱动菜单项接口契约。
 */
export interface ProMenuItem {
  /**
   * 路由或唯一路径标识。
   */
  path: string;

  /**
   * 菜单标题文字。
   */
  title: string;

  /**
   * 菜单图标（支持 Element Plus 图标组件或 SVG/CSS 字符串）。
   */
  icon?: string | Component;

  /**
   * 子菜单项列表。
   */
  children?: ProMenuItem[];

  /**
   * 徽标内容（角标文字或数字）。
   */
  badge?: string | number;

  /**
   * 徽标类型。
   */
  badgeType?: 'primary' | 'success' | 'warning' | 'danger' | 'info';

  /**
   * 是否禁用。
   */
  disabled?: boolean;

  /**
   * 是否在菜单中隐藏（不参与渲染，但路由仍可匹配）。
   */
  hidden?: boolean;

  /**
   * 是否在多标签栏中固定常驻。
   */
  affix?: boolean;

  /**
   * 外部链接跳转方式。
   */
  target?: '_blank' | '_self';

  /**
   * 任意业务元数据扩展包。
   */
  meta?: Record<string, unknown>;

  /**
   * 兼容后端异构原始字段的动态索引签名。
   */
  [key: string]: unknown;
}

/**
 * 菜单字段别名自适应映射契约。
 * 解决后端接口命名差异（如 url 代替 path、name 代替 title、subList 代替 children）。
 */
export interface ProMenuFieldNames {
  /** 路径字段名，默认 'path' */
  path?: string;
  /** 标题字段名，默认 'title' */
  title?: string;
  /** 子节点字段名，默认 'children' */
  children?: string;
  /** 图标字段名，默认 'icon' */
  icon?: string;
  /** 徽标字段名，默认 'badge' */
  badge?: string;
  /** 徽标类型字段名，默认 'badgeType' */
  badgeType?: string;
  /** 禁用字段名，默认 'disabled' */
  disabled?: string;
  /** 隐藏字段名，默认 'hidden' */
  hidden?: string;
}

/**
 * AtengProLayout 属性契约。
 */
export interface AtengProLayoutProps {
  /**
   * 布局形态模式，默认 'side'。
   */
  layout?: ProLayoutMode;

  /**
   * 系统标题，默认 'Ateng Admin'。
   */
  title?: string;

  /**
   * 系统 Logo 图像 URL。
   */
  logo?: string;

  /**
   * 数据驱动菜单源数组。
   */
  menuData?: ProMenuItem[];

  /**
   * 菜单字段别名自适应映射。
   */
  fieldNames?: ProMenuFieldNames;

  /**
   * 当前激活的高亮菜单 path。
   */
  activeMenu?: string;

  /**
   * 默认展开的 SubMenu path 数组。
   */
  defaultOpeneds?: string[];

  /**
   * 侧边栏折叠受控状态，默认 false。
   */
  collapsed?: boolean;

  /**
   * 是否允许侧边栏折叠展开，默认 true。
   */
  collapsible?: boolean;

  /**
   * 是否显示折叠/展开把手按钮，默认 true。
   */
  showCollapseTrigger?: boolean;

  /**
   * 折叠把手摆放位置，默认 'header'（顶栏左侧）。支持 'aside'（侧边栏底部）。
   */
  collapseTriggerPosition?: 'header' | 'aside';

  /**
   * 侧边栏展开宽度，默认 '220px'。
   */
  asideWidth?: string | number;

  /**
   * 侧边栏折叠后宽度，默认 '64px'。
   */
  asideCollapsedWidth?: string | number;

  /**
   * 顶栏高度，默认 '56px'。
   */
  headerHeight?: string | number;

  /**
   * 多标签栏高度，默认 '38px'。
   */
  tabsHeight?: string | number;

  /**
   * 是否开启顶栏视口固定吸顶，默认 true。
   */
  fixedHeader?: boolean;

  /**
   * 是否开启侧边栏视口固定，默认 true。
   */
  fixedAside?: boolean;

  /**
   * 是否显示顶栏面包屑，默认 true。
   */
  showBreadcrumb?: boolean;

  /**
   * 面包屑分隔符，默认 '/'。
   */
  breadcrumbSeparator?: string;

  /**
   * mix 模式下点击顶栏一级大类是否自动导航至其首个有效叶子菜单，默认 true。
   */
  mixAutoSelectFirstLeaf?: boolean;

  /**
   * 是否开启移动端窄屏自适应响应，默认 true。
   */
  responsive?: boolean;

  /**
   * 移动端断点阈值（像素），默认 768。
   */
  mobileBreakpoint?: number;

  /**
   * 是否显示内置多标签栏，默认 false。
   */
  showTabs?: boolean;

  /**
   * 内置 AtengTabsNav 属性配置项。
   */
  tabsProps?: AtengTabsNavProps;

  /**
   * 内容主体区是否处于全屏最大化沉浸模式（隐藏顶栏与侧边栏），默认 false。
   */
  isMaximized?: boolean;
}

/**
 * AtengProLayout 事件契约。
 */
export interface AtengProLayoutEmits {
  /**
   * 侧边栏折叠状态双向绑定变更事件。
   */
  (e: 'update:collapsed', val: boolean): void;

  /**
   * 侧边栏折叠状态触发事件。
   */
  (e: 'collapseChange', val: boolean): void;

  /**
   * 激活菜单高亮双向绑定变更事件。
   */
  (e: 'update:activeMenu', val: string): void;

  /**
   * 菜单点击选择事件。
   */
  (e: 'menuSelect', path: string, item: ProMenuItem): void;

  /**
   * 全屏沉浸最大化状态双向绑定变更事件。
   */
  (e: 'update:isMaximized', val: boolean): void;

  /**
   * 全屏沉浸最大化状态触发事件。
   */
  (e: 'maximizeChange', val: boolean): void;

  /**
   * 内置多标签点击事件。
   */
  (e: 'tabClick', tab: TabItem): void;

  /**
   * 内置多标签关闭事件。
   */
  (e: 'tabClose', key: string, tab: TabItem): void;

  /**
   * 内置多标签刷新事件。
   */
  (e: 'tabRefresh', key: string, tab: TabItem): void;
}

/**
 * AtengProLayout 插槽契约。
 */
export interface AtengProLayoutSlots {
  /** 主体内容插槽 */
  default?: () => VNode[];
  /** Logo 品牌区插槽 */
  logo?: (props: { collapsed: boolean; title: string; logo?: string }) => VNode[];
  /** 顶栏左侧区域插槽（位于 Logo/折叠键 与 面包屑之间） */
  headerLeft?: () => VNode[];
  /** 顶栏面包屑定制插槽 */
  breadcrumb?: () => VNode[];
  /** 顶栏中间区域插槽（如搜索条、全局通知滚动等） */
  headerCenter?: () => VNode[];
  /** 顶栏右侧区域插槽（放置操作动作、用户信息等） */
  headerRight?: () => VNode[];
  /** 顶栏右侧快捷功能图标区 */
  headerActions?: () => VNode[];
  /** 顶栏用户信息区插槽 */
  user?: () => VNode[];
  /** 自定义菜单全量接管插槽 */
  menu?: (props: {
    menuData: ProMenuItem[];
    mode: 'horizontal' | 'vertical';
    collapsed: boolean;
  }) => VNode[];
  /** 自定义单菜单项渲染插槽 */
  menuItem?: (props: { item: ProMenuItem; depth: number }) => VNode[];
  /** 侧边栏底部内容区插槽 */
  asideFooter?: (props: { collapsed: boolean }) => VNode[];
  /** 多标签栏定制插槽（通常在此放置 <AtengTabsNav />） */
  tabs?: () => VNode[];
  /** 底部版权与说明区插槽 */
  footer?: () => VNode[];
}

/**
 * 布局上下文总线接口（由 AtengProLayout 向上向下 provide）。
 */
export interface AtengProLayoutContext {
  /**
   * 当前是否处于折叠状态。
   */
  collapsed: ComputedRef<boolean>;

  /**
   * 当前侧边栏实际生效宽度（展开或折叠）。
   */
  asideWidth: ComputedRef<string>;

  /**
   * 顶栏实际高度。
   */
  headerHeight: ComputedRef<string>;

  /**
   * 布局形态。
   */
  layout: ComputedRef<ProLayoutMode>;

  /**
   * 是否处于移动端窄屏模式。
   */
  isMobile?: ComputedRef<boolean>;

  /**
   * 是否处于全屏沉浸最大化模式。
   */
  isMaximized?: ComputedRef<boolean>;

  /**
   * 切换折叠方法。
   */
  toggleCollapse: () => void;

  /**
   * 切换全屏沉浸最大化方法。
   */
  toggleMaximize?: (val?: boolean) => void;
}

/**
 * AtengProLayout 依赖注入 Key。
 */
export const ATENG_PRO_LAYOUT_KEY: InjectionKey<AtengProLayoutContext> =
  Symbol('ATENG_PRO_LAYOUT_KEY');

/**
 * AtengProLayout 暴露实例方法。
 */
export interface AtengProLayoutExpose {
  /** 切换折叠 */
  toggleCollapse: () => void;
  /** 切换最大化模式 */
  toggleMaximize: (val?: boolean) => void;
  /** 当前折叠状态 */
  collapsed: ComputedRef<boolean>;
  /** 当前是否处于全屏最大化 */
  isMaximized: ComputedRef<boolean>;
  /** 实际侧边栏宽度 */
  asideWidth: ComputedRef<string>;
}
