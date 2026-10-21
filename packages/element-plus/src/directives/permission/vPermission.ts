/**
 * 基于权限码的细粒度操作权限控制指令实现。
 *
 * 默认物理移除 DOM 并在原位记录注释定位锚点，支持 .disabled 置灰态与 .all 且逻辑修饰符。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { createAuthDirective } from '../shared/createAuthDirective';
import type { PermissionDirective } from './types';

/**
 * 权限指令 v-permission。
 */
export const vPermission: PermissionDirective = createAuthDirective({
  commentText: 'v-permission',
  evaluator: (auth, value, mode) => auth.hasPermission(value, mode),
});
