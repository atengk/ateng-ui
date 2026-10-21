/**
 * 权限指令类型契约。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { Directive } from 'vue';

export type PermissionDirectiveValue = string | string[] | undefined | null;

export type PermissionDirective = Directive<HTMLElement, PermissionDirectiveValue>;
