/**
 * 电子表格业务数据双向转译引擎 (SheetDataMapper)。
 *
 * 遵循 ADR-0049 确立的双轨数据契约与工业级防线：
 * 1. 业务对象数组 (records) 与 Univer 单元格二维矩阵 (cellData) 纯函数互转；
 * 2. 动态列推断 (autoInferColumns)，当未显式配置 columns 时自适应首行推断列头与列宽；
 * 3. 关键内部字段保全机制：在矩阵逆向提取对象时，基于原始对象（originalRecords）
 *    执行解构合并，确保未在表格中呈现的内部隐藏字段（如 _id、createdAt、状态标记等）100% 完整保留。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import type {
  SpreadsheetColumn,
  SpreadsheetRecord,
  SpreadsheetCellData,
  SpreadsheetSnapshot,
  SpreadsheetWorksheetData,
} from '../types';

export class SheetDataMapper {
  /**
   * 将字段名转译为可读的列标题（如 'userName' -> 'User Name'，'id' -> 'Id'）。
   */
  public static formatTitle(key: string): string {
    if (!key) return '';
    // 如果包含下划线或短横线，按分隔符分词
    if (key.includes('_') || key.includes('-')) {
      return key
        .split(/[_-]/)
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
    }
    // 驼峰命名分词
    const formatted = key.replace(/([A-Z])/g, ' $1').trim();
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  /**
   * 动态推断列配置。
   *
   * @param records 扁平业务行记录
   * @returns 推断出的列定义数组，无记录时保底返回 []
   */
  public static inferColumns(records: SpreadsheetRecord[]): SpreadsheetColumn[] {
    if (!Array.isArray(records) || records.length === 0) {
      return [];
    }

    const firstRow = records[0];
    if (!firstRow || typeof firstRow !== 'object') {
      return [];
    }

    const keys = Object.keys(firstRow);
    if (keys.length === 0) {
      return [];
    }

    return keys.map(key => ({
      key,
      title: SheetDataMapper.formatTitle(key),
      width: 120,
      required: false,
    }));
  }

  /**
   * 将扁平对象行记录转换为 Univer 单元格二维矩阵及对应列配置。
   *
   * 第 0 行为表头，第 1 行及以上为业务数据行。
   *
   * @param records 扁平行记录
   * @param columns 显式列配置（未传则自动推断）
   * @returns 包含 cellData 矩阵、已解析 columns 与行列维度的元组对象
   */
  public static recordsToMatrix(
    records: SpreadsheetRecord[],
    columns?: SpreadsheetColumn[],
  ): {
    cellData: Record<number, Record<number, SpreadsheetCellData>>;
    columns: SpreadsheetColumn[];
    rowCount: number;
    columnCount: number;
  } {
    const safeRecords = Array.isArray(records) ? records : [];
    const resolvedColumns =
      columns && columns.length > 0 ? columns : SheetDataMapper.inferColumns(safeRecords);

    const cellData: Record<number, Record<number, SpreadsheetCellData>> = {};

    // 1. 构建第 0 行表头
    cellData[0] = {};
    const headerRow = cellData[0];
    resolvedColumns.forEach((col, colIdx) => {
      headerRow[colIdx] = {
        v: col.title,
        m: col.title,
        s: {
          bold: true,
          horizontalAlign: 'center',
          backgroundColor: '#f5f7fa',
          ...(col.style || {}),
        },
      };
    });

    // 2. 填充第 1 行及以上的数据行
    safeRecords.forEach((record, rowIdx) => {
      const rowIndex = rowIdx + 1;
      cellData[rowIndex] = {};
      const dataRow = cellData[rowIndex];

      resolvedColumns.forEach((col, colIdx) => {
        const rawVal = record[col.key];
        let val: string | number | boolean = '';

        if (rawVal !== undefined && rawVal !== null) {
          if (typeof rawVal === 'object') {
            try {
              val = JSON.stringify(rawVal);
            } catch {
              val = String(rawVal);
            }
          } else if (
            typeof rawVal === 'number' ||
            typeof rawVal === 'boolean' ||
            typeof rawVal === 'string'
          ) {
            val = rawVal;
          } else {
            val = String(rawVal);
          }
        }

        dataRow[colIdx] = {
          v: val,
          m: val === '' ? '' : String(val),
          ...(col.style ? { s: col.style } : {}),
        };
      });
    });

    const rowCount = Math.max(safeRecords.length + 1, 20);
    const columnCount = Math.max(resolvedColumns.length, 10);

    return {
      cellData,
      columns: resolvedColumns,
      rowCount,
      columnCount,
    };
  }

  /**
   * 将 Univer 单元格二维矩阵逆向提取为业务对象数组。
   *
   * 具备关键内部字段保全机制：若提供 originalRecords，提取时将优先以原始对象为基底，
   * 仅覆写当前 columns 对应的已修改字段，确保表格外隐藏字段（如 _id、createdAt）完好无损。
   *
   * @param cellData 单元格二维矩阵
   * @param columns 列定义配置
   * @param originalRecords 原始数据行（用于未展示字段保全）
   * @returns 提取出的扁平业务对象数组，保底返回 []
   */
  public static matrixToRecords(
    cellData: Record<number, Record<number, SpreadsheetCellData>> | undefined,
    columns: SpreadsheetColumn[],
    originalRecords?: SpreadsheetRecord[],
  ): SpreadsheetRecord[] {
    if (!cellData || typeof cellData !== 'object') {
      return [];
    }

    const resolvedColumns = Array.isArray(columns) ? columns : [];
    if (resolvedColumns.length === 0) {
      return [];
    }

    const rowIndices = Object.keys(cellData)
      .map(Number)
      .filter(r => !Number.isNaN(r) && r > 0)
      .sort((a, b) => a - b);

    if (rowIndices.length === 0) {
      return [];
    }

    const records: SpreadsheetRecord[] = [];

    rowIndices.forEach(rowIndex => {
      const rowCells = cellData[rowIndex];
      const recordIdx = rowIndex - 1;

      // 未展示字段保全：若有原始记录，以其深拷贝/展开为基底
      const baseRecord: SpreadsheetRecord =
        originalRecords && originalRecords[recordIdx] ? { ...originalRecords[recordIdx] } : {};

      let hasAnyValue = false;

      resolvedColumns.forEach((col, colIdx) => {
        const cell = rowCells?.[colIdx];
        const val = cell?.v;

        if (val !== undefined && val !== null && val !== '') {
          hasAnyValue = true;
          baseRecord[col.key] = val;
        } else {
          baseRecord[col.key] = val === '' ? '' : (val ?? baseRecord[col.key] ?? '');
        }
      });

      // 如果整行没有任何值且原本也没有原始记录，则跳过空行
      if (hasAnyValue || (originalRecords && originalRecords[recordIdx])) {
        records.push(baseRecord);
      }
    });

    return records;
  }

  /**
   * 将业务行数据直接序列化为 Univer 工作簿完整 JSON 快照。
   *
   * @param records 扁平业务行记录
   * @param columns 显式列定义
   * @param options 快照元数据选项
   * @returns 合法的 Univer 工作簿 JSON 快照
   */
  public static recordsToSnapshot(
    records: SpreadsheetRecord[],
    columns?: SpreadsheetColumn[],
    options: {
      sheetId?: string;
      sheetName?: string;
      workbookName?: string;
    } = {},
  ): SpreadsheetSnapshot {
    const sheetId = options.sheetId ?? 'sheet-01';
    const sheetName = options.sheetName ?? 'Sheet1';
    const workbookName = options.workbookName ?? 'Spreadsheet';

    const {
      cellData,
      columns: resolvedColumns,
      rowCount,
      columnCount,
    } = SheetDataMapper.recordsToMatrix(records, columns);

    // 计算列宽映射
    const columnData: Record<number, { w?: number }> = {};
    resolvedColumns.forEach((col, idx) => {
      if (col.width) {
        columnData[idx] = { w: col.width };
      }
    });

    const worksheet: SpreadsheetWorksheetData = {
      id: sheetId,
      name: sheetName,
      rowCount,
      columnCount,
      cellData,
      columnData,
    };

    return {
      id: `workbook-${Date.now()}`,
      name: workbookName,
      locale: 'zh-CN',
      sheetOrder: [sheetId],
      sheets: {
        [sheetId]: worksheet,
      },
    };
  }

  /**
   * 从 Univer 工作簿快照中反向提取激活工作表的数据行记录。
   *
   * @param snapshot 工作簿快照
   * @param columns 显式列配置（未传则自动推断）
   * @param originalRecords 原始数据行（用于内部隐藏字段保全）
   * @param targetSheetId 指定的工作表 ID（默认首张工作表）
   * @returns 提取出的扁平业务对象数组
   */
  public static snapshotToRecords(
    snapshot: SpreadsheetSnapshot,
    columns?: SpreadsheetColumn[],
    originalRecords?: SpreadsheetRecord[],
    targetSheetId?: string,
  ): SpreadsheetRecord[] {
    if (!snapshot || !snapshot.sheets) {
      return [];
    }

    const sheetId =
      targetSheetId ??
      (snapshot.sheetOrder && snapshot.sheetOrder[0]) ??
      Object.keys(snapshot.sheets)[0];

    if (!sheetId || !snapshot.sheets[sheetId]) {
      return [];
    }

    const sheet = snapshot.sheets[sheetId];
    const cellData = sheet.cellData;

    // 若未传入 columns，尝试从第 0 行表头推断
    let resolvedColumns = columns;
    if (!resolvedColumns || resolvedColumns.length === 0) {
      const headerRow = cellData?.[0];
      if (headerRow) {
        const colIndices = Object.keys(headerRow)
          .map(Number)
          .filter(c => !Number.isNaN(c))
          .sort((a, b) => a - b);

        resolvedColumns = colIndices.map(colIdx => {
          const title = String(headerRow[colIdx]?.v ?? `Column ${colIdx + 1}`);
          // 键名首字母小写或转为属性名
          const key = title.charAt(0).toLowerCase() + title.slice(1).replace(/\s+/g, '');
          return {
            key,
            title,
            width: sheet.columnData?.[colIdx]?.w ?? 120,
          };
        });
      } else {
        resolvedColumns = [];
      }
    }

    return SheetDataMapper.matrixToRecords(cellData, resolvedColumns, originalRecords);
  }
}
