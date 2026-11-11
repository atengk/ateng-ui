/**
 * @atengk/gantt-vue 顶级入口文件。
 *
 * 依据 ADR-0050，纯声明式具名导出全部类型、常量、组件与状态机。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import './styles/index.css';

export const GANTT_VUE_VERSION = '1.0.0';

// 表现组件
export { default as AtengGantt } from './components/AtengGantt.vue';

// 状态机与守卫
export { useGantt } from './composables/use-gantt';
export { GanttResizeGuard, type GanttResizeGuardOptions } from './guards/gantt-resize-guard';

// 强类型契约
export * from './types';
