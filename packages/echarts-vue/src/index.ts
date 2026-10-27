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
import AtengGaugeChart from './components/AtengGaugeChart.vue';
import AtengRadarChart from './components/AtengRadarChart.vue';
import AtengMapChart from './components/AtengMapChart.vue';

export {
  AtengECharts,
  AtengTrendChart,
  AtengDonutChart,
  AtengFunnelChart,
  AtengGaugeChart,
  AtengRadarChart,
  AtengMapChart,
};
export { useECharts } from './composables/useECharts';
export {
  createTrendOption,
  createDonutOption,
  createFunnelOption,
  createGaugeOption,
  createRadarOption,
  createUrlGeoProvider,
  useMapDrillDown,
  createMapOption,
} from './presets';
export {
  registerTheme,
  ensureBuiltinThemes,
  AtengChartColors,
  atengLightTheme,
  atengDarkTheme,
} from './theme';
export {
  generateChartFilename,
  dataUrlToBlob,
  exportChartImage,
  isNativeFullscreenSupported,
  isElementInNativeFullscreen,
  requestNativeFullscreen,
  exitNativeFullscreen,
} from './utils';

/**
 * Vue 插件安装器，支持 app.use(installECharts)。
 */
export function install(app: App): void {
  app.component('AtengECharts', AtengECharts);
  app.component('AtengTrendChart', AtengTrendChart);
  app.component('AtengDonutChart', AtengDonutChart);
  app.component('AtengFunnelChart', AtengFunnelChart);
  app.component('AtengGaugeChart', AtengGaugeChart);
  app.component('AtengRadarChart', AtengRadarChart);
  app.component('AtengMapChart', AtengMapChart);
}

export type AtengEChartsInstance = InstanceType<typeof AtengECharts>;
export type AtengTrendChartInstance = InstanceType<typeof AtengTrendChart>;
export type AtengDonutChartInstance = InstanceType<typeof AtengDonutChart>;
export type AtengFunnelChartInstance = InstanceType<typeof AtengFunnelChart>;
export type AtengGaugeChartInstance = InstanceType<typeof AtengGaugeChart>;
export type AtengRadarChartInstance = InstanceType<typeof AtengRadarChart>;
export type AtengMapChartInstance = InstanceType<typeof AtengMapChart>;

export type {
  EChartsInstance,
  EChartsOption,
  EChartsInitOpts,
  SetOptionOpts,
  UseEChartsOptions,
  UseEChartsReturn,
  AtengEChartsProps,
  AtengEChartsEmits,
  AtengEChartsSlots,
  ChartExportOptions,
  ChartExportPayload,
  TrendDimension,
  TrendDimensionConfig,
  TrendMetric,
  TrendMetricConfig,
  TrendYAxisConfig,
  TrendDataZoomConfig,
  TrendChartConfig,
  AtengTrendChartProps,
  AtengTrendChartEmits,
  AtengTrendChartSlots,
  DonutChartConfig,
  DonutCenterSummaryConfig,
  AtengDonutChartProps,
  AtengDonutChartEmits,
  AtengDonutChartSlots,
  FunnelChartConfig,
  AtengFunnelChartProps,
  AtengFunnelChartEmits,
  AtengFunnelChartSlots,
  GaugeThreshold,
  GaugeChartConfig,
  AtengGaugeChartProps,
  AtengGaugeChartEmits,
  AtengGaugeChartSlots,
  RadarIndicator,
  RadarSeriesItem,
  RadarChartConfig,
  AtengRadarChartProps,
  AtengRadarChartEmits,
  AtengRadarChartSlots,
  GeoDataProvider,
  UrlGeoProviderOptions,
  MapNode,
  UseMapDrillDownOptions,
  UseMapDrillDownReturn,
  MapSeriesDataItem,
  MapChartConfig,
  AtengMapChartProps,
  AtengMapChartEmits,
  AtengMapChartSlots,
} from './types';
