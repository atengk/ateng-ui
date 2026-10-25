/**
 * 细粒度微骨架指令实现。
 *
 * 核心技术特征：
 * 1. 原地 CSS 伪元素遮罩机制，文本与子元素透明化，100% 保持原有物理宽高，消除排版跳变（Zero-CLS）；
 * 2. 绝不解构或破坏 Vue 虚拟 DOM 树，零组件卸载与重绘性能开销；
 * 3. 深度适配 ThemePro Slate 深空暗黑基底与纯 GPU 合成图层透明度脉冲动效；
 * 4. 支持布尔值与完整配置对象，支持确定性生命周期清理。
 *
 * @author Ateng
 * @since 2026-10-25
 */

import type { DirectiveBinding } from 'vue';
import type { SkeletonDirective, SkeletonDirectiveValue, SkeletonOptions } from './types';

export const SKELETON_ACTIVE_CLASS = 'at-skeleton-active';
export const SKELETON_ANIMATED_CLASS = 'is-animated';

interface SkeletonState {
  options: SkeletonOptions;
  originalPosition: string;
  originalRadius: string;
  hasCustomRadius: boolean;
}

const stateMap = new WeakMap<HTMLElement, SkeletonState>();

function resolveOptions(value: SkeletonDirectiveValue): SkeletonOptions {
  if (typeof value === 'boolean') {
    return { loading: value, animated: true };
  }
  if (value && typeof value === 'object') {
    return {
      loading: value.loading ?? true,
      animated: value.animated ?? true,
      radius: value.radius,
    };
  }
  return { loading: true, animated: true };
}

function applySkeleton(el: HTMLElement, options: SkeletonOptions) {
  let state = stateMap.get(el);
  if (!state) {
    state = {
      options,
      originalPosition: el.style.position,
      originalRadius: el.style.borderRadius,
      hasCustomRadius: false,
    };
    stateMap.set(el, state);
  } else {
    state.options = options;
  }

  if (options.loading) {
    el.classList.add(SKELETON_ACTIVE_CLASS);
    if (options.animated !== false) {
      el.classList.add(SKELETON_ANIMATED_CLASS);
    } else {
      el.classList.remove(SKELETON_ANIMATED_CLASS);
    }

    // 确保绝对定位 ::after 的包含块有效
    const computedPosition = window.getComputedStyle(el).position;
    if (!computedPosition || computedPosition === 'static') {
      el.style.position = 'relative';
    }

    if (options.radius !== undefined) {
      const r = typeof options.radius === 'number' ? `${options.radius}px` : options.radius;
      el.style.borderRadius = r;
      state.hasCustomRadius = true;
    }
  } else {
    removeSkeleton(el);
  }
}

function removeSkeleton(el: HTMLElement) {
  el.classList.remove(SKELETON_ACTIVE_CLASS);
  el.classList.remove(SKELETON_ANIMATED_CLASS);

  const state = stateMap.get(el);
  if (state) {
    el.style.position = state.originalPosition;
    if (state.hasCustomRadius) {
      el.style.borderRadius = state.originalRadius;
      state.hasCustomRadius = false;
    }
  }
}

export const vSkeleton: SkeletonDirective = {
  mounted(el: HTMLElement, binding: DirectiveBinding<SkeletonDirectiveValue>) {
    const options = resolveOptions(binding.value);
    applySkeleton(el, options);
  },
  updated(el: HTMLElement, binding: DirectiveBinding<SkeletonDirectiveValue>) {
    const options = resolveOptions(binding.value);
    applySkeleton(el, options);
  },
  unmounted(el: HTMLElement) {
    removeSkeleton(el);
    stateMap.delete(el);
  },
};
