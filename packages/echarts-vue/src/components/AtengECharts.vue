<script setup lang="ts">
/**
 * AtengECharts 通用表现容器组件。
 *
 * 包装 useECharts 无头状态机，提供保底高度、BEM 独立样式隔离与声明式 Option 同步。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { ref, watch, onMounted, computed, type CSSProperties } from 'vue';
import { useECharts } from '../composables/useECharts';
import type { AtengEChartsEmits, AtengEChartsProps, EChartsInstance } from '../types';

defineOptions({
  name: 'AtengECharts',
});

const props = withDefaults(defineProps<AtengEChartsProps>(), {
  theme: undefined,
  initOptions: undefined,
  width: '100%',
  height: '350px',
  notMerge: true,
  lazyUpdate: true,
  loading: false,
});

const emit = defineEmits<AtengEChartsEmits>();

const chartRef = ref<HTMLDivElement | null>(null);

// 1. 初始化无头状态机
const {
  instance,
  init,
  dispose,
  setOption,
  resize,
  showLoading,
  hideLoading,
  clear,
  dispatchAction,
  getDataURL,
} = useECharts(chartRef, {
  theme: () => props.theme,
  initOptions: () => props.initOptions,
});

// 2. 容器样式计算
const containerStyle = computed<CSSProperties>(() => ({
  width: props.width,
  height: props.height,
  minWidth: '0',
  minHeight: '0',
}));

// 3. 初始渲染与事件监听绑定
onMounted(() => {
  const chart = init();
  if (chart) {
    if (props.option) {
      setOption(props.option, props.notMerge, props.lazyUpdate);
    }
    if (props.loading) {
      showLoading();
    }

    // 绑定事件转发
    chart.on('click', (params: unknown) => {
      emit('chart-click', params);
    });

    chart.on('finished', () => {
      emit('finished');
    });

    emit('rendered', chart);
  }
});

// 4. 响应式同步 Option
watch(
  () => props.option,
  newOption => {
    if (newOption) {
      setOption(newOption, props.notMerge, props.lazyUpdate);
    }
  },
  { deep: false },
);

// 5. 响应式同步 Loading
watch(
  () => props.loading,
  isLoading => {
    if (isLoading) {
      showLoading();
    } else {
      hideLoading();
    }
  },
);

// 6. 显式暴露实例方法
defineExpose({
  getInstance: (): EChartsInstance | null => instance.value,
  init,
  dispose,
  setOption,
  resize,
  showLoading,
  hideLoading,
  clear,
  dispatchAction,
  getDataURL,
});
</script>

<template>
  <div ref="chartRef" class="at-echarts" :style="containerStyle">
    <slot />
  </div>
</template>

<style scoped>
.at-echarts {
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
}
</style>
