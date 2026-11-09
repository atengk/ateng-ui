/**
 * @atengk/grid-layout-vue 常量与依赖注入键定义。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import type { InjectionKey } from 'vue';
import type { GridItemContext, UseGridLayoutReturn } from '../types';

/**
 * 网格布局全局控制器依赖注入键。
 */
export const GRID_LAYOUT_KEY: InjectionKey<UseGridLayoutReturn<Record<string, unknown>>> =
  Symbol('ATENG_GRID_LAYOUT');

/**
 * 网格项局部上下文依赖注入键。
 */
export const GRID_ITEM_KEY: InjectionKey<GridItemContext<Record<string, unknown>>> =
  Symbol('ATENG_GRID_ITEM');

/**
 * 默认断点配置。
 */
export const DEFAULT_BREAKPOINTS = {
  xs: 576,
  sm: 768,
  md: 992,
  lg: 1200,
} as const;

/**
 * 默认 CSS 类名前缀。
 */
export const CSS_PREFIX = 'at-grid' as const;
