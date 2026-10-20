/**
 * useAuth 响应式鉴权门面与 useTenant 多租户切片单元测试。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { effectScope, isReadonly } from 'vue';
import {
  createAuthManager,
  createTenantManager,
  MemoryAuthStorage,
  MemoryTenantStorage,
} from '@atengk/core';
import { useAuth, useTenant } from '../src';

describe('useAuth & useTenant', () => {
  let customAuthManager: ReturnType<typeof createAuthManager>;
  let customTenantManager: ReturnType<typeof createTenantManager>;

  beforeEach(() => {
    customAuthManager = createAuthManager({
      storage: new MemoryAuthStorage(),
    });
    customTenantManager = createTenantManager({
      storage: new MemoryTenantStorage(),
    });
  });

  afterEach(() => {
    customAuthManager.clearToken();
    customTenantManager.clearTenantId();
  });

  describe('Seam 1: Auth Reactive State & Credentials Lifecycle', () => {
    it('should initialize with not authenticated state and support login / logout flow', () => {
      const scope = effectScope();
      let auth!: ReturnType<typeof useAuth>;

      scope.run(() => {
        auth = useAuth({ authManager: customAuthManager });
      });

      expect(auth.token.value).toBeNull();
      expect(auth.isAuthenticated.value).toBe(false);
      expect(auth.permissions.value).toEqual([]);
      expect(auth.roles.value).toEqual([]);
      expect(auth.user.value).toBeUndefined();

      // 验证只读约束
      expect(isReadonly(auth.token)).toBe(true);
      expect(isReadonly(auth.isAuthenticated)).toBe(true);
      expect(isReadonly(auth.permissions)).toBe(true);
      expect(isReadonly(auth.roles)).toBe(true);

      // 登录
      auth.login({
        token: 'jwt-bearer-token-123',
        permissions: ['sys:user:list', 'sys:user:view'],
        roles: ['operator'],
        user: { id: 10, username: 'tester' },
      });

      expect(auth.token.value).toBe('jwt-bearer-token-123');
      expect(auth.isAuthenticated.value).toBe(true);
      expect(auth.permissions.value).toEqual(['sys:user:list', 'sys:user:view']);
      expect(auth.roles.value).toEqual(['operator']);
      expect(customAuthManager.getToken()).toBe('jwt-bearer-token-123');

      // 登出
      auth.logout();

      expect(auth.token.value).toBeNull();
      expect(auth.isAuthenticated.value).toBe(false);
      expect(auth.permissions.value).toEqual([]);
      expect(auth.roles.value).toEqual([]);
      expect(auth.user.value).toBeUndefined();
      expect(customAuthManager.getToken()).toBeNull();

      scope.stop();
    });

    it('should automatically logout and reset state when 401 unauthorized occurs', () => {
      const scope = effectScope();
      let auth!: ReturnType<typeof useAuth>;

      scope.run(() => {
        auth = useAuth({ authManager: customAuthManager });
      });

      auth.login({
        token: 'expire-token',
        permissions: ['test:perm'],
        roles: ['test:role'],
      });

      expect(auth.isAuthenticated.value).toBe(true);

      // 模拟底层网络层触发 401
      customAuthManager.handleUnauthorized();

      expect(auth.token.value).toBeNull();
      expect(auth.isAuthenticated.value).toBe(false);
      expect(auth.permissions.value).toEqual([]);
      expect(auth.roles.value).toEqual([]);

      scope.stop();
    });
  });

  describe('Seam 2: Fine-Grained Permissions & Role Matching with Wildcards', () => {
    it('should correctly match precise permissions and colon wildcards', () => {
      const scope = effectScope();
      let auth!: ReturnType<typeof useAuth>;

      scope.run(() => {
        auth = useAuth({ authManager: customAuthManager });
      });

      auth.login({
        token: 'token',
        permissions: ['sys:user:*', 'order:view', 'report:export:pdf'],
        roles: ['auditor'],
      });

      // 1. 精确匹配
      expect(auth.hasPermission('order:view')).toBe(true);
      expect(auth.hasPermission('order:edit')).toBe(false);

      // 2. 冒号分段通配符匹配 (sys:user:*)
      expect(auth.hasPermission('sys:user:add')).toBe(true);
      expect(auth.hasPermission('sys:user:delete')).toBe(true);
      expect(auth.hasPermission('sys:dept:add')).toBe(false);

      // 3. 段内分段通配符匹配 (order:*:view)
      auth.setPermissions(['order:*:view']);
      expect(auth.hasPermission('order:refund:view')).toBe(true);
      expect(auth.hasPermission('order:pay:view')).toBe(true);
      expect(auth.hasPermission('order:refund:edit')).toBe(false);

      // 4. 多权限匹配 (some 模式：只要满足其一)
      expect(auth.hasPermission(['order:refund:view', 'order:refund:edit'])).toBe(true);
      // 5. 多权限匹配 (every 模式：必须全部满足)
      expect(auth.hasPermission(['order:refund:view', 'order:refund:edit'], 'every')).toBe(false);
      expect(auth.hasPermission(['order:refund:view', 'order:pay:view'], 'every')).toBe(true);

      scope.stop();
    });

    it('should grant all permissions when user has global wildcard * or superAdmin role', () => {
      const scope = effectScope();
      let auth!: ReturnType<typeof useAuth>;

      scope.run(() => {
        auth = useAuth({ authManager: customAuthManager });
      });

      // 1. 全局通配符 *
      auth.login({
        token: 'token-wildcard',
        permissions: ['*'],
      });

      expect(auth.hasPermission('any:domain:action')).toBe(true);
      expect(auth.hasPermission(['a:b', 'c:d'], 'every')).toBe(true);

      // 2. 超级管理员角色 admin 全局放行特权
      auth.login({
        token: 'token-admin',
        permissions: [],
        roles: ['admin'],
      });

      expect(auth.hasRole('admin')).toBe(true);
      expect(auth.hasRole('auditor')).toBe(false); // 严格角色身份校验：非当前角色返回 false
      expect(auth.hasPermission('finance:audit:approve')).toBe(true); // 超管拥有任意权限放行特权

      scope.stop();
    });
  });

  describe('Seam 3: Tenant Reactive State & Switching', () => {
    it('should switch and clear tenantId reactively and synchronize with TenantManager', () => {
      const scope = effectScope();
      let tenant!: ReturnType<typeof useTenant>;

      scope.run(() => {
        tenant = useTenant({ tenantManager: customTenantManager });
      });

      expect(tenant.tenantId.value).toBeNull();
      expect(tenant.hasTenant.value).toBe(false);
      expect(isReadonly(tenant.tenantId)).toBe(true);
      expect(isReadonly(tenant.hasTenant)).toBe(true);

      // 切换租户
      tenant.setTenantId('tenant_alfa');
      expect(tenant.tenantId.value).toBe('tenant_alfa');
      expect(tenant.hasTenant.value).toBe(true);
      expect(customTenantManager.getTenantId()).toBe('tenant_alfa');

      // 清除租户
      tenant.clearTenantId();
      expect(tenant.tenantId.value).toBeNull();
      expect(tenant.hasTenant.value).toBe(false);
      expect(customTenantManager.getTenantId()).toBeNull();

      scope.stop();
    });

    it('should reactively sync when TenantManager is updated externally', () => {
      const scope = effectScope();
      let tenant!: ReturnType<typeof useTenant>;

      scope.run(() => {
        tenant = useTenant({ tenantManager: customTenantManager });
      });

      // 外部直接操作 TenantManager 单例
      customTenantManager.setTenantId('tenant_bravo');
      expect(tenant.tenantId.value).toBe('tenant_bravo');
      expect(tenant.hasTenant.value).toBe(true);

      customTenantManager.clearTenantId();
      expect(tenant.tenantId.value).toBeNull();
      expect(tenant.hasTenant.value).toBe(false);

      scope.stop();
    });
  });

  describe('Seam 4: Cross-Scope Reactivity Synchronization', () => {
    it('multiple useAuth calls should share reactive state automatically', () => {
      const scope1 = effectScope();
      const scope2 = effectScope();

      let auth1!: ReturnType<typeof useAuth>;
      let auth2!: ReturnType<typeof useAuth>;

      scope1.run(() => {
        auth1 = useAuth({ authManager: customAuthManager });
      });

      scope2.run(() => {
        auth2 = useAuth({ authManager: customAuthManager });
      });

      expect(auth1.isAuthenticated.value).toBe(false);
      expect(auth2.isAuthenticated.value).toBe(false);

      // scope1 登录
      auth1.login({
        token: 'shared-token',
        permissions: ['shared:read'],
        roles: ['shared_role'],
      });

      // scope2 即时自动感知
      expect(auth2.token.value).toBe('shared-token');
      expect(auth2.isAuthenticated.value).toBe(true);
      expect(auth2.hasPermission('shared:read')).toBe(true);

      // scope2 登出
      auth2.logout();

      // scope1 即时自动清空
      expect(auth1.isAuthenticated.value).toBe(false);
      expect(auth1.token.value).toBeNull();

      scope1.stop();
      scope2.stop();
    });
  });
});
