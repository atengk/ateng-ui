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
 * 默认响应式栅格列数配置。
 */
export const DEFAULT_RESPONSIVE_COLUMNS = {
  xs: 1,
  sm: 2,
  md: 6,
  lg: 12,
} as const;

/**
 * 依据容器像素宽度计算匹配的栅格列数。
 *
 * @param width 容器像素宽度
 * @param breakpoints 用户自定义列数映射 (可选)
 * @param defaultColumn 默认列数 (缺省 12)
 * @returns 计算后的列数
 */
export function resolveResponsiveColumns(
  width: number,
  breakpoints?: { xs?: number; sm?: number; md?: number; lg?: number },
  defaultColumn = 12,
): number {
  if (width <= 0) {
    return defaultColumn;
  }
  const cols = {
    ...DEFAULT_RESPONSIVE_COLUMNS,
    lg: defaultColumn,
    ...breakpoints,
  };
  if (width < DEFAULT_BREAKPOINTS.xs) {
    return cols.xs;
  }
  if (width < DEFAULT_BREAKPOINTS.sm) {
    return cols.sm;
  }
  if (width < DEFAULT_BREAKPOINTS.md) {
    return cols.md;
  }
  return cols.lg;
}

/**
 * 默认 CSS 类名前缀。
 */
export const CSS_PREFIX = 'at-grid' as const;
