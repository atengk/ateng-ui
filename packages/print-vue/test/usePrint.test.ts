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

  it('usePrint().printBatch：空数组保底返回全 0 成功实体与 100% 进度', async () => {
    const { printBatch, queueStatus, batchProgress } = usePrint();

    const result = await printBatch([], i => String(i));
    expect(result.total).toBe(0);
    expect(result.status).toBe('completed');
    expect(queueStatus.value).toBe('completed');
    expect(batchProgress.value.percentage).toBe(100);
  });

  it('usePrint().printBatch：正确调度批量打印并响应式更新进度', async () => {
    const { printBatch, registerDriver, batchProgress, queueStatus } = usePrint();

    const mockPrint = vi.fn().mockResolvedValue(undefined);
    registerDriver({
      name: 'batch-test-driver',
      isAvailable: async () => true,
      print: mockPrint,
    });

    const items = ['doc1', 'doc2', 'doc3'];
    const result = await printBatch(items, item => `<div>${item}</div>`, {
      driver: 'batch-test-driver',
      concurrency: 1,
    });

    expect(result.total).toBe(3);
    expect(result.successCount).toBe(3);
    expect(result.status).toBe('completed');
    expect(queueStatus.value).toBe('completed');
    expect(batchProgress.value.current).toBe(3);
    expect(batchProgress.value.percentage).toBe(100);
    expect(mockPrint).toHaveBeenCalledTimes(3);
  });

  it('usePrint().pauseBatch 与 cancelBatch 能够控制批量队列生命周期', async () => {
    const { printBatch, registerDriver, pauseBatch, resumeBatch, cancelBatch, queueStatus } =
      usePrint();

    let releaseWait: (() => void) | null = null;
    const mockPrint = vi.fn(async () => {
      await new Promise<void>(resolve => {
        releaseWait = resolve;
      });
    });

    registerDriver({
      name: 'controllable-driver',
      isAvailable: async () => true,
      print: mockPrint,
    });

    const batchPromise = printBatch([1, 2, 3], i => `<div>${i}</div>`, {
      driver: 'controllable-driver',
      concurrency: 1,
    });

    await new Promise(r => setTimeout(r, 10));
    expect(queueStatus.value).toBe('running');

    pauseBatch();
    expect(queueStatus.value).toBe('paused');

    resumeBatch();
    expect(queueStatus.value).toBe('running');

    cancelBatch();
    expect(queueStatus.value).toBe('cancelled');

    releaseWait?.();
    const result = await batchPromise;
    expect(result.status).toBe('cancelled');
  });
});
