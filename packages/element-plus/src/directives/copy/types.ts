/**
 * 剪贴板复制指令类型契约。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { Directive } from 'vue';

/**
 * 动态文本求值函数。
 */
export type CopyGetter = () => string | number | undefined | null;

/**
 * 复制指令配置项。
 */
export interface CopyOptions {
  /**
   * 待复制的文本内容或动态 Getter 求值函数。
   */
  value?: string | number | CopyGetter | null;

  /**
   * 复制成功后的提示文案。传 false 则表示静默不提示，默认 '复制成功'。
   */
  message?: string | boolean;

  /**
   * 复制成功回调函数。
   */
  onSuccess?: (text: string) => void;

  /**
   * 复制失败回调函数。
   */
  onError?: (error: unknown) => void;
}

/**
 * v-copy 指令入参：支持纯文本、数字、Getter 求值函数、配置对象或空。
 */
export type CopyDirectiveValue = string | number | CopyGetter | CopyOptions | undefined | null;

/**
 * v-copy 指令类型。
 */
export type CopyDirective = Directive<HTMLElement, CopyDirectiveValue>;
