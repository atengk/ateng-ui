/**
 * @atengk/echarts-vue 核心入口。
 *
 * 导出 AtengECharts 表现容器、useECharts 组合式 Hook 与完整强类型契约。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import type { App } from 'vue';
import AtengECharts from './components/AtengECharts.vue';

export { AtengECharts };
export { useECharts } from './composables/useECharts';

/**
 * Vue 插件安装器，支持 app.use(installECharts)。
 */
export function install(app: App): void {
  app.component('AtengECharts', AtengECharts);
}

export type AtengEChartsInstance = InstanceType<typeof AtengECharts>;

export type {
  EChartsInstance,
  EChartsOption,
  EChartsInitOpts,
  SetOptionOpts,
  UseEChartsOptions,
  UseEChartsReturn,
  AtengEChartsProps,
  AtengEChartsEmits,
} from './types';
