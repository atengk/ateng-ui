/**
 * PrintQueueCoordinator 批量并发调度器单元测试。
 *
 * 验证受控并发限流、暂停/恢复/取消状态流转、单任务错误隔离、进度感知与空安全兜底。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrintQueueCoordinator } from '../src/services/PrintQueueCoordinator';
import { PrintErrorCode, PrintException } from '../src/errors/PrintException';
import type { BatchPrintProgress, BatchPrintStatus } from '../src/types';

describe('PrintQueueCoordinator', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('空数组防御：传入空集合立即返回保底成功结果与 100% 进度', async () => {
    const onProgress = vi.fn();
    const coordinator = new PrintQueueCoordinator();

    const result = await coordinator.printBatch([], item => String(item), {
      onProgress,
    });

    expect(result).toEqual({
      total: 0,
      successCount: 0,
      failedCount: 0,
      items: [],
      failedItems: [],
      status: 'completed',
    });
    expect(coordinator.getStatus()).toBe('completed');
    expect(onProgress).toHaveBeenCalledWith({
      current: 0,
      total: 0,
      percentage: 100,
      successCount: 0,
      failedCount: 0,
    });
  });

  it('串行调度 (concurrency = 1)：任务严格按序执行且同一时刻活跃任务数不超过 1', async () => {
    let activeWorkers = 0;
    let maxActiveWorkers = 0;
    const executionOrder: number[] = [];

    const mockPrint = vi.fn(async (_target: unknown, _opts: unknown) => {
      activeWorkers++;
      maxActiveWorkers = Math.max(maxActiveWorkers, activeWorkers);
      await new Promise(resolve => setTimeout(resolve, 20));
      activeWorkers--;
    });

    const coordinator = new PrintQueueCoordinator(mockPrint);
    const items = [10, 20, 30, 40];

    const result = await coordinator.printBatch(
      items,
      (item, index) => {
        executionOrder.push(index);
        return `<div>${item}</div>`;
      },
      { concurrency: 1 },
    );

    expect(result.total).toBe(4);
    expect(result.successCount).toBe(4);
    expect(result.failedCount).toBe(0);
    expect(result.failedItems).toEqual([]);
    expect(maxActiveWorkers).toBe(1);
    expect(executionOrder).toEqual([0, 1, 2, 3]);
    expect(mockPrint).toHaveBeenCalledTimes(4);
  });

  it('受控并发调度 (concurrency = 3)：活跃任务数不超过 3 且全量完成', async () => {
    let activeWorkers = 0;
    let maxActiveWorkers = 0;

    const mockPrint = vi.fn(async () => {
      activeWorkers++;
      maxActiveWorkers = Math.max(maxActiveWorkers, activeWorkers);
      await new Promise(resolve => setTimeout(resolve, 25));
      activeWorkers--;
    });

    const coordinator = new PrintQueueCoordinator(mockPrint);
    const items = ['A', 'B', 'C', 'D', 'E', 'F'];

    const result = await coordinator.printBatch(items, item => `<span>${item}</span>`, {
      concurrency: 3,
    });

    expect(result.total).toBe(6);
    expect(result.successCount).toBe(6);
    expect(maxActiveWorkers).toBeLessThanOrEqual(3);
    expect(maxActiveWorkers).toBeGreaterThan(1);
    expect(result.status).toBe('completed');
  });

  it('实时进度分发：正确更新 current、percentage 与成功数', async () => {
    const progressHistory: BatchPrintProgress[] = [];
    const coordinator = new PrintQueueCoordinator(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    const items = [1, 2, 3, 4];
    await coordinator.printBatch(items, item => `<div>${item}</div>`, {
      concurrency: 1,
      onProgress: prog => {
        progressHistory.push({ ...prog });
      },
    });

    expect(progressHistory.length).toBe(4);
    expect(progressHistory[0]).toEqual({
      current: 1,
      total: 4,
      percentage: 25,
      successCount: 1,
      failedCount: 0,
    });
    expect(progressHistory[3]).toEqual({
      current: 4,
      total: 4,
      percentage: 100,
      successCount: 4,
      failedCount: 0,
    });
  });

  it('生命周期：暂停 (pause) 与恢复 (resume) 调度', async () => {
    const executed: number[] = [];
    let resolveFirstTask: (() => void) | null = null;

    const mockPrint = vi.fn(async (_target: unknown, _opts: unknown) => {
      await new Promise<void>(resolve => {
        if (!resolveFirstTask) {
          resolveFirstTask = resolve;
        } else {
          resolve();
        }
      });
    });

    const statusChanges: BatchPrintStatus[] = [];
    const coordinator = new PrintQueueCoordinator(mockPrint);

    const batchPromise = coordinator.printBatch(
      [1, 2, 3, 4],
      (item, idx) => {
        executed.push(idx);
        return `<div>${item}</div>`;
      },
      {
        concurrency: 1,
        onStatusChange: s => statusChanges.push(s),
      },
    );

    // 等待第一个任务开始
    await new Promise(r => setTimeout(r, 10));
    expect(coordinator.getStatus()).toBe('running');

    // 触发暂停
    coordinator.pause();
    expect(coordinator.getStatus()).toBe('paused');

    // 完成第一个任务
    resolveFirstTask?.();
    await new Promise(r => setTimeout(r, 30));

    // 暂停期间，后续任务不启动
    expect(executed).toEqual([0]);

    // 触发恢复
    coordinator.resume();
    expect(coordinator.getStatus()).toBe('running');

    const result = await batchPromise;
    expect(result.successCount).toBe(4);
    expect(result.status).toBe('completed');
    expect(executed).toEqual([0, 1, 2, 3]);
  });

  it('生命周期：取消 (cancel) 队列中断待执行任务', async () => {
    const executed: number[] = [];
    let resolveFirst: (() => void) | null = null;

    const mockPrint = vi.fn(async () => {
      await new Promise<void>(resolve => {
        if (!resolveFirst) {
          resolveFirst = resolve;
        } else {
          resolve();
        }
      });
    });

    const coordinator = new PrintQueueCoordinator(mockPrint);
    const batchPromise = coordinator.printBatch(
      ['doc1', 'doc2', 'doc3', 'doc4'],
      (item, idx) => {
        executed.push(idx);
        return `<div>${item}</div>`;
      },
      { concurrency: 1 },
    );

    await new Promise(r => setTimeout(r, 10));
    // 在第一个任务运行中取消队列
    coordinator.cancel();
    expect(coordinator.getStatus()).toBe('cancelled');

    // 释放第一个任务
    resolveFirst?.();

    const result = await batchPromise;
    expect(result.status).toBe('cancelled');
    expect(result.successCount).toBe(1);
    expect(executed).toEqual([0]);
  });

  it('错误隔离 (continueOnError: true)：单任务失败不阻断后续流转并收集 failedItems', async () => {
    const mockPrint = vi.fn(async (target: unknown) => {
      if (String(target).includes('FAIL')) {
        throw new PrintException('单据渲染或打印异常', PrintErrorCode.EXECUTION_FAILED);
      }
    });

    const coordinator = new PrintQueueCoordinator(mockPrint);
    const items = ['PASS_1', 'FAIL_2', 'PASS_3'];

    const result = await coordinator.printBatch(items, item => `<div>${item}</div>`, {
      concurrency: 1,
      continueOnError: true,
    });

    expect(result.total).toBe(3);
    expect(result.successCount).toBe(2);
    expect(result.failedCount).toBe(1);
    expect(result.failedItems.length).toBe(1);
    expect(result.failedItems[0].index).toBe(1);
    expect(result.failedItems[0].item).toBe('FAIL_2');
    expect(result.failedItems[0].error).toBeInstanceOf(PrintException);
    expect(result.status).toBe('completed');
  });

  it('快速失败 (continueOnError: false)：单任务失败立即中断后续执行', async () => {
    const mockPrint = vi.fn(async (target: unknown) => {
      if (String(target).includes('ERR')) {
        throw new Error('网络通信断开');
      }
    });

    const coordinator = new PrintQueueCoordinator(mockPrint);
    const executed: string[] = [];

    const result = await coordinator.printBatch(
      ['A', 'ERR', 'C', 'D'],
      item => {
        executed.push(item);
        return `<div>${item}</div>`;
      },
      { concurrency: 1, continueOnError: false },
    );

    expect(result.successCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(result.status).toBe('cancelled');
    expect(executed).toEqual(['A', 'ERR']);
  });

  it('防重入防御：当前队列运行中再次发起调度抛出 QUEUE_ERROR', async () => {
    const coordinator = new PrintQueueCoordinator(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    const firstRun = coordinator.printBatch([1, 2], i => `${i}`);
    await expect(coordinator.printBatch([3, 4], i => `${i}`)).rejects.toThrow(PrintException);

    await firstRun;
  });

  it('缓冲延迟 (delayBetweenTasks)：在相邻任务间插入缓冲', async () => {
    const timestamps: number[] = [];
    const coordinator = new PrintQueueCoordinator(async () => {
      timestamps.push(Date.now());
    });

    await coordinator.printBatch([1, 2, 3], i => `${i}`, {
      concurrency: 1,
      delayBetweenTasks: 30,
    });

    expect(timestamps.length).toBe(3);
    const diff1 = timestamps[1] - timestamps[0];
    const diff2 = timestamps[2] - timestamps[1];
    expect(diff1).toBeGreaterThanOrEqual(25);
    expect(diff2).toBeGreaterThanOrEqual(25);
  });
});
