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
export { default as AtengCodeScanner } from './components/AtengCodeScanner.vue';

// 无头状态机 Hooks
export { useBarcode } from './composables/useBarcode';
export type { UseBarcodeReturn } from './composables/useBarcode';

export { useQRCode } from './composables/useQRCode';
export type { UseQRCodeOptions } from './composables/useQRCode';

export { useCodeScanner } from './composables/useCodeScanner';
export type { UseCodeScannerOptions } from './composables/useCodeScanner';

export { useHardwareScanner } from './composables/useHardwareScanner';

// 靶向接收输入框指令
export {
  vHardwareScannerReceiver,
  registerReceiver,
  unregisterReceiver,
  isReceiverElement,
  dispatchCodeToReceivers,
} from './directives/vHardwareScannerReceiver';

// 校验工具
export { validateBarcode } from './utils/validator';

// 格式化管道与图像导出工具
export { formatEan13, formatItf14, formatCode128Grouped, formatIsbn } from './utils/formatter';

export { exportBarcodeAsImage, downloadBarcodeImage } from './utils/export';
export type { BarcodeExportFormat, BarcodeExportOptions } from './utils/export';

// 二维码主题预设与导出工具
export { QR_CODE_PRESETS, resolveQRCodePreset } from './constants/presets';
export { exportQRCodeAsImage, downloadQRCodeImage } from './utils/exportQRCode';

// 二维码 Logo 容错提升与 CORS 跨域防污损守卫
export { elevateErrorCorrectionLevel, clampLogoSize, loadSafeImage } from './utils/corsGuard';

// 扫码引擎动态懒加载器与长宽比构型工具
export {
  loadHtml5Qrcode,
  resolveFormatsForScanMode,
  resolveAdaptiveQrBox,
  setScannerEngineMock,
  resetScannerEngineMock,
} from './utils/scannerLoader';

// Web Audio 原生蜂鸣音与设备震动发生器
export {
  playScanBeep,
  triggerVibrate,
  playSuccessFeedback,
  setAudioContextMock,
  resetAudioContextMock,
} from './utils/audioFeedback';
export type { BeepOptions, FeedbackOptions } from './utils/audioFeedback';

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
  ScanMode,
  ScannerFacingMode,
  ScannerInteractionMode,
  QrBoxDimensions,
  QrBoxFunction,
  QrBoxConfig,
  ScannerCameraDevice,
  ScanResult,
  StartScanOptions,
  UseCodeScannerReturn,
  AtengCodeScannerProps,
} from './types/scanner';

export type {
  HardwareScannerOptions,
  UseHardwareScannerReturn,
  HardwareScannerReceiverDirective,
} from './types/hardware';

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
  SafeImageResult,
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
