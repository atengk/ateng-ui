<script setup lang="ts">
/**
 * AtengMapTrack 历史轨迹平滑回放表现容器组件。
 *
 * 遵循 ADR-0002、ADR-0009、ADR-0021、ADR-0029 与 ADR-0051 规范，
 * 封装 requestAnimationFrame 平滑插帧动画、车辆航向角平滑旋转、分色路线高亮与控制底栏。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { ref, computed, watch, onBeforeUnmount } from 'vue';
import L from 'leaflet';
import type {
  AtengMapTrackProps,
  AtengMapTrackEmits,
  MapCoordinate,
  MapDriverAdapter,
} from '../types';
import { DEFAULT_MAP_CENTER } from '../constants';
import AtengMap from './AtengMap.vue';
import { useMapTrack } from '../composables/use-map-track';

const props = withDefaults(defineProps<AtengMapTrackProps>(), {
  trackPoints: () => [],
  speedRate: 1,
  progress: 0,
  loop: false,
  autoPlay: false,
  passedPathColor: '#10b981',
  pendingPathColor: '#94a3b8',
  pathWidth: 5,
  carIcon: undefined,
  showStopMarkers: true,
  showControlBar: true,
  center: () => DEFAULT_MAP_CENTER,
  zoom: 14,
  dark: 'auto',
  height: '520px',
  customClass: '',
});

const emit = defineEmits<AtengMapTrackEmits>();

// 内部驱动引用与 Leaflet 图层
const driverInstance = ref<MapDriverAdapter | null>(null);
let trackLayerGroup: L.LayerGroup | null = null;
let _pendingPolyline: L.Polyline | null = null;
let passedPolyline: L.Polyline | null = null;
let carMarker: L.Marker | null = null;
const stopMarkers: L.Marker[] = [];
let isDisposed = false;

// 状态机集成
let updateTrackVisualsFn: (() => void) | null = null;

const trackState = useMapTrack({
  trackPoints: () => props.trackPoints,
  speedRate: () => props.speedRate,
  initialProgress: () => props.progress,
  loop: () => props.loop,
  onStatusChange: status => {
    emit('statusChange', status);
  },
  onProgressChange: p => {
    emit('update:progress', p);
    updateTrackVisualsFn?.();
  },
  onPointChange: payload => {
    emit('pointChange', payload);
  },
  onFinish: () => {
    emit('finish');
  },
});

const {
  status,
  progress,
  speedRate,
  currentIndex,
  currentCoordinate,
  currentHeading,
  play,
  pause,
  stop,
  seek,
  setSpeedRate,
} = trackState;

const speedOptions = [0.5, 1, 2, 4, 8];

// 地图初次定位中心点推导
const initialCenter = computed<MapCoordinate>(() => {
  if (props.trackPoints && props.trackPoints.length > 0 && props.trackPoints[0]?.coordinate) {
    return props.trackPoints[0].coordinate;
  }
  return props.center;
});

// 构建车辆/移动图标
function createVehicleIcon(heading: number): L.DivIcon {
  const customIcon = props.carIcon;
  let innerHtml = '';
  if (typeof customIcon === 'string') {
    innerHtml = `<img src="${customIcon}" style="width: 100%; height: 100%; transform: rotate(${heading}deg); transform-origin: center center;" />`;
  } else if (customIcon?.url) {
    innerHtml = `<img src="${customIcon.url}" style="width: 100%; height: 100%; transform: rotate(${heading}deg); transform-origin: center center;" />`;
  } else {
    // 默认高质感小车 SVG 图标
    innerHtml = `
      <div style="width: 32px; height: 32px; transform: rotate(${heading}deg); transform-origin: center center; display: flex; align-items: center; justify-content: center;">
        <svg viewBox="0 0 24 24" width="30" height="30" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="11" fill="#3b82f6" fill-opacity="0.2" stroke="#2563eb" stroke-width="1.5" />
          <path d="M12 4L17 17L12 14L7 17L12 4Z" fill="#1d4ed8" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round" />
        </svg>
      </div>
    `;
  }

  return L.divIcon({
    className: 'at-map-track-vehicle-marker',
    html: innerHtml,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

// 构建停靠点图钉图标
function createStopIcon(): L.DivIcon {
  return L.divIcon({
    className: 'at-map-track-stop-marker',
    html: `
      <div style="width: 20px; height: 20px; border-radius: 50%; background: #f59e0b; border: 2px solid #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; color: #ffffff;">
        P
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

// 初始化 Leaflet 轨迹渲染图层
function setupLayers() {
  if (!driverInstance.value || isDisposed) return;
  const rawMap = driverInstance.value.getRawInstance<L.Map>();
  if (!rawMap || typeof rawMap.addLayer !== 'function') return;

  clearLayers();

  trackLayerGroup = L.layerGroup().addTo(rawMap);

  const pts = props.trackPoints || [];
  if (pts.length < 2) return;

  const latLngs: L.LatLngTuple[] = pts.map(p => [p.coordinate.lat, p.coordinate.lng]);

  // 1. 待行驶路线全线 (底层)
  _pendingPolyline = L.polyline(latLngs, {
    color: props.pendingPathColor,
    weight: props.pathWidth,
    opacity: 0.7,
    dashArray: '6, 6',
  }).addTo(trackLayerGroup);

  // 2. 已行驶路线 (顶层，起始为空)
  passedPolyline = L.polyline([], {
    color: props.passedPathColor,
    weight: props.pathWidth + 1,
    opacity: 0.95,
  }).addTo(trackLayerGroup);

  // 3. 停靠点图钉
  if (props.showStopMarkers) {
    pts.forEach(p => {
      if (p.isStop) {
        const marker = L.marker([p.coordinate.lat, p.coordinate.lng], {
          icon: createStopIcon(),
          title: p.name || '停靠驻留点',
        });
        if (p.stopDuration || p.name) {
          marker.bindTooltip(
            `${p.name || '停靠点'}${p.stopDuration ? ` (停靠 ${p.stopDuration} 秒)` : ''}`,
          );
        }
        marker.addTo(trackLayerGroup!);
        stopMarkers.push(marker);
      }
    });
  }

  // 4. 移动载具 Marker
  const startPt = pts[0]?.coordinate;
  if (startPt) {
    carMarker = L.marker([startPt.lat, startPt.lng], {
      icon: createVehicleIcon(currentHeading.value),
      zIndexOffset: 1000,
    }).addTo(trackLayerGroup);
  }

  // 视口自适应包围盒
  if (latLngs.length > 0) {
    const bounds = L.latLngBounds(latLngs);
    rawMap.fitBounds(bounds, { padding: [40, 40] });
  }

  updateTrackVisuals();

  if (props.autoPlay) {
    play();
  }
}

// 刷新轨迹视觉呈现
function updateTrackVisuals() {
  if (!currentCoordinate.value || isDisposed) return;

  const curCoord = currentCoordinate.value;
  const curHead = currentHeading.value;
  const pts = props.trackPoints || [];

  // 更新车辆 Marker 位置与旋转
  if (carMarker) {
    carMarker.setLatLng([curCoord.lat, curCoord.lng]);
    carMarker.setIcon(createVehicleIcon(curHead));
  }

  // 更新已走轨迹点
  if (passedPolyline && pts.length >= 2) {
    const passedLatLngs: L.LatLngTuple[] = [];
    for (let i = 0; i <= currentIndex.value && i < pts.length; i++) {
      const p = pts[i];
      if (p) passedLatLngs.push([p.coordinate.lat, p.coordinate.lng]);
    }
    passedLatLngs.push([curCoord.lat, curCoord.lng]);
    passedPolyline.setLatLngs(passedLatLngs);
  }
}

updateTrackVisualsFn = updateTrackVisuals;

function clearLayers() {
  if (trackLayerGroup) {
    trackLayerGroup.clearLayers();
    trackLayerGroup.remove();
    trackLayerGroup = null;
  }
  _pendingPolyline = null;
  passedPolyline = null;
  carMarker = null;
  stopMarkers.length = 0;
}

function handleReady(driver: MapDriverAdapter) {
  driverInstance.value = driver;
  setupLayers();
}

function handleSliderChange(e: Event) {
  const target = e.target as HTMLInputElement;
  const val = parseFloat(target.value);
  seek(val);
}

function handleSpeedChange(rate: number) {
  setSpeedRate(rate);
  emit('update:speedRate', rate);
}

watch(
  () => props.trackPoints,
  () => {
    setupLayers();
  },
  { deep: true },
);

onBeforeUnmount(() => {
  isDisposed = true;
  stop();
  clearLayers();
});

defineExpose({
  get status() {
    return status.value;
  },
  get progress() {
    return progress.value;
  },
  get currentCoordinate() {
    return currentCoordinate.value;
  },
  get currentHeading() {
    return currentHeading.value;
  },
  get currentIndex() {
    return currentIndex.value;
  },
  get speedRate() {
    return speedRate.value;
  },
  play,
  pause,
  stop,
  seek,
  setSpeedRate,
});
</script>

<template>
  <div :class="['at-map-track-container', customClass]" :style="{ height }">
    <AtengMap
      :center="initialCenter"
      :zoom="zoom"
      :tile-preset="tilePreset"
      :dark="dark"
      @ready="handleReady"
    />

    <!-- 回放控制底栏 -->
    <div v-if="showControlBar" class="at-map-track-bar">
      <!-- 播放 / 暂停 / 停止按钮 -->
      <div class="at-map-track-actions">
        <button
          v-if="status !== 'playing'"
          type="button"
          class="at-map-track-btn at-map-track-play-btn"
          title="播放"
          @click="play"
        >
          ▶
        </button>
        <button
          v-else
          type="button"
          class="at-map-track-btn at-map-track-pause-btn"
          title="暂停"
          @click="pause"
        >
          ⏸
        </button>
        <button
          type="button"
          class="at-map-track-btn at-map-track-stop-btn"
          title="停止并重置"
          @click="stop"
        >
          ⏹
        </button>
      </div>

      <!-- 进度条与瞬时数据 -->
      <div class="at-map-track-progress-wrapper">
        <input
          type="range"
          class="at-map-track-slider"
          min="0"
          max="1"
          step="0.001"
          :value="progress"
          @input="handleSliderChange"
        />
        <div class="at-map-track-metrics">
          <span class="at-map-track-percent">{{ (progress * 100).toFixed(1) }}%</span>
          <span v-if="currentCoordinate" class="at-map-track-coord">
            [{{ currentCoordinate.lng.toFixed(4) }}, {{ currentCoordinate.lat.toFixed(4) }}]
          </span>
          <span class="at-map-track-bearing"> {{ Math.round(currentHeading) }}° </span>
        </div>
      </div>

      <!-- 倍速切换 -->
      <div class="at-map-track-speeds">
        <button
          v-for="rate in speedOptions"
          :key="rate"
          type="button"
          :class="['at-map-track-speed-tag', { 'is-active': speedRate === rate }]"
          @click="handleSpeedChange(rate)"
        >
          {{ rate }}x
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.at-map-track-container {
  position: relative;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.at-map-track-bar {
  position: absolute;
  bottom: 16px;
  left: 16px;
  right: 16px;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 16px;
  background: var(--at-map-panel-bg, rgba(255, 255, 255, 0.94));
  backdrop-filter: blur(8px);
  border: 1px solid var(--at-map-border-color, #e2e8f0);
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.at-map-track-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.at-map-track-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid var(--at-map-border-color, #cbd5e1);
  background: #ffffff;
  color: #1e293b;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.at-map-track-btn:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.at-map-track-play-btn {
  background: #3b82f6;
  border-color: #2563eb;
  color: #ffffff;
}

.at-map-track-play-btn:hover {
  background: #2563eb;
}

.at-map-track-progress-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.at-map-track-slider {
  width: 100%;
  cursor: pointer;
  accent-color: #3b82f6;
}

.at-map-track-metrics {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #64748b;
  font-family: monospace;
}

.at-map-track-speeds {
  display: flex;
  align-items: center;
  gap: 4px;
}

.at-map-track-speed-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s ease;
}

.at-map-track-speed-tag:hover {
  background: #f1f5f9;
}

.at-map-track-speed-tag.is-active {
  background: #3b82f6;
  border-color: #2563eb;
  color: #ffffff;
}
</style>
