/**
 * 具备命名空间隔离、TTL 存活时效与过期自动垃圾回收的缓存管理器实现。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import type { CacheDriver, CacheEnvelope, CacheStorageOptions } from './types';

/**
 * 基于内存 Map 的缓存驱动实现。
 */
export class MemoryCacheDriver implements CacheDriver {
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

  public getAllKeys(): string[] {
    return Array.from(this.store.keys());
  }
}

/**
 * 基于浏览器 window.localStorage 的缓存驱动实现。
 */
export class LocalStorageCacheDriver implements CacheDriver {
  public getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // 容错降级
    }
    return null;
  }

  public setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // 存储配额超限等容错
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

  public getAllKeys(): string[] {
    const keys: string[] = [];
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k) keys.push(k);
        }
      }
    } catch {
      // 容错降级
    }
    return keys;
  }
}

/**
 * 自适应创建默认缓存存储驱动。
 */
export function createDefaultCacheDriver(): CacheDriver {
  try {
    if (
      typeof window !== 'undefined' &&
      typeof window.localStorage !== 'undefined' &&
      window.localStorage !== null
    ) {
      return new LocalStorageCacheDriver();
    }
  } catch {
    // 降级内存
  }
  return new MemoryCacheDriver();
}

/**
 * 带 TTL 时效与命名空间隔离的通用缓存管理器。
 */
export class CacheStorage {
  private readonly namespace: string;

  private readonly driver: CacheDriver;

  private readonly defaultTtlMs?: number;

  public constructor(options?: CacheStorageOptions) {
    this.namespace = options?.namespace ?? 'at_cache:';
    this.driver = options?.driver ?? createDefaultCacheDriver();
    this.defaultTtlMs = options?.defaultTtlMs;
  }

  /**
   * 读取指定键的缓存数据。
   * 若数据已过期或底层损坏，将自动执行物理剔除并安全返回 null。
   *
   * @param key 缓存键
   * @returns 泛型缓存数据实体，不存在或过期返回 null
   */
  public get<T = unknown>(key: string): T | null {
    const fullKey = this.toFullKey(key);
    const raw = this.driver.getItem(fullKey);
    if (!raw) {
      return null;
    }

    try {
      const envelope = JSON.parse(raw) as CacheEnvelope<T>;
      if (!envelope || typeof envelope !== 'object' || !('value' in envelope)) {
        this.driver.removeItem(fullKey);
        return null;
      }

      // 检查是否过期
      if (envelope.expiresAt !== null && typeof envelope.expiresAt === 'number') {
        if (Date.now() > envelope.expiresAt) {
          // 物理清理过期脏数据
          this.driver.removeItem(fullKey);
          return null;
        }
      }

      return envelope.value;
    } catch {
      // 损坏的非 JSON 数据物理自愈剔除
      this.driver.removeItem(fullKey);
      return null;
    }
  }

  /**
   * 写入并持久化缓存数据。
   *
   * @param key 缓存键
   * @param value 缓存数据实体
   * @param ttlMs 存活时长（毫秒）。未传时采用 defaultTtlMs；均未配置则永久有效。
   */
  public set<T = unknown>(key: string, value: T, ttlMs?: number): void {
    const fullKey = this.toFullKey(key);
    const effectiveTtl = ttlMs ?? this.defaultTtlMs;
    const expiresAt =
      typeof effectiveTtl === 'number' && effectiveTtl > 0 ? Date.now() + effectiveTtl : null;

    const envelope: CacheEnvelope<T> = {
      value,
      expiresAt,
    };

    try {
      this.driver.setItem(fullKey, JSON.stringify(envelope));
    } catch (error) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(`[CacheStorage] setItem failed for key "${fullKey}":`, error);
      }
    }
  }

  /**
   * 判断指定键是否存在且未过期。
   *
   * @param key 缓存键
   * @returns 是否有效存在
   */
  public has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * 移除指定键的缓存。
   *
   * @param key 缓存键
   */
  public remove(key: string): void {
    this.driver.removeItem(this.toFullKey(key));
  }

  /**
   * 精准清空当前命名空间下的所有缓存数据。
   * 严格受限于当前 namespace，绝不影响其他命名空间或外部 Storage 数据。
   */
  public clear(): void {
    if (this.driver.getAllKeys) {
      const allKeys = this.driver.getAllKeys();
      for (const k of allKeys) {
        if (k.startsWith(this.namespace)) {
          this.driver.removeItem(k);
        }
      }
    }
  }

  /**
   * 获取当前缓存管理器绑定的命名空间前缀。
   */
  public getNamespace(): string {
    return this.namespace;
  }

  /**
   * 获取底层驱动实例。
   */
  public getDriver(): CacheDriver {
    return this.driver;
  }

  /**
   * 拼接命名空间前缀生成真实物理存储键名。
   */
  private toFullKey(key: string): string {
    return `${this.namespace}${key}`;
  }
}

/**
 * 创建 CacheStorage 缓存管理器工厂函数。
 *
 * @param options 配置项
 * @returns CacheStorage 实例
 */
export function createCacheStorage(options?: CacheStorageOptions): CacheStorage {
  return new CacheStorage(options);
}

/**
 * 全局默认 CacheStorage 开箱单例。
 */
export const cacheStorage: CacheStorage = createCacheStorage();
