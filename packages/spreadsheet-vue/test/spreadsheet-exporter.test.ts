/**
 * SpreadsheetExporter 数据导出引擎单元测试。
 *
 * 覆盖 CSV 转义规范、UTF-8 BOM、逗号与换行处理、空数据兜底及 JSON 导出。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SpreadsheetExporter } from '../src/exporters/spreadsheet-exporter';
import type { SpreadsheetSnapshot } from '../src/types';

describe('SpreadsheetExporter', () => {
  let mockClick: ReturnType<typeof vi.fn>;
  let mockCreateObjectURL: ReturnType<typeof vi.fn>;
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockClick = vi.fn();
    mockCreateObjectURL = vi.fn().mockReturnValue('blob:http://localhost/mock-url');
    mockRevokeObjectURL = vi.fn();

    vi.stubGlobal('URL', {
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL,
    });

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(
      (tagName: string, options?: ElementCreationOptions) => {
        const el = originalCreateElement(tagName, options);
        if (tagName && tagName.toLowerCase() === 'a') {
          el.click = mockClick;
        }
        return el;
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('formatCsvCell - CSV 单元格转义', () => {
    it('常规文本与数字应当原样输出', () => {
      expect(SpreadsheetExporter.formatCsvCell('Hello')).toBe('Hello');
      expect(SpreadsheetExporter.formatCsvCell(12345)).toBe('12345');
      expect(SpreadsheetExporter.formatCsvCell(true)).toBe('true');
    });

    it('空值与 null/undefined 应当输出空字符串', () => {
      expect(SpreadsheetExporter.formatCsvCell(null)).toBe('');
      expect(SpreadsheetExporter.formatCsvCell(undefined)).toBe('');
      expect(SpreadsheetExporter.formatCsvCell('')).toBe('');
    });

    it('包含逗号、双引号与换行符时应当双引号包裹且内部双引号翻倍转义', () => {
      expect(SpreadsheetExporter.formatCsvCell('Hello, World')).toBe('"Hello, World"');
      expect(SpreadsheetExporter.formatCsvCell('Said "Yes"')).toBe('"Said ""Yes"""');
      expect(SpreadsheetExporter.formatCsvCell('Line1\nLine2')).toBe('"Line1\nLine2"');
    });
  });

  describe('matrixToCsv - 单元格矩阵转 CSV', () => {
    it('应当生成带 UTF-8 BOM 头的标准 CSV 内容', () => {
      const cellData = {
        0: { 0: { v: '姓名' }, 1: { v: '薪水' } },
        1: { 0: { v: '张三' }, 1: { v: 10000 } },
        2: { 0: { v: '李四, 工程师' }, 1: { v: 20000 } },
      };

      const csv = SpreadsheetExporter.matrixToCsv(cellData);

      // 第一字符为 UTF-8 BOM
      expect(csv.startsWith('\uFEFF')).toBe(true);
      // 检查内容
      expect(csv).toContain('姓名,薪水');
      expect(csv).toContain('张三,10000');
      expect(csv).toContain('"李四, 工程师",20000');
    });

    it('cellData 为空时应保底返回空 BOM 字符串', () => {
      expect(SpreadsheetExporter.matrixToCsv(undefined)).toBe('\uFEFF');
      expect(SpreadsheetExporter.matrixToCsv({})).toBe('\uFEFF');
    });
  });

  describe('exportCsvFromSnapshot & exportJsonFromSnapshot - 下载触发与资源释放', () => {
    const mockSnapshot: SpreadsheetSnapshot = {
      id: 'wb-test',
      sheetOrder: ['s1'],
      sheets: {
        s1: {
          id: 's1',
          name: 'Sheet1',
          cellData: {
            0: { 0: { v: 'Title' }, 1: { v: 'Count' } },
            1: { 0: { v: 'Item A' }, 1: { v: 5 } },
          },
        },
      },
    };

    it('exportCsvFromSnapshot 应当正确生成 Blob、触发下载并撤销 ObjectURL', () => {
      SpreadsheetExporter.exportCsvFromSnapshot(mockSnapshot, 'report.csv');

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
      expect(mockClick).toHaveBeenCalledTimes(1);
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/mock-url');
    });

    it('exportJsonFromSnapshot 应当正确导出 JSON 并格式化下载', () => {
      SpreadsheetExporter.exportJsonFromSnapshot(mockSnapshot, 'data.json');

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
      expect(mockClick).toHaveBeenCalledTimes(1);
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/mock-url');
    });
  });
});
