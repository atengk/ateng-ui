/**
 * C-Lodop 硬件打印与通道路由专享 Composable。
 *
 * 封装服务状态探针、打印机动态枚举、多业务通道映射持久化及基于业务通道的静默打印调度。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref, type Ref } from 'vue';
import { LodopDriver } from '../drivers/LodopDriver';
import { PrinterManager } from '../services/PrinterManager';
import type { PrintOptions, LodopDriverOptions } from '../types';

export interface UseLodopReturn {
  /** C-Lodop 本地服务当前是否在线 */
  isServiceAvailable: Ref<boolean>;
  /** 是否正在执行端口探针探测 */
  isDetecting: Ref<boolean>;
  /** 当前可用物理打印机列表 */
  printers: Ref<string[]>;
  /** 业务通道绑定的打印机映射快照 */
  channelBindings: Ref<Record<string, string>>;
  /** 主动探测 C-Lodop 本地服务状态 */
  detectService: (timeoutMs?: number) => Promise<boolean>;
  /** 刷新并获取物理打印机列表 */
  refreshPrinters: () => Promise<string[]>;
  /** 将业务通道绑定至目标打印机 */
  bindChannel: (channel: string, printerName: string) => void;
  /** 解绑业务通道 */
  unbindChannel: (channel: string) => void;
  /** 获取业务通道对应的打印机名称 */
  getChannelPrinter: (channel: string) => string | undefined;
  /** 按业务通道执行打印 */
  printWithChannel: (
    channel: string,
    target: HTMLElement | string,
    options?: PrintOptions,
  ) => Promise<void>;
  /** 底层 LodopDriver 实例 */
  driver: LodopDriver;
  /** 打印机管理器实例 */
  printerManager: PrinterManager;
}

export function useLodop(driverOptions?: LodopDriverOptions): UseLodopReturn {
  const driver = new LodopDriver(driverOptions);
  const printerManager = new PrinterManager(driverOptions?.getLodop);

  const isServiceAvailable = ref(false);
  const isDetecting = ref(false);
  const printers = ref<string[]>([]);
  const channelBindings = ref<Record<string, string>>(printerManager.getAllChannelBindings());

  const detectService = async (timeoutMs?: number): Promise<boolean> => {
    isDetecting.value = true;
    try {
      const probeDriver = timeoutMs ? new LodopDriver({ ...driverOptions, timeoutMs }) : driver;
      const available = await probeDriver.isAvailable();
      isServiceAvailable.value = available;
      if (available) {
        await refreshPrinters();
      }
      return available;
    } finally {
      isDetecting.value = false;
    }
  };

  const refreshPrinters = async (): Promise<string[]> => {
    const list = await printerManager.getPrinters();
    printers.value = list;
    return list;
  };

  const bindChannel = (channel: string, printerName: string): void => {
    printerManager.bindChannel(channel, printerName);
    channelBindings.value = printerManager.getAllChannelBindings();
  };

  const unbindChannel = (channel: string): void => {
    printerManager.unbindChannel(channel);
    channelBindings.value = printerManager.getAllChannelBindings();
  };

  const getChannelPrinter = (channel: string): string | undefined => {
    return printerManager.getChannelPrinter(channel);
  };

  const printWithChannel = async (
    channel: string,
    target: HTMLElement | string,
    options?: PrintOptions,
  ): Promise<void> => {
    const resolvedOptions = printerManager.resolvePrintOptions(channel, options);
    await driver.print(target, resolvedOptions);
  };

  return {
    isServiceAvailable,
    isDetecting,
    printers,
    channelBindings,
    detectService,
    refreshPrinters,
    bindChannel,
    unbindChannel,
    getChannelPrinter,
    printWithChannel,
    driver,
    printerManager,
  };
}
