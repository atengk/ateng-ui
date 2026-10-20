/**
 * 多租户凭据持久化存储抽象与宿主自适应驱动。
 *
 * 遵循平台宿主中立原则，支持浏览器 LocalStorage 与 Node/SSR 内存存储的自适应选择与自定义扩展。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { isLocalStorageAvailable } from '../auth';

/**
 * 租户标识持久化存储契约接口。
 */
export interface TenantStorage {
  /**
   * 读取存储的租户标识。
   *
   * @param key 键名
   * @returns 租户标识字符串或 null
   */
  getItem(key: string): string | null;

  /**
   * 写入并持久化租户标识。
   *
   * @param key 键名
   * @param value 租户标识字符串
   */
  setItem(key: string, value: string): void;

  /**
   * 删除指定的租户标识。
   *
   * @param key 键名
   */
  removeItem(key: string): void;

  /**
   * 清空所有存储数据（可选）。
   */
  clear?(): void;
}

/**
 * 基于内存的纯 JavaScript Map 存储驱动。
 * 专用于 Node.js、SSR 服务端渲染及无 DOM 环境。
 */
export class MemoryTenantStorage implements TenantStorage {
  private readonly store: Map<string, string> = new Map();

  public getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  public removeItem(key: string): void {
    this.store.delete(key);
  }

  public clear(): void {
    this.store.clear();
  }
}

/**
 * 基于浏览器 window.localStorage 的持久化存储驱动。
 */
export class LocalStorageTenantStorage implements TenantStorage {
  public getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // 宿主异常或隐私沙箱阻止时静默降级为 null
    }
    return null;
  }

  public setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // 容错降级
    }
  }

  public removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // 容错降级
    }
  }

  public clear(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch {
      // 容错降级
    }
  }
}

/**
 * 根据当前运行宿主自适应创建默认租户存储驱动。
 *
 * @returns 适合当前环境的 TenantStorage 实例
 */
export function createDefaultTenantStorage(): TenantStorage {
  if (isLocalStorageAvailable()) {
    return new LocalStorageTenantStorage();
  }
  return new MemoryTenantStorage();
}
