/**
 * @atengk/grid-layout-vue 布局数据容灾清洗纯函数 (LayoutSanitizer)。
 *
 * 遵循 ADR-0045，清洗外部脏 JSON 布局数据：
 * 1. 过滤非法或缺失 ID 的项；
 * 2. 修正极小值 (w < 1, h < 1 兜底为 1) 与负数坐标；
 * 3. 裁剪超出栅格总列宽的超大卡片 (w > column)；
 * 4. 越界卡片 (x + w > column) 自动向左平移自愈；
 * 5. 碰撞冲突项自动寻空分配无冲突槽位。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import type { GridLayoutItem } from '../types';
import { findFirstAvailableSlot } from './autoPosition';

/**
 * 检验两个网格卡片是否在二维平面发生矩形几何重叠。
 */
function isColliding(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/**
 * 清洗外部导入的脏数据布局数组。
 *
 * @param raw 未经校验的外部数据
 * @param column 当前栅格总列数 (默认 12)
 * @returns 经过清洗与碰撞自愈的合法网格数据数组
 */
export function sanitizeLayout<T = Record<string, unknown>>(
  raw: unknown,
  column: number = 12,
): GridLayoutItem<T>[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [];
  }

  const effectiveCol = Math.max(1, Math.floor(column));
  const sanitizedList: GridLayoutItem<T>[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const candidate = item as Record<string, unknown>;
    const id = candidate.id;
    if (id === undefined || id === null || id === '') {
      continue;
    }

    // 1. 宽高修正 (保底 1，最大不超过列宽)
    const rawW = Number(candidate.w);
    const rawH = Number(candidate.h);
    const w = Math.max(1, Math.min(isNaN(rawW) || rawW <= 0 ? 1 : Math.floor(rawW), effectiveCol));
    const h = Math.max(1, isNaN(rawH) || rawH <= 0 ? 1 : Math.floor(rawH));

    // 2. 极值约束修正
    const minW =
      candidate.minW !== undefined && !isNaN(Number(candidate.minW))
        ? Math.max(1, Math.min(Math.floor(Number(candidate.minW)), effectiveCol))
        : undefined;
    const maxW =
      candidate.maxW !== undefined && !isNaN(Number(candidate.maxW))
        ? Math.max(1, Math.min(Math.floor(Number(candidate.maxW)), effectiveCol))
        : undefined;
    const minH =
      candidate.minH !== undefined && !isNaN(Number(candidate.minH))
        ? Math.max(1, Math.floor(Number(candidate.minH)))
        : undefined;
    const maxH =
      candidate.maxH !== undefined && !isNaN(Number(candidate.maxH))
        ? Math.max(1, Math.floor(Number(candidate.maxH)))
        : undefined;

    // 3. 坐标修正与越界自愈
    const rawX = Number(candidate.x);
    const rawY = Number(candidate.y);
    let x = isNaN(rawX) || rawX < 0 ? undefined : Math.floor(rawX);
    let y = isNaN(rawY) || rawY < 0 ? undefined : Math.floor(rawY);

    if (x === undefined || y === undefined || candidate.autoPosition) {
      const slot = findFirstAvailableSlot(sanitizedList, w, h, effectiveCol);
      x = slot.x;
      y = slot.y;
    } else {
      // 检查列宽越界并平移
      if (x + w > effectiveCol) {
        x = Math.max(0, effectiveCol - w);
      }

      // 检查与已有已清洗卡片的碰撞
      const currentRect = { x, y, w, h };
      const hasConflict = sanitizedList.some(existing =>
        isColliding(currentRect, {
          x: existing.x ?? 0,
          y: existing.y ?? 0,
          w: existing.w ?? 1,
          h: existing.h ?? 1,
        }),
      );

      if (hasConflict) {
        // 发生碰撞时，自动寻空槽位安置
        const slot = findFirstAvailableSlot(sanitizedList, w, h, effectiveCol);
        x = slot.x;
        y = slot.y;
      }
    }

    const cleanItem: GridLayoutItem<T> = {
      ...candidate,
      id: id as string | number,
      x,
      y,
      w,
      h,
      minW,
      maxW,
      minH,
      maxH,
      autoPosition: false,
    } as GridLayoutItem<T>;

    sanitizedList.push(cleanItem);
  }

  return sanitizedList;
}
