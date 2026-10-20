/**
 * 响应式鉴权与权限状态机类型定义。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import type { DeepReadonly, Ref } from 'vue';
import type { AuthManager } from '@atengk/core';

/**
 * 权限数组匹配判定模式。
 *
 * - 'some': 满足指定权限集合中的任意一项即判定通过（默认）。
 * - 'every': 必须同时满足指定权限集合中的所有项方判定通过。
 */
export type PermissionMatchMode = 'some' | 'every';

/**
 * 用户登录凭据与身份载荷接口。
 */
export interface AuthLoginPayload<TUser = unknown> {
  /**
   * 登录成功的 Token 凭据字符串。
   */
  token: string;

  /**
   * 用户拥有的细粒度权限标识集合（如 ['sys:user:add', 'sys:*']）。
   */
  permissions?: string[];

  /**
   * 用户拥有的角色标识集合（如 ['admin', 'operator']）。
   */
  roles?: string[];

  /**
   * 可选的当前登录用户详细信息实体。
   */
  user?: TUser;
}

/**
 * useAuth 可选配置项。
 */
export interface UseAuthOptions {
  /**
   * 自定义关联的 AuthManager 实例。未指定时自动读取全局上下文或 Fallback 至全局单例 authManager。
   */
  authManager?: AuthManager;

  /**
   * 超级管理员角色标识。拥有该角色时 hasRole 与 hasPermission 默认全局放行，默认为 'admin'。
   */
  superAdminRole?: string;
}

/**
 * useAuth 返回的响应式状态与鉴权校验门面。
 */
export interface UseAuthResult<TUser = unknown> {
  /**
   * 当前生效的 Token 字符串，未登录时为 null，受到 readonly 只读保护。
   */
  token: DeepReadonly<Ref<string | null>>;

  /**
   * 当前是否已处于已认证登录状态，受到 readonly 只读保护。
   */
  isAuthenticated: DeepReadonly<Ref<boolean>>;

  /**
   * 当前用户拥有的细粒度权限列表，受到 readonly 只读保护。
   */
  permissions: DeepReadonly<Ref<string[]>>;

  /**
   * 当前用户拥有的角色列表，受到 readonly 只读保护。
   */
  roles: DeepReadonly<Ref<string[]>>;

  /**
   * 当前登录用户信息实体，未登录时为 undefined，受到 readonly 只读保护。
   */
  user: DeepReadonly<Ref<TUser | undefined>>;

  /**
   * 校验当前用户是否具备指定的细粒度操作权限（支持通配符 * 匹配）。
   *
   * @param permission 权限标识字符串或权限标识数组
   * @param mode 当传入数组时的匹配模式，默认为 'some'
   * @returns 是否通过校验
   */
  hasPermission: (permission: string | string[], mode?: PermissionMatchMode) => boolean;

  /**
   * 校验当前用户是否具备指定的角色（超管角色拥有全局放行特权）。
   *
   * @param role 角色标识字符串或角色标识数组
   * @param mode 当传入数组时的匹配模式，默认为 'some'
   * @returns 是否通过校验
   */
  hasRole: (role: string | string[], mode?: PermissionMatchMode) => boolean;

  /**
   * 写入登录凭据与身份信息，同步持久化并触发全应用响应式更新。
   *
   * @param payload 登录载荷
   */
  login: (payload: AuthLoginPayload<TUser>) => void;

  /**
   * 清除当前登录凭据、权限与用户信息，同步销毁持久化 Token。
   */
  logout: () => void;

  /**
   * 独立动态更新权限列表。
   *
   * @param permissions 全新权限列表
   */
  setPermissions: (permissions: string[]) => void;

  /**
   * 独立动态更新角色列表。
   *
   * @param roles 全新角色列表
   */
  setRoles: (roles: string[]) => void;

  /**
   * 独立动态更新用户信息。
   *
   * @param user 用户信息实体
   */
  setUser: (user: TUser | undefined) => void;
}
