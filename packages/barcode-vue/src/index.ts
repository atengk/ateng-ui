/**
 * @atengk/barcode-vue 顶级公开统一出口。
 *
 * 规范导出核心组件、无头状态机、校验工具与 TypeScript 类型契约。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import './style/index.css';

// 核心组件
export { default as AtengBarcode } from './components/AtengBarcode.vue';
export { default as AtengQRCode } from './components/AtengQRCode.vue';

// 无头状态机 Hooks
export { useBarcode } from './composables/useBarcode';
export type { UseBarcodeReturn } from './composables/useBarcode';

export { useQRCode } from './composables/useQRCode';
export type { UseQRCodeOptions } from './composables/useQRCode';

// 校验工具
export { validateBarcode } from './utils/validator';

// 格式化管道与图像导出工具
export { formatEan13, formatItf14, formatCode128Grouped, formatIsbn } from './utils/formatter';

export { exportBarcodeAsImage, downloadBarcodeImage } from './utils/export';
export type { BarcodeExportFormat, BarcodeExportOptions } from './utils/export';

// 二维码主题预设与导出工具
export { QR_CODE_PRESETS, resolveQRCodePreset } from './constants/presets';
export { exportQRCodeAsImage, downloadQRCodeImage } from './utils/exportQRCode';

// 类型契约
export type {
  BarcodeFormat,
  BarcodeRenderType,
  BarcodeTextPosition,
  BarcodeTextAlign,
  BarcodeRenderOptions,
  BarcodeValidationResult,
} from './types';

export type {
  QRCodePreset,
  QRCodeExportFormat,
  QRCodeDotsOptions,
  QRCodeCornersSquareOptions,
  QRCodeCornersDotOptions,
  QRCodeBackgroundOptions,
  QRCodeImageOptions,
  QRCodeEncodingOptions,
  QRCodeOptions,
  ExportQRCodeOptions,
  DownloadQRCodeOptions,
  UseQRCodeReturn,
  DotType,
  CornerDotType,
  CornerSquareType,
  FileExtension,
  GradientType,
  DrawType,
  ShapeType,
  ErrorCorrectionLevel,
  Mode,
  TypeNumber,
  Gradient,
} from './types/qrcode';
