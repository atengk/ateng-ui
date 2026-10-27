/**
 * @atengk/echarts-vue 核心入口。
 *
 * 导出 AtengECharts 表现容器、useECharts 组合式 Hook、主题管理与完整强类型契约。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import type { App } from 'vue';
import AtengECharts from './components/AtengECharts.vue';
import AtengTrendChart from './components/AtengTrendChart.vue';

export { AtengECharts, AtengTrendChart };
export { useECharts } from './composables/useECharts';
export { createTrendOption } from './presets';
export {
  registerTheme,
  ensureBuiltinThemes,
  AtengChartColors,
  atengLightTheme,
  atengDarkTheme,
} from './theme';

/**
 * Vue 插件安装器，支持 app.use(installECharts)。
 */
export function install(app: App): void {
  app.component('AtengECharts', AtengECharts);
  app.component('AtengTrendChart', AtengTrendChart);
}

export type AtengEChartsInstance = InstanceType<typeof AtengECharts>;
export type AtengTrendChartInstance = InstanceType<typeof AtengTrendChart>;

export type {
  EChartsInstance,
  EChartsOption,
  EChartsInitOpts,
  SetOptionOpts,
  UseEChartsOptions,
  UseEChartsReturn,
  AtengEChartsProps,
  AtengEChartsEmits,
  TrendDimension,
  TrendDimensionConfig,
  TrendMetric,
  TrendMetricConfig,
  TrendYAxisConfig,
  TrendDataZoomConfig,
  TrendChartConfig,
  AtengTrendChartProps,
  AtengTrendChartEmits,
} from './types';
