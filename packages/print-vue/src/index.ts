/**
 * @atengk/print-vue 顶级公开导出入口。
 *
 * 遵循纯声明式具名导出规范，声明式导出所有组件、错误实体、驱动 SPI、服务与指令。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import type { App } from 'vue';
import AtengPrintSheet from './components/AtengPrintSheet.vue';
import AtengPrintRuler from './components/AtengPrintRuler.vue';
import AtengPrintBreak from './components/AtengPrintBreak.vue';
import AtengPrintSeal from './components/AtengPrintSeal.vue';
import AtengPrintCalibrator from './components/AtengPrintCalibrator.vue';
import { vPrint } from './directives/vPrint';
import { vPrintNoSplit } from './directives/vPrintNoSplit';

import './style/index.css';

// 核心组件导出
export { AtengPrintSheet, AtengPrintRuler, AtengPrintBreak, AtengPrintSeal, AtengPrintCalibrator };
export type {
  AtengPrintSheetProps,
  AtengPrintRulerProps,
  AtengPrintSealProps,
  AtengPrintCalibratorProps,
} from './types/components';

// 纸张尺寸与预设导出
export {
  resolvePaperDimensions,
  PAPER_PRESET_MAP,
  mmToPx,
  pxToMm,
  parseLengthToPx,
  MM_PER_INCH,
  PX_PER_MM,
} from './types/paper';
export type { PaperPreset, PaperOrientation, ResolvedPaperDimensions } from './types/paper';

// 分页引擎与切片导出
export {
  PaginationEngine,
  getElementHeight,
  isNoSplitElement,
  isBreakElement,
} from './services/PaginationEngine';
export type { PaginationOptions, PageSlice, PaginationResult } from './services/PaginationEngine';

// 异常与错误码导出
export { PrintException, PrintErrorCode } from './errors/PrintException';
export type { PrintExceptionContext } from './errors/PrintException';

// 类型定义导出
export type {
  PrintDriver,
  PrintOptions,
  PrintProgress,
  PrintBindingValue,
  PdfExportOptions,
  LodopDriverOptions,
  BatchPrintProgress,
  BatchPrintStatus,
  BatchPrintItemError,
  BatchPrintResult,
  BatchPrintOptions,
} from './types';

// 服务与驱动导出
export { StyleHarvester } from './services/StyleHarvester';
export type { HarvestStylesOptions } from './services/StyleHarvester';
export { PrintQueueCoordinator } from './services/PrintQueueCoordinator';
export { PrinterManager } from './services/PrinterManager';
export { BrowserIframeDriver } from './drivers/BrowserIframeDriver';
export { PdfExportDriver } from './drivers/PdfExportDriver';
export { LodopDriver } from './drivers/LodopDriver';

// Composables 导出
export { usePrint } from './composables/usePrint';
export type { UsePrintReturn } from './composables/usePrint';
export { useLodop } from './composables/useLodop';
export type { UseLodopReturn } from './composables/useLodop';

// 指令导出
export { vPrint } from './directives/vPrint';
export { vPrintNoSplit } from './directives/vPrintNoSplit';

/**
 * Vue 插件安装器。
 * 注册 AtengPrintSheet、AtengPrintRuler、AtengPrintBreak 与 v-print、v-print-no-split 指令。
 */
export function install(app: App): void {
  app.component('AtengPrintSheet', AtengPrintSheet);
  app.component('AtengPrintRuler', AtengPrintRuler);
  app.component('AtengPrintBreak', AtengPrintBreak);
  app.component('AtengPrintSeal', AtengPrintSeal);
  app.component('AtengPrintCalibrator', AtengPrintCalibrator);
  app.directive('print', vPrint);
  app.directive('print-no-split', vPrintNoSplit);
}

export default {
  install,
};
