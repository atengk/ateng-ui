/**
 * usePrint Composable 单元测试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { usePrint } from '../src/composables/usePrint';
import { PrintErrorCode, PrintException } from '../src/errors/PrintException';
import type { PrintDriver } from '../src/types';

describe('usePrint', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('默认注册 browser 驱动，初始状态正常', () => {
    const { isPrinting, error, currentDriver, getDriver } = usePrint();

    expect(isPrinting.value).toBe(false);
    expect(error.value).toBeNull();
    expect(currentDriver.value).toBe('browser');
    expect(getDriver('browser')).toBeDefined();
  });

  it('支持注册自定义扩展驱动并在调度时命中', async () => {
    const { registerDriver, print } = usePrint();

    const mockPrint = vi.fn().mockResolvedValue(undefined);
    const customDriver: PrintDriver = {
      name: 'mock-driver',
      isAvailable: async () => true,
      print: mockPrint,
    };

    registerDriver(customDriver);
    await print('<div>测试</div>', { driver: 'mock-driver' });

    expect(mockPrint).toHaveBeenCalled();
  });

  it('未找到驱动且未启用降级时抛出 DRIVER_NOT_FOUND', async () => {
    const { print, error } = usePrint();

    await expect(print('<div>测试</div>', { driver: 'unknown-driver' })).rejects.toThrow(
      PrintException,
    );
    expect(error.value?.code).toBe(PrintErrorCode.DRIVER_NOT_FOUND);
  });

  it('当目标驱动未找到但开启 fallbackToBrowser 时自动降级为 browser 驱动', async () => {
    const { print } = usePrint();
    const onFallback = vi.fn();
    const onSuccess = vi.fn();

    await print('<div>测试</div>', {
      driver: 'non-existing',
      fallbackToBrowser: true,
      onFallback,
      onSuccess,
    });

    expect(onFallback).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
  });
});
