/**
 * LodopDriver C-Lodop 硬件静默直连驱动单元测试。
 *
 * 验证探针探测、离线异常转译、fallbackToBrowser 降级、打印机指定与连续打孔纸协议。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LodopDriver } from '../src/drivers/LodopDriver';
import { PrintErrorCode, PrintException } from '../src/errors/PrintException';

describe('LodopDriver', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    delete (window as unknown as { getCLodop?: unknown }).getCLodop;
    delete (window as unknown as { LODOP?: unknown }).LODOP;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('探针探测：当本地未启动 C-Lodop 且无 mock 时，isAvailable() 返回 false', async () => {
    const driver = new LodopDriver({ timeoutMs: 50 });
    const available = await driver.isAvailable();
    expect(available).toBe(false);
  });

  it('离线防卫：未启动服务且 fallbackToBrowser = false 时抛出 DRIVER_UNAVAILABLE', async () => {
    const driver = new LodopDriver({ timeoutMs: 50 });
    await expect(driver.print('<div>单据内容</div>', { fallbackToBrowser: false })).rejects.toThrow(
      PrintException,
    );

    try {
      await driver.print('<div>单据内容</div>', { fallbackToBrowser: false });
    } catch (err) {
      expect((err as PrintException).code).toBe(PrintErrorCode.DRIVER_UNAVAILABLE);
    }
  });

  it('平滑降级：未启动服务但 fallbackToBrowser = true 时自动降级至无头浏览器打印', async () => {
    const driver = new LodopDriver({ timeoutMs: 50 });
    const onFallback = vi.fn();
    const onSuccess = vi.fn();

    // 在 jsdom 中模拟 window.print
    window.print = vi.fn();

    await driver.print('<div>降级单据内容</div>', {
      fallbackToBrowser: true,
      onFallback,
      onSuccess,
    });

    expect(onFallback).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
  });

  it('连续打孔纸走纸协议：针对 continuous-241-140 下发 intOrient=3 与物理尺寸', async () => {
    const mockLodop = {
      PRINT_INIT: vi.fn(),
      SET_PRINT_PAGESIZE: vi.fn(),
      SET_PRINTER_INDEX_OR_NAME: vi.fn(),
      SET_PRINT_COPIES: vi.fn(),
      ADD_PRINT_HTM: vi.fn(),
      PRINT: vi.fn(() => true),
    };

    const driver = new LodopDriver({
      getLodop: () => mockLodop,
    });

    await driver.print('<div id="print-content">三联单内容</div>', {
      preset: 'continuous-241-140',
      printer: 'DASCOM DS-620',
      copies: 2,
    });

    expect(mockLodop.PRINT_INIT).toHaveBeenCalledWith('ATENG_PRINT_JOB');
    expect(mockLodop.SET_PRINTER_INDEX_OR_NAME).toHaveBeenCalledWith('DASCOM DS-620');
    // 连续打孔纸协议：intOrient 必须为 3，高度匹配 140mm
    expect(mockLodop.SET_PRINT_PAGESIZE).toHaveBeenCalledWith(
      3,
      '241mm',
      '140mm',
      'continuous-241-140',
    );
    expect(mockLodop.SET_PRINT_COPIES).toHaveBeenCalledWith(2);
    expect(mockLodop.ADD_PRINT_HTM).toHaveBeenCalled();
    expect(mockLodop.PRINT).toHaveBeenCalled();
  });

  it('标准 A4 纸张排版：下发固定尺寸与纵向模式 (intOrient=1)', async () => {
    const mockLodop = {
      PRINT_INIT: vi.fn(),
      SET_PRINT_PAGESIZE: vi.fn(),
      SET_PRINTER_INDEX_OR_NAME: vi.fn(),
      SET_PRINT_COPIES: vi.fn(),
      ADD_PRINT_HTM: vi.fn(),
      PRINT: vi.fn(() => true),
    };

    const driver = new LodopDriver({
      getLodop: () => mockLodop,
    });

    await driver.print('<div>A4 单据内容</div>', {
      preset: 'a4',
      orientation: 'portrait',
    });

    expect(mockLodop.SET_PRINT_PAGESIZE).toHaveBeenCalledWith(1, '210mm', '297mm', 'a4');
    expect(mockLodop.PRINT).toHaveBeenCalled();
  });
});
