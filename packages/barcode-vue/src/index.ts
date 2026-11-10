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

// 无头状态机 Hooks
export { useBarcode } from './composables/useBarcode';
export type { UseBarcodeReturn } from './composables/useBarcode';

// 校验工具
export { validateBarcode } from './utils/validator';

// 类型契约
export type {
  BarcodeFormat,
  BarcodeRenderType,
  BarcodeTextPosition,
  BarcodeTextAlign,
  BarcodeRenderOptions,
  BarcodeValidationResult,
} from './types';
