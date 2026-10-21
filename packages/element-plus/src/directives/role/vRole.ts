/**
 * 基于角色标识的操作权限控制指令实现。
 *
 * 默认物理移除 DOM 并在原位记录注释定位锚点，支持 .disabled 置灰态与 .all 且逻辑修饰符。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { createAuthDirective } from '../shared/createAuthDirective';
import type { RoleDirective } from './types';

/**
 * 角色指令 v-role。
 */
export const vRole: RoleDirective = createAuthDirective({
  commentText: 'v-role',
  evaluator: (auth, value, mode) => auth.hasRole(value, mode),
});
