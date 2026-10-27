<script setup lang="ts">
/**
 * AtengRadarChart 多维能力画像雷达图高频预设组件。
 *
 * 包装 AtengECharts 容器，支持多指标维度声明、多数据集对比覆盖与半透明区域渐变填充。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { computed, ref } from 'vue';
import AtengECharts from './AtengECharts.vue';
import { createRadarOption } from '../presets/radar';
import type {
  AtengRadarChartEmits,
  AtengRadarChartProps,
  AtengRadarChartSlots,
} from '../presets/types';
import type { EChartsInstance } from '../types';

defineOptions({
  name: 'AtengRadarChart',
});

const props = withDefaults(defineProps<AtengRadarChartProps>(), {
  indicators: () => [],
  data: () => [],
  area: true,
  shape: 'polygon',
  splitNumber: 5,
  center: undefined,
  radius: undefined,
  legend: true,
  tooltip: true,
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
  emptyText: '暂无雷达数据',
  error: null,
  errorText: '雷达图加载异常',
});

const emit = defineEmits<AtengRadarChartEmits>();
defineSlots<AtengRadarChartSlots>();

const echartsRef = ref<InstanceType<typeof AtengECharts> | null>(null);

// 1. 动态生成 EChartsOption
const resolvedOption = computed(() => {
  return createRadarOption({
    indicators: props.indicators,
    data: props.data,
    area: props.area,
    shape: props.shape,
    splitNumber: props.splitNumber,
    center: props.center,
    radius: props.radius,
    legend: props.legend,
    tooltip: props.tooltip,
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

// 3. 统一暴露实例操作门面
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
  <div class="at-radar-chart">
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
.at-radar-chart {
  position: relative;
  box-sizing: border-box;
  width: 100%;
}
</style>
