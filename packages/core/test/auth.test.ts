/**
 * Sa-Token 鉴权凭据门面与自适应存储单元测试。
 *
 * @author Ateng
 * @since 2026-10-19
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AuthManager,
  AuthStorage,
  createAuthManager,
  createDefaultAuthStorage,
  isLocalStorageAvailable,
  LocalStorageAuthStorage,
  MemoryAuthStorage,
} from '../src/auth';

describe('AuthManager & AuthStorage (Sa-Token 鉴权凭据门面与自适应存储)', () => {
  describe('1. AuthStorage 存储适配器', () => {
    let originalWindow: unknown;

    beforeEach(() => {
      originalWindow = (globalThis as Record<string, unknown>).window;
    });

    afterEach(() => {
      if (originalWindow === undefined) {
        delete (globalThis as Record<string, unknown>).window;
      } else {
        (globalThis as Record<string, unknown>).window = originalWindow;
      }
    });

    it('MemoryAuthStorage 应支持标准的存取与清理契约', () => {
      const storage = new MemoryAuthStorage();

      expect(storage.getItem('token')).toBeNull();

      storage.setItem('token', 'mock-token-123');
      expect(storage.getItem('token')).toBe('mock-token-123');

      storage.removeItem('token');
      expect(storage.getItem('token')).toBeNull();
    });

    it('LocalStorageAuthStorage 在可用浏览器环境中应正常存取', () => {
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

      const storage = new LocalStorageAuthStorage();
      storage.setItem('satoken', 'browser-token-abc');

      expect(storage.getItem('satoken')).toBe('browser-token-abc');

      storage.removeItem('satoken');
      expect(storage.getItem('satoken')).toBeNull();
    });

    it('LocalStorageAuthStorage 在宿主异常或权限受限时应静默降级不崩溃', () => {
      (globalThis as Record<string, unknown>).window = {
        localStorage: {
          getItem: () => {
            throw new Error('SecurityError: Access is denied');
          },
          setItem: () => {
            throw new Error('QuotaExceededError');
          },
          removeItem: () => {
            throw new Error('SecurityError');
          },
        },
      };

      const storage = new LocalStorageAuthStorage();
      expect(() => storage.setItem('key', 'val')).not.toThrow();
      expect(storage.getItem('key')).toBeNull();
      expect(() => storage.removeItem('key')).not.toThrow();
    });

    it('在 Node/SSR 环境下 createDefaultAuthStorage 应自动降级为 MemoryAuthStorage', () => {
      delete (globalThis as Record<string, unknown>).window;
      expect(isLocalStorageAvailable()).toBe(false);

      const storage = createDefaultAuthStorage();
      expect(storage instanceof MemoryAuthStorage).toBe(true);
    });

    it('在浏览器环境下 createDefaultAuthStorage 应自适应优先选择 LocalStorageAuthStorage', () => {
      const mockStore = new Map<string, string>();
      (globalThis as Record<string, unknown>).window = {
        localStorage: {
          getItem: (k: string) => mockStore.get(k) ?? null,
          setItem: (k: string, v: string) => {
            mockStore.set(k, v);
          },
          removeItem: (k: string) => {
            mockStore.delete(k);
          },
        },
      };

      expect(isLocalStorageAvailable()).toBe(true);
      const storage = createDefaultAuthStorage();
      expect(storage instanceof LocalStorageAuthStorage).toBe(true);
    });
  });

  describe('2. AuthManager 凭据操作门面', () => {
    let memoryStorage: MemoryAuthStorage;
    let authManager: AuthManager;

    beforeEach(() => {
      memoryStorage = new MemoryAuthStorage();
      authManager = new AuthManager({ storage: memoryStorage });
    });

    it('初始化时未存 Token 应返回 null', () => {
      expect(authManager.getToken()).toBeNull();
    });

    it('setToken 应保存凭据，getToken 能准确获取，clearToken 能彻底销毁', () => {
      authManager.setToken('auth-token-xyz');
      expect(authManager.getToken()).toBe('auth-token-xyz');
      expect(memoryStorage.getItem('satoken')).toBe('auth-token-xyz');

      authManager.clearToken();
      expect(authManager.getToken()).toBeNull();
      expect(memoryStorage.getItem('satoken')).toBeNull();
    });

    it('setToken 传入空值或纯空格时应自动视为销毁凭据', () => {
      authManager.setToken('auth-token-xyz');
      expect(authManager.getToken()).toBe('auth-token-xyz');

      authManager.setToken('');
      expect(authManager.getToken()).toBeNull();

      authManager.setToken('auth-token-xyz');
      authManager.setToken('   ');
      expect(authManager.getToken()).toBeNull();
    });

    it('支持注入自定义存储与自定义键名', () => {
      const customStorage: AuthStorage = {
        data: {} as Record<string, string>,
        getItem(key) {
          return this.data[key] ?? null;
        },
        setItem(key, val) {
          this.data[key] = val;
        },
        removeItem(key) {
          delete this.data[key];
        },
      };

      const customManager = createAuthManager({
        storage: customStorage,
        tokenKey: 'custom_access_token',
      });

      customManager.setToken('custom-123');
      expect(customManager.getToken()).toBe('custom-123');
      expect(customStorage.getItem('custom_access_token')).toBe('custom-123');
    });
  });

  describe('3. 双轨请求头注入 (Header Propagation)', () => {
    it('存在有效 Token 时应生成标准双轨请求头 (satoken 与 Authorization: Bearer)', () => {
      const auth = createAuthManager({
        storage: new MemoryAuthStorage(),
      });
      auth.setToken('test-jwt-token-999');

      const headers = auth.getHeaders();
      expect(headers).toEqual({
        satoken: 'test-jwt-token-999',
        Authorization: 'Bearer test-jwt-token-999',
      });
    });

    it('无 Token 时 getHeaders 应保底返回空对象', () => {
      const auth = createAuthManager({
        storage: new MemoryAuthStorage(),
      });

      expect(auth.getHeaders()).toEqual({});
    });

    it('支持自定义 Header 名称与 Token 前缀', () => {
      const auth = createAuthManager({
        storage: new MemoryAuthStorage(),
        headerName: 'X-Access-Token',
        bearerHeaderName: 'X-Authorization',
        tokenPrefix: 'Token ',
      });
      auth.setToken('my-token');

      expect(auth.getHeaders()).toEqual({
        'X-Access-Token': 'my-token',
        'X-Authorization': 'Token my-token',
      });
    });
  });

  describe('4. 401 自动清理与事件通知闭环', () => {
    it('调用 handleUnauthorized 时应自动清空凭据并触发构造器注入的回调', () => {
      const onUnauthorizedMock = vi.fn();
      const auth = new AuthManager({
        storage: new MemoryAuthStorage(),
        onUnauthorized: onUnauthorizedMock,
      });

      auth.setToken('dirty-token');
      expect(auth.getToken()).toBe('dirty-token');

      auth.handleUnauthorized();

      expect(auth.getToken()).toBeNull();
      expect(onUnauthorizedMock).toHaveBeenCalledTimes(1);
    });

    it('通过 onUnauthorized 动态注册的监听器应能触发，且支持取消订阅', () => {
      const auth = createAuthManager({ storage: new MemoryAuthStorage() });
      const listener = vi.fn();

      const unsubscribe = auth.onUnauthorized(listener);

      auth.setToken('token-1');
      auth.handleUnauthorized();
      expect(listener).toHaveBeenCalledTimes(1);
      expect(auth.getToken()).toBeNull();

      // 取消订阅后再触发 401
      unsubscribe();
      auth.setToken('token-2');
      auth.handleUnauthorized();
      expect(listener).toHaveBeenCalledTimes(1); // 仍为 1 次，无重复触发
      expect(auth.getToken()).toBeNull();
    });

    it('监听器内部抛出异常时不应影响凭据清理与后续逻辑', () => {
      const auth = createAuthManager({
        storage: new MemoryAuthStorage(),
        onUnauthorized: () => {
          throw new Error('Callback crashed');
        },
      });

      auth.setToken('token-x');
      expect(() => auth.handleUnauthorized()).not.toThrow();
      expect(auth.getToken()).toBeNull();
    });

    it('clearListeners 应清空所有已注册的监听器', () => {
      const auth = createAuthManager({ storage: new MemoryAuthStorage() });
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      auth.onUnauthorized(listener1);
      auth.onUnauthorized(listener2);

      auth.clearListeners();
      auth.handleUnauthorized();

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });
  });
});
