<script setup lang="ts">
/**
 * AtengDonutChart 环形占比与南丁格尔玫瑰图高频预设组件。
 *
 * 包装 AtengECharts 容器，接收扁平对象数组，支持标准环形、玫瑰图模式、
 * 中心 KPI 统计指标卡自动求和与数值千分位 Tooltip。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { computed, ref } from 'vue';
import AtengECharts from './AtengECharts.vue';
import { createDonutOption } from '../presets/donut';
import type {
  AtengDonutChartEmits,
  AtengDonutChartProps,
  AtengDonutChartSlots,
} from '../presets/types';
import type { EChartsInstance } from '../types';

defineOptions({
  name: 'AtengDonutChart',
});

const props = withDefaults(defineProps<AtengDonutChartProps>(), {
  data: () => [],
  nameKey: 'name',
  valueKey: 'value',
  radius: () => ['45%', '70%'],
  center: () => ['50%', '50%'],
  roseType: false,
  borderRadius: 6,
  padAngle: 2,
  unit: '',
  precision: undefined,
  formatThousands: true,
  centerSummary: false,
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
  emptyText: '暂无分类数据',
  error: null,
  errorText: '分类占比图加载异常',
});

const emit = defineEmits<AtengDonutChartEmits>();
defineSlots<AtengDonutChartSlots>();

const echartsRef = ref<InstanceType<typeof AtengECharts> | null>(null);

// 1. 动态生成 EChartsOption
const resolvedOption = computed(() => {
  return createDonutOption({
    data: props.data,
    nameKey: props.nameKey,
    valueKey: props.valueKey,
    radius: props.radius,
    center: props.center,
    roseType: props.roseType,
    borderRadius: props.borderRadius,
    padAngle: props.padAngle,
    unit: props.unit,
    precision: props.precision,
    formatThousands: props.formatThousands,
    centerSummary: props.centerSummary,
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
  <div class="at-donut-chart">
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
.at-donut-chart {
  position: relative;
  box-sizing: border-box;
  width: 100%;
}
</style>
