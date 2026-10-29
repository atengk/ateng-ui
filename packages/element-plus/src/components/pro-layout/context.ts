/**
 * AtengProLayout 上下文总线依赖注入契约与 Key 定义。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import type { InjectionKey, ComputedRef } from 'vue';
import type { ProLayoutMode } from './types';

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
