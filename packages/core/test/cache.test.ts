/**
 * 带 TTL 存活时效与命名空间隔离的缓存管理器单元测试。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CacheStorage, createCacheStorage, type CacheDriver } from '../src/cache';

describe('CacheStorage (带 TTL 时效与命名空间隔离缓存)', () => {
  let mockStorage: Map<string, string>;
  let driver: CacheDriver;
  let cache: CacheStorage;

  beforeEach(() => {
    mockStorage = new Map<string, string>();
    driver = {
      getItem: (key: string) => mockStorage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        mockStorage.set(key, value);
      },
      removeItem: (key: string) => {
        mockStorage.delete(key);
      },
      clear: () => {
        mockStorage.clear();
      },
      getAllKeys: () => Array.from(mockStorage.keys()),
    };
    cache = new CacheStorage({ driver, namespace: 'test_cache:' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('1. 基础存取与命名空间隔离', () => {
    it('应支持存取对象、数组、字符串与数值', () => {
      cache.set('user', { id: '1001', name: 'Ateng' });
      expect(cache.get<{ id: string; name: string }>('user')).toEqual({
        id: '1001',
        name: 'Ateng',
      });

      cache.set('tags', ['a', 'b', 'c']);
      expect(cache.get<string[]>('tags')).toEqual(['a', 'b', 'c']);

      cache.set('count', 42);
      expect(cache.get<number>('count')).toBe(42);

      // 验证命名空间前缀物理隔离
      expect(mockStorage.has('test_cache:user')).toBe(true);
      expect(mockStorage.has('user')).toBe(false);
    });

    it('has 与 remove 应准确管理键生命周期', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('not_exist')).toBe(false);

      cache.remove('key1');
      expect(cache.has('key1')).toBe(false);
      expect(cache.get('key1')).toBeNull();
    });

    it('clear 应仅清除当前命名空间下的缓存，不影响其他数据', () => {
      mockStorage.set('other_namespace:key', 'safe_data');
      cache.set('temp_1', 'val1');
      cache.set('temp_2', 'val2');

      expect(cache.has('temp_1')).toBe(true);
      expect(mockStorage.has('other_namespace:key')).toBe(true);

      cache.clear();

      expect(cache.has('temp_1')).toBe(false);
      expect(cache.has('temp_2')).toBe(false);
      // 验证其他命名空间数据完好无损
      expect(mockStorage.get('other_namespace:key')).toBe('safe_data');
    });
  });

  describe('2. TTL 存活时间与过期自动剔除', () => {
    it('在 TTL 时效内应正常读取，超过 TTL 时应物理剔除并返回 null', () => {
      vi.useFakeTimers();
      const startTime = new Date('2026-10-20T08:00:00Z').getTime();
      vi.setSystemTime(startTime);

      // 设置 1000ms TTL
      cache.set('dict_status', { active: true }, 1000);

      // 500ms 后依然有效
      vi.setSystemTime(startTime + 500);
      expect(cache.get('dict_status')).toEqual({ active: true });
      expect(cache.has('dict_status')).toBe(true);

      // 1001ms 后已过期
      vi.setSystemTime(startTime + 1001);
      expect(cache.get('dict_status')).toBeNull();
      expect(cache.has('dict_status')).toBe(false);

      // 验证过期后底层已物理清除
      expect(mockStorage.has('test_cache:dict_status')).toBe(false);
    });

    it('未设置 TTL 时应永久有效', () => {
      vi.useFakeTimers();
      const startTime = new Date('2026-10-20T08:00:00Z').getTime();
      vi.setSystemTime(startTime);

      cache.set('permanent_key', 'never_expires');

      // 10 天后依然有效
      vi.setSystemTime(startTime + 10 * 24 * 3600 * 1000);
      expect(cache.get('permanent_key')).toBe('never_expires');
    });
  });

  describe('3. 防御性容错与异常数据自愈', () => {
    it('底层存储脏数据（非合规 JSON）时读取应安全返回 null 并自动清理脏数据', () => {
      mockStorage.set('test_cache:corrupted', 'invalid{json:data');
      expect(cache.get('corrupted')).toBeNull();
      // 验证脏数据被自动清理
      expect(mockStorage.has('test_cache:corrupted')).toBe(false);
    });

    it('createCacheStorage 工厂函数创建默认开箱单例', () => {
      const defaultCache = createCacheStorage();
      expect(defaultCache).toBeInstanceOf(CacheStorage);
    });
  });
});
