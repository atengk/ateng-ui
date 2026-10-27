<script setup lang="ts">
/**
 * AtengTrendChart 趋势对比图高频预设组件。
 *
 * 包装 AtengECharts 容器，接收扁平对象数组，集成双 Y 轴、柱线混合、平滑渐变、
 * 数值千分位 Tooltip、受控 DataZoom 缩放手柄与逃生通道。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { computed, ref } from 'vue';
import AtengECharts from './AtengECharts.vue';
import { createTrendOption } from '../presets/trend';
import type {
  AtengTrendChartEmits,
  AtengTrendChartProps,
  AtengTrendChartSlots,
} from '../presets/types';
import type { EChartsInstance } from '../types';

defineOptions({
  name: 'AtengTrendChart',
});

const props = withDefaults(defineProps<AtengTrendChartProps>(), {
  data: () => [],
  yAxis: undefined,
  dataZoom: false,
  legend: true,
  tooltip: true,
  grid: undefined,
  overrideOption: undefined,
  theme: 'auto',
  initOptions: undefined,
  width: '100%',
  height: '350px',
  autoResize: true,
  deepWatch: false,
  notMerge: true,
  lazyUpdate: true,
  loading: false,
  loadingText: '加载中...',
  nativeLoading: false,
  empty: undefined,
  emptyText: '暂无趋势数据',
  error: null,
  errorText: '趋势图加载异常',
});

const emit = defineEmits<AtengTrendChartEmits>();
defineSlots<AtengTrendChartSlots>();

const echartsRef = ref<InstanceType<typeof AtengECharts> | null>(null);

// 1. 动态生成 EChartsOption
const resolvedOption = computed(() => {
  return createTrendOption({
    data: props.data,
    dimension: props.dimension,
    metrics: props.metrics,
    yAxis: props.yAxis,
    dataZoom: props.dataZoom,
    legend: props.legend,
    tooltip: props.tooltip,
    grid: props.grid,
    overrideOption: props.overrideOption,
  });
});

// 2. 空数据防白屏自愈判定
const resolvedEmpty = computed(() => {
  if (props.empty !== undefined) {
    return props.empty;
  }
  return !props.data || props.data.length === 0;
});

// 3. 统一转发与暴露实例操作门面
defineExpose({
  getInstance: (): EChartsInstance | null => echartsRef.value?.getInstance() ?? null,
  isZeroDimension: computed(() => echartsRef.value?.isZeroDimension ?? false),
  currentTheme: computed(() => echartsRef.value?.currentTheme ?? 'ateng-light'),
  init: () => echartsRef.value?.init() ?? null,
  dispose: () => echartsRef.value?.dispose(),
  setOption: (option: Parameters<NonNullable<InstanceType<typeof AtengECharts>>['setOption']>[0]) =>
    echartsRef.value?.setOption(option),
  resize: () => echartsRef.value?.resize(),
  showLoading: () => echartsRef.value?.showLoading(),
  hideLoading: () => echartsRef.value?.hideLoading(),
  clear: () => echartsRef.value?.clear(),
  dispatchAction: (payload: unknown) => echartsRef.value?.dispatchAction(payload),
  getDataURL: (
    opts?: Parameters<NonNullable<InstanceType<typeof AtengECharts>>['getDataURL']>[0],
  ) => echartsRef.value?.getDataURL(opts) ?? '',
  isFullscreen: computed(() => echartsRef.value?.isFullscreen ?? false),
  toggleFullscreen: (mode?: 'auto' | 'native' | 'page') =>
    echartsRef.value?.toggleFullscreen(mode) ?? Promise.resolve(false),
  exportImage: (
    opts?: Parameters<NonNullable<InstanceType<typeof AtengECharts>>['exportImage']>[0],
  ) => echartsRef.value?.exportImage(opts) ?? false,
});
</script>

<template>
  <div class="at-trend-chart">
    <AtengECharts
      ref="echartsRef"
      :option="resolvedOption"
      :theme="props.theme"
      :init-options="props.initOptions"
      :width="props.width"
      :height="props.height"
      :auto-resize="props.autoResize"
      :deep-watch="props.deepWatch"
      :not-merge="props.notMerge"
      :lazy-update="props.lazyUpdate"
      :loading="props.loading"
      :loading-text="props.loadingText"
      :native-loading="props.nativeLoading"
      :empty="resolvedEmpty"
      :empty-text="props.emptyText"
      :error="props.error"
      :error-text="props.errorText"
      :allow-fullscreen="props.allowFullscreen"
      :fullscreen-mode="props.fullscreenMode"
      :allow-export="props.allowExport"
      :export-options="props.exportOptions"
      @rendered="inst => emit('rendered', inst)"
      @finished="() => emit('finished')"
      @click="p => emit('click', p)"
      @dblclick="p => emit('dblclick', p)"
      @mouseover="p => emit('mouseover', p)"
      @mouseout="p => emit('mouseout', p)"
      @legendselectchanged="p => emit('legendselectchanged', p)"
      @datazoom="p => emit('datazoom', p)"
      @chart-click="p => emit('chart-click', p)"
      @chart-dblclick="p => emit('chart-dblclick', p)"
      @chart-mouseover="p => emit('chart-mouseover', p)"
      @chart-mouseout="p => emit('chart-mouseout', p)"
      @legend-change="p => emit('legend-change', p)"
      @data-zoom="p => emit('data-zoom', p)"
      @chart-event="(name, p) => emit('chart-event', name, p)"
      @resize="() => emit('resize')"
      @theme-change="t => emit('theme-change', t)"
      @retry="() => emit('retry')"
      @fullscreen-change="isFs => emit('fullscreen-change', isFs)"
      @export="payload => emit('export', payload)"
    >
      <template #default>
        <slot />
      </template>
      <template #loading>
        <slot name="loading" />
      </template>
      <template #empty>
        <slot name="empty" />
      </template>
      <template #error="slotProps">
        <slot name="error" v-bind="slotProps" />
      </template>
      <template #toolbar="slotProps">
        <slot name="toolbar" v-bind="slotProps" />
      </template>
    </AtengECharts>
  </div>
</template>

<style scoped>
.at-trend-chart {
  position: relative;
  box-sizing: border-box;
  width: 100%;
}
</style>
