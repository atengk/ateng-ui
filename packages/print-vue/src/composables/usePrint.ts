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
import type { PrintDriver, PrintOptions } from '../types';

/** 全局驱动单例注册表 */
const driverRegistry = new Map<string, PrintDriver>();

// 默认注册浏览器无头 iframe 驱动
const defaultBrowserDriver = new BrowserIframeDriver();
driverRegistry.set(defaultBrowserDriver.name, defaultBrowserDriver);

export interface UsePrintReturn {
  /** 当前是否正在执行打印任务 */
  isPrinting: Ref<boolean>;
  /** 最近一次打印产生的异常状态 */
  error: Ref<PrintException | null>;
  /** 当前活跃的驱动标识 */
  currentDriver: Ref<string>;
  /** 提交打印任务 */
  print: (target: HTMLElement | string, options?: PrintOptions) => Promise<void>;
  /** 注册新的打印驱动 SPI */
  registerDriver: (driver: PrintDriver) => void;
  /** 获取指定名称的驱动实例 */
  getDriver: (name: string) => PrintDriver | undefined;
}

export function usePrint(defaultOptions?: PrintOptions): UsePrintReturn {
  const isPrinting = ref(false);
  const error = ref<PrintException | null>(null);
  const currentDriver = ref(defaultOptions?.driver || 'browser');

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

  return {
    isPrinting,
    error,
    currentDriver,
    print,
    registerDriver,
    getDriver,
  };
}
