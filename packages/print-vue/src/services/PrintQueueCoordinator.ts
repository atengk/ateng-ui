/**
 * 批量打印并发队列调度器。
 *
 * 提供受控并发限流、响应式进度分发、运行时暂停/恢复/取消及单任务异常隔离机制，
 * 有效防止并发突发请求导致浏览器崩溃或硬件打印驱动过载。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { PrintErrorCode, PrintException } from '../errors/PrintException';
import { BrowserIframeDriver } from '../drivers/BrowserIframeDriver';
import type {
  PrintOptions,
  BatchPrintOptions,
  BatchPrintResult,
  BatchPrintStatus,
  BatchPrintItemError,
} from '../types';

export class PrintQueueCoordinator {
  /** 当前队列执行状态 */
  private status: BatchPrintStatus = 'idle';

  /** 暂停状态等待唤醒的 Promise 决策解析器 */
  private resumeResolve: (() => void) | null = null;
  private resumePromise: Promise<void> | null = null;

  /** 状态流转监听器 */
  private statusListener: ((status: BatchPrintStatus) => void) | null = null;

  /** 默认单项打印执行器 */
  private defaultPrintFn: (target: HTMLElement | string, options?: PrintOptions) => Promise<void>;

  /**
   * 构造批量并发调度器实例。
   *
   * @param defaultPrintFn 默认打印执行器函数，未指定时默认使用 BrowserIframeDriver
   */
  constructor(
    defaultPrintFn?: (target: HTMLElement | string, options?: PrintOptions) => Promise<void>,
  ) {
    this.defaultPrintFn =
      defaultPrintFn ||
      (async (target, options) => {
        const driver = new BrowserIframeDriver();
        await driver.print(target, options);
      });
  }

  /**
   * 获取当前队列调度状态。
   */
  public getStatus(): BatchPrintStatus {
    return this.status;
  }

  /**
   * 暂停队列调度。
   *
   * 正在并发执行中的单据任务将继续运行至完成，待执行的任务将被挂起等待 resume。
   */
  public pause(): void {
    if (this.status === 'running') {
      this.updateStatus('paused');
      if (!this.resumePromise) {
        this.resumePromise = new Promise<void>(resolve => {
          this.resumeResolve = resolve;
        });
      }
    }
  }

  /**
   * 恢复被暂停的队列调度。
   */
  public resume(): void {
    if (this.status === 'paused') {
      this.updateStatus('running');
      if (this.resumeResolve) {
        const resolve = this.resumeResolve;
        this.resumePromise = null;
        this.resumeResolve = null;
        resolve();
      }
    }
  }

  /**
   * 取消当前队列调度。
   *
   * 正在执行中的任务允许退出，所有未开始的任务将被放弃。
   */
  public cancel(): void {
    if (this.status === 'running' || this.status === 'paused') {
      this.updateStatus('cancelled');
      if (this.resumeResolve) {
        const resolve = this.resumeResolve;
        this.resumePromise = null;
        this.resumeResolve = null;
        resolve();
      }
    }
  }

  /**
   * 重置队列状态为闲置。
   */
  public reset(): void {
    this.status = 'idle';
    this.resumePromise = null;
    this.resumeResolve = null;
    this.statusListener = null;
  }

  /**
   * 执行批量单据并发调度。
   *
   * @param items 待打印的单据数据项集合
   * @param renderFn 单据渲染器，将单条数据转译为 DOM 节点或 HTML 字符串
   * @param options 批量打印与并发控制参数
   */
  public async printBatch<T>(
    items: T[],
    renderFn: (item: T, index: number) => HTMLElement | string | Promise<HTMLElement | string>,
    options?: BatchPrintOptions,
  ): Promise<BatchPrintResult<T>> {
    // 1. 空安全保底防御：空集合直接返回保底实体与 100% 进度
    if (!items || items.length === 0) {
      this.updateStatus('completed');
      options?.onProgress?.({
        current: 0,
        total: 0,
        percentage: 100,
        successCount: 0,
        failedCount: 0,
      });
      return {
        total: 0,
        successCount: 0,
        failedCount: 0,
        items: [],
        failedItems: [],
        status: 'completed',
      };
    }

    // 2. 防重入卫语句校验
    if (this.status === 'running' || this.status === 'paused') {
      throw new PrintException(
        '当前已有正在排队或执行中的批量打印任务，无法并发启动多个调度实例',
        PrintErrorCode.QUEUE_ERROR,
        { extra: { currentStatus: this.status } },
      );
    }

    // 3. 初始化调度上下文
    this.statusListener = options?.onStatusChange || null;
    this.updateStatus('running');

    const total = items.length;
    let successCount = 0;
    let failedCount = 0;
    const failedItems: BatchPrintItemError<T>[] = [];
    const continueOnError = options?.continueOnError !== false;
    const concurrency = Math.max(1, Math.min(options?.concurrency ?? 1, total));
    const delayBetweenTasks = options?.delayBetweenTasks ?? 0;

    let nextTaskIndex = 0;

    const emitProgress = (): void => {
      const processed = successCount + failedCount;
      const percentage = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 100;
      options?.onProgress?.({
        current: processed,
        total,
        percentage,
        successCount,
        failedCount,
      });
    };

    const getNextIndex = (): number | null => {
      if (nextTaskIndex >= total) {
        return null;
      }
      const idx = nextTaskIndex;
      nextTaskIndex++;
      return idx;
    };

    // 4. 工作协程执行循环
    const worker = async (): Promise<void> => {
      while (true) {
        // 检查取消态
        if (this.getStatus() === 'cancelled') {
          break;
        }

        // 检查暂停态并挂起等待恢复
        if (this.getStatus() === 'paused') {
          await (this.resumePromise || Promise.resolve());
          if (this.getStatus() === 'cancelled') {
            break;
          }
        }

        const index = getNextIndex();
        if (index === null || index >= items.length) {
          break;
        }

        const item = items[index];
        if (item === undefined) {
          break;
        }

        try {
          // 渲染单据内容
          const renderedTarget = await renderFn(item, index);

          // 再次检查中途是否被取消
          if (this.getStatus() === 'cancelled') {
            break;
          }

          // 调度单据打印
          if (options?.executeItem) {
            await options.executeItem(renderedTarget, item, index, options);
          } else {
            await this.defaultPrintFn(renderedTarget, options);
          }

          successCount++;
        } catch (err: unknown) {
          failedCount++;
          const printErr =
            err instanceof PrintException
              ? err
              : err instanceof Error
                ? err
                : new Error(String(err));

          failedItems.push({
            item,
            index,
            error: printErr,
          });

          // 若配置为不容错，立即终止后续队列
          if (!continueOnError) {
            this.cancel();
            break;
          }
        } finally {
          emitProgress();
        }

        // 任务间缓冲延迟
        if (delayBetweenTasks > 0 && this.getStatus() === 'running') {
          await new Promise(resolve => setTimeout(resolve, delayBetweenTasks));
        }
      }
    };

    try {
      // 5. 启动并发工作协程池
      const workerPool = Array.from({ length: concurrency }, () => worker());
      await Promise.all(workerPool);

      if (this.status !== 'cancelled') {
        this.updateStatus('completed');
      }
    } finally {
      this.resumePromise = null;
      this.resumeResolve = null;
    }

    return {
      total,
      successCount,
      failedCount,
      items,
      failedItems,
      status: this.status,
    };
  }

  /**
   * 变更队列状态并触发监听回调。
   */
  private updateStatus(newStatus: BatchPrintStatus): void {
    this.status = newStatus;
    this.statusListener?.(newStatus);
  }
}
