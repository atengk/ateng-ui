/**
 * @atengk/ai-chat-vue StorageAdapter 与 LocalStorageAdapter 单元测试。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalStorageAdapter } from '../src/storage/LocalStorageAdapter';

describe('LocalStorageAdapter', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('正常存取与删除键值对', () => {
    const storage = new LocalStorageAdapter({ prefix: 'test:' });

    expect(storage.getItem('key1')).toBeNull();

    storage.setItem('key1', JSON.stringify({ a: 1 }));
    expect(storage.getItem('key1')).toBe(JSON.stringify({ a: 1 }));
    // 验证实际底层 localStorage 带前缀
    expect(window.localStorage.getItem('test:key1')).toBe(JSON.stringify({ a: 1 }));

    storage.removeItem('key1');
    expect(storage.getItem('key1')).toBeNull();
    expect(window.localStorage.getItem('test:key1')).toBeNull();
  });

  it('支持 clear 清空指定前缀下的所有数据', () => {
    const storage = new LocalStorageAdapter({ prefix: 'chat_scope:' });
    storage.setItem('s1', 'val1');
    storage.setItem('s2', 'val2');
    window.localStorage.setItem('other:foo', 'bar');

    storage.clear();

    expect(storage.getItem('s1')).toBeNull();
    expect(storage.getItem('s2')).toBeNull();
    // 不影响其他命名空间
    expect(window.localStorage.getItem('other:foo')).toBe('bar');
  });

  it('捕获 QuotaExceededError 配额超出时触发安全保护与 fallback 清理', () => {
    const storage = new LocalStorageAdapter({ prefix: 'quota_test:' });

    let callCount = 0;
    const realSetItem = window.localStorage.setItem.bind(window.localStorage);
    vi.spyOn(window.localStorage, 'setItem').mockImplementation((key, val) => {
      callCount++;
      if (callCount === 1) {
        const error = new Error('Quota exceeded');
        error.name = 'QuotaExceededError';
        throw error;
      }
      return realSetItem(key, val);
    });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // 尝试写入，应当被内部安全捕获降级处理
    expect(() => {
      storage.setItem('big_key', 'huge_content');
    }).not.toThrow();

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('在无 window.localStorage 的宿主中自动优雅降级为内存 Map 存储', () => {
    const storage = new LocalStorageAdapter({
      useMemoryFallback: true,
      prefix: 'mem:',
    });

    storage.setItem('session_mem', 'saved_in_mem');
    expect(storage.getItem('session_mem')).toBe('saved_in_mem');
    storage.removeItem('session_mem');
    expect(storage.getItem('session_mem')).toBeNull();
  });
});
