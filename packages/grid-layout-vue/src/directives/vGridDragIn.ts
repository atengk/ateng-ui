/**
 * @atengk/grid-layout-vue 外部物料拖入声明式指令 (vGridDragIn)。
 *
 * 遵循 ADR-0045，允许任意原生 DOM 元素声明为可拖入 GridStack 的物料元。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import type { Directive, DirectiveBinding } from 'vue';
import type { GridLayoutItem } from '../types';

export const vGridDragIn: Directive<
  HTMLElement,
  Partial<GridLayoutItem<Record<string, unknown>>> | undefined
> = {
  mounted(
    el: HTMLElement,
    binding: DirectiveBinding<Partial<GridLayoutItem<Record<string, unknown>>> | undefined>,
  ) {
    el.classList.add('grid-stack-item');
    el.classList.add('at-grid-drag-in-source');
    el.setAttribute('data-drag-in', 'true');

    const item = binding.value || {};
    const w = item.w ?? 1;
    const h = item.h ?? 1;

    el.setAttribute('gs-w', String(w));
    el.setAttribute('gs-h', String(h));
    el.setAttribute('data-gs-w', String(w));
    el.setAttribute('data-gs-h', String(h));

    if (item.minW) {
      el.setAttribute('gs-min-w', String(item.minW));
      el.setAttribute('data-gs-min-w', String(item.minW));
    }
    if (item.minH) {
      el.setAttribute('gs-min-h', String(item.minH));
      el.setAttribute('data-gs-min-h', String(item.minH));
    }
    if (item.data !== undefined) {
      try {
        el.setAttribute('data-payload', JSON.stringify(item.data));
      } catch {
        // 忽略非序列化数据
      }
    }
  },

  updated(
    el: HTMLElement,
    binding: DirectiveBinding<Partial<GridLayoutItem<Record<string, unknown>>> | undefined>,
  ) {
    const item = binding.value || {};
    const w = item.w ?? 1;
    const h = item.h ?? 1;

    el.setAttribute('gs-w', String(w));
    el.setAttribute('gs-h', String(h));
    el.setAttribute('data-gs-w', String(w));
    el.setAttribute('data-gs-h', String(h));

    if (item.minW) {
      el.setAttribute('gs-min-w', String(item.minW));
      el.setAttribute('data-gs-min-w', String(item.minW));
    }
    if (item.minH) {
      el.setAttribute('gs-min-h', String(item.minH));
      el.setAttribute('data-gs-min-h', String(item.minH));
    }
    if (item.data !== undefined) {
      try {
        el.setAttribute('data-payload', JSON.stringify(item.data));
      } catch {
        // 忽略非序列化数据
      }
    }
  },
};
