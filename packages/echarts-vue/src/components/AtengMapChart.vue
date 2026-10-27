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
import * as echarts from 'echarts';
import AtengECharts from './AtengECharts.vue';
import { useMapDrillDown, createMapOption } from '../presets/map';
import type {
  AtengMapChartEmits,
  AtengMapChartProps,
  AtengMapChartSlots,
  MapNode,
} from '../presets/types';
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

defineSlots<AtengMapChartSlots>();

const echartsRef = ref<InstanceType<typeof AtengECharts> | null>(null);

// 1. 初始化地图下钻受控状态机
const resolvedInitialNode = computed<MapNode>(() => {
  if (props.initialNode) return props.initialNode;
  return { code: props.map ?? 'china', name: '全国' };
});

const { currentNode, breadcrumbs, isDrilling, canBack, currentLevel, drillTo, back, reset } =
  useMapDrillDown({
    initialNode: resolvedInitialNode.value,
    geoProvider: props.geoProvider,
    beforeDrillDown: props.beforeDrillDown,
    onDrillDown: (target, crumbs) => {
      emit('drill-down', target, crumbs);
    },
  });

// 2. 初始加载根节点 GeoJSON 与错误管理
const internalError = ref<unknown>(null);
const resolvedError = computed(() => props.error ?? internalError.value);
const isMapReady = ref(
  !props.geoProvider || Boolean(echarts.getMap(resolvedInitialNode.value.code)),
);

const loadRootGeo = async () => {
  if (props.geoProvider && resolvedInitialNode.value) {
    try {
      internalError.value = null;
      const res = await props.geoProvider(
        resolvedInitialNode.value.code,
        resolvedInitialNode.value.name,
      );
      if (res && !echarts.getMap(resolvedInitialNode.value.code)) {
        echarts.registerMap(
          resolvedInitialNode.value.code,
          res as Parameters<typeof echarts.registerMap>[1],
        );
      }
      isMapReady.value = true;
    } catch (err) {
      console.error('[AtengMapChart] 根地图 GeoJSON 初始化失败:', err);
      internalError.value = err;
      isMapReady.value = false;
    }
  } else {
    isMapReady.value = true;
  }
};

onMounted(loadRootGeo);

// 3. 计算生效的地图编码与 EChartsOption
const activeMapCode = computed(() => {
  return props.map ?? currentNode.value.code;
});

