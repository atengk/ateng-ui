/**
 * DraftManager 本地草稿箱容灾管理器单元测试。
 *
 * 遵循 ADR-0008（全自洽单测）与 ADR-0044 规约：
 * 验证 500ms 防抖静默落盘、立即写入、过期清理、主动销毁与浏览器配额超限优雅降级。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DraftManager, createDraftManager } from '../src/storage';

describe('DraftManager 本地草稿箱容灾管理器', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('非法 key 入参前置防御并快速失败', () => {
    expect(() => new DraftManager('')).toThrowError('[DraftManager]');
    // @ts-expect-error 测试非法类型
    expect(() => new DraftManager(null)).toThrowError('[DraftManager]');
  });

  it('默认 500ms 防抖静默写入与持久化落盘', () => {
    const onSave = vi.fn();
    const manager = createDraftManager('user_form', {
      debounceMs: 500,
      onSave,
    });

    expect(manager.hasDraft()).toBe(false);

    // 触发保存
    manager.save({ name: '张三', score: 90 });

    // 尚未经过 500ms 时，未持久化
    expect(onSave).not.toHaveBeenCalled();
    expect(window.localStorage.getItem('@atengk/form-draft:user_form')).toBeNull();

    // 快进 200ms
    vi.advanceTimersByTime(200);
    expect(onSave).not.toHaveBeenCalled();

    // 再次调用更新，防抖重置
    manager.save({ name: '李四', score: 95 });
    vi.advanceTimersByTime(300);
    expect(onSave).not.toHaveBeenCalled();

    // 走完剩余 200ms (累计 500ms)
    vi.advanceTimersByTime(200);
    expect(onSave).toHaveBeenCalledTimes(1);

    const record = manager.get();
    expect(record).not.toBeNull();
    expect(record?.data).toEqual({ name: '李四', score: 95 });
    expect(record?.key).toBe('user_form');
    expect(typeof record?.timestamp).toBe('number');
    expect(typeof record?.updatedAt).toBe('string');
    expect(manager.hasDraft()).toBe(true);

    manager.dispose();
  });

  it('immediate 立即同步保存绕过防抖', () => {
    const onSave = vi.fn();
    const manager = createDraftManager('instant_form', { onSave });

    manager.save({ title: '紧急填报' }, true);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(manager.hasDraft()).toBe(true);
    expect(manager.get()?.data).toEqual({ title: '紧急填报' });

    manager.dispose();
  });

  it('flush 立即提交等待中的防抖任务', () => {
    const manager = createDraftManager('flush_form', { debounceMs: 500 });
    manager.save({ status: 'pending' });

    expect(manager.hasDraft()).toBe(false);
    manager.flush();
    expect(manager.hasDraft()).toBe(true);
    expect(manager.get()?.data).toEqual({ status: 'pending' });

    manager.dispose();
  });

  it('clear 物理清除草稿并取消未落盘任务', () => {
    const manager = createDraftManager('clear_form', { debounceMs: 500 });
    manager.save({ count: 1 });

    manager.clear();
    vi.advanceTimersByTime(1000);

    expect(manager.hasDraft()).toBe(false);
    expect(manager.get()).toBeNull();
    expect(window.localStorage.getItem('@atengk/form-draft:clear_form')).toBeNull();

    manager.dispose();
  });

  it('过期检测与自动物理销毁', () => {
    const manager = createDraftManager('expired_form', {
      debounceMs: 0,
      maxAgeMs: 1000,
    });

    manager.save({ step: 1 }, true);
    expect(manager.hasDraft()).toBe(true);

    // 快进 1500ms (超过 1000ms maxAge)
    vi.advanceTimersByTime(1500);

    expect(manager.hasDraft()).toBe(false);
    expect(manager.get()).toBeNull();
    expect(window.localStorage.getItem('@atengk/form-draft:expired_form')).toBeNull();

    manager.dispose();
  });

  it('dispose 后注销定时器并不再响应保存', () => {
    const onSave = vi.fn();
    const manager = createDraftManager('dispose_form', { debounceMs: 500, onSave });

    manager.save({ val: 10 });
    manager.dispose();

    vi.advanceTimersByTime(1000);
    expect(onSave).not.toHaveBeenCalled();
    expect(manager.hasDraft()).toBe(false);

    // dispose 后再调用 save 无效
    manager.save({ val: 20 });
    expect(onSave).not.toHaveBeenCalled();
  });

  it('对抗性极限：localStorage 配额超限时优雅降级至内存存储且不崩溃', () => {
    const onError = vi.fn();
    const manager = createDraftManager('fallback_form', {
      debounceMs: 0,
      onError,
    });

    // Mock setItem 抛出 QuotaExceededError
    const originalSetItem = window.localStorage.setItem;
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      const quotaErr = new Error('QuotaExceededError: storage is full');
      quotaErr.name = 'QuotaExceededError';
      throw quotaErr;
    });

    // 应该优雅降级至内存 Map，调用 onError 但不抛出未捕获异常
    expect(() => {
      manager.save({ fallback: true }, true);
    }).not.toThrow();

    expect(onError).toHaveBeenCalledTimes(1);

    // Mock getItem 模拟 localStorage 无法读取
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('Access denied');
    });

    // 从内存降级 Map 中读取依然正常成功
    const record = manager.get();
    expect(record).not.toBeNull();
    expect(record?.data).toEqual({ fallback: true });

    manager.clear();
    expect(manager.get()).toBeNull();

    manager.dispose();
    window.localStorage.setItem = originalSetItem;
  });
});
