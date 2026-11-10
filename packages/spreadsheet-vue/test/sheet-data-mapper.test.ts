/**
 * SheetDataMapper 数据转译引擎单元测试。
 *
 * 覆盖动态列推断、矩阵双向映射、字段防丢保全与极限边界情况。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect } from 'vitest';
import { SheetDataMapper } from '../src/mappers/sheet-data-mapper';
import type { SpreadsheetColumn, SpreadsheetRecord } from '../src/types';

describe('SheetDataMapper', () => {
  describe('inferColumns - 动态列推断', () => {
    it('空数组或非法入参时应当保底返回空数组 []', () => {
      expect(SheetDataMapper.inferColumns([])).toEqual([]);
      expect(SheetDataMapper.inferColumns(null as unknown as SpreadsheetRecord[])).toEqual([]);
      expect(SheetDataMapper.inferColumns(undefined as unknown as SpreadsheetRecord[])).toEqual([]);
    });

    it('应当从首行记录正确提取属性键并生成默认列配置', () => {
      const records: SpreadsheetRecord[] = [
        { id: 101, name: 'Alice', age: 28, isActive: true },
        { id: 102, name: 'Bob', age: 32, isActive: false },
      ];

      const columns = SheetDataMapper.inferColumns(records);

      expect(columns).toHaveLength(4);
      expect(columns[0]).toMatchObject({ key: 'id', title: 'Id', width: 120 });
      expect(columns[1]).toMatchObject({ key: 'name', title: 'Name', width: 120 });
      expect(columns[2]).toMatchObject({ key: 'age', title: 'Age', width: 120 });
      expect(columns[3]).toMatchObject({ key: 'isActive', title: 'Is Active', width: 120 });
    });

    it('首行记录为空对象时应当返回空数组', () => {
      expect(SheetDataMapper.inferColumns([{}])).toEqual([]);
    });
  });

  describe('recordsToMatrix - 业务行对象转单元格矩阵', () => {
    it('空数组时应只生成表头或空矩阵保底', () => {
      const result = SheetDataMapper.recordsToMatrix([]);
      expect(result.cellData).toBeDefined();
      expect(result.columns).toEqual([]);
    });

    it('显式传入 columns 时应当使用指定列配置并生成第 0 行表头', () => {
      const columns: SpreadsheetColumn[] = [
        { key: 'name', title: '姓名', width: 150 },
        { key: 'salary', title: '薪资', width: 100 },
      ];
      const records = [
        { name: '张三', salary: 15000 },
        { name: '李四', salary: 20000 },
      ];

      const { cellData, columns: resolvedColumns } = SheetDataMapper.recordsToMatrix(
        records,
        columns,
      );

      expect(resolvedColumns).toBe(columns);
      // 第 0 行为表头
      expect(cellData[0][0].v).toBe('姓名');
      expect(cellData[0][1].v).toBe('薪资');

      // 第 1 行为第 1 条数据
      expect(cellData[1][0].v).toBe('张三');
      expect(cellData[1][1].v).toBe(15000);

      // 第 2 行为第 2 条数据
      expect(cellData[2][0].v).toBe('李四');
      expect(cellData[2][1].v).toBe(20000);
    });

    it('应对 null / undefined / 复杂对象字段进行安全序列化', () => {
      const records = [{ name: '王五', extra: null, tags: ['dev', 'ui'], missing: undefined }];
      const { cellData } = SheetDataMapper.recordsToMatrix(records);

      // 行 1, 列 extra (null -> '')
      expect(cellData[1][1].v).toBe('');
      // 行 1, 列 tags (数组 -> JSON 串)
      expect(cellData[1][2].v).toBe('["dev","ui"]');
      // 行 1, 列 missing (undefined -> '')
      expect(cellData[1][3].v).toBe('');
    });
  });

  describe('matrixToRecords - 单元格矩阵逆向提取为业务对象', () => {
    it('cellData 为空时应当保底返回空数组 []', () => {
      const columns: SpreadsheetColumn[] = [{ key: 'name', title: '姓名' }];
      expect(SheetDataMapper.matrixToRecords(undefined, columns)).toEqual([]);
      expect(SheetDataMapper.matrixToRecords({}, columns)).toEqual([]);
    });

    it('应当准确将数据行单元格值提取为对象属性', () => {
      const columns: SpreadsheetColumn[] = [
        { key: 'name', title: '姓名' },
        { key: 'score', title: '分数' },
      ];

      const cellData = {
        0: { 0: { v: '姓名' }, 1: { v: '分数' } },
        1: { 0: { v: '小明' }, 1: { v: 95 } },
        2: { 0: { v: '小红' }, 1: { v: 99 } },
      };

      const records = SheetDataMapper.matrixToRecords(cellData, columns);

      expect(records).toHaveLength(2);
      expect(records[0]).toEqual({ name: '小明', score: 95 });
      expect(records[1]).toEqual({ 小红: undefined, name: '小红', score: 99 });
    });

    it('未展示字段保全防御：回写时应完整保留原始对象中的隐藏内部属性', () => {
      const columns: SpreadsheetColumn[] = [{ key: 'name', title: '姓名' }];

      const originalRecords: SpreadsheetRecord[] = [
        { _id: 'snowflake_1001', name: '旧名字', createdAt: '2026-01-01', secretToken: 'xyz-999' },
        { _id: 'snowflake_1002', name: '李四', createdAt: '2026-01-02', secretToken: 'xyz-888' },
      ];

      // 用户在表格中修改了第 1 行的姓名，第 2 行保持
      const cellData = {
        0: { 0: { v: '姓名' } },
        1: { 0: { v: '新名字' } },
        2: { 0: { v: '李四' } },
      };

      const result = SheetDataMapper.matrixToRecords(cellData, columns, originalRecords);

      expect(result).toHaveLength(2);
      // 第一行：name 更新，但 _id, createdAt, secretToken 100% 完好保全
      expect(result[0].name).toBe('新名字');
      expect(result[0]._id).toBe('snowflake_1001');
      expect(result[0].createdAt).toBe('2026-01-01');
      expect(result[0].secretToken).toBe('xyz-999');

      // 第二行：保持
      expect(result[1]._id).toBe('snowflake_1002');
    });
  });

  describe('recordsToSnapshot & snapshotToRecords 双向快照互转', () => {
    it('能够将 records 序列化为 Univer 合法工作簿快照并准确反向还原', () => {
      const records: SpreadsheetRecord[] = [
        { id: 1, title: 'Item 1', price: 99.9 },
        { id: 2, title: 'Item 2', price: 199.9 },
      ];

      const snapshot = SheetDataMapper.recordsToSnapshot(records);

      expect(snapshot.id).toBeDefined();
      expect(snapshot.sheetOrder).toHaveLength(1);
      const sheetId = snapshot.sheetOrder![0];
      expect(snapshot.sheets?.[sheetId]?.cellData).toBeDefined();

      // 反向提取
      const restored = SheetDataMapper.snapshotToRecords(snapshot);
      expect(restored).toHaveLength(2);
      expect(restored[0].title).toBe('Item 1');
      expect(restored[1].price).toBe(199.9);
    });
  });
});
