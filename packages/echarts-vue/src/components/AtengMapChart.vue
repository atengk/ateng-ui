<script setup lang="ts">
/**
 * AtengMapChart 地图下钻高频预设组件。
 *
 * 包装 AtengECharts 表现容器，集成 GeoDataProvider 异步 SPI 抽象、
 * useMapDrillDown 受控路径栈状态机与优雅面包屑药丸导航。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { computed, ref, onMounted } from 'vue';
import AtengECharts from './AtengECharts.vue';
import { useMapDrillDown, createMapOption } from '../presets/map';
import type { AtengMapChartEmits, AtengMapChartProps, MapNode } from '../presets/types';
import type { EChartsInstance } from '../types';

defineOptions({
  name: 'AtengMapChart',
});

const props = withDefaults(defineProps<AtengMapChartProps>(), {
  map: undefined,
  data: () => [],
  scatterData: () => [],
  initialNode: undefined,
  geoProvider: undefined,
  beforeDrillDown: undefined,
  visualMap: true,
  roam: true,
  showBreadcrumb: true,
  overrideOption: undefined,
  theme: 'auto',
  initOptions: undefined,
  width: '100%',
  height: '450px',
  autoResize: true,
  deepWatch: false,
  notMerge: true,
  lazyUpdate: true,
  loading: false,
  loadingText: '加载地图中...',
  nativeLoading: false,
  empty: undefined,
  emptyText: '暂无地图数据',
  error: null,
  errorText: '地图加载异常',
});

const emit = defineEmits<AtengMapChartEmits>();

const echartsRef = ref<InstanceType<typeof AtengECharts> | null>(null);

// 1. 初始化地图下钻受控状态机
const resolvedInitialNode = computed<MapNode>(() => {
  if (props.initialNode) return props.initialNode;
  return { code: props.map ?? 'china', name: '全国' };
});

const { currentNode, breadcrumbs, isDrilling, canBack, drillTo, back, reset } = useMapDrillDown({
  initialNode: resolvedInitialNode.value,
  geoProvider: props.geoProvider,
  beforeDrillDown: props.beforeDrillDown,
  onDrillDown: (target, crumbs) => {
    emit('drill-down', target, crumbs);
  },
});

// 2. 初始加载根节点 GeoJSON
onMounted(async () => {
  if (props.geoProvider && resolvedInitialNode.value) {
    try {
      await props.geoProvider(resolvedInitialNode.value.code, resolvedInitialNode.value.name);
    } catch (err) {
      console.error('[AtengMapChart] 根地图 GeoJSON 初始化失败:', err);
    }
  }
});

// 3. 计算生效的地图编码与 EChartsOption
const activeMapCode = computed(() => {
  return props.map ?? currentNode.value.code;
});

const resolvedOption = computed(() => {
  return createMapOption({
    map: activeMapCode.value,
    data: props.data,
    scatterData: props.scatterData,
    visualMap: props.visualMap,
    roam: props.roam,
    overrideOption: props.overrideOption,
  });
});

// 4. 空数据防白屏自愈判定
const resolvedEmpty = computed(() => {
  if (props.empty !== undefined) {
    return props.empty;
  }
  return false;
});

// 5. 点击地图区域触发下钻代理
const handleChartClick = async (params: unknown) => {
  emit('chart-click', params);

  const p = params as { name?: string; data?: Record<string, unknown>; componentType?: string };
  if (p.name && (p.componentType === 'series' || !p.componentType)) {
    const targetCode = String(p.data?.code ?? p.name);
    const targetNode: MapNode = {
      code: targetCode,
      name: p.name,
      meta: p.data,
    };
    await drillTo(targetNode);
  }
};

const handleBack = async () => {
  const success = await back();
  if (success) {
    emit('back', currentNode.value, breadcrumbs.value);
  }
};

const handleReset = async () => {
  const success = await reset();
  if (success) {
    emit('reset', currentNode.value);
  }
};

// 6. 统一暴露实例操作门面与下钻控制方法
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
  drillTo,
  back: handleBack,
  reset: handleReset,
  currentNode,
  breadcrumbs,
  canBack,
  isDrilling,
});
</script>

<template>
  <div class="at-map-chart">
    <!-- 面包屑导航药丸槽位 -->
    <div v-if="props.showBreadcrumb" class="at-map-chart__breadcrumbs">
      <slot
        name="breadcrumb"
        :breadcrumbs="breadcrumbs"
        :current-node="currentNode"
        :can-back="canBack"
        :drill-to="drillTo"
        :back="handleBack"
        :reset="handleReset"
      >
        <div class="at-map-chart__crumb-list">
          <span
            v-for="(crumb, idx) in breadcrumbs"
            :key="crumb.code"
            class="at-map-chart__crumb-item"
            :class="{ active: idx === breadcrumbs.length - 1 }"
            @click="drillTo(crumb)"
          >
            {{ crumb.name }}
            <span v-if="idx < breadcrumbs.length - 1" class="at-map-chart__crumb-sep">/</span>
          </span>
        </div>
        <button v-if="canBack" type="button" class="at-map-chart__back-btn" @click="handleBack">
          ◀ 返回上一级
        </button>
      </slot>
    </div>

    <!-- 表现容器 -->
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
      :loading="props.loading || isDrilling"
      :loading-text="isDrilling ? '正在切换层级地图...' : props.loadingText"
      :native-loading="props.nativeLoading"
      :empty="resolvedEmpty"
      :empty-text="props.emptyText"
      :error="props.error"
      :error-text="props.errorText"
      @rendered="inst => emit('rendered', inst)"
      @finished="() => emit('finished')"
      @chart-click="handleChartClick"
      @chart-dblclick="p => emit('chart-dblclick', p)"
      @chart-mouseover="p => emit('chart-mouseover', p)"
      @chart-mouseout="p => emit('chart-mouseout', p)"
      @legend-change="p => emit('legend-change', p)"
      @data-zoom="p => emit('data-zoom', p)"
      @chart-event="(name, p) => emit('chart-event', name, p)"
      @resize="() => emit('resize')"
      @theme-change="t => emit('theme-change', t)"
      @retry="() => emit('retry')"
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
    </AtengECharts>
  </div>
</template>

<style scoped>
.at-map-chart {
  position: relative;
  box-sizing: border-box;
  width: 100%;
}

.at-map-chart__breadcrumbs {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 14px;
  background-color: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(6px);
  border-radius: 9999px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #ebeef5;
  font-size: 13px;
}

.at-map-chart__crumb-list {
  display: flex;
  align-items: center;
  gap: 4px;
}

.at-map-chart__crumb-item {
  color: #409eff;
  cursor: pointer;
  user-select: none;
  font-weight: 500;
  transition: color 0.2s;
}

.at-map-chart__crumb-item:hover {
  color: #66b1ff;
  text-decoration: underline;
}

.at-map-chart__crumb-item.active {
  color: #303133;
  cursor: default;
  font-weight: 600;
  text-decoration: none;
}

.at-map-chart__crumb-sep {
  margin-left: 6px;
  color: #c0c4cc;
}

.at-map-chart__back-btn {
  background: none;
  border: none;
  padding: 2px 6px;
  color: #606266;
  font-size: 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.at-map-chart__back-btn:hover {
  color: #409eff;
  background-color: #f2f6fc;
}
</style>
