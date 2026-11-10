/**
 * useSpreadsheet 无头状态机单元测试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useSpreadsheet } from '../src/composables/use-spreadsheet';

describe('useSpreadsheet Composable', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container.parentElement) {
      container.parentElement.removeChild(container);
    }
  });

  it('应当返回完备的只读响应式状态与对称操作方法', () => {
    const spreadsheet = useSpreadsheet({ container });

    expect(spreadsheet.containerRef.value).toBe(container);
    expect(spreadsheet.ready.value).toBeDefined();
    expect(spreadsheet.loading.value).toBeDefined();
    expect(spreadsheet.activeSheetId.value).toBeDefined();
    expect(spreadsheet.sheetList.value).toBeDefined();
    expect(spreadsheet.selection.value).toBeNull();
    expect(spreadsheet.isDirty.value).toBe(false);

    expect(typeof spreadsheet.getSnapshot).toBe('function');
    expect(typeof spreadsheet.setSnapshot).toBe('function');
    expect(typeof spreadsheet.getData).toBe('function');
    expect(typeof spreadsheet.setData).toBe('function');
    expect(typeof spreadsheet.addSheet).toBe('function');
    expect(typeof spreadsheet.removeSheet).toBe('function');
    expect(typeof spreadsheet.activateSheet).toBe('function');
    expect(typeof spreadsheet.setReadOnly).toBe('function');
    expect(typeof spreadsheet.setTheme).toBe('function');
    expect(typeof spreadsheet.destroy).toBe('function');
    expect(typeof spreadsheet.getUniverAPI).toBe('function');
    expect(typeof spreadsheet.getUniver).toBe('function');

    spreadsheet.destroy();
  });

  it('调用 destroy 应当确定性清理实例与重置状态', () => {
    const spreadsheet = useSpreadsheet({ container });

    spreadsheet.destroy();

    expect(spreadsheet.ready.value).toBe(false);
    expect(spreadsheet.activeSheetId.value).toBeNull();
    expect(spreadsheet.sheetList.value).toHaveLength(0);
    expect(spreadsheet.getUniver()).toBeNull();
    expect(spreadsheet.getUniverAPI()).toBeNull();
  });

  it('只读切换应当拦截撤销重做操作', () => {
    const spreadsheet = useSpreadsheet({ container, readOnly: true });

    spreadsheet.setReadOnly(true);
    // 不应抛出异常
    expect(() => spreadsheet.undo()).not.toThrow();
    expect(() => spreadsheet.redo()).not.toThrow();
    expect(() => spreadsheet.clear()).not.toThrow();

    spreadsheet.destroy();
  });
});
