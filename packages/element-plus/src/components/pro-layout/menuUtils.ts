/**
 * ProLayout 菜单项异构字段只读读取辅助工具。
 *
 * @author Ateng
 * @since 2026-11-24
 */

import type { ProMenuRawItem } from './types';

/**
 * 将联合菜单项（标准 `ProMenuItem` 或外部自定义对象）投影为动态字段索引记录，供按 `fieldNames` 读取键值。
 *
 * @param item 原始菜单项对象
 * @returns 只读键值映射视图
 */
export function asMenuRecord(item: ProMenuRawItem): Record<string, unknown> {
  return item as Record<string, unknown>;
}
