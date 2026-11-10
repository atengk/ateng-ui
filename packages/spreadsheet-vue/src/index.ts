/**
 * @atengk/spreadsheet-vue 在线电子表格与批量填报扩展模块入口。
 *
 * 遵循四层洋葱拓扑之 L2 专用能力/领域扩展层架构契约。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import './styles/index.css';

export * from './types';
export * from './guards/spreadsheet-resize-guard';
export * from './mappers/sheet-data-mapper';
export * from './exporters/spreadsheet-exporter';
export * from './spi/excel-exchange-spi';
export * from './composables/use-spreadsheet';
export * from './composables/use-spreadsheet-theme-sync';
export { default as AtengSpreadsheet } from './components/AtengSpreadsheet.vue';
export { default as AtengSpreadsheetModal } from './components/AtengSpreadsheetModal.vue';

/**
 * 当前包发布版本标识。
 */
export const SPREADSHEET_VUE_VERSION = '1.0.0';
