/**
 * 响应式鉴权门面 Hook 实现。
 *
 * 提供登录态、双轨 Token、细粒度权限 (hasPermission) 与角色 (hasRole) 响应式联动。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import {
  computed,
  readonly,
  ref,
  shallowRef,
  type DeepReadonly,
  type Ref,
  type ShallowRef,
} from 'vue';
import type { AuthManager } from '@atengk/core';
import { useAtengConfig } from '../context';
import type { AuthLoginPayload, PermissionMatchMode, UseAuthOptions, UseAuthResult } from './types';

/**
 * 内部鉴权响应式状态存储结构。
 */
interface AuthInternalState<TUser = unknown> {
  token: Ref<string | null>;
  permissions: Ref<string[]>;
  roles: Ref<string[]>;
  user: ShallowRef<TUser | undefined>;
}

/**
 * 基于 AuthManager 实例维度的响应式单例状态缓存映射。
 */
const authStateMap = new WeakMap<AuthManager, AuthInternalState<unknown>>();

/**
 * 重置并清空指定鉴权状态内部数据。
 */
function resetInternalState<TUser>(state: AuthInternalState<TUser>): void {
  state.token.value = null;
  state.permissions.value = [];
  state.roles.value = [];
  state.user.value = undefined;
}

/**
 * 获取或初始化指定 AuthManager 对应的响应式状态单例。
 */
function getOrCreateAuthState<TUser>(manager: AuthManager): AuthInternalState<TUser> {
  const existing = authStateMap.get(manager);
  if (existing) {
    return existing as AuthInternalState<TUser>;
  }

  const newState: AuthInternalState<TUser> = {
    token: ref<string | null>(manager.getToken()),
    permissions: ref<string[]>([]),
    roles: ref<string[]>([]),
    user: shallowRef<TUser | undefined>(undefined),
  };
  authStateMap.set(manager, newState as AuthInternalState<unknown>);

  // 绑定 401 自动清理监听（使用局部确定性引用，绝无非空断言 !）
  manager.onUnauthorized(() => {
    resetInternalState(newState);
  });

  return newState;
}

/**
 * 细粒度多段权限通配符匹配算法（支持 Apache Shiro 经典分段语法）。
 *
 * @param owned 用户拥有的单条权限规则（如 'sys:*'、'order:*:view'、'*'）
 * @param target 目标待检测权限代码（如 'sys:user:add'、'order:refund:view'）
 * @returns 是否匹配通过
 */
export function matchSinglePermission(owned: string, target: string): boolean {
  if (owned === '*' || owned === target) {
    return true;
  }

  const ownedParts = owned.split(':');
  const targetParts = target.split(':');

  for (let i = 0; i < ownedParts.length; i++) {
    const ownedPart = ownedParts[i];

    // 若末尾分段为 *，放行目标后续所有子层级
    if (ownedPart === '*' && i === ownedParts.length - 1) {
      return targetParts.length >= ownedParts.length;
    }

    // 若当前段未越界且为单个通配符 *，匹配当前对应位置
    if (ownedPart === '*') {
      if (i >= targetParts.length) {
        return false;
      }
      continue;
    }

    // 普通分段精准对比
    if (ownedPart !== targetParts[i]) {
      return false;
    }
  }

  return ownedParts.length === targetParts.length;
}

/**
 * 通用集合匹配判定调度器。
 */
function evaluateItemsMatch(
  targets: string | string[],
  predicate: (target: string) => boolean,
  mode: PermissionMatchMode,
): boolean {
  const list = Array.isArray(targets) ? targets : [targets];
  if (list.length === 0) {
    return false;
  }
  if (mode === 'every') {
    return list.every(predicate);
  }
  return list.some(predicate);
}

/**
 * 响应式鉴权门面 Hook。
 *
 * @template TUser 用户信息类型
 * @param options 鉴权配置选项
 * @returns 包含响应式登录态与权限判定门面的结果对象
 */
export function useAuth<TUser = unknown>(options: UseAuthOptions = {}): UseAuthResult<TUser> {
  const globalConfig = useAtengConfig();
  const manager = options.authManager ?? globalConfig.authManager;
  const superAdminRole = options.superAdminRole ?? 'admin';

  const state = getOrCreateAuthState<TUser>(manager);

  const isAuthenticated = computed<boolean>(() => {
    return Boolean(state.token.value);
  });

  /**
   * 细粒度权限校验方法。
   */
  const hasPermission = (
    permission: string | string[],
    mode: PermissionMatchMode = 'some',
  ): boolean => {
    // 超管角色享有权限全局放行特权
    if (state.roles.value.includes(superAdminRole)) {
      return true;
    }

    const ownedList = state.permissions.value;
    if (ownedList.length === 0) {
      return false;
    }

    return evaluateItemsMatch(
      permission,
      target => ownedList.some(owned => matchSinglePermission(owned, target)),
      mode,
    );
  };

  /**
   * 角色标识校验方法（严格校验角色身份真实归属）。
   */
  const hasRole = (role: string | string[], mode: PermissionMatchMode = 'some'): boolean => {
    const ownedRoles = state.roles.value;
    if (ownedRoles.length === 0) {
      return false;
    }

    return evaluateItemsMatch(role, target => ownedRoles.includes(target), mode);
  };

  /**
   * 用户登录写入。
   */
  const login = (payload: AuthLoginPayload<TUser>): void => {
    manager.setToken(payload.token);
    state.token.value = payload.token;
    state.permissions.value = payload.permissions ? [...payload.permissions] : [];
    state.roles.value = payload.roles ? [...payload.roles] : [];
    state.user.value = payload.user;
  };

  /**
   * 用户登出清理。
   */
  const logout = (): void => {
    manager.clearToken();
    resetInternalState(state);
  };

  /**
   * 独立更新权限列表。
   */
  const setPermissions = (permissions: string[]): void => {
    state.permissions.value = [...permissions];
  };

  /**
   * 独立更新角色列表。
   */
  const setRoles = (roles: string[]): void => {
    state.roles.value = [...roles];
  };

  /**
   * 独立更新用户信息。
   */
  const setUser = (user: TUser | undefined): void => {
    state.user.value = user;
  };

  return {
    token: readonly(state.token) as DeepReadonly<Ref<string | null>>,
    isAuthenticated: readonly(isAuthenticated) as DeepReadonly<Ref<boolean>>,
    permissions: readonly(state.permissions) as DeepReadonly<Ref<string[]>>,
    roles: readonly(state.roles) as DeepReadonly<Ref<string[]>>,
    user: readonly(state.user) as DeepReadonly<Ref<TUser | undefined>>,
    hasPermission,
    hasRole,
    login,
    logout,
    setPermissions,
    setRoles,
    setUser,
  };
}
