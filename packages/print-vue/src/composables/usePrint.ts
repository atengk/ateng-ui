/**
 * 统领无头打印状态机 Composable。
 *
 * 提供对默认浏览器打印、PDF 导出、批量打印调度、驱动热切换及响应式执行状态的全套编程调度接口。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref, type Ref } from 'vue';
import { PrintErrorCode, PrintException } from '../errors/PrintException';
import { BrowserIframeDriver } from '../drivers/BrowserIframeDriver';
import { PdfExportDriver } from '../drivers/PdfExportDriver';
import { LodopDriver } from '../drivers/LodopDriver';
import { PrintQueueCoordinator } from '../services/PrintQueueCoordinator';
import type {
  PrintDriver,
  PrintOptions,
  PdfExportOptions,
  BatchPrintOptions,
  BatchPrintProgress,
  BatchPrintResult,
  BatchPrintStatus,
} from '../types';

/** 全局驱动单例注册表 */
const driverRegistry = new Map<string, PrintDriver>();

// 默认注册浏览器无头 iframe 驱动、PDF 导出驱动与 C-Lodop 静默驱动
const defaultBrowserDriver = new BrowserIframeDriver();
const defaultPdfDriver = new PdfExportDriver();
const defaultLodopDriver = new LodopDriver({ fallbackToBrowser: true });
driverRegistry.set(defaultBrowserDriver.name, defaultBrowserDriver);
driverRegistry.set(defaultPdfDriver.name, defaultPdfDriver);
driverRegistry.set(defaultLodopDriver.name, defaultLodopDriver);

export interface UsePrintReturn {
  /** 当前是否正在执行打印任务 */
  isPrinting: Ref<boolean>;
  /** 最近一次打印产生的异常状态 */
  error: Ref<PrintException | null>;
  /** 当前活跃的驱动标识 */
  currentDriver: Ref<string>;
  /** 批量打印队列当前状态 */
  queueStatus: Ref<BatchPrintStatus>;
  /** 批量打印实时进度状态 */
  batchProgress: Ref<BatchPrintProgress>;
  /** 提交打印任务 */
  print: (target: HTMLElement | string, options?: PrintOptions) => Promise<void>;
  /** 导出高保真 PDF 矢量文件 */
  exportPdf: (target: HTMLElement | string, options?: PdfExportOptions) => Promise<Blob>;
  /** 执行批量打印受控并发调度 */
  printBatch: <T>(
    items: T[],
    renderFn: (item: T, index: number) => HTMLElement | string | Promise<HTMLElement | string>,
    options?: BatchPrintOptions,
  ) => Promise<BatchPrintResult<T>>;
  /** 暂停当前批量打印队列 */
  pauseBatch: () => void;
  /** 恢复暂停的批量打印队列 */
  resumeBatch: () => void;
  /** 取消当前批量打印队列 */
  cancelBatch: () => void;
  /** 注册新的打印驱动 SPI */
  registerDriver: (driver: PrintDriver) => void;
  /** 获取指定名称的驱动实例 */
  getDriver: (name: string) => PrintDriver | undefined;
}

