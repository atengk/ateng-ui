/**
 * PrinterManager 物理打印机与业务通道路由管理器单元测试。
 *
 * 验证系统打印机枚举、业务通道绑定、localStorage 偏好持久化与空安全。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrinterManager } from '../src/services/PrinterManager';

describe('PrinterManager', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('空安全保底：在无可用打印机时 getPrinters() 返回空数组 []', async () => {
    const manager = new PrinterManager();
    const printers = await manager.getPrinters();
    expect(printers).toEqual([]);
  });

  it('支持从 C-Lodop 实例中枚举物理打印机列表', async () => {
    const mockLodop = {
      GET_PRINTER_COUNT: vi.fn(() => 3),
      GET_PRINTER_NAME: vi.fn((index: number) => {
        const names = [
          'HP LaserJet Pro M404n (标准 A4 激光机)',
          'Xprinter XP-420B (电子面单热敏机)',
          'DASCOM DS-620 (连续打孔多联单针式机)',
        ];
        return names[index] || '';
      }),
    };

    const manager = new PrinterManager(() => mockLodop);
    const printers = await manager.getPrinters();

    expect(printers.length).toBe(3);
    expect(printers[1]).toContain('Xprinter XP-420B');
    expect(mockLodop.GET_PRINTER_COUNT).toHaveBeenCalled();
  });

  it('业务通道绑定：成功将 channel 与目标打印机绑定并读取', () => {
    const manager = new PrinterManager();

    manager.bindChannel('waybill', 'Xprinter XP-420B');
    manager.bindChannel('continuous', 'DASCOM DS-620');

    expect(manager.getChannelPrinter('waybill')).toBe('Xprinter XP-420B');
    expect(manager.getChannelPrinter('continuous')).toBe('DASCOM DS-620');
    expect(manager.getChannelPrinter('unknown')).toBeUndefined();

    const allBindings = manager.getAllChannelBindings();
    expect(allBindings).toEqual({
      waybill: 'Xprinter XP-420B',
      continuous: 'DASCOM DS-620',
    });
  });

  it('业务通道解绑：成功移除指定通道绑定关系', () => {
    const manager = new PrinterManager();
    manager.bindChannel('receipt', 'EPSON TM-T88VI');
    expect(manager.getChannelPrinter('receipt')).toBe('EPSON TM-T88VI');

    manager.unbindChannel('receipt');
    expect(manager.getChannelPrinter('receipt')).toBeUndefined();
  });

  it('偏好持久化：绑定关系自动保存并在新实例中从 localStorage 恢复', () => {
    const manager1 = new PrinterManager();
    manager1.bindChannel('invoice', 'HP LaserJet Pro');

    // 检查 localStorage 中已被持久化
    const saved = localStorage.getItem('ateng_print_channel_printers');
    expect(saved).toBeTruthy();
    expect(JSON.parse(saved!)).toEqual({ invoice: 'HP LaserJet Pro' });

    // 新实例初始化自动从 localStorage 加载
    const manager2 = new PrinterManager();
    expect(manager2.getChannelPrinter('invoice')).toBe('HP LaserJet Pro');
  });

  it('清空偏好：clearPreferences() 清空通道绑定与 localStorage 缓存', () => {
    const manager = new PrinterManager();
    manager.bindChannel('a', 'printer-a');
    manager.clearPreferences();

    expect(manager.getAllChannelBindings()).toEqual({});
    expect(localStorage.getItem('ateng_print_channel_printers')).toBeNull();
  });

  it('路由参数解析：resolvePrintOptions 将通道绑定打印机自动注入 PrintOptions', () => {
    const manager = new PrinterManager();
    manager.bindChannel('waybill', 'Label-Printer-01');

    const resolved = manager.resolvePrintOptions('waybill', {
      copies: 2,
    });

    expect(resolved.driver).toBe('lodop');
    expect(resolved.printer).toBe('Label-Printer-01');
    expect(resolved.copies).toBe(2);
  });
});