const resolvedOption = computed(() => {
  if (!isMapReady.value || resolvedError.value || !echarts.getMap(activeMapCode.value)) {
    return {};
  }
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
  emit('click', params);
  emit('chart-click', params);

  const p = params as { name?: string; data?: Record<string, unknown>; componentType?: string };
  if (p.name && (p.componentType === 'series' || !p.componentType)) {
    const targetCode = String(p.data?.code ?? p.name);
    const targetNode: MapNode = {
      code: targetCode,
      name: p.name,
      meta: p.data,
    };
    try {
      await drillTo(targetNode);
    } catch (err) {
      console.error('[AtengMapChart] 下钻 GeoJSON 加载失败:', err);
      internalError.value = err;
    }
  }
};

const handleBack = async () => {
  try {
    const success = await back();
    if (success) {
      emit('back', currentNode.value, breadcrumbs.value);
    }
  } catch (err) {
    console.error('[AtengMapChart] 回退上一级地图失败:', err);
    internalError.value = err;
  }
};

const handleReset = async () => {
  try {
    const success = await reset();
    if (success) {
      emit('reset', currentNode.value);
    }
  } catch (err) {
    console.error('[AtengMapChart] 重置地图层级失败:', err);
    internalError.value = err;
  }
};

const handleRetry = async () => {
  internalError.value = null;
  emit('retry');
  await loadRootGeo();
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
  isFullscreen: computed(() => echartsRef.value?.isFullscreen ?? false),
  toggleFullscreen: (mode?: 'auto' | 'native' | 'page') =>
    echartsRef.value?.toggleFullscreen(mode) ?? Promise.resolve(false),
  exportImage: (
    opts?: Parameters<NonNullable<InstanceType<typeof AtengECharts>>['exportImage']>[0],
  ) => echartsRef.value?.exportImage(opts) ?? false,
  drillTo,
  back: handleBack,
  reset: handleReset,
  currentNode,
  breadcrumbs,
  canBack,
  currentLevel,
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
        :current-level="currentLevel"
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
      :error="resolvedError"
      :error-text="props.errorText"
      :allow-fullscreen="props.allowFullscreen"
      :fullscreen-mode="props.fullscreenMode"
      :allow-export="props.allowExport"
      :export-options="props.exportOptions"
      @rendered="inst => emit('rendered', inst)"
      @finished="() => emit('finished')"
      @click="p => emit('click', p)"
      @dblclick="p => emit('dblclick', p)"
      @legendselectchanged="p => emit('legendselectchanged', p)"
      @datazoom="p => emit('datazoom', p)"
      @chart-click="handleChartClick"
      @chart-dblclick="p => emit('chart-dblclick', p)"
      @chart-mouseover="p => emit('chart-mouseover', p)"
      @chart-mouseout="p => emit('chart-mouseout', p)"
      @legend-change="p => emit('legend-change', p)"
      @data-zoom="p => emit('data-zoom', p)"
      @chart-event="(name, p) => emit('chart-event', name, p)"
      @resize="() => emit('resize')"
      @theme-change="t => emit('theme-change', t)"
      @retry="handleRetry"
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
.at-map-chart {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  --at-map-crumb-bg: rgba(255, 255, 255, 0.85);
  --at-map-crumb-border: var(--at-border-color, #ebeef5);
  --at-map-crumb-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  --at-map-crumb-text: var(--at-text-color-regular, #606266);
  --at-map-crumb-link: var(--at-color-primary, #409eff);
  --at-map-crumb-hover: var(--at-color-primary-light-3, #66b1ff);
  --at-map-crumb-active: var(--at-text-color-primary, #303133);
  --at-map-crumb-sep: var(--at-text-color-placeholder, #c0c4cc);
  --at-map-back-hover-bg: var(--at-fill-color-light, #f2f6fc);
}

:global(.dark) .at-map-chart {
  --at-map-crumb-bg: rgba(29, 30, 31, 0.85);
  --at-map-crumb-border: var(--at-border-color-dark, #363637);
  --at-map-crumb-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  --at-map-crumb-text: #a3a6ad;
  --at-map-crumb-link: #409eff;
  --at-map-crumb-hover: #79bbff;
  --at-map-crumb-active: #e5eaf3;
  --at-map-crumb-sep: #606266;
  --at-map-back-hover-bg: #262727;
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
  background-color: var(--at-map-crumb-bg);
  backdrop-filter: blur(6px);
  border-radius: 9999px;
  box-shadow: var(--at-map-crumb-shadow);
  border: 1px solid var(--at-map-crumb-border);
  font-size: 13px;
}

.at-map-chart__crumb-list {
  display: flex;
  align-items: center;
  gap: 4px;
}

.at-map-chart__crumb-item {
  color: var(--at-map-crumb-link);
  cursor: pointer;
  user-select: none;
  font-weight: 500;
  transition: color 0.2s;
}

.at-map-chart__crumb-item:hover {
  color: var(--at-map-crumb-hover);
  text-decoration: underline;
}

.at-map-chart__crumb-item.active {
  color: var(--at-map-crumb-active);
  cursor: default;
  font-weight: 600;
  text-decoration: none;
}

.at-map-chart__crumb-sep {
  margin-left: 6px;
  color: var(--at-map-crumb-sep);
}

.at-map-chart__back-btn {
  background: none;
  border: none;
  padding: 2px 6px;
  color: var(--at-map-crumb-text);
  font-size: 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.at-map-chart__back-btn:hover {
  color: var(--at-map-crumb-link);
  background-color: var(--at-map-back-hover-bg);
}
</style>
