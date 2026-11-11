<script setup lang="ts">
/**
 * AtengMapToolbar 悬浮微工具栏组件。
 *
 * 遵循 ADR-0002、ADR-0009、ADR-0021、ADR-0029 与 ADR-0051 规范，
 * 封装缩放复位、全屏切换、交互式折线连续测距与多边形面积测量小工具。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { ref, computed, watch, onBeforeUnmount } from 'vue';
import L from 'leaflet';
import type {
  AtengMapToolbarProps,
  AtengMapToolbarEmits,
  MapCoordinate,
  MeasureMode,
  MeasureResult,
  ToolbarAction,
} from '../types';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '../constants';
import { GeoMath } from '../engines/geo-math';

const props = withDefaults(defineProps<AtengMapToolbarProps>(), {
  driver: null,
  actions: () => [
    'zoomIn',
    'zoomOut',
    'reset',
    'measureDistance',
    'measureArea',
    'fullscreen',
    'clear',
  ],
  position: 'top-right',
  defaultCenter: () => DEFAULT_MAP_CENTER,
  defaultZoom: DEFAULT_MAP_ZOOM,
  customClass: '',
});

const emit = defineEmits<AtengMapToolbarEmits>();

const measureMode = ref<MeasureMode>('none');
const measuredPoints = ref<MapCoordinate[]>([]);
const isFullscreen = ref<boolean>(false);

let measureLayerGroup: L.LayerGroup | null = null;
let isDisposed = false;

// 格式化距离 (米 / 千米)
function formatDistance(m: number): string {
  if (m < 1000) {
    return `${Math.round(m)} m`;
  }
  return `${(m / 1000).toFixed(2)} km`;
}

// 格式化面积 (平方米 / 平方千米)
function formatArea(sqm: number): string {
  if (sqm < 1_000_000) {
    return `${Math.round(sqm)} ㎡`;
  }
  return `${(sqm / 1_000_000).toFixed(2)} km²`;
}

// 创建拐点标尺 HTML
function createRulerIcon(text: string, isTotal = false): L.DivIcon {
  return L.divIcon({
    className: 'at-map-measure-ruler',
    html: `
      <div style="
        padding: 2px 6px;
        background: ${isTotal ? '#2563eb' : '#ffffff'};
        color: ${isTotal ? '#ffffff' : '#1e293b'};
        border: 1px solid ${isTotal ? '#1d4ed8' : '#cbd5e1'};
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        white-space: nowrap;
        pointer-events: none;
        transform: translate(6px, -14px);
      ">
        ${text}
      </div>
    `,
    iconSize: [0, 0],
  });
}

function getRawMap(): L.Map | null {
  if (!props.driver) return null;
  const raw = props.driver.getRawInstance<L.Map>();
  if (raw && typeof raw.on === 'function') {
    return raw;
  }
  return null;
}

// 刷新测量图层
function redrawMeasurement() {
  const rawMap = getRawMap();
  if (!rawMap || isDisposed) return;

  if (!measureLayerGroup) {
    measureLayerGroup = L.layerGroup().addTo(rawMap);
  } else {
    measureLayerGroup.clearLayers();
  }

  const pts = measuredPoints.value;
  if (pts.length === 0) return;

  const latLngs: L.LatLngTuple[] = pts.map(p => [p.lat, p.lng]);

  if (measureMode.value === 'distance') {
    // 折线测距
    L.polyline(latLngs, {
      color: '#3b82f6',
      weight: 3,
      dashArray: '4, 4',
    }).addTo(measureLayerGroup);

    let cumulative = 0;
    pts.forEach((pt, idx) => {
      if (idx === 0) {
        L.marker([pt.lat, pt.lng], { icon: createRulerIcon('起点', false) }).addTo(
          measureLayerGroup!,
        );
      } else {
        const seg = GeoMath.distance(pts[idx - 1]!, pt);
        cumulative += seg;
        const isEnd = idx === pts.length - 1;
        const text = isEnd
          ? `总长: ${formatDistance(cumulative)}`
          : `+${formatDistance(seg)} (${formatDistance(cumulative)})`;
        L.marker([pt.lat, pt.lng], { icon: createRulerIcon(text, isEnd) }).addTo(
          measureLayerGroup!,
        );
      }
    });

    const res: MeasureResult = {
      mode: 'distance',
      points: [...pts],
      totalDistance: cumulative,
    };
    emit('measureChange', res);
  } else if (measureMode.value === 'area') {
    // 多边形测面
    L.polygon(latLngs, {
      color: '#10b981',
      fillColor: '#10b981',
      fillOpacity: 0.25,
      weight: 2.5,
    }).addTo(measureLayerGroup);

    if (pts.length >= 3) {
      const area = GeoMath.area(pts);
      // 质心位置浮动标牌
      const centerLng = pts.reduce((sum, p) => sum + p.lng, 0) / pts.length;
      const centerLat = pts.reduce((sum, p) => sum + p.lat, 0) / pts.length;

      L.marker([centerLat, centerLng], {
        icon: createRulerIcon(`总面积: ${formatArea(area)}`, true),
      }).addTo(measureLayerGroup);

      const res: MeasureResult = {
        mode: 'area',
        points: [...pts],
        area,
      };
      emit('measureChange', res);
    }
  }
}

function handleMapClick(e: L.LeafletMouseEvent) {
  if (measureMode.value === 'none') return;
  measuredPoints.value.push({ lng: e.latlng.lng, lat: e.latlng.lat });
  redrawMeasurement();
}

function handleMapDblClick() {
  if (measureMode.value === 'none') return;
  finishMeasurement();
}

function finishMeasurement() {
  const pts = measuredPoints.value;
  const currentMode = measureMode.value;
  let res: MeasureResult;

  if (currentMode === 'distance') {
    res = {
      mode: 'distance',
      points: [...pts],
      totalDistance: GeoMath.polylineDistance(pts),
    };
  } else {
    res = {
      mode: 'area',
      points: [...pts],
      area: pts.length >= 3 ? GeoMath.area(pts) : 0,
    };
  }

  emit('measureFinish', res);
  measureMode.value = 'none';
}

function setMeasureMode(mode: MeasureMode) {
  if (measureMode.value === mode) {
    measureMode.value = 'none';
    clearMeasurement();
    return;
  }
  measureMode.value = mode;
  measuredPoints.value = [];
  if (measureLayerGroup) {
    measureLayerGroup.clearLayers();
  }
}

function clearMeasurement() {
  measureMode.value = 'none';
  measuredPoints.value = [];
  if (measureLayerGroup) {
    measureLayerGroup.clearLayers();
  }
}

function handleAction(action: ToolbarAction) {
  emit('action', action);
  const rawMap = getRawMap();

  switch (action) {
    case 'zoomIn':
      if (rawMap) rawMap.zoomIn();
      else if (props.driver) props.driver.setZoom(props.defaultZoom + 1);
      break;
    case 'zoomOut':
      if (rawMap) rawMap.zoomOut();
      else if (props.driver) props.driver.setZoom(props.defaultZoom - 1);
      break;
    case 'reset':
      if (props.driver) {
        props.driver.setCenter(props.defaultCenter);
        props.driver.setZoom(props.defaultZoom);
      }
      break;
    case 'measureDistance':
      setMeasureMode('distance');
      break;
    case 'measureArea':
      setMeasureMode('area');
      break;
    case 'clear':
      clearMeasurement();
      break;
    case 'fullscreen':
      toggleFullscreen();
      break;
  }
}

function toggleFullscreen() {
  const rawMap = getRawMap();
  const container = rawMap?.getContainer() || document.querySelector('.at-map-container');
  if (!container) return;

  if (!document.fullscreenElement) {
    container
      .requestFullscreen?.()
      .then(() => {
        isFullscreen.value = true;
        emit('fullscreenChange', true);
        props.driver?.invalidateSize();
      })
      .catch(() => {});
  } else {
    document
      .exitFullscreen?.()
      .then(() => {
        isFullscreen.value = false;
        emit('fullscreenChange', false);
        props.driver?.invalidateSize();
      })
      .catch(() => {});
  }
}

// 绑定与解绑地图监听
function bindMapEvents(rawMap: L.Map | null) {
  if (!rawMap) return;
  rawMap.on('click', handleMapClick);
  rawMap.on('dblclick', handleMapDblClick);
}

function unbindMapEvents(rawMap: L.Map | null) {
  if (!rawMap) return;
  rawMap.off('click', handleMapClick);
  rawMap.off('dblclick', handleMapDblClick);
}

watch(
  () => props.driver,
  (newDriver, oldDriver) => {
    if (oldDriver) {
      const oldMap = oldDriver.getRawInstance<L.Map>();
      unbindMapEvents(oldMap);
    }
    if (newDriver) {
      const newMap = newDriver.getRawInstance<L.Map>();
      bindMapEvents(newMap);
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  isDisposed = true;
  const rawMap = getRawMap();
  unbindMapEvents(rawMap);
  if (measureLayerGroup) {
    measureLayerGroup.clearLayers();
    measureLayerGroup.remove();
    measureLayerGroup = null;
  }
});

const isActionEnabled = (act: ToolbarAction) => computed(() => props.actions.includes(act)).value;

defineExpose({
  get measureMode() {
    return measureMode.value;
  },
  setMeasureMode,
  clearMeasurement,
  toggleFullscreen,
});
</script>

<template>
  <div :class="['at-map-toolbar', `is-${position}`, customClass]">
    <slot
      :measure-mode="measureMode"
      :set-measure-mode="setMeasureMode"
      :clear="clearMeasurement"
      :handle-action="handleAction"
    >
      <div class="at-map-toolbar-group">
        <button
          v-if="isActionEnabled('zoomIn')"
          type="button"
          class="at-map-toolbar-btn"
          data-action="zoomIn"
          title="放大"
          @click="handleAction('zoomIn')"
        >
          ＋
        </button>
        <button
          v-if="isActionEnabled('zoomOut')"
          type="button"
          class="at-map-toolbar-btn"
          data-action="zoomOut"
          title="缩小"
          @click="handleAction('zoomOut')"
        >
          －
        </button>
      </div>

      <div class="at-map-toolbar-group">
        <button
          v-if="isActionEnabled('reset')"
          type="button"
          class="at-map-toolbar-btn"
          data-action="reset"
          title="重置中心视口"
          @click="handleAction('reset')"
        >
          🎯
        </button>
        <button
          v-if="isActionEnabled('measureDistance')"
          type="button"
          :class="['at-map-toolbar-btn', { 'is-active': measureMode === 'distance' }]"
          data-action="measureDistance"
          title="折线连续测距"
          @click="handleAction('measureDistance')"
        >
          📏
        </button>
        <button
          v-if="isActionEnabled('measureArea')"
          type="button"
          :class="['at-map-toolbar-btn', { 'is-active': measureMode === 'area' }]"
          data-action="measureArea"
          title="多边形面积测面"
          @click="handleAction('measureArea')"
        >
          📐
        </button>
        <button
          v-if="isActionEnabled('clear') && (measureMode !== 'none' || measuredPoints.length > 0)"
          type="button"
          class="at-map-toolbar-btn"
          data-action="clear"
          title="清除测量标尺"
          @click="handleAction('clear')"
        >
          🧹
        </button>
      </div>

      <div v-if="isActionEnabled('fullscreen')" class="at-map-toolbar-group">
        <button
          type="button"
          class="at-map-toolbar-btn"
          data-action="fullscreen"
          title="全屏切换"
          @click="handleAction('fullscreen')"
        >
          ⛶
        </button>
      </div>
    </slot>
  </div>
</template>

<style scoped>
.at-map-toolbar {
  position: absolute;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: auto;
}

.at-map-toolbar.is-top-right {
  top: 16px;
  right: 16px;
}

.at-map-toolbar.is-top-left {
  top: 16px;
  left: 16px;
}

.at-map-toolbar.is-bottom-right {
  bottom: 24px;
  right: 16px;
}

.at-map-toolbar.is-bottom-left {
  bottom: 24px;
  left: 16px;
}

.at-map-toolbar-group {
  display: flex;
  flex-direction: column;
  background: var(--at-map-toolbar-bg, rgba(255, 255, 255, 0.92));
  backdrop-filter: blur(8px);
  border: 1px solid var(--at-map-border-color, #e2e8f0);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.at-map-toolbar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  background: transparent;
  color: #334155;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.at-map-toolbar-btn:hover {
  background: rgba(241, 245, 249, 0.9);
  color: #0f172a;
}

.at-map-toolbar-btn.is-active {
  background: #3b82f6;
  color: #ffffff;
}

.at-map-toolbar-btn + .at-map-toolbar-btn {
  border-top: 1px solid var(--at-map-border-color, #f1f5f9);
}
</style>
