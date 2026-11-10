/**
 * ExcelExchangeSPI 驱动接口与注册管理器单元测试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExcelExchangeManager, type ExcelExchangeSPI } from '../src/spi/excel-exchange-spi';
import type { SpreadsheetSnapshot } from '../src/types';

describe('ExcelExchangeSPI & ExcelExchangeManager', () => {
  beforeEach(() => {
    ExcelExchangeManager.clearDriver();
  });

  afterEach(() => {
    ExcelExchangeManager.clearDriver();
  });

  it('未注册驱动时调用 import 或 export 应当快速失败并抛出明确错误', async () => {
    expect(ExcelExchangeManager.hasDriver()).toBe(false);
    expect(ExcelExchangeManager.getDriver()).toBeNull();

    await expect(ExcelExchangeManager.import(new Blob([]))).rejects.toThrow(
      'ExcelExchangeSPI driver not registered',
    );
    await expect(ExcelExchangeManager.export({ id: 'test' }, 'test.xlsx')).rejects.toThrow(
      'ExcelExchangeSPI driver not registered',
    );
  });

  it('注册非法驱动时应当抛出 TypeError', () => {
    expect(() => {
      ExcelExchangeManager.registerDriver({} as unknown as ExcelExchangeSPI);
    }).toThrow(TypeError);
  });

  it('成功注册驱动后能够正确委托 import 与 export 调用', async () => {
    const mockSnapshot: SpreadsheetSnapshot = { id: 'workbook-mock' };
    const mockBlob = new Blob(['mock-excel-binary']);

    const mockDriver: ExcelExchangeSPI = {
      import: vi.fn().mockResolvedValue(mockSnapshot),
      export: vi.fn().mockResolvedValue(mockBlob),
    };

    ExcelExchangeManager.registerDriver(mockDriver);

    expect(ExcelExchangeManager.hasDriver()).toBe(true);
    expect(ExcelExchangeManager.getDriver()).toBe(mockDriver);

    const imported = await ExcelExchangeManager.import(new Blob(['input']));
    expect(imported).toEqual(mockSnapshot);
    expect(mockDriver.import).toHaveBeenCalledTimes(1);

    const exported = await ExcelExchangeManager.export(mockSnapshot, 'out.xlsx');
    expect(exported).toEqual(mockBlob);
    expect(mockDriver.export).toHaveBeenCalledTimes(1);

    // 清理测试
    ExcelExchangeManager.clearDriver();
    expect(ExcelExchangeManager.hasDriver()).toBe(false);
  });
});
