/**
 * @atengk/grid-layout-vue 自动寻空与几何碰撞算法。
 *
 * 遵循 ADR-0045，提供二维包围盒空位探测与坐标安全分配算法。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import type { GridLayoutItem } from '../types';

/**
 * 依据当前栅格布局数据寻找首个可容纳 (w x h) 的无冲突坐标空位。
 *
 * @param layout 当前布局项列表
 * @param w 待插入项宽度跨度 (列数)
 * @param h 待插入项高度跨度 (行数)
 * @param column 当前栅格总列数 (默认 12)
 * @returns 首个可用坐标 { x, y }
 */
export function findFirstAvailableSlot<T = Record<string, unknown>>(
  layout: GridLayoutItem<T>[],
  w = 1,
  h = 1,
  column = 12,
): { x: number; y: number } {
  const safeCol = column > 0 ? column : 12;
  const safeW = Math.max(1, Math.min(w, safeCol));
  const safeH = Math.max(1, h);

  // 1. 如果布局为空，直接放置在原点 (0, 0)
  if (!Array.isArray(layout) || layout.length === 0) {
    return { x: 0, y: 0 };
  }

  // 2. 构建二维占用碰撞网格检测辅助函数
  const isOccupied = (x: number, y: number): boolean => {
    return layout.some(item => {
      const itemX = item.x ?? 0;
      const itemY = item.y ?? 0;
      const itemW = item.w ?? 1;
      const itemH = item.h ?? 1;

      // 判断点 (x, y) 是否落在已有卡片包围盒内
      return x >= itemX && x < itemX + itemW && y >= itemY && y < itemY + itemH;
    });
  };

  // 3. 判断候选矩形区域 [candX, candX + safeW) x [candY, candY + safeH) 是否与现有卡片冲突
  const canFit = (candX: number, candY: number): boolean => {
    if (candX + safeW > safeCol) {
      return false;
    }
    for (let dy = 0; dy < safeH; dy++) {
      for (let dx = 0; dx < safeW; dx++) {
        if (isOccupied(candX + dx, candY + dy)) {
          return false;
        }
      }
    }
    return true;
  };

  // 4. 从 y=0 逐行向下、从 x=0 逐列向右扫描首个可放置空槽
  let y = 0;
  while (y < 1000) {
    for (let x = 0; x <= safeCol - safeW; x++) {
      if (canFit(x, y)) {
        return { x, y };
      }
    }
    y++;
  }

  return { x: 0, y: 0 };
}
