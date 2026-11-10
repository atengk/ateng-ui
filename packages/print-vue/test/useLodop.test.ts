/**
 * useLodop Composable 专用状态机单元测试。
 *
 * 验证探针状态流转、打印机刷新、通道绑定与通道打印路由。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useLodop } from '../src/composables/useLodop';

describe('useLodop', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('初始状态中，isDetecting 初始为 false，printers 默认为空数组', () => {
    const { isServiceAvailable, isDetecting, printers, channelBindings } = useLodop();

    expect(isServiceAvailable.value).toBe(false);
    expect(isDetecting.value).toBe(false);
    expect(printers.value).toEqual([]);
    expect(channelBindings.value).toEqual({});
  });

  it('detectService() 在无服务时正确捕获并置 isServiceAvailable 为 false', async () => {
    const { isServiceAvailable, detectService } = useLodop({ timeoutMs: 30 });

    const available = await detectService();
    expect(available).toBe(false);
    expect(isServiceAvailable.value).toBe(false);
  });

  it('bindChannel 与 unbindChannel 能够更新响应式 channelBindings', () => {
    const { channelBindings, bindChannel, unbindChannel, getChannelPrinter } = useLodop();

    bindChannel('waybill', 'XP-420B');
    expect(channelBindings.value.waybill).toBe('XP-420B');
    expect(getChannelPrinter('waybill')).toBe('XP-420B');

    unbindChannel('waybill');
    expect(channelBindings.value.waybill).toBeUndefined();
    expect(getChannelPrinter('waybill')).toBeUndefined();
  });

  it('printWithChannel 自动将业务通道绑定的打印机注入 options 并执行打印', async () => {
    const mockLodop = {
      PRINT_INIT: vi.fn(),
      SET_PRINT_PAGESIZE: vi.fn(),
      SET_PRINTER_INDEX_OR_NAME: vi.fn(),
      SET_PRINT_COPIES: vi.fn(),
      ADD_PRINT_HTM: vi.fn(),
      PRINT: vi.fn(() => true),
    };

    const { bindChannel, printWithChannel } = useLodop({
      getLodop: () => mockLodop,
    });

    bindChannel('logistics', 'Thermal-Printer-99');

    await printWithChannel('logistics', '<div>物流面单</div>', {
      copies: 3,
    });

    expect(mockLodop.SET_PRINTER_INDEX_OR_NAME).toHaveBeenCalledWith('Thermal-Printer-99');
    expect(mockLodop.SET_PRINT_COPIES).toHaveBeenCalledWith(3);
    expect(mockLodop.PRINT).toHaveBeenCalled();
  });
});
