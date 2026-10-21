/**
 * 提交防重与前端幂等指令类型契约。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { Directive } from 'vue';

/**
 * 幂等处理函数定义。
 */
export type IdempotentHandler = (event: MouseEvent) => unknown;

/**
 * 幂等指令配置选项。
 */
export interface IdempotentOptions {
  /**
   * 异步执行函数（Promise 互斥锁模式）。
   */
  handler?: IdempotentHandler;

  /**
   * 时间窗口防刷间隔（毫秒），默认 1000ms。
   */
  delay?: number;

  /**
   * 异步防死锁超时时间（毫秒），默认 30000ms。
   * 防止异步操作挂起导致按钮永久假死。
   */
  timeout?: number;

  /**
   * 是否在互斥锁激活期间联动按钮视觉反馈与禁用态。
   * 默认为 true。
   */
  feedback?: boolean;
}

/**
 * 幂等指令绑定值类型：支持数字毫秒、异步处理函数、配置对象、布尔值或空。
 */
export type IdempotentDirectiveValue =
  number | IdempotentHandler | IdempotentOptions | boolean | undefined | null;

/**
 * v-idempotent 指令类型。
 */
export type IdempotentDirective = Directive<HTMLElement, IdempotentDirectiveValue>;
