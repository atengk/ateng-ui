<script setup lang="ts">
/**
 * AtengMapCluster 海量点标记网格聚合与 Spiderfy 表现容器组件。
 *
 * 遵循 ADR-0002、ADR-0009、ADR-0021、ADR-0029 与 ADR-0051 规范，
 * 封装轻量墨卡托网格聚合、蜘蛛网扩散展开 (Spiderfy) 与 Canvas 纯画布超高吞吐渲染双模引擎。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { ref, watch, onBeforeUnmount, nextTick } from 'vue';
import L from 'leaflet';
import type {
  AtengMapClusterProps,
  AtengMapClusterEmits,
  ClusterGroup,
  MapDriverAdapter,
} from '../types';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '../constants';
import AtengMap from './AtengMap.vue';
import { ClusterEngine } from '../engines/cluster-engine';

const props = withDefaults(defineProps<AtengMapClusterProps>(), {
  markers: () => [],
  gridSize: 60,
  maxClusterZoom: 17,
  spiderfyOnMaxZoom: true,
  renderMode: 'dom',
  clusterColor: '#3b82f6',
  center: () => DEFAULT_MAP_CENTER,
  zoom: DEFAULT_MAP_ZOOM,
  dark: 'auto',
  height: '520px',
  customClass: '',
});

const emit = defineEmits<AtengMapClusterEmits>();

const driverInstance = ref<MapDriverAdapter | null>(null);
const currentClusters = ref<ClusterGroup[]>([]);
const canvasRef = ref<HTMLCanvasElement | null>(null);

let clusterLayerGroup: L.LayerGroup | null = null;
let spiderfyLayerGroup: L.LayerGroup | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let isDisposed = false;

// 聚合圈样式阶梯
function getClusterBadgeStyle(count: number): { bg: string; size: number } {
  if (count < 10) {
    return { bg: props.clusterColor || '#3b82f6', size: 36 };
  }
  if (count < 100) {
    return { bg: '#10b981', size: 44 };
  }
  if (count < 1000) {
    return { bg: '#f59e0b', size: 52 };
  }
  return { bg: '#ef4444', size: 60 };
}

// 构建 DOM 聚合徽标图标
function createClusterIcon(count: number): L.DivIcon {
  const { bg, size } = getClusterBadgeStyle(count);
  return L.divIcon({
    className: 'at-map-cluster-badge',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background-color: ${bg};
        opacity: 0.92;
        border: 3px solid rgba(255, 255, 255, 0.85);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-weight: 700;
        font-size: ${size >= 52 ? 14 : 12}px;
        user-select: none;
        cursor: pointer;
        transition: transform 0.15s ease;
      ">
        ${count > 9999 ? '9999+' : count}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// 执行聚合计算
function computeClusters() {
  if (!driverInstance.value || isDisposed) return;
  const rawMap = driverInstance.value.getRawInstance<L.Map>();
  if (!rawMap || typeof rawMap.getZoom !== 'function') return;

  const currentZoom = rawMap.getZoom();
  const clusters = ClusterEngine.cluster(props.markers, {
    zoom: currentZoom,
    gridSize: props.gridSize,
    maxClusterZoom: props.maxClusterZoom,
  });

  currentClusters.value = clusters;

  if (props.renderMode === 'canvas') {
    renderCanvas();
  } else {
    renderDomLayers(rawMap);
  }
}

// 防抖聚合
function scheduleCompute() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    computeClusters();
  }, 40);
}

// 展开 Spiderfy 蜘蛛网散开图层
function expandSpiderfy(cluster: ClusterGroup, rawMap: L.Map) {
  if (!spiderfyLayerGroup) {
    spiderfyLayerGroup = L.layerGroup().addTo(rawMap);
  } else {
    spiderfyLayerGroup.clearLayers();
  }

  const spiderfied = ClusterEngine.generateSpiderfyOffsets(cluster.center, cluster.markers, {
    zoom: rawMap.getZoom(),
    radiusPixels: 55,
  });

  const centerLatLng: L.LatLngTuple = [cluster.center.lat, cluster.center.lng];

  spiderfied.forEach(item => {
    const targetLatLng: L.LatLngTuple = [item.coordinate.lat, item.coordinate.lng];

    // 绘制连线
    L.polyline([centerLatLng, targetLatLng], {
      color: props.clusterColor || '#3b82f6',
      weight: 1.5,
      dashArray: '3, 4',
      opacity: 0.8,
    }).addTo(spiderfyLayerGroup!);

    // 绘制散开 marker
    const marker = L.marker(targetLatLng, {
      title: item.marker.title,
    });
    marker.on('click', () => {
      emit('markerClick', item.marker);
    });
    marker.addTo(spiderfyLayerGroup!);
  });
}

function clearSpiderfy() {
  if (spiderfyLayerGroup) {
    spiderfyLayerGroup.clearLayers();
    spiderfyLayerGroup.remove();
    spiderfyLayerGroup = null;
  }
}

// DOM 模式渲染
function renderDomLayers(rawMap: L.Map) {
  if (!clusterLayerGroup) {
    clusterLayerGroup = L.layerGroup().addTo(rawMap);
  } else {
    clusterLayerGroup.clearLayers();
  }

  clearSpiderfy();

  const clusters = currentClusters.value;
  for (const c of clusters) {
    if (c.count > 1) {
      // 聚合簇
      const marker = L.marker([c.center.lat, c.center.lng], {
        icon: createClusterIcon(c.count),
      });

      marker.on('click', () => {
        emit('clusterClick', c);
        const curZoom = rawMap.getZoom();
        if (curZoom < props.maxClusterZoom) {
          const [sw, ne] = c.bounds;
          rawMap.fitBounds(L.latLngBounds([sw.lat, sw.lng], [ne.lat, ne.lng]), {
            padding: [50, 50],
            maxZoom: props.maxClusterZoom,
          });
        } else if (props.spiderfyOnMaxZoom) {
          expandSpiderfy(c, rawMap);
        }
      });

      marker.addTo(clusterLayerGroup);
    } else {
      // 单个独立点
      const single = c.markers[0];
      if (single) {
        const marker = L.marker([single.coordinate.lat, single.coordinate.lng], {
          title: single.title,
        });
        marker.on('click', () => {
          emit('markerClick', single);
        });
        marker.addTo(clusterLayerGroup);
      }
    }
  }
}

// Canvas 模式渲染
function renderCanvas() {
  if (!canvasRef.value || !driverInstance.value) return;
  const rawMap = driverInstance.value.getRawInstance<L.Map>();
  if (!rawMap || typeof rawMap.getSize !== 'function') return;

  const canvas = canvasRef.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const size = rawMap.getSize();
  const dpr = window.devicePixelRatio || 1;

  if (canvas.width !== size.x * dpr || canvas.height !== size.y * dpr) {
    canvas.width = size.x * dpr;
    canvas.height = size.y * dpr;
    canvas.style.width = `${size.x}px`;
    canvas.style.height = `${size.y}px`;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(dpr, dpr);

  const clusters = currentClusters.value;
  for (const c of clusters) {
    const pt = rawMap.latLngToContainerPoint([c.center.lat, c.center.lng]);
    if (c.count > 1) {
      const { bg, size: badgeSize } = getClusterBadgeStyle(c.count);
      const radius = badgeSize / 2;

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = bg;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${radius >= 26 ? 13 : 11}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.count > 9999 ? '9999+' : `${c.count}`, pt.x, pt.y);
    } else {
      // 独立点小圆点
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = props.clusterColor || '#3b82f6';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    }
  }

  ctx.restore();
}

function handleReady(driver: MapDriverAdapter) {
  driverInstance.value = driver;
  const rawMap = driver.getRawInstance<L.Map>();
  if (rawMap && typeof rawMap.on === 'function') {
    rawMap.on('zoomend moveend resize', scheduleCompute);
  }
  nextTick(() => {
    computeClusters();
  });
}

function refresh() {
  computeClusters();
}

watch(
  () => props.markers,
  () => {
    scheduleCompute();
  },
  { deep: true },
);

watch(
  () => props.renderMode,
  () => {
    if (clusterLayerGroup) {
      clusterLayerGroup.clearLayers();
    }
    clearSpiderfy();
    computeClusters();
  },
);

onBeforeUnmount(() => {
  isDisposed = true;
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (clusterLayerGroup) {
    clusterLayerGroup.clearLayers();
    clusterLayerGroup.remove();
    clusterLayerGroup = null;
  }
  clearSpiderfy();
});

defineExpose({
  get clusters() {
    return currentClusters.value;
  },
  refresh,
});
</script>

<template>
  <div :class="['at-map-cluster-container', customClass]" :style="{ height }">
    <AtengMap
      :center="center"
      :zoom="zoom"
      :tile-preset="tilePreset"
      :dark="dark"
      @ready="handleReady"
    >
      <template #default>
        <canvas
          v-if="renderMode === 'canvas'"
          ref="canvasRef"
          class="at-map-cluster-canvas"
        ></canvas>
      </template>
    </AtengMap>
  </div>
</template>

<style scoped>
.at-map-cluster-container {
  position: relative;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.at-map-cluster-canvas {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 500;
}
</style>
