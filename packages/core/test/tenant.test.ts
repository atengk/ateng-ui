/**
 * 多租户上下文门面与自适应存储单元测试。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createDefaultTenantStorage,
  createTenantManager,
  LocalStorageTenantStorage,
  MemoryTenantStorage,
  TenantManager,
} from '../src/tenant';

describe('TenantManager & TenantStorage (多租户上下文门面与自适应存储)', () => {
  describe('1. TenantStorage 存储驱动', () => {
    let originalWindow: unknown;

    beforeEach(() => {
      originalWindow = (globalThis as Record<string, unknown>).window;
    });

    afterEach(() => {
      (globalThis as Record<string, unknown>).window = originalWindow;
    });

    it('MemoryTenantStorage 应具备内存存取能力', () => {
      const storage = new MemoryTenantStorage();
      expect(storage.getItem('tenant_id')).toBeNull();

      storage.setItem('tenant_id', 'tenant-001');
      expect(storage.getItem('tenant_id')).toBe('tenant-001');

      storage.removeItem('tenant_id');
      expect(storage.getItem('tenant_id')).toBeNull();
    });

    it('LocalStorageTenantStorage 在浏览器环境中应读写 window.localStorage', () => {
      const mockStore = new Map<string, string>();
      (globalThis as Record<string, unknown>).window = {
        localStorage: {
          getItem: (key: string) => mockStore.get(key) ?? null,
          setItem: (key: string, val: string) => {
            mockStore.set(key, val);
          },
          removeItem: (key: string) => {
            mockStore.delete(key);
          },
        },
      };

      const storage = new LocalStorageTenantStorage();
      storage.setItem('tenant_id', 'browser-tenant-999');
      expect(storage.getItem('tenant_id')).toBe('browser-tenant-999');

      storage.removeItem('tenant_id');
      expect(storage.getItem('tenant_id')).toBeNull();
    });

    it('createDefaultTenantStorage 在无 DOM 环境下应降级为 MemoryTenantStorage', () => {
      delete (globalThis as Record<string, unknown>).window;
      const storage = createDefaultTenantStorage();
      expect(storage).toBeInstanceOf(MemoryTenantStorage);
    });
  });

  describe('2. TenantManager 核心门面', () => {
    let memoryStorage: MemoryTenantStorage;
    let tenantManager: TenantManager;

    beforeEach(() => {
      memoryStorage = new MemoryTenantStorage();
      tenantManager = new TenantManager({ storage: memoryStorage });
    });

    it('初始未设置租户时应返回 null', () => {
      expect(tenantManager.getTenantId()).toBeNull();
    });

    it('setTenantId 应保存租户ID，getTenantId 准确获取，clearTenantId 彻底清除', () => {
      tenantManager.setTenantId('tenant-dept-101');
      expect(tenantManager.getTenantId()).toBe('tenant-dept-101');
      expect(memoryStorage.getItem('tenant_id')).toBe('tenant-dept-101');

      tenantManager.clearTenantId();
      expect(tenantManager.getTenantId()).toBeNull();
      expect(memoryStorage.getItem('tenant_id')).toBeNull();
    });

    it('setTenantId 传入空字符串或纯空格应自动视为清除租户', () => {
      tenantManager.setTenantId('tenant-1');
      expect(tenantManager.getTenantId()).toBe('tenant-1');

      tenantManager.setTenantId('');
      expect(tenantManager.getTenantId()).toBeNull();

      tenantManager.setTenantId('tenant-1');
      tenantManager.setTenantId('   ');
      expect(tenantManager.getTenantId()).toBeNull();
    });

    it('支持自定义存储键名与请求头名称', () => {
      const customManager = createTenantManager({
        storage: memoryStorage,
        tenantKey: 'my_tenant_key',
        headerName: 'X-Custom-Tenant',
      });

      customManager.setTenantId('custom-t-888');
      expect(customManager.getTenantId()).toBe('custom-t-888');
      expect(memoryStorage.getItem('my_tenant_key')).toBe('custom-t-888');

      const headers = customManager.getHeaders();
      expect(headers).toEqual({
        'X-Custom-Tenant': 'custom-t-888',
      });
    });

    it('存在有效租户时 getHeaders 应返回默认 X-Tenant-Id', () => {
      tenantManager.setTenantId('corp-tenant-01');
      expect(tenantManager.getHeaders()).toEqual({
        'X-Tenant-Id': 'corp-tenant-01',
      });
    });

    it('无有效租户时 getHeaders 应防御性返回空对象', () => {
      expect(tenantManager.getHeaders()).toEqual({});
    });

    it('租户变更监听器与对称注销解绑', () => {
      const listener = vi.fn();
      const unsubscribe = tenantManager.onTenantChange(listener);

      tenantManager.setTenantId('tenant-alpha');
      expect(listener).toHaveBeenCalledWith('tenant-alpha');

      tenantManager.clearTenantId();
      expect(listener).toHaveBeenCalledWith(null);

      // 解绑注销后不应再触发
      unsubscribe();
      tenantManager.setTenantId('tenant-beta');
      expect(listener).toHaveBeenCalledTimes(2);
    });
  });
});
