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
import AtengDonutChart from './components/AtengDonutChart.vue';
import AtengFunnelChart from './components/AtengFunnelChart.vue';

export { AtengECharts, AtengTrendChart, AtengDonutChart, AtengFunnelChart };
export { useECharts } from './composables/useECharts';
export { createTrendOption, createDonutOption, createFunnelOption } from './presets';
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
  app.component('AtengDonutChart', AtengDonutChart);
  app.component('AtengFunnelChart', AtengFunnelChart);
}

export type AtengEChartsInstance = InstanceType<typeof AtengECharts>;
export type AtengTrendChartInstance = InstanceType<typeof AtengTrendChart>;
export type AtengDonutChartInstance = InstanceType<typeof AtengDonutChart>;
export type AtengFunnelChartInstance = InstanceType<typeof AtengFunnelChart>;

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
  DonutChartConfig,
  DonutCenterSummaryConfig,
  AtengDonutChartProps,
  AtengDonutChartEmits,
  FunnelChartConfig,
  AtengFunnelChartProps,
  AtengFunnelChartEmits,
} from './types';
