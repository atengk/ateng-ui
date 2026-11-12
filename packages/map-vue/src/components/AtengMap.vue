<script setup lang="ts">
/**
 * AtengMap 核心地图表现容器组件。
 *
 * 遵循 ADR-0002、ADR-0009、ADR-0021、ADR-0029 与 ADR-0051 规范，
 * 封装多源底图切换、暗黑模式瓦片无损反色滤镜、0x0 视口几何自愈与插槽反转微工具栏支持。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import type { AtengMapProps, AtengMapEmits, MapMarker } from '../types';
import { TilePreset, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '../constants';
import { useMap } from '../composables/use-map';

const props = withDefaults(defineProps<AtengMapProps>(), {
  center: () => DEFAULT_MAP_CENTER,
  zoom: DEFAULT_MAP_ZOOM,
  minZoom: 3,
  maxZoom: 18,
  tilePreset: TilePreset.OSM,
  tileUrl: undefined,
  engine: 'leaflet',
  driver: undefined,
  coordType: 'GCJ02',
  dark: 'auto',
  interactive: true,
  autoResize: true,
  markers: () => [],
  customClass: '',
});

const emit = defineEmits<AtengMapEmits>();

const viewportRef = ref<HTMLElement | null>(null);

const {
  ready,
  loading,
  currentCenter,
  currentZoom,
  isDark,
  mount,
  dispose,
  setCenter,
  setZoom,
  setView,
  panTo,
  fitBounds,
  addMarker,
  removeMarker,
  clearMarkers,
  invalidateSize,
  getDriver,
  getRawInstance,
} = useMap({
  center: () => props.center,
  zoom: () => props.zoom,
  minZoom: () => props.minZoom,
  maxZoom: () => props.maxZoom,
  tilePreset: () => props.tilePreset,
  tileUrl: () => props.tileUrl,
  engine: () => props.engine,
  driver: () => props.driver,
  coordType: () => props.coordType,
  dark: () => props.dark,
  interactive: () => props.interactive,
  autoResize: props.autoResize,
  onMapClick: payload => emit('mapClick', payload),
  onMapDblClick: payload => emit('mapDblClick', payload),
  onMapMoveEnd: center => {
    emit('update:center', center);
    emit('mapMoveEnd', center);
  },
  onMapZoomEnd: zoom => {
    emit('update:zoom', zoom);
    emit('mapZoomEnd', zoom);
  },
  onReady: driver => emit('ready', driver),
});

/**
 * 同步外部 markers 列表。
 */
const syncMarkers = (newMarkers: MapMarker[]): void => {
  clearMarkers();
  if (Array.isArray(newMarkers)) {
    for (const m of newMarkers) {
      addMarker(m);
    }
  }
};

watch(
  () => props.markers,
  newMarkers => {
    if (ready.value) {
      syncMarkers(newMarkers);
    }
  },
  { deep: true },
);

let isUnmounted = false;

onMounted(async () => {
  if (viewportRef.value) {
    await mount(viewportRef.value);
    if (!isUnmounted && props.markers?.length) {
      syncMarkers(props.markers);
    }
  }
});

onBeforeUnmount(() => {
  isUnmounted = true;
  dispose();
});

defineExpose({
  getRawMapInstance: getRawInstance,
  getDriver,
  panTo,
  setCenter,
  setZoom,
  setView,
  fitBounds,
  invalidateSize,
  addMarker,
  removeMarker,
  clearMarkers,
  ready,
  loading,
  currentCenter,
  currentZoom,
  isDark,
});
</script>

<template>
  <div :class="['at-map-container', customClass, { 'is-dark': isDark }]">
    <!-- 地图渲染挂载视口 -->
    <div ref="viewportRef" class="at-map-viewport"></div>

    <!-- 默认子组件/图层插槽 -->
    <slot
      :driver="getDriver()"
      :is-ready="ready"
      :is-dark="isDark"
      :center="currentCenter"
      :zoom="currentZoom"
    />

    <!-- 微工具栏插槽 -->
    <div v-if="$slots.toolbar" class="at-map-toolbar-slot">
      <slot
        name="toolbar"
        :driver="getDriver()"
        :invalidate-size="invalidateSize"
        :set-zoom="setZoom"
        :pan-to="panTo"
      />
    </div>
  </div>
</template>

<style scoped>
.at-map-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 240px;
  background-color: var(--at-map-bg, #f8fafc);
  border-radius: var(--at-map-border-radius, 8px);
  overflow: hidden;
}

.at-map-viewport {
  width: 100%;
  height: 100%;
  z-index: 1;
}

.at-map-toolbar-slot {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 999;
}
</style>
