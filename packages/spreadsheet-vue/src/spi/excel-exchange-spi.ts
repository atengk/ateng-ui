/**
 * 外部 Excel 二进制文件交换驱动器接口 (ExcelExchangeSPI) 与注册管理器。
 *
 * 遵循 ADR-0009、ADR-0049 与工业级成熟度防线：
 * 1. 保持 @atengk/spreadsheet-vue L2 专用扩展层跨框架中立与零臃肿底座收敛，
 *    严禁在核心包内直接捆绑 sheetjs、exceljs 等几兆重量级外部依赖；
 * 2. 通过 SPI 扩展点模式解耦二进制 .xlsx / .xls 的解析导入与 Blob 序列化生成，
 *    宿主工程可按需注册服务端转换驱动或客户端纯前端驱动（如 ExcelJS 桥接）。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import type { SpreadsheetSnapshot, ExcelExchangeDriver } from '../types';

export type ExcelExchangeSPI = ExcelExchangeDriver;

/**
 * Excel 交换驱动单例管理器。
 */
export class ExcelExchangeManager {
  private static driver: ExcelExchangeSPI | null = null;

  /**
   * 注册自定义 Excel 二进制文件交换驱动器。
   */
  public static registerDriver(driver: ExcelExchangeSPI): void {
    if (!driver || typeof driver.import !== 'function' || typeof driver.export !== 'function') {
      throw new TypeError(
        'Invalid ExcelExchangeSPI driver implementation: import and export must be functions',
      );
    }
    ExcelExchangeManager.driver = driver;
  }

  /**
   * 获取当前已注册的驱动器实例。
   */
  public static getDriver(): ExcelExchangeSPI | null {
    return ExcelExchangeManager.driver;
  }

  /**
   * 判断是否已注册驱动器。
   */
  public static hasDriver(): boolean {
    return ExcelExchangeManager.driver !== null;
  }

  /**
   * 注销并清理当前驱动器。
   */
  public static clearDriver(): void {
    ExcelExchangeManager.driver = null;
  }

  /**
   * 调用已注册驱动器将二进制 Excel 文件转换为结构化快照。
   */
  public static async import(file: File | Blob): Promise<SpreadsheetSnapshot> {
    if (!ExcelExchangeManager.driver) {
      throw new Error(
        'ExcelExchangeSPI driver not registered. Please register a driver via ExcelExchangeManager.registerDriver() first.',
      );
    }
    return ExcelExchangeManager.driver.import(file);
  }

  /**
   * 调用已注册驱动器将结构化快照转换为二进制 Excel 文件 Blob。
   */
  public static async export(snapshot: SpreadsheetSnapshot, filename?: string): Promise<Blob> {
    if (!ExcelExchangeManager.driver) {
      throw new Error(
        'ExcelExchangeSPI driver not registered. Please register a driver via ExcelExchangeManager.registerDriver() first.',
      );
    }
    return ExcelExchangeManager.driver.export(snapshot, filename);
  }
}
