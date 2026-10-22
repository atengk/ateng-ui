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
}

/**
 * AtengPageContainer 事件契约。
 */
export interface AtengPageContainerEmits {
  /**
   * 点击返回箭头按钮时触发。
   */
  (e: 'back'): void;
}
