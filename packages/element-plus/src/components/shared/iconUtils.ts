/**
 * 菜单与多标签导航图标判别与自定义解析共享辅助工具。
 *
 * @author Ateng
 * @since 2026-11-24
 */

import type { Component } from 'vue';

/**
 * 判别值是否为 Vue 组件对象或函数式组件。
 */
export function isVueComponentIcon(val: unknown): val is Component {
  return val !== null && (typeof val === 'object' || typeof val === 'function');
}

/**
 * 判别输入值是否为合法的图标输入（非空字符串或 Vue 组件）。
 */
export function isValidIconInput(val: unknown): val is string | Component {
  return (typeof val === 'string' && val.trim().length > 0) || isVueComponentIcon(val);
}

/**
 * 统一解析图标输入值并调用自定义解析器（返回 undefined 时回退原始值）。
 */
export function resolveCustomIcon<TItem>(
  rawIcon: unknown,
  item: TItem,
  indexOrDepth: number,
  resolver?: (
    icon: string | Component,
    item: TItem,
    indexOrDepth: number,
  ) => string | Component | undefined,
): string | Component | undefined {
  if (!isValidIconInput(rawIcon)) {
    return undefined;
  }
  if (!resolver) {
    return rawIcon;
  }
  const resolved = resolver(rawIcon, item, indexOrDepth);
  if (resolved === undefined) {
    return rawIcon;
  }
  if (typeof resolved === 'string') {
    return resolved.trim().length > 0 ? resolved : undefined;
  }
  return isVueComponentIcon(resolved) ? resolved : undefined;
}
