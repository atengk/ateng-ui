/**
 * 权限与角色指令通用状态定义与类型契约。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { Directive } from 'vue';
import type { UseAuthResult } from '@atengk/vue';

/**
 * 权限指令绑定值类型（支持单权限字符串或多权限字符串数组）。
 */
export type PermissionDirectiveValue = string | string[] | undefined | null;

/**
 * 角色指令绑定值类型（支持单角色标识或多角色标识数组）。
 */
export type RoleDirectiveValue = string | string[] | undefined | null;

/**
 * 鉴权指令内部挂载状态。
 */
export interface AuthDirectiveInternalState {
  /**
   * DOM 物理移除时替换留存的注释节点定位锚点。
   */
  comment: Comment | null;
  /**
   * 响应式权限/角色监听注销函数。
   */
  stopWatch: (() => void) | null;
  /**
   * 捕获阶段点击事件拦截器。
   */
  clickInterceptor: ((event: MouseEvent) => void) | null;
  /**
   * 当前是否处于置灰禁用态。
   */
  isDisabled: boolean;
}

/**
 * 鉴权指令判定执行器函数。
 */
export type AuthEvaluator = (
  auth: UseAuthResult,
  value: string | string[],
  mode: 'some' | 'every',
) => boolean;

/**
 * 创建鉴权类指令配置选项。
 */
export interface CreateAuthDirectiveOptions {
  /**
   * 指令名称标识（用于注释节点内容，如 'v-permission'）。
   */
  commentText: string;
  /**
   * 鉴权判定函数。
   */
  evaluator: AuthEvaluator;
}

export type AuthDirective = Directive<HTMLElement, string | string[] | undefined | null>;
