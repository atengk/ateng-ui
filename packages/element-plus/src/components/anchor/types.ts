/**
 * 企业级电梯楼层导航锚点容器类型契约。
 *
 * @author Ateng
 * @since 2026-10-23
 */

/**
 * 电梯楼层导航锚点单项契约。
 */
export interface AtengAnchorItem {
  /**
   * 唯一标识键。若未显式提供，默认使用 href 作为 key。
   */
  key?: string | number;

  /**
   * 目标锚点标识符（支持 '#section-id' 或纯 'section-id'）。
   */
  href: string;

  /**
   * 锚点展示标题文案。
   */
  title: string;

  /**
   * 二级嵌套子锚点列表。
   */
  children?: AtengAnchorItem[];
}

/**
 * AtengAnchor 属性契约。
 */
export interface AtengAnchorProps {
  /**
   * 声明式树形锚点数据列表。
   * 默认保底返回空数组 []。
   */
  items?: AtengAnchorItem[];

  /**
   * 滚动容器逃生舱。
   * 支持 CSS 选择器字符串（如 '.at-page-container__content'）、DOM 节点实例或 window。
   * 若不传，组件默认向上自动探测最近的祖先滚动容器（如 PageContainer 内部滚动区），探测不到则降级为 window。
   */
  container?: string | HTMLElement | Window;

  /**
   * 锚点吸顶判定安全避让偏移量（单位 px）。
   * 点击定位时会预留此偏移，避免被吸顶页头遮挡；滚动激活判定时也会依此偏移比对。
   * 默认 0。
   */
  targetOffset?: number;

  /**
   * 锚点激活判定的边界敏感度容差（单位 px）。
   * 默认 5。
   */
  bounds?: number;

  /**
   * 排列方向。
   * 'vertical': 垂直纵向排列（标准电梯大纲）；
   * 'horizontal': 水平横向排列。
   * 默认 'vertical'。
   */
  direction?: 'vertical' | 'horizontal';

  /**
   * 是否显示左侧/下侧指示游标墨水条 (ink-bar)。
   * 默认 true。
   */
  showInkBar?: boolean;

  /**
   * 当前激活项的 href（支持双向绑定 v-model:currentAnchor）。
   */
  currentAnchor?: string;
}

/**
 * AtengAnchor 事件契约。
 */
export interface AtengAnchorEmits {
  /**
   * 当前激活锚点变更（v-model:currentAnchor）。
   */
  (e: 'update:currentAnchor', href: string): void;

  /**
   * 激活锚点发生变化时派发。
   */
  (e: 'change', href: string): void;

  /**
   * 点击锚点链接时派发。
   */
  (e: 'click', eEvent: MouseEvent, item: AtengAnchorItem): void;
}
