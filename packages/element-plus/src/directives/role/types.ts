/**
 * 角色指令类型契约。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { Directive } from 'vue';

export type RoleDirectiveValue = string | string[] | undefined | null;

export type RoleDirective = Directive<HTMLElement, RoleDirectiveValue>;