export function usePrint(defaultOptions?: PrintOptions): UsePrintReturn {
  const isPrinting = ref(false);
  const error = ref<PrintException | null>(null);
  const currentDriver = ref(defaultOptions?.driver || 'browser');
  const queueStatus = ref<BatchPrintStatus>('idle');
  const batchProgress = ref<BatchPrintProgress>({
    current: 0,
    total: 0,
    percentage: 0,
    successCount: 0,
    failedCount: 0,
  });

  let activeCoordinator: PrintQueueCoordinator | null = null;

  const registerDriver = (driver: PrintDriver): void => {
    driverRegistry.set(driver.name, driver);
  };

  const getDriver = (name: string): PrintDriver | undefined => {
    return driverRegistry.get(name);
  };

  const print = async (target: HTMLElement | string, options?: PrintOptions): Promise<void> => {
    const mergedOptions: PrintOptions = {
      ...defaultOptions,
      ...options,
    };

    const targetDriverName = mergedOptions.driver || currentDriver.value || 'browser';
    let driver = getDriver(targetDriverName);

    // 若目标驱动未找到
    if (!driver) {
      // 若开启降级且目标并非 browser，尝试回退至 browser
      if (mergedOptions.fallbackToBrowser && targetDriverName !== 'browser') {
        mergedOptions.onFallback?.(`目标驱动 ${targetDriverName} 未注册，自动降级至 browser 驱动`);
        driver = getDriver('browser');
      }

      if (!driver) {
        const err = new PrintException(
          `未找到名为 "${targetDriverName}" 的打印驱动，请确认是否已完成注册`,
          PrintErrorCode.DRIVER_NOT_FOUND,
          { driverName: targetDriverName },
        );
        error.value = err;
        mergedOptions.onError?.(err);
        throw err;
      }
    }

    isPrinting.value = true;
    error.value = null;

    try {
      await driver.print(target, mergedOptions);
      mergedOptions.onSuccess?.();
    } catch (err) {
      const printErr =
        err instanceof PrintException
          ? err
          : new PrintException(
              '打印执行期间发生未处理异常',
              PrintErrorCode.EXECUTION_FAILED,
              {},
              err,
            );
      error.value = printErr;
      mergedOptions.onError?.(printErr);
      throw printErr;
    } finally {
      isPrinting.value = false;
    }
  };

  const exportPdf = async (
    target: HTMLElement | string,
    options?: PdfExportOptions,
  ): Promise<Blob> => {
    isPrinting.value = true;
    error.value = null;

    try {
      const pdfDriver = getDriver('pdf') as PdfExportDriver;
      if (!pdfDriver) {
        throw new PrintException('未找到 PDF 导出驱动 (pdf)', PrintErrorCode.DRIVER_NOT_FOUND, {
          driverName: 'pdf',
        });
      }
      const blob = await pdfDriver.exportPdf(target, options);
      options?.onSuccess?.();
      return blob;
    } catch (err) {
      const printErr =
        err instanceof PrintException
          ? err
          : new PrintException('PDF 导出执行异常', PrintErrorCode.EXPORT_FAILED, {}, err);
      error.value = printErr;
      options?.onError?.(printErr);
      throw printErr;
    } finally {
      isPrinting.value = false;
    }
  };

  const pauseBatch = (): void => {
    activeCoordinator?.pause();
    if (activeCoordinator) {
      queueStatus.value = activeCoordinator.getStatus();
    }
  };

  const resumeBatch = (): void => {
    activeCoordinator?.resume();
    if (activeCoordinator) {
      queueStatus.value = activeCoordinator.getStatus();
    }
  };

  const cancelBatch = (): void => {
    activeCoordinator?.cancel();
    if (activeCoordinator) {
      queueStatus.value = activeCoordinator.getStatus();
    }
  };

  const printBatch = async <T>(
    items: T[],
    renderFn: (item: T, index: number) => HTMLElement | string | Promise<HTMLElement | string>,
    options?: BatchPrintOptions,
  ): Promise<BatchPrintResult<T>> => {
    if (!items || items.length === 0) {
      queueStatus.value = 'completed';
      batchProgress.value = {
        current: 0,
        total: 0,
        percentage: 100,
        successCount: 0,
        failedCount: 0,
      };
      return {
        total: 0,
        successCount: 0,
        failedCount: 0,
        items: [],
        failedItems: [],
        status: 'completed',
      };
    }

    isPrinting.value = true;
    error.value = null;

    const coordinator = new PrintQueueCoordinator(async (target, itemOpts) => {
      await print(target, { ...options, ...itemOpts });
    });
    activeCoordinator = coordinator;
    queueStatus.value = 'running';

    batchProgress.value = {
      current: 0,
      total: items.length,
      percentage: 0,
      successCount: 0,
      failedCount: 0,
    };

    try {
      const result = await coordinator.printBatch(items, renderFn, {
        ...options,
        onProgress: prog => {
          batchProgress.value = prog;
          options?.onProgress?.(prog);
        },
        onStatusChange: status => {
          queueStatus.value = status;
          options?.onStatusChange?.(status);
        },
      });

      queueStatus.value = result.status;
      return result;
    } catch (err: unknown) {
      const printErr =
        err instanceof PrintException
          ? err
          : new PrintException('批量打印队列执行异常', PrintErrorCode.QUEUE_ERROR, {}, err);
      error.value = printErr;
      queueStatus.value = 'cancelled';
      throw printErr;
    } finally {
      isPrinting.value = false;
    }
  };

  return {
    isPrinting,
    error,
    currentDriver,
    queueStatus,
    batchProgress,
    print,
    exportPdf,
    printBatch,
    pauseBatch,
    resumeBatch,
    cancelBatch,
    registerDriver,
    getDriver,
  };
}
