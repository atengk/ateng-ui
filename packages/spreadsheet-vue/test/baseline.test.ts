/**
 * @atengk/spreadsheet-vue 基座构建与类型契约基线单元测试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect } from 'vitest';
import {
  SPREADSHEET_VUE_VERSION,
  type SpreadsheetMode,
  type SpreadsheetColumn,
  type SpreadsheetSnapshot,
  type SpreadsheetRecord,
  type SpreadsheetRange,
} from '../src';

describe('@atengk/spreadsheet-vue Baseline', () => {
  it('应当正确导出包版本常量与核心标识', () => {
    expect(SPREADSHEET_VUE_VERSION).toBe('1.0.0');
  });

  it('应当具备完备的 SpreadsheetMode 模式联合类型约束', () => {
    const modes: SpreadsheetMode[] = ['full', 'compact', 'readonly'];
    expect(modes).toHaveLength(3);
    expect(modes).toContain('full');
    expect(modes).toContain('compact');
    expect(modes).toContain('readonly');
  });

  it('应当正确构造 SpreadsheetColumn 列定义契约', () => {
    const column: SpreadsheetColumn = {
      key: 'productName',
      title: '商品名称',
      width: 150,
      required: true,
      align: 'left',
      dataValidation: {
        type: 'list',
        formula: 'A,B,C',
      },
      numfmt: '@',
    };

    expect(column.key).toBe('productName');
    expect(column.title).toBe('商品名称');
    expect(column.width).toBe(150);
    expect(column.required).toBe(true);
    expect(column.dataValidation?.type).toBe('list');
  });

  it('应当正确构造 SpreadsheetSnapshot 工作簿快照契约', () => {
    const snapshot: SpreadsheetSnapshot = {
      id: 'workbook-test',
      name: '测试工作簿',
      sheetOrder: ['sheet-1'],
      sheets: {
        'sheet-1': {
          id: 'sheet-1',
          name: 'Sheet1',
          rowCount: 100,
          columnCount: 26,
          cellData: {
            0: {
              0: { v: '标题', s: { bold: true } },
            },
          },
        },
      },
    };

    expect(snapshot.id).toBe('workbook-test');
    expect(snapshot.sheetOrder).toContain('sheet-1');
    expect(snapshot.sheets?.['sheet-1'].name).toBe('Sheet1');
    expect(snapshot.sheets?.['sheet-1'].cellData?.[0]?.[0]?.v).toBe('标题');
  });

  it('应当正确构造 SpreadsheetRecord 与 SpreadsheetRange 契约', () => {
    const record: SpreadsheetRecord = {
      id: 101,
      name: '智能手机',
      price: 4999.0,
      inStock: true,
      _hiddenCode: 'SEC_001',
    };

    const range: SpreadsheetRange = {
      startRow: 0,
      endRow: 10,
      startColumn: 0,
      endColumn: 5,
      sheetId: 'sheet-1',
    };

    expect(record.id).toBe(101);
    expect(record._hiddenCode).toBe('SEC_001');
    expect(range.endRow - range.startRow).toBe(10);
  });
});
