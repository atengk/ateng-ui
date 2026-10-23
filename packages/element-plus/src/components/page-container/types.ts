/**
 * 企业级标准页面容器组件类型契约。
 *
 * @author Ateng
 * @since 2026-10-22
 */

/**
 * 路由目标类型（兼容 Vue Router 路径字符串或对象）。
 */
export type AtengRouteTarget = string | Record<string, unknown>;

/**
 * 面包屑导航项契约。
 */
export interface AtengPageBreadcrumbItem {
  /**
   * 显示文案。
   */
  label: string;
  /**
   * 跳转路由目标。
   */
  to?: AtengRouteTarget;
  /**
   * 路径。
   */
  path?: string;
}

/**
 * AtengPageContainer 属性契约。
 */
export interface AtengPageContainerProps {
  /**
   * 页面主标题。
   */
  title?: string;

  /**
   * 页面副标题。
   */
  subTitle?: string;

  /**
   * 面包屑导航数据项。
   */
  breadcrumb?: AtengPageBreadcrumbItem[];

  /**
   * 是否显示返回上一页按钮。
   * 默认 false。
   */
  showBack?: boolean;

  /**
   * 页头是否吸顶固定。
   * 默认 false。
   */
  fixedHeader?: boolean;

  /**
   * 页头是否开启吸顶毛玻璃滤镜（backdrop-filter: blur(8px)）。
   * 默认 false。
   */
  headerBlur?: boolean;

  /**
   * 是否弱感应当前路由（$route.matched）自动推导面包屑导航。
   * 默认 false。
   */
  autoBreadcrumb?: boolean;

  /**
   * 自动推导面包屑时，路由节点中用于提取标题的键名路径。
   * 默认 'meta.title'。
   */
  breadcrumbTitleKey?: string;

  /**
   * 自定义路由面包屑解析函数（逃生舱）。
   * 若提供，将接管 autoBreadcrumb 的默认提取逻辑。
   */
  breadcrumbResolver?: (matched: unknown[]) => AtengPageBreadcrumbItem[];

  /**
   * 是否为透明幽灵模式（内容区无预设白色背景与边框，由子卡片自行组织）。
   * 默认 false。
   */
  ghost?: boolean;

  /**
   * 是否自适应撑满父级视口剩余高度（内部局部滚动，锁定页头与底部）。
   * 默认 false。
   */
  fitViewport?: boolean;

  /**
   * 主体内容区域内边距。
   * 默认 '16px'。
   */
  contentPadding?: string | number;

  /**
   * 自定义页头背景色。
   */
  headerBackground?: string;

  /**
   * 自定义内容区背景色。
   */
  contentBackground?: string;

  /**
   * 是否处于视口脱壳全屏状态（支持双向绑定 v-model:fullscreen）。
   * 全屏时通过 Teleport 瞬移至全局 body 顶层，彻底绕过父级包含块 transform 限制。
   * 默认 false。
   */
  fullscreen?: boolean;

  /**
   * 是否在页头操作区显示全屏切换按钮。
   * 默认 false。
   */
  showFullscreen?: boolean;

  /**
   * 全屏时是否锁定 body 滚动，防止底层背景穿透滚动。
   * 采用模块级引用计数机制，多组件并发时安全归零还原。
   * 默认 true。
   */
  lockScroll?: boolean;

  /**
   * 是否允许通过按 ESC 快捷键退出全屏。
   * 默认 true。
   */
  escExit?: boolean;

  /**
   * 是否开启沉浸式滚动折叠页头特性。
   * 开启后在向下滚动时平滑收起页头、向上滚动或回滚至顶部时平滑复原。
   * 默认 false。
   */
  collapseHeaderOnScroll?: boolean;
}

/**
 * AtengPageContainer 事件契约。
 */
export interface AtengPageContainerEmits {
  /**
   * 点击返回箭头按钮时触发。
   */
  (e: 'back'): void;

  /**
   * 全屏状态更新（v-model:fullscreen）。
   */
  (e: 'update:fullscreen', val: boolean): void;

  /**
   * 全屏切换时派发。
   */
  (e: 'fullscreen', val: boolean): void;

  /**
   * 滚动导致页头折叠或展开状态发生变化时派发。
   */
  (e: 'header-collapse', collapsed: boolean): void;
}
