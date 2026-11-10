/**
 * @atengk/barcode-vue 扫码引擎按需懒加载器与长宽比构型计算管道。
 *
 * 依据 ADR-0047，落实 html5-qrcode 异步动态拉取，确保生成端 0 字节打入；
 * 配合自适应取景框算法收敛，大幅提升识别帧率并降低硬件功耗。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import type { ScanMode, QrBoxConfig, QrBoxFunction } from '../types/scanner';

/** html5-qrcode 模块类型定义缓存 */
type Html5QrcodeModule = typeof import('html5-qrcode');

/** 模块异步懒加载单例 Promise 缓存 */
let enginePromise: Promise<Html5QrcodeModule> | null = null;

/** 离线测试环境注入的 Mock 引擎桩 */
let mockEngineInstance: unknown = null;

/**
 * 注入测试用 Mock 扫码引擎（用于 happy-dom / Vitest 离线自洽单测）。
 *
 * @param mockEngine 模拟的 html5-qrcode 模块对象
 */
export function setScannerEngineMock(mockEngine: unknown): void {
  mockEngineInstance = mockEngine;
  enginePromise = Promise.resolve(mockEngine as Html5QrcodeModule);
}

/**
 * 重置 Mock 扫码引擎，还原为真实动态加载模式。
 */
export function resetScannerEngineMock(): void {
  mockEngineInstance = null;
  enginePromise = null;
}

/**
 * 动态按需懒加载 html5-qrcode 模块。
 *
 * 保证非扫码业务（如纯条码、二维码展示）打包时 0 字节引入扫码核心包。
 *
 * @returns html5-qrcode 模块命名空间 Promise
 */
export function loadHtml5Qrcode(): Promise<Html5QrcodeModule> {
  if (mockEngineInstance) {
    return Promise.resolve(mockEngineInstance as Html5QrcodeModule);
  }

  if (!enginePromise) {
    enginePromise = import('html5-qrcode');
  }

  return enginePromise;
}

/**
 * 根据扫码模式收敛底层解码算法集。
 *
 * 一维码收敛后仅开启条码检测器，避免冗余二维码解码算法空转，降低 CPU 功耗。
 *
 * @param mode 扫码模式 ('qr-code' | 'barcode' | 'all')
 * @param formatsEnum Html5QrcodeSupportedFormats 枚举对象
 * @returns 优化收敛后的格式枚举数组，'all' 模式返回 undefined 保持底层全量开启
 */
export function resolveFormatsForScanMode(
  mode: ScanMode,
  formatsEnum: Record<string, number>,
): number[] | undefined {
  if (mode === 'barcode') {
    const barcodeKeys = [
      'CODE_128',
      'CODE_39',
      'CODE_93',
      'CODABAR',
      'EAN_13',
      'EAN_8',
      'ITF',
      'UPC_A',
      'UPC_E',
      'UPC_EAN_EXTENSION',
      'RSS_14',
      'RSS_EXPANDED',
    ];
    return barcodeKeys
      .map(key => formatsEnum[key])
      .filter((val): val is number => typeof val === 'number');
  }

  if (mode === 'qr-code') {
    const qrKeys = ['QR_CODE', 'DATA_MATRIX', 'AZTEC', 'PDF_417', 'MAXICODE'];
    return qrKeys
      .map(key => formatsEnum[key])
      .filter((val): val is number => typeof val === 'number');
  }

  return undefined;
}

/**
 * 计算自适应长宽比取景框尺寸。
 *
 * - 'barcode': 3:1 ~ 2.8:1 狭长宽屏构型，完美契合标准物流与商品条码外形；
 * - 'qr-code': 1:1 正方形黄金比例构型；
 * - 'all': 0.75 短边正方形构型。
 *
 * @param mode 扫码模式
 * @param customQrBox 用户自定义传入的尺寸或计算函数
 * @returns 最终生效的 qrbox 配置
 */
export function resolveAdaptiveQrBox(mode: ScanMode, customQrBox?: QrBoxConfig): QrBoxConfig {
  if (customQrBox !== undefined) {
    return customQrBox;
  }

  if (mode === 'barcode') {
    const barcodeCalculator: QrBoxFunction = (viewWidth, viewHeight) => {
      const width = Math.floor(viewWidth * 0.85);
      // 长宽比约为 2.8:1
      const height = Math.min(Math.floor(width / 2.8), Math.floor(viewHeight * 0.7));
      return { width, height };
    };
    return barcodeCalculator;
  }

  if (mode === 'qr-code') {
    const qrCalculator: QrBoxFunction = (viewWidth, viewHeight) => {
      const minEdge = Math.min(viewWidth, viewHeight);
      const size = Math.floor(minEdge * 0.7);
      return { width: size, height: size };
    };
    return qrCalculator;
  }

  const allCalculator: QrBoxFunction = (viewWidth, viewHeight) => {
    const minEdge = Math.min(viewWidth, viewHeight);
    const size = Math.floor(minEdge * 0.75);
    return { width: size, height: size };
  };
  return allCalculator;
}
