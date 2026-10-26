/**
 * viewStateHistory 阅读状态弱引用记忆与 LRU 缓存单元测试。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveViewStateHistory,
  restoreViewStateHistory,
  clearViewStateHistory,
  resolveViewStateKey,
  getViewStateHistorySize,
  type StoredViewState,
} from '../src/utils/viewStateHistory';

describe('viewStateHistory 状态记忆与恢复机制测试', () => {
  beforeEach(() => {
    clearViewStateHistory();
  });

  it('使用对象 (File/Blob) 作为 key 时利用 WeakMap 存储并正确读写', () => {
    const file = new File(['hello content'], 'test.pdf', { type: 'application/pdf' });
    const state: StoredViewState = {
      page: 3,
      sheet: 0,
      zoomScale: 1.5,
      rotation: 90,
      scroll: { top: 320, left: 0 },
      timestamp: Date.now(),
    };

    saveViewStateHistory(file, state);

    const restored = restoreViewStateHistory(file);
    expect(restored).toBeDefined();
    expect(restored?.page).toBe(3);
    expect(restored?.zoomScale).toBe(1.5);
    expect(restored?.rotation).toBe(90);
    expect(restored?.scroll?.top).toBe(320);
  });

  it('使用 URL 字符串作为 key 时存储在 LRU 缓存中并支持读写与更新', () => {
    const url = 'https://example.com/files/spec.docx';
    const state1: StoredViewState = {
      page: 1,
      zoomScale: 1.0,
      rotation: 0,
      timestamp: Date.now(),
    };

    saveViewStateHistory(url, state1);
    expect(getViewStateHistorySize()).toBe(1);

    const restored1 = restoreViewStateHistory(url);
    expect(restored1?.page).toBe(1);

    // 局部合并更新
    saveViewStateHistory(url, { page: 5, zoomScale: 1.25 });
    const restored2 = restoreViewStateHistory(url);
    expect(restored2?.page).toBe(5);
    expect(restored2?.zoomScale).toBe(1.25);
    expect(getViewStateHistorySize()).toBe(1);
  });

  it('URL LRU 缓存超出容量上限时遵循 LRU 原则淘汰最久未访问的条目', () => {
    // 写入超出默认 LRU 容量的条目 (测试内部限制为 100，这里测试写入 105 条)
    for (let i = 0; i < 105; i++) {
      saveViewStateHistory(`https://example.com/doc_${i}.pdf`, {
        page: i,
        timestamp: Date.now(),
      });
    }

    expect(getViewStateHistorySize()).toBeLessThanOrEqual(100);
    // 前面 0~4 号已被淘汰
    expect(restoreViewStateHistory('https://example.com/doc_0.pdf')).toBeUndefined();
    expect(restoreViewStateHistory('https://example.com/doc_1.pdf')).toBeUndefined();
    // 最后的 104 号必定存在
    expect(restoreViewStateHistory('https://example.com/doc_104.pdf')?.page).toBe(104);
  });

  it('resolveViewStateKey 能够从复合参数中确定性提取最佳 key', () => {
    const file = new File(['abc'], 'doc.pdf');
    expect(resolveViewStateKey({ file })).toBe(file);

    expect(resolveViewStateKey({ url: 'https://example.com/a.pdf' })).toBe(
      'https://example.com/a.pdf',
    );
    expect(resolveViewStateKey({ fileName: 'local.xlsx' })).toBe('name:local.xlsx');
    expect(resolveViewStateKey({})).toBeUndefined();
  });

  it('clearViewStateHistory 支持指定 key 清理或全量重置', () => {
    const url1 = 'https://example.com/1.pdf';
    const url2 = 'https://example.com/2.pdf';
    saveViewStateHistory(url1, { page: 1, timestamp: Date.now() });
    saveViewStateHistory(url2, { page: 2, timestamp: Date.now() });

    clearViewStateHistory(url1);
    expect(restoreViewStateHistory(url1)).toBeUndefined();
    expect(restoreViewStateHistory(url2)).toBeDefined();

    clearViewStateHistory();
    expect(restoreViewStateHistory(url2)).toBeUndefined();
    expect(getViewStateHistorySize()).toBe(0);
  });
});
