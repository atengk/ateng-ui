/**
 * 电子表格轻量导出引擎 (SpreadsheetExporter)。
 *
 * 遵循 ADR-0004 与 ADR-0049 规约：
 * 1. 原生浏览器纯前端导出，不依赖任何第三方重量级转换库；
 * 2. UTF-8 BOM (\uFEFF) 强注入，100% 根除 Windows Excel 打开中文数据乱码；
 * 3. 严格遵循 RFC 4180 CSV 规范（逗号、双引号与换行符转义防裂）；
 * 4. 确定性生命周期防线：创建的临时 ObjectURL 必须通过 try...finally 100% 释放撤销，防止内存泄漏。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import type {
  SpreadsheetCellData,
  SpreadsheetSnapshot,
  SpreadsheetExportOptions,
  SpreadsheetRecord,
  SpreadsheetColumn,
} from '../types';
import { SheetDataMapper } from '../mappers/sheet-data-mapper';

export class SpreadsheetExporter {
  /**
   * 将任意单元格值按 RFC 4180 规范转译为合法 CSV 字段字符串。
   *
   * @param value 单元格原始值
   * @returns 转义后的 CSV 单元格字符串
   */
  public static formatCsvCell(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    const str = String(value);

    // 若包含逗号、双引号、换行符等敏感字符，需用双引号包裹且内部双引号双写转义
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }

  /**
   * 将 Univer 单元格二维矩阵转译为携带 UTF-8 BOM 的标准 CSV 文本。
   *
   * @param cellData 单元格二维矩阵
   * @param separator 字段分隔符，默认为逗号 ','
   * @returns 带有 UTF-8 BOM 前缀的完整 CSV 文本
   */
  public static matrixToCsv(
    cellData: Record<number, Record<number, SpreadsheetCellData>> | undefined,
    separator = ',',
  ): string {
    const BOM = '\uFEFF';

    if (!cellData || typeof cellData !== 'object') {
      return BOM;
    }

    const rowIndices = Object.keys(cellData)
      .map(Number)
      .filter(r => !Number.isNaN(r))
      .sort((a, b) => a - b);

    if (rowIndices.length === 0) {
      return BOM;
    }

    const rows: string[] = [];

    rowIndices.forEach(rowIndex => {
      const rowCells = cellData[rowIndex];
      if (!rowCells) return;

      const colIndices = Object.keys(rowCells)
        .map(Number)
        .filter(c => !Number.isNaN(c))
        .sort((a, b) => a - b);

      if (colIndices.length === 0) return;

      const maxCol = colIndices[colIndices.length - 1];
      if (maxCol === undefined) return;
      const cols: string[] = [];

      for (let c = 0; c <= maxCol; c++) {
        const cell = rowCells[c];
        const val = cell?.m ?? cell?.v ?? '';
        cols.push(SpreadsheetExporter.formatCsvCell(val));
      }

      rows.push(cols.join(separator));
    });

    return BOM + rows.join('\r\n');
  }

  /**
   * 将扁平记录转换为 CSV 文本。
   */
  public static recordsToCsv(
    records: SpreadsheetRecord[],
    columns?: SpreadsheetColumn[],
    separator = ',',
  ): string {
    const { cellData } = SheetDataMapper.recordsToMatrix(records, columns);
    return SpreadsheetExporter.matrixToCsv(cellData, separator);
  }

  /**
   * 安全触发 Blob 下载并在完成后撤销临时 ObjectURL 句柄。
   *
   * @param blob 待下载二进制数据对象
   * @param filename 目标文件名
   */
  public static downloadBlob(blob: Blob, filename: string): void {
    if (typeof document === 'undefined' || typeof URL === 'undefined') {
      return;
    }

    let url = '';
    try {
      url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      if (link.style) {
        link.style.display = 'none';
      }
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      if (url) {
        URL.revokeObjectURL(url);
      }
    }
  }

  /**
   * 从 Univer 工作簿快照导出激活工作表为 CSV 文件并触发下载。
   *
   * @param snapshot 工作簿完整快照
   * @param filename 目标文件名，默认为 spreadsheet.csv
   * @param options 导出选项
   */
  public static exportCsvFromSnapshot(
    snapshot: SpreadsheetSnapshot,
    filename = 'spreadsheet.csv',
    options: SpreadsheetExportOptions = {},
  ): void {
    if (!snapshot || !snapshot.sheets) return;

    const sheetId =
      options.sheetId ??
      (snapshot.sheetOrder && snapshot.sheetOrder[0]) ??
      Object.keys(snapshot.sheets)[0];

    if (!sheetId) return;

    const sheet = snapshot.sheets[sheetId];
    if (!sheet) return;

    const csvContent = SpreadsheetExporter.matrixToCsv(sheet.cellData, options.separator ?? ',');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const finalName = filename.endsWith('.csv') ? filename : `${filename}.csv`;

    SpreadsheetExporter.downloadBlob(blob, finalName);
  }

  /**
   * 从 Univer 工作簿快照导出结构化 JSON 文件并触发下载。
   *
   * @param snapshot 工作簿完整快照
   * @param filename 目标文件名，默认为 spreadsheet.json
   */
  public static exportJsonFromSnapshot(
    snapshot: SpreadsheetSnapshot,
    filename = 'spreadsheet.json',
  ): void {
    if (!snapshot) return;

    const jsonContent = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const finalName = filename.endsWith('.json') ? filename : `${filename}.json`;

    SpreadsheetExporter.downloadBlob(blob, finalName);
  }
}
