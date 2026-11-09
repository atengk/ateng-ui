/**
 * @atengk/grid-layout-vue useGridItem 注入 Composable。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { inject } from 'vue';
import { GRID_ITEM_KEY } from '../constants';
import type { GridItemContext } from '../types';

/**
 * 消费当前栅格项的上下文信息。
 *
 * @returns 当前网格项上下文或 null
 */
export function useGridItem<T = Record<string, unknown>>(): GridItemContext<T> | null {
  return inject(GRID_ITEM_KEY, null) as unknown as GridItemContext<T> | null;
}
