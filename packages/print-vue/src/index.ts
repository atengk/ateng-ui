/**
 * @atengk/print-vue 顶级公开导出入口。
 *
 * 遵循纯声明式具名导出规范，声明式导出所有错误实体、驱动 SPI、服务与指令。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import type { App } from 'vue';
import { vPrint } from './directives/vPrint';

import './style/index.css';

// 异常与错误码导出
export { PrintException, PrintErrorCode } from './errors/PrintException';
export type { PrintExceptionContext } from './errors/PrintException';

// 类型定义导出
export type { PrintDriver, PrintOptions, PrintProgress, PrintBindingValue } from './types';

// 服务与驱动导出
export { StyleHarvester } from './services/StyleHarvester';
export type { HarvestStylesOptions } from './services/StyleHarvester';
export { BrowserIframeDriver } from './drivers/BrowserIframeDriver';

// Composables 导出
export { usePrint } from './composables/usePrint';
export type { UsePrintReturn } from './composables/usePrint';

// 指令导出
export { vPrint } from './directives/vPrint';

/**
 * Vue 插件安装器。
 * 显式注册 v-print 全局指令。
 */
export function install(app: App): void {
  app.directive('print', vPrint);
}

export default {
  install,
};
