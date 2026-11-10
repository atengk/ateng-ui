/**
 * 物理打印机与业务通道路由管理器。
 *
 * 负责系统物理打印机枚举列表、业务通道绑定（如 waybill ➔ 电子面单条码机）与 localStorage 偏好持久化。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import type { PrintOptions } from '../types';

export class PrinterManager {
  private static readonly DEFAULT_STORAGE_KEY = 'ateng_print_channel_printers';

  private readonly storageKey: string;
  private readonly channelBindings: Map<string, string> = new Map();
  private readonly getLodopFn?: () => unknown;

  /**
   * 构造打印机管理器实例。
   *
   * @param getLodopFn 可选的获取 LODOP 实例钩子（主要用于测试或代理注入）
   * @param storageKey 自定义 localStorage 持久化键名
   */
  constructor(getLodopFn?: () => unknown, storageKey: string = PrinterManager.DEFAULT_STORAGE_KEY) {
    this.getLodopFn = getLodopFn;
    this.storageKey = storageKey;
    this.loadPreferences();
  }

  /**
   * 枚举系统物理打印机设备名称列表。
   *
   * 若底层服务未就绪或未枚举到设备，满足空安全契约统一保底返回空数组 []。
   */
  public async getPrinters(): Promise<string[]> {
    const lodopInstance = this.resolveLodop();
    if (!lodopInstance) {
      return [];
    }

    try {
      const lodop = lodopInstance as {
        GET_PRINTER_COUNT?: () => number;
        GET_PRINTER_NAME?: (index: number) => string;
      };

      if (
        typeof lodop.GET_PRINTER_COUNT !== 'function' ||
        typeof lodop.GET_PRINTER_NAME !== 'function'
      ) {
        return [];
      }

      const count = lodop.GET_PRINTER_COUNT();
      const list: string[] = [];
      for (let i = 0; i < count; i++) {
        const name = lodop.GET_PRINTER_NAME(i);
        if (name) {
          list.push(name);
        }
      }
      return list;
    } catch {
      return [];
    }
  }

  /**
   * 将业务通道绑定到指定物理打印机。
   *
   * @param channel 业务通道标识（如 'waybill'、'receipt'、'invoice'）
   * @param printerName 目标物理打印机设备全称
   */
  public bindChannel(channel: string, printerName: string): void {
    if (!channel || !printerName) {
      return;
    }
    this.channelBindings.set(channel, printerName);
    this.savePreferences();
  }

  /**
   * 解除指定业务通道的打印机绑定。
   */
  public unbindChannel(channel: string): void {
    if (this.channelBindings.delete(channel)) {
      this.savePreferences();
    }
  }

  /**
   * 获取指定业务通道绑定的打印机设备全称。
   */
  public getChannelPrinter(channel: string): string | undefined {
    return this.channelBindings.get(channel);
  }

  /**
   * 获取全部业务通道的打印机绑定映射快照。
   */
  public getAllChannelBindings(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [ch, printer] of this.channelBindings.entries()) {
      result[ch] = printer;
    }
    return result;
  }

  /**
   * 批量覆盖全部业务通道绑定关系。
   */
  public setAllChannelBindings(bindings: Record<string, string>): void {
    this.channelBindings.clear();
    if (bindings && typeof bindings === 'object') {
      for (const [k, v] of Object.entries(bindings)) {
        if (v) {
          this.channelBindings.set(k, v);
        }
      }
    }
    this.savePreferences();
  }

  /**
   * 将业务通道绑定与偏好持久化至 localStorage。
   */
  public savePreferences(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    try {
      const data = this.getAllChannelBindings();
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch {
      // 忽略存储受限异常
    }
  }

  /**
   * 从 localStorage 恢复业务通道偏好设置。
   */
  public loadPreferences(): Record<string, string> {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return {};
    }
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        return {};
      }
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        this.channelBindings.clear();
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === 'string') {
            this.channelBindings.set(k, v);
          }
        }
      }
    } catch {
      // 降级兜底
    }
    return this.getAllChannelBindings();
  }

  /**
   * 清空所有业务通道绑定关系并抹除持久化偏好。
   */
  public clearPreferences(): void {
    this.channelBindings.clear();
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(this.storageKey);
      } catch {
        // 忽略异常
      }
    }
  }

  /**
   * 根据业务通道自动解析注入目标打印机。
   */
  public resolvePrintOptions(channel: string, baseOptions?: PrintOptions): PrintOptions {
    const boundPrinter = this.getChannelPrinter(channel);
    return {
      ...baseOptions,
      driver: 'lodop',
      printer: boundPrinter || baseOptions?.printer,
    };
  }

  /**
   * 统一解析底层 LODOP 实例。
   */
  private resolveLodop(): unknown {
    if (this.getLodopFn) {
      return this.getLodopFn();
    }
    if (typeof window === 'undefined') {
      return null;
    }
    const win = window as unknown as {
      getCLodop?: () => unknown;
      LODOP?: unknown;
      CLODOP?: unknown;
    };
    if (typeof win.getCLodop === 'function') {
      try {
        return win.getCLodop();
      } catch {
        // 忽略
      }
    }
    return win.LODOP || win.CLODOP || null;
  }
}
