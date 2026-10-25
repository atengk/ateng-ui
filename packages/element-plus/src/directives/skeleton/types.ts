/**
 * 细粒度微骨架指令类型契约。
 *
 * @author Ateng
 * @since 2026-10-25
 */

import type { Directive } from 'vue';

/**
 * 微骨架配置选项。
 */
export interface SkeletonOptions {
  /**
   * 是否处于骨架加载状态。
   * 默认 true。
   */
  loading?: boolean;

  /**
   * 是否展示呼吸波纹脉冲动画。
   * 默认 true。
   */
  animated?: boolean;

  /**
   * 骨架圆角半径。支持纯数字（补齐 px）或带单位字符串。
   * 默认继承宿主元素边框圆角（inherit）。
   */
  radius?: number | string;
}

/**
 * 指令绑定值类型（支持布尔值或详细配置对象）。
 */
export type SkeletonDirectiveValue = boolean | SkeletonOptions;

/**
 * 微骨架指令类型。
 */
export type SkeletonDirective = Directive<HTMLElement, SkeletonDirectiveValue>;
