<script setup lang="ts">
/**
 * AtengMapMask 行政区划反向遮罩表现容器组件。
 *
 * 遵循 ADR-0002、ADR-0009、ADR-0021、ADR-0029 与 ADR-0051 规范，
 * 封装 GeoJSON 行政区划反向多环多边形构建 (Inverted Polygon Mask)、全局压暗与目标边界高亮。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { ref, watch, onBeforeUnmount } from 'vue';
import L from 'leaflet';
import type {
  AtengMapMaskProps,
  AtengMapMaskEmits,
  AtengMapMaskInstance,
  MapDriverAdapter,
} from '../types';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '../constants';
import AtengMap from './AtengMap.vue';
import { MaskEngine } from '../engines/mask-engine';

const props = withDefaults(defineProps<AtengMapMaskProps>(), {
  geoData: null,
  maskColor: 'rgba(15, 23, 42, 0.72)',
  boundaryColor: '#38bdf8',
  boundaryWidth: 2.5,
  dashArray: undefined,
  center: () => DEFAULT_MAP_CENTER,
  zoom: DEFAULT_MAP_ZOOM,
  dark: 'auto',
  height: '520px',
  customClass: '',
});

const emit = defineEmits<AtengMapMaskEmits>();

const driverInstance = ref<MapDriverAdapter | null>(null);
let maskLayerGroup: L.LayerGroup | null = null;
let isDisposed = false;

// 绘制反向掩膜与高亮描边
function renderMask() {
  if (!driverInstance.value || isDisposed) return;
  const rawMap = driverInstance.value.getRawInstance<L.Map>();
  if (!rawMap || typeof rawMap.addLayer !== 'function') return;

  clearLayers();

  maskLayerGroup = L.layerGroup().addTo(rawMap);

  const maskData = MaskEngine.buildInvertedMask(props.geoData);
  if (maskData.holes.length === 0) {
    return;
  }

  // 1. 构建 Leaflet 多环反向多边形 (外环为全球，内环为行政区划)
  const worldLatLngs: L.LatLngTuple[] = maskData.worldRing.map(p => [p.lat, p.lng]);
  const holesLatLngs: L.LatLngTuple[][] = maskData.holes.map(ring => ring.map(p => [p.lat, p.lng]));

  const polygonLatLngs = [worldLatLngs, ...holesLatLngs];

  const maskPolygon = L.polygon(polygonLatLngs, {
    stroke: false,
    fillColor: props.maskColor,
    fillOpacity: 1,
    fillRule: 'evenodd',
    interactive: true,
  });

  maskPolygon.on('click', (e: L.LeafletMouseEvent) => {
    emit('maskClick', {
      coordinate: { lng: e.latlng.lng, lat: e.latlng.lat },
      originalEvent: e.originalEvent,
    });
  });

  maskPolygon.addTo(maskLayerGroup);

  // 2. 绘制行政边界高亮描边
  for (const b of maskData.boundaries) {
    const boundaryLatLngs: L.LatLngTuple[] = b.map(p => [p.lat, p.lng]);
    L.polyline(boundaryLatLngs, {
      color: props.boundaryColor,
      weight: props.boundaryWidth,
      dashArray: props.dashArray,
      opacity: 0.95,
      interactive: false,
    }).addTo(maskLayerGroup);
  }

  // 3. 自适应边界定位
  if (maskData.bounds) {
    const [sw, ne] = maskData.bounds;
    rawMap.fitBounds(L.latLngBounds([sw.lat, sw.lng], [ne.lat, ne.lng]), { padding: [30, 30] });
  }
}

function fitMaskBounds() {
  if (!driverInstance.value || isDisposed) return;
  const rawMap = driverInstance.value.getRawInstance<L.Map>();
  if (!rawMap) return;

  const maskData = MaskEngine.buildInvertedMask(props.geoData);
  if (maskData.bounds) {
    const [sw, ne] = maskData.bounds;
    rawMap.fitBounds(L.latLngBounds([sw.lat, sw.lng], [ne.lat, ne.lng]), { padding: [30, 30] });
  }
}

function clearLayers() {
  if (maskLayerGroup) {
    maskLayerGroup.clearLayers();
    maskLayerGroup.remove();
    maskLayerGroup = null;
  }
}

function handleReady(driver: MapDriverAdapter) {
  driverInstance.value = driver;
  emit('ready', driver);
  renderMask();
}

function refresh() {
  renderMask();
}

watch(
  () => props.geoData,
  () => {
    renderMask();
  },
  { deep: true },
);

watch(
  () => [props.maskColor, props.boundaryColor, props.boundaryWidth],
  () => {
    renderMask();
  },
);

onBeforeUnmount(() => {
  isDisposed = true;
  clearLayers();
});

defineExpose<AtengMapMaskInstance>({
  fitMaskBounds,
  refresh,
});
</script>

<template>
  <div :class="['at-map-mask-container', customClass]" :style="{ height }">
    <AtengMap
      :center="center"
      :zoom="zoom"
      :tile-preset="tilePreset"
      :dark="dark"
      @ready="handleReady"
    />
  </div>
</template>

<style scoped>
.at-map-mask-container {
  position: relative;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
</style>
