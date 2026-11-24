/**
 * ProLayout 菜单树辅助查找、尺寸规格化与面包屑计算工具。
 *
 * @author Ateng
 * @since 2026-11-24
 */

import type { ProMenuRawItem } from './types';

/**
 * 面包屑节点条目结构。
 */
export interface BreadcrumbItem {
  title: string;
  path: string;
}

/**
 * 将联合菜单项（标准 `ProMenuItem` 或外部自定义对象）投影为动态字段索引记录，供按 `fieldNames` 读取键值。
 *
 * @param item 原始菜单项对象
 * @returns 只读键值映射视图
 */
export function asMenuRecord(item: ProMenuRawItem): Record<string, unknown> {
  return item as Record<string, unknown>;
}

/**
 * 规范化 CSS 长度值为带单位字符串（数字自动追加 px）。
 */
export function toPx(val: string | number | undefined): string {
  if (val === undefined || val === null || val === '') return '';
  return typeof val === 'number' ? `${val}px` : String(val);
}

/**
 * 判别菜单项本身或其后代是否匹配目标路径。
 */
export function isItemOrDescendant(
  item: ProMenuRawItem,
  targetPath: string,
  pathKey: string,
  childrenKey: string,
): boolean {
  const record = asMenuRecord(item);
  const p = String(record[pathKey] ?? record.path ?? '');
  if (p === targetPath) return true;
  const children = record[childrenKey] as ProMenuRawItem[] | undefined;
  if (Array.isArray(children)) {
    return children.some(child => isItemOrDescendant(child, targetPath, pathKey, childrenKey));
  }
  return false;
}

/**
 * 递归查找首个可用叶子菜单节点。
 */
export function findFirstLeaf(item: ProMenuRawItem, childrenKey: string): ProMenuRawItem {
  const record = asMenuRecord(item);
  const children = record[childrenKey] as ProMenuRawItem[] | undefined;
  if (Array.isArray(children) && children.length > 0) {
    const firstChild = children[0];
    if (firstChild) {
      return findFirstLeaf(firstChild, childrenKey);
    }
  }
  return item;
}

/**
 * 依据当前激活路径收集从根节点到目标节点的面包屑轨迹（未匹配时返回空数组）。
 */
export function findBreadcrumbs(
  items: ProMenuRawItem[],
  target: string,
  pathKey: string,
  titleKey: string,
  childrenKey: string,
  ancestors: BreadcrumbItem[] = [],
): BreadcrumbItem[] {
  for (const item of items) {
    const record = asMenuRecord(item);
    const p = String(record[pathKey] ?? record.path ?? '');
    const t = String(record[titleKey] ?? record.title ?? '');
    const currentTrail = [...ancestors, { title: t, path: p }];
    if (p === target) {
      return currentTrail;
    }
    const children = record[childrenKey] as ProMenuRawItem[] | undefined;
    if (Array.isArray(children) && children.length > 0) {
      const match = findBreadcrumbs(children, target, pathKey, titleKey, childrenKey, currentTrail);
      if (match.length > 0) return match;
    }
  }
  return [];
}
