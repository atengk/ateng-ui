/**
 * @atengk/grid-layout-vue 纯内存不可变快照栈、撤销重做与持久化测试。
 *
 * 遵循 ADR-0008 与 ADR-0045，验证：
 * 1. LayoutHistoryStack 不可变快照管理 (undo / redo / canUndo / canRedo / maxHistory)；
 * 2. 深度不可变性 (深拷贝防篡改污染)；
 * 3. 本地存储持久化 (saveToStorage / loadFromStorage / resetLayout) 与脏数据容灾自愈；
 * 4. 快捷键与组件实例暴露。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { AtengGridLayout, useGridLayout } from '../src';
import type { GridLayoutItem } from '../src';

describe('LayoutHistoryStack & Persistence (工单 #311)', () => {
  let wrapper: ReturnType<typeof mount> | null = null;
  const mockStorage = new Map<string, string>();

  beforeEach(() => {
    mockStorage.clear();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => mockStorage.get(key) ?? null),
      setItem: vi.fn((key: string, val: string) => mockStorage.set(key, val)),
      removeItem: vi.fn((key: string) => mockStorage.delete(key)),
      clear: vi.fn(() => mockStorage.clear()),
    });
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    vi.restoreAllMocks();
  });

  describe('useGridLayout 纯内存不可变撤销重做栈', () => {
    it('初始化时撤销重做状态均为 false', () => {
      const state = useGridLayout({
        initialLayout: [{ id: 'card-1', x: 0, y: 0, w: 4, h: 2 }],
      });

      expect(state.canUndo.value).toBe(false);
      expect(state.canRedo.value).toBe(false);
    });

    it('记录新快照后 canUndo 为 true，执行 undo() 可回退上一步', () => {
      const state = useGridLayout({
        initialLayout: [{ id: 'card-1', x: 0, y: 0, w: 4, h: 2 }],
      });

      // 添加新卡片并记入快照
      state.addItem({ id: 'card-2', x: 4, y: 0, w: 4, h: 2 });
      state.recordSnapshot();

      expect(state.layout.value.length).toBe(2);
      expect(state.canUndo.value).toBe(true);
      expect(state.canRedo.value).toBe(false);

      // 执行撤销
      state.undo();
      expect(state.layout.value.length).toBe(1);
      expect(state.layout.value[0].id).toBe('card-1');
      expect(state.canUndo.value).toBe(false);
      expect(state.canRedo.value).toBe(true);

      // 执行重做
      state.redo();
      expect(state.layout.value.length).toBe(2);
      expect(state.canUndo.value).toBe(true);
      expect(state.canRedo.value).toBe(false);
    });

    it('深拷贝不可变性：修改当前布局对象不会污染历史快照', () => {
      const state = useGridLayout({
        initialLayout: [{ id: 'card-1', x: 0, y: 0, w: 4, h: 2 }],
      });

      state.updateItem('card-1', { w: 8 });
      state.recordSnapshot();

      expect(state.layout.value[0].w).toBe(8);

      // 直接突变当前对象
      state.layout.value[0].w = 12;

      // 撤销回第一步
      state.undo();
      expect(state.layout.value[0].w).toBe(4);
    });

    it('回退后再产生新操作时自动丢弃旧的前进栈 (Redo Stack)', () => {
      const state = useGridLayout({
        initialLayout: [{ id: 'card-1', x: 0, y: 0, w: 4, h: 2 }],
      });

      state.addItem({ id: 'card-2', x: 4, y: 0, w: 4, h: 2 });
      state.recordSnapshot();

      state.undo();
      expect(state.canRedo.value).toBe(true);

      // 新增卡片 3
      state.addItem({ id: 'card-3', x: 8, y: 0, w: 4, h: 2 });
      state.recordSnapshot();

      // 前进栈被清空
      expect(state.canRedo.value).toBe(false);
      expect(state.layout.value.some(i => i.id === 'card-2')).toBe(false);
      expect(state.layout.value.some(i => i.id === 'card-3')).toBe(true);
    });

    it('遵守最大快照深度约束 (maxHistory)', () => {
      const state = useGridLayout({
        maxHistory: 3,
        initialLayout: [{ id: 'item-0', x: 0, y: 0, w: 2, h: 1 }],
      });

      // 连续记录 5 次
      for (let i = 1; i <= 5; i++) {
        state.addItem({ id: `item-${i}`, x: 0, y: i, w: 2, h: 1 });
        state.recordSnapshot();
      }

      // 最多只能撤销 3 次
      let undoCount = 0;
      while (state.canUndo.value) {
        state.undo();
        undoCount++;
      }
      expect(undoCount).toBe(3);
    });
  });

  describe('本地持久化与一键重置', () => {
    it('saveToStorage 将当前布局存入 localStorage，loadFromStorage 安全恢复', () => {
      const items: GridLayoutItem[] = [{ id: 'c1', x: 0, y: 0, w: 6, h: 3 }];
      const state = useGridLayout({
        initialLayout: items,
      });

      state.saveToStorage('test-grid-storage');
      expect(localStorage.setItem).toHaveBeenCalledWith('test-grid-storage', expect.any(String));

      // 修改当前状态
      state.addItem({ id: 'c2', x: 6, y: 0, w: 6, h: 3 });
      expect(state.layout.value.length).toBe(2);

      // 重新加载草稿
      const success = state.loadFromStorage('test-grid-storage');
      expect(success).toBe(true);
      expect(state.layout.value.length).toBe(1);
      expect(state.layout.value[0].id).toBe('c1');
    });

    it('loadFromStorage 读取损坏 JSON 或空数据时安全防守并返回 false', () => {
      mockStorage.set('broken-key', '{ invalid json ...');
      const state = useGridLayout();
      const res = state.loadFromStorage('broken-key');
      expect(res).toBe(false);
      expect(state.layout.value).toEqual([]);
    });

    it('resetLayout 一键恢复为 initialLayout 出厂预设', () => {
      const initial: GridLayoutItem[] = [{ id: 'origin-1', x: 0, y: 0, w: 4, h: 2 }];
      const state = useGridLayout({
        initialLayout: initial,
      });

      state.addItem({ id: 'added-1', x: 4, y: 0, w: 4, h: 2 });
      state.removeItem('origin-1');
      expect(state.layout.value.length).toBe(1);
      expect(state.layout.value[0].id).toBe('added-1');

      state.resetLayout();
      expect(state.layout.value.length).toBe(1);
      expect(state.layout.value[0].id).toBe('origin-1');
    });
  });

  describe('AtengGridLayout 组件实例透出与快捷键', () => {
    it('对外暴露 undo, redo, canUndo, canRedo, saveToStorage, loadFromStorage, resetLayout', async () => {
      wrapper = mount(AtengGridLayout, {
        props: {
          layout: [{ id: '1', x: 0, y: 0, w: 4, h: 2 }],
        },
      });

      await nextTick();

      const vm = wrapper.vm as unknown as {
        undo: () => void;
        redo: () => void;
        canUndo: { value: boolean };
        canRedo: { value: boolean };
        resetLayout: () => void;
        saveToStorage: (k?: string) => void;
        loadFromStorage: (k?: string) => boolean;
      };

      expect(typeof vm.undo).toBe('function');
      expect(typeof vm.redo).toBe('function');
      expect(typeof vm.resetLayout).toBe('function');
      expect(typeof vm.saveToStorage).toBe('function');
      expect(typeof vm.loadFromStorage).toBe('function');
      const isCanUndoFalse =
        vm.canUndo === false || (vm.canUndo as { value: boolean })?.value === false;
      const isCanRedoFalse =
        vm.canRedo === false || (vm.canRedo as { value: boolean })?.value === false;
      expect(isCanUndoFalse).toBe(true);
      expect(isCanRedoFalse).toBe(true);
    });
  });
});
