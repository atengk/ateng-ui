<script setup lang="ts">
/**
 * BoardAdvanced 看板 4：历史轨迹回放、海量点网格聚合与行政区划反向遮罩看板。
 *
 * 遵循工业级组件设计与样式隔离规范。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { ref } from 'vue';
import {
  AtengMapTrack,
  AtengMapCluster,
  AtengMapMask,
  type MapCoordinate,
  type TrackPoint,
  type ClusterMarker,
  type ClusterGroup,
  type GeoJSONGeometryData,
  type AtengMapMaskInstance,
} from '@atengk/map-vue';

const subTab = ref<'track' | 'cluster' | 'mask'>('track');

// 1. 轨迹回放状态
const demoTrackPoints = ref<TrackPoint[]>([
  { coordinate: { lng: 116.4074, lat: 39.9042 }, name: '起点：天安门广场中心站' },
  { coordinate: { lng: 116.4014, lat: 39.9282 }, name: '景山公园万春亭' },
  { coordinate: { lng: 116.398, lat: 39.936 }, name: '地安门外大街中继点' },
  {
    coordinate: { lng: 116.3965, lat: 39.945 },
    name: '中途停靠：鼓楼物流分拣调度中心',
    isStop: true,
    stopDuration: 45,
  },
  { coordinate: { lng: 116.411, lat: 39.954 }, name: '安定门立交桥枢纽' },
  {
    coordinate: { lng: 116.395, lat: 40.005 },
    name: '物资补给站：国家体育场(鸟巢)',
    isStop: true,
    stopDuration: 60,
  },
  { coordinate: { lng: 116.48, lat: 39.996 }, name: '终点：望京 SOHO 智慧园区' },
]);

const trackProgress = ref<number>(0);
const trackSpeedRate = ref<number>(1);
const trackDark = ref<boolean>(false);
const trackLogs = ref<string[]>([]);

function logTrackEvent(msg: string) {
  const time = new Date().toLocaleTimeString();
  trackLogs.value.unshift(`[${time}] ${msg}`);
  if (trackLogs.value.length > 20) {
    trackLogs.value.pop();
  }
}

function onTrackPointChange(payload: {
  point: TrackPoint;
  index: number;
  coordinate: MapCoordinate;
  heading: number;
}) {
  logTrackEvent(
    `车辆移动: [${payload.coordinate.lng.toFixed(5)}, ${payload.coordinate.lat.toFixed(5)}] 航向: ${Math.round(payload.heading)}° (第 ${payload.index + 1} 赛段)`,
  );
}

function onTrackFinish() {
  logTrackEvent('🏁 轨迹回放已顺利到达终点！');
}

// 2. 海量点聚合状态
function generateClusterMockData(count: number): ClusterMarker[] {
  const result: ClusterMarker[] = [];
  const baseLng = 116.4074;
  const baseLat = 39.9042;
  for (let i = 0; i < count; i++) {
    result.push({
      id: `sensor-${i + 1}`,
      coordinate: {
        lng: baseLng + (Math.random() - 0.5) * 0.25,
        lat: baseLat + (Math.random() - 0.5) * 0.2,
      },
      title: `智慧 IoT 物联设备 #${i + 1}`,
    });
  }
  return result;
}

const clusterMarkers = ref<ClusterMarker[]>(generateClusterMockData(3000));
const clusterRenderMode = ref<'dom' | 'canvas'>('dom');
const clusterDark = ref<boolean>(false);
const clusterLogs = ref<string[]>([]);

function logClusterEvent(msg: string) {
  const time = new Date().toLocaleTimeString();
  clusterLogs.value.unshift(`[${time}] ${msg}`);
  if (clusterLogs.value.length > 20) {
    clusterLogs.value.pop();
  }
}

function setClusterCount(count: number) {
  clusterMarkers.value = generateClusterMockData(count);
  logClusterEvent(`重新生成点位数据: 共 ${count} 个密集点位`);
}

function onClusterClick(cluster: ClusterGroup) {
  logClusterEvent(
    `点击聚合圈: 包含 ${cluster.count} 个标记点，中心位于 [${cluster.center.lng.toFixed(4)}, ${cluster.center.lat.toFixed(4)}]`,
  );
}

function onMarkerClick(marker: ClusterMarker) {
  logClusterEvent(`点击独立标记: ${marker.title || marker.id}`);
}

// 3. 行政区划遮罩状态
const demoMaskGeoData = ref<GeoJSONGeometryData>({
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [116.36, 39.96],
        [116.46, 39.96],
        [116.48, 39.9],
        [116.45, 39.86],
        [116.36, 39.87],
        [116.34, 39.91],
        [116.36, 39.96],
      ],
    ],
  },
  properties: {
    name: '北京核心首都功能重点保护示范区',
  },
});

const maskDark = ref<boolean>(false);
const maskColor = ref<string>('rgba(15, 23, 42, 0.75)');
const maskBoundaryColor = ref<string>('#38bdf8');
const maskRef = ref<AtengMapMaskInstance | null>(null);
const maskLogs = ref<string[]>([]);

function logMaskEvent(msg: string) {
  const time = new Date().toLocaleTimeString();
  maskLogs.value.unshift(`[${time}] ${msg}`);
  if (maskLogs.value.length > 20) {
    maskLogs.value.pop();
  }
}

function onMaskClick(payload: { coordinate: MapCoordinate }) {
  logMaskEvent(
    `点击遮罩外部区域: [${payload.coordinate.lng.toFixed(5)}, ${payload.coordinate.lat.toFixed(5)}]`,
  );
}

function handleFitMask() {
  maskRef.value?.fitMaskBounds();
  logMaskEvent('聚焦并缩放至行政区划核心外包围盒 (fitMaskBounds)');
}
</script>

<template>
  <section class="board-card">
    <div class="card-header">
      <h2>历史轨迹回放、海量点聚合与行政区划遮罩看板</h2>
      <div class="toolbar">
        <div class="sub-tab-group">
          <button
            class="btn-subtab"
            :class="{ active: subTab === 'track' }"
            @click="subTab = 'track'"
          >
            🚀 历史轨迹平滑回放
          </button>
          <button
            class="btn-subtab"
            :class="{ active: subTab === 'cluster' }"
            @click="subTab = 'cluster'"
          >
            🌐 海量点网格聚合
          </button>
          <button
            class="btn-subtab"
            :class="{ active: subTab === 'mask' }"
            @click="subTab = 'mask'"
          >
            🗺️ 行政区划反向遮罩
          </button>
        </div>
      </div>
    </div>

    <!-- 子场景 1: 轨迹回放 -->
    <div v-if="subTab === 'track'" class="map-container-layout">
      <div class="map-wrapper picker-box">
        <AtengMapTrack
          v-model:progress="trackProgress"
          v-model:speed-rate="trackSpeedRate"
          :track-points="demoTrackPoints"
          :dark="trackDark"
          height="540px"
          @point-change="onTrackPointChange"
          @finish="onTrackFinish"
        />
      </div>

      <div class="log-panel">
        <div class="log-header">
          <h3>轨迹回放配置与车况监控</h3>
          <button class="btn-toggle" :class="{ active: trackDark }" @click="trackDark = !trackDark">
            {{ trackDark ? '🌙 暗黑模式' : '☀️ 浅色模式' }}
          </button>
        </div>

        <div class="track-summary">
          <div class="metric-row">
            <span class="lbl">轨迹节点总数：</span>
            <span class="val">{{ demoTrackPoints.length }} 个关键路标</span>
          </div>
          <div class="metric-row">
            <span class="lbl">内置停靠站点：</span>
            <span class="val">鼓楼调度站、鸟巢补给点</span>
          </div>
          <div class="metric-row">
            <span class="lbl">当前回放进度：</span>
            <span class="val highlight">{{ (trackProgress * 100).toFixed(1) }}%</span>
          </div>
          <div class="metric-row">
            <span class="lbl">播放倍速倍率：</span>
            <span class="val">{{ trackSpeedRate }}x 极速推演</span>
          </div>
        </div>

        <div class="log-header" style="margin-top: 14px">
          <h3>车辆瞬时遥测与航向事件流</h3>
        </div>
        <div class="log-list">
          <div v-for="(log, idx) in trackLogs" :key="idx" class="log-item">
            {{ log }}
          </div>
          <div v-if="trackLogs.length === 0" class="log-empty">
            点击左侧地图底栏【▶ 播放】按键开始轨迹推演...
          </div>
        </div>
      </div>
    </div>

    <!-- 子场景 2: 海量点网格聚合 -->
    <div v-else-if="subTab === 'cluster'" class="map-container-layout">
      <div class="map-wrapper picker-box">
        <AtengMapCluster
          :markers="clusterMarkers"
          :render-mode="clusterRenderMode"
          :dark="clusterDark"
          height="540px"
          @cluster-click="onClusterClick"
          @marker-click="onMarkerClick"
        />
      </div>

      <div class="log-panel">
        <div class="log-header">
          <h3>海量点聚合沙箱控制</h3>
          <button
            class="btn-toggle"
            :class="{ active: clusterDark }"
            @click="clusterDark = !clusterDark"
          >
            {{ clusterDark ? '🌙 暗黑模式' : '☀️ 浅色模式' }}
          </button>
        </div>

        <div class="cluster-controls">
          <div class="control-row">
            <label>点位数据规模：</label>
            <div class="btn-group">
              <button
                class="btn-sm"
                :class="{ active: clusterMarkers.length === 1000 }"
                @click="setClusterCount(1000)"
              >
                1,000 点
              </button>
              <button
                class="btn-sm"
                :class="{ active: clusterMarkers.length === 3000 }"
                @click="setClusterCount(3000)"
              >
                3,000 点
              </button>
              <button
                class="btn-sm"
                :class="{ active: clusterMarkers.length === 10000 }"
                @click="setClusterCount(10000)"
              >
                10,000 点
              </button>
            </div>
          </div>

          <div class="control-row">
            <label>引擎渲染模式：</label>
            <div class="btn-group">
              <button
                class="btn-sm"
                :class="{ active: clusterRenderMode === 'dom' }"
                @click="clusterRenderMode = 'dom'"
              >
                DOM 阶梯徽标
              </button>
              <button
                class="btn-sm"
                :class="{ active: clusterRenderMode === 'canvas' }"
                @click="clusterRenderMode = 'canvas'"
              >
                Canvas 纯画布
              </button>
            </div>
          </div>

          <div class="patrol-tip">
            支持墨卡托网格分桶聚合，放大到极限层级点击聚合圈自动触发 Spiderfy 蜘蛛网环状发散扩散。
          </div>
        </div>

        <div class="log-header" style="margin-top: 14px">
          <h3>聚合交互感知事件流</h3>
        </div>
        <div class="log-list">
          <div v-for="(log, idx) in clusterLogs" :key="idx" class="log-item">
            {{ log }}
          </div>
          <div v-if="clusterLogs.length === 0" class="log-empty">
            在左侧地图滚轮缩放或点击聚合徽标体验聚合散开...
          </div>
        </div>
      </div>
    </div>

    <!-- 子场景 3: 行政区划反向遮罩 -->
    <div v-else class="map-container-layout">
      <div class="map-wrapper picker-box">
        <AtengMapMask
          ref="maskRef"
          :geo-data="demoMaskGeoData"
          :mask-color="maskColor"
          :boundary-color="maskBoundaryColor"
          :dark="maskDark"
          height="540px"
          @mask-click="onMaskClick"
        />
      </div>

      <div class="log-panel">
        <div class="log-header">
          <h3>行政区划镂空遮罩控制</h3>
          <button class="btn-toggle" :class="{ active: maskDark }" @click="maskDark = !maskDark">
            {{ maskDark ? '🌙 暗黑模式' : '☀️ 浅色模式' }}
          </button>
        </div>

        <div class="mask-controls">
          <div class="control-row">
            <button class="btn-action" @click="handleFitMask">
              🎯 视口自适应包围盒 (fitMaskBounds)
            </button>
          </div>

          <div class="control-row">
            <label>边界高亮描边色：</label>
            <div class="btn-group">
              <button
                class="btn-sm"
                :class="{ active: maskBoundaryColor === '#38bdf8' }"
                @click="maskBoundaryColor = '#38bdf8'"
              >
                天蓝色
              </button>
              <button
                class="btn-sm"
                :class="{ active: maskBoundaryColor === '#10b981' }"
                @click="maskBoundaryColor = '#10b981'"
              >
                翡翠绿
              </button>
              <button
                class="btn-sm"
                :class="{ active: maskBoundaryColor === '#f59e0b' }"
                @click="maskBoundaryColor = '#f59e0b'"
              >
                琥珀黄
              </button>
            </div>
          </div>

          <div class="patrol-tip">
            基于 GeoJSON 反向多环构建，全局压暗背景，行政边界高亮，内部区域透明凸显。
          </div>
        </div>

        <div class="log-header" style="margin-top: 14px">
          <h3>遮罩事件与操作流</h3>
        </div>
        <div class="log-list">
          <div v-for="(log, idx) in maskLogs" :key="idx" class="log-item">
            {{ log }}
          </div>
          <div v-if="maskLogs.length === 0" class="log-empty">
            点击压暗区域或上方按钮查看交互响应...
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.board-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.card-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.sub-tab-group {
  display: flex;
  gap: 6px;
  background: #f1f5f9;
  padding: 3px;
  border-radius: 8px;
}

.btn-subtab {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  border: none;
  background: transparent;
  color: #64748b;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-subtab:hover {
  color: #0f172a;
}

.btn-subtab.active {
  background: #ffffff;
  color: #2563eb;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.btn-toggle,
.btn-action {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
  transition: all 0.15s;
}

.btn-toggle:hover,
.btn-action:hover {
  background: #f1f5f9;
}

.btn-toggle.active {
  background: #0f172a;
  color: #fff;
  border-color: #0f172a;
}

.map-container-layout {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 16px;
}

.map-wrapper {
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  overflow: hidden;
  height: 540px;
}

.picker-box {
  border: none;
}

.log-panel {
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.log-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.track-summary,
.cluster-controls,
.mask-controls {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.metric-row .lbl {
  color: #64748b;
}

.metric-row .val {
  font-weight: 500;
  color: #1e293b;
}

.metric-row .val.highlight {
  color: #2563eb;
  font-weight: 700;
  font-family: monospace;
}

.control-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
}

.control-row label {
  color: #475569;
  font-weight: 500;
}

.btn-group {
  display: flex;
  gap: 6px;
}

.btn-sm {
  padding: 4px 10px;
  font-size: 11px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-sm:hover {
  background: #f1f5f9;
}

.btn-sm.active {
  background: #3b82f6;
  border-color: #2563eb;
  color: #ffffff;
  font-weight: 600;
}

.patrol-tip {
  color: #64748b;
  font-size: 11px;
  margin-top: 4px;
}

.log-list {
  flex: 1;
  overflow-y: auto;
  max-height: 280px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.log-item {
  font-size: 12px;
  color: #334155;
  background: #f8fafc;
  padding: 6px 8px;
  border-radius: 4px;
  border-left: 3px solid #3b82f6;
  word-break: break-all;
}

.log-empty {
  font-size: 12px;
  color: #94a3b8;
  text-align: center;
  padding: 24px 0;
}
</style>
