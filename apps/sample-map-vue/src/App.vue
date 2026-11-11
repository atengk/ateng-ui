<script setup lang="ts">
/**
 * sample-map-vue 展厅主容器。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { ref } from 'vue';
import {
  MAP_VUE_VERSION,
  TilePreset,
  DEFAULT_MAP_CENTER,
  AtengMap,
  AtengMapPicker,
  AtengMapFence,
  AtengMapTrack,
  AtengMapCluster,
  AtengMapMask,
  type MapCoordinate,
  type MapDriverAdapter,
  type AtengMapInstance,
  type AtengMapMaskInstance,
  type PickerResult,
  type PickerMode,
  type CoordType,
  type FenceRecord,
  type FenceDrawMode,
  type FenceAlarmPayload,
  type TrackPoint,
  type ClusterMarker,
  type ClusterGroup,
  type GeoJSONGeometryData,
} from '@atengk/map-vue';

const activeTab = ref('board1');

// 看板 1 状态
const selectedPreset = ref<string>(TilePreset.OSM);
const currentCenter = ref<MapCoordinate>({ ...DEFAULT_MAP_CENTER });
const currentZoom = ref<number>(12);
const darkTheme = ref<boolean>(false);
const mapReady = ref<boolean>(false);
const eventLogs = ref<string[]>([]);
const mapRef = ref<AtengMapInstance | null>(null);

const presetOptions = [
  { label: 'OpenStreetMap (内置免费)', value: TilePreset.OSM },
  { label: 'CartoDB 浅色 (清新明快)', value: TilePreset.CARTO_LIGHT },
  { label: 'CartoDB 深色 (极客夜间)', value: TilePreset.CARTO_DARK },
  { label: '天地图矢量 (测绘标准)', value: TilePreset.TIANDITU_VEC },
  { label: '高德矢量瓦片 (中国坐标)', value: TilePreset.AMAP_VEC },
];

const cityOptions: Array<{ label: string; point: MapCoordinate }> = [
  { label: '北京 (天安门)', point: { lng: 116.4074, lat: 39.9042 } },
  { label: '上海 (陆家嘴)', point: { lng: 121.4997, lat: 31.2397 } },
  { label: '广州 (珠江新城)', point: { lng: 113.3245, lat: 23.119 } },
  { label: '深圳 (市民中心)', point: { lng: 114.0579, lat: 22.5431 } },
  { label: '杭州 (西湖)', point: { lng: 120.1536, lat: 30.2448 } },
];

function logEvent(msg: string) {
  const time = new Date().toLocaleTimeString();
  eventLogs.value.unshift(`[${time}] ${msg}`);
  if (eventLogs.value.length > 20) {
    eventLogs.value.pop();
  }
}

function onMapReady(driver: MapDriverAdapter) {
  mapReady.value = true;
  logEvent(`地图引擎就绪: ${driver.engineName}`);
}

function onMapClick(payload: { coordinate: MapCoordinate; originalEvent: MouseEvent }) {
  logEvent(
    `点击坐标: [${payload.coordinate.lng.toFixed(6)}, ${payload.coordinate.lat.toFixed(6)}]`,
  );
}

function onMapMoveEnd(center: MapCoordinate) {
  logEvent(`视野中心平移至: [${center.lng.toFixed(6)}, ${center.lat.toFixed(6)}]`);
}

function onMapZoomEnd(zoom: number) {
  logEvent(`地图缩放至: Level ${zoom}`);
}

function setCity(pt: MapCoordinate) {
  currentCenter.value = { ...pt };
  mapRef.value?.setCenter(pt);
  logEvent(`切换城市中心: [${pt.lng}, ${pt.lat}]`);
}

function handleInvalidateSize() {
  mapRef.value?.invalidateSize();
  logEvent('主动触发视口尺寸几何自愈 (invalidateSize)');
}

// 看板 2: 坐标拾取与逆地理纠偏状态
const pickerCoord = ref<MapCoordinate>({ lng: 116.4074, lat: 39.9042, coordType: 'GCJ02' });
const pickerMode = ref<PickerMode>('marker');
const pickerCoordType = ref<CoordType>('GCJ02');
const pickerDark = ref<boolean>(false);
const lastPickerResult = ref<PickerResult | null>(null);
const pickerLogs = ref<string[]>([]);

function logPickerEvent(msg: string) {
  const time = new Date().toLocaleTimeString();
  pickerLogs.value.unshift(`[${time}] ${msg}`);
  if (pickerLogs.value.length > 20) {
    pickerLogs.value.pop();
  }
}

function onPickerChange(result: PickerResult) {
  logPickerEvent(
    `选点变化: [${result.coordinate.lng.toFixed(6)}, ${result.coordinate.lat.toFixed(6)}] - ${result.address?.formattedAddress || '未解析'}`,
  );
}

function onPickerConfirm(result: PickerResult) {
  lastPickerResult.value = result;
  logPickerEvent(
    `★ 确认选点: [${result.coordinate.lng.toFixed(6)}, ${result.coordinate.lat.toFixed(6)}] - ${result.address?.formattedAddress || '未解析'}`,
  );
}

function onPickerReset() {
  lastPickerResult.value = null;
  logPickerEvent('选点器状态已重置');
}

// 看板 3: 空间电子围栏与越界告警状态
const demoFences = ref<FenceRecord[]>([
  {
    id: 'fence-circle-01',
    name: '天安门特级安防圈',
    shape: 'circle',
    center: { lng: 116.4074, lat: 39.9042 },
    radius: 800,
    strokeColor: '#ef4444',
    fillColor: '#ef4444',
  },
  {
    id: 'fence-poly-02',
    name: '王府井商业步行区多边形',
    shape: 'polygon',
    points: [
      { lng: 116.411, lat: 39.916 },
      { lng: 116.417, lat: 39.916 },
      { lng: 116.417, lat: 39.908 },
      { lng: 116.411, lat: 39.908 },
    ],
    strokeColor: '#3b82f6',
    fillColor: '#3b82f6',
  },
]);

const fenceDrawMode = ref<FenceDrawMode>('none');
const activeFenceId = ref<string | number | null>('fence-circle-01');
const fenceDark = ref<boolean>(false);
const patrolPoint = ref<MapCoordinate>({ lng: 116.395, lat: 39.9042 });
const isPatrolling = ref<boolean>(false);
let patrolInterval: ReturnType<typeof setInterval> | null = null;
const fenceAlarmLogs = ref<
  Array<{ time: string; type: 'enter' | 'leave' | 'inside'; text: string }>
>([]);

function logFenceAlarm(type: 'enter' | 'leave' | 'inside', text: string) {
  const time = new Date().toLocaleTimeString();
  fenceAlarmLogs.value.unshift({ time, type, text });
  if (fenceAlarmLogs.value.length > 20) {
    fenceAlarmLogs.value.pop();
  }
}

function onPointEnter(p: FenceAlarmPayload) {
  logFenceAlarm(
    'enter',
    `🚨 [进入告警] 巡检目标侵入围栏【${p.fence.name}】，坐标 [${p.point.lng.toFixed(5)}, ${p.point.lat.toFixed(5)}]`,
  );
}

function onPointInside(p: FenceAlarmPayload) {
  logFenceAlarm('inside', `⏱️ [内部滞留] 巡检目标在围栏【${p.fence.name}】内部活动中...`);
}

function onPointLeave(p: FenceAlarmPayload) {
  logFenceAlarm('leave', `🟢 [移出提示] 巡检目标已离开围栏【${p.fence.name}】`);
}

function togglePatrolSimulation() {
  if (isPatrolling.value) {
    if (patrolInterval) clearInterval(patrolInterval);
    patrolInterval = null;
    isPatrolling.value = false;
  } else {
    isPatrolling.value = true;
    patrolPoint.value = { lng: 116.395, lat: 39.9042 };
    let step = 0;
    patrolInterval = setInterval(() => {
      step++;
      // 沿经度东向移动：从 116.3950 穿越至 116.4250
      const currentLng = 116.395 + step * 0.002;
      patrolPoint.value = { lng: currentLng, lat: 39.9042 };
      if (step > 16) {
        step = 0;
      }
    }, 1200);
  }
}

// ==================== 看板 4 状态与逻辑 ====================
const board4SubTab = ref<'track' | 'cluster' | 'mask'>('track');

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
  <div class="sample-map-app">
    <header class="sample-header">
      <div class="brand">
        <h1>@atengk/map-vue 展厅</h1>
        <span class="badge">v{{ MAP_VUE_VERSION }}</span>
      </div>
      <p class="subtitle">通用多源地图、坐标拾取、空间电子围栏与轨迹回放基础设施 (Port: 3019)</p>
    </header>

    <nav class="board-nav">
      <button :class="{ active: activeTab === 'board1' }" @click="activeTab = 'board1'">
        看板 1：多源底图与瓦片预设
      </button>
      <button :class="{ active: activeTab === 'board2' }" @click="activeTab = 'board2'">
        看板 2：坐标拾取与逆地理纠偏
      </button>
      <button :class="{ active: activeTab === 'board3' }" @click="activeTab = 'board3'">
        看板 3：空间电子围栏与越界告警
      </button>
      <button :class="{ active: activeTab === 'board4' }" @click="activeTab = 'board4'">
        看板 4：历史轨迹回放与海量点聚合
      </button>
    </nav>

    <main class="board-viewport">
      <!-- 看板 1: 多源底图与瓦片预设 -->
      <section v-if="activeTab === 'board1'" class="board-card">
        <div class="card-header">
          <h2>多源底图与瓦片预设看板</h2>
          <div class="toolbar">
            <label class="control-label">瓦片图层：</label>
            <select v-model="selectedPreset" class="select-box">
              <option v-for="item in presetOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </select>

            <button
              class="btn-toggle"
              :class="{ active: darkTheme }"
              @click="darkTheme = !darkTheme"
            >
              {{ darkTheme ? '🌙 暗黑滤镜开启' : '☀️ 浅色明亮模式' }}
            </button>

            <button class="btn-action" @click="handleInvalidateSize">📐 视口几何自愈</button>
          </div>
        </div>

        <div class="city-selector">
          <span class="label">快捷城市：</span>
          <button
            v-for="city in cityOptions"
            :key="city.label"
            class="city-chip"
            @click="setCity(city.point)"
          >
            {{ city.label }}
          </button>
        </div>

        <div class="map-container-layout">
          <div class="map-wrapper">
            <AtengMap
              ref="mapRef"
              v-model:center="currentCenter"
              v-model:zoom="currentZoom"
              :tile-url="selectedPreset"
              :dark="darkTheme"
              @ready="onMapReady"
              @map-click="onMapClick"
              @map-move-end="onMapMoveEnd"
              @map-zoom-end="onMapZoomEnd"
            />
          </div>

          <div class="log-panel">
            <div class="log-header">
              <h3>状态监视与事件流</h3>
              <span class="status-indicator" :class="{ ready: mapReady }">
                {{ mapReady ? '● 引擎在线' : '○ 加载中' }}
              </span>
            </div>
            <div class="log-meta">
              <div>
                当前中心：[{{ currentCenter.lng.toFixed(4) }}, {{ currentCenter.lat.toFixed(4) }}]
              </div>
              <div>当前缩放：Level {{ currentZoom }}</div>
            </div>
            <div class="log-list">
              <div v-for="(log, idx) in eventLogs" :key="idx" class="log-item">
                {{ log }}
              </div>
              <div v-if="eventLogs.length === 0" class="log-empty">点击或平移地图产生事件...</div>
            </div>
          </div>
        </div>
      </section>

      <!-- 看板 2: 坐标拾取与逆地理纠偏 -->
      <section v-else-if="activeTab === 'board2'" class="board-card">
        <div class="card-header">
          <h2>坐标拾取与逆地理纠偏看板</h2>
          <div class="toolbar">
            <label class="control-label">基准坐标系：</label>
            <select v-model="pickerCoordType" class="select-box">
              <option value="GCJ02">GCJ02 (国测局火星坐标)</option>
              <option value="WGS84">WGS84 (GPS/通用标准)</option>
              <option value="BD09">BD09 (百度加密坐标)</option>
            </select>

            <button
              class="btn-toggle"
              :class="{ active: pickerDark }"
              @click="pickerDark = !pickerDark"
            >
              {{ pickerDark ? '🌙 暗黑模式' : '☀️ 浅色模式' }}
            </button>
          </div>
        </div>

        <div class="map-container-layout">
          <div class="map-wrapper picker-box">
            <AtengMapPicker
              v-model="pickerCoord"
              v-model:mode="pickerMode"
              :coord-type="pickerCoordType"
              :dark="pickerDark"
              height="540px"
              @change="onPickerChange"
              @confirm="onPickerConfirm"
              @reset="onPickerReset"
            />
          </div>

          <div class="log-panel">
            <div class="log-header">
              <h3>拾取结果交付卡片</h3>
              <span class="status-indicator ready">● 选点器就绪</span>
            </div>

            <div v-if="lastPickerResult" class="result-card">
              <div class="result-title">🎯 确认交付结果</div>
              <div class="result-row">
                <span class="k">详细地址：</span>
                <span class="v highlight">{{
                  lastPickerResult.address?.formattedAddress || '无结构化地址'
                }}</span>
              </div>
              <div class="result-row">
                <span class="k">行政区划：</span>
                <span class="v">
                  {{ lastPickerResult.address?.province || '' }}
                  {{ lastPickerResult.address?.city || '' }}
                  {{ lastPickerResult.address?.district || '' }}
                </span>
              </div>
              <div class="coords-box">
                <div class="coords-header">三维坐标防漂移对照 (CoordTransform)</div>
                <div class="coord-line">
                  <span class="tag">GCJ02</span>
                  <code
                    >{{ lastPickerResult.coords.gcj02.lng.toFixed(6) }},
                    {{ lastPickerResult.coords.gcj02.lat.toFixed(6) }}</code
                  >
                </div>
                <div class="coord-line">
                  <span class="tag">WGS84</span>
                  <code
                    >{{ lastPickerResult.coords.wgs84.lng.toFixed(6) }},
                    {{ lastPickerResult.coords.wgs84.lat.toFixed(6) }}</code
                  >
                </div>
                <div class="coord-line">
                  <span class="tag">BD09</span>
                  <code
                    >{{ lastPickerResult.coords.bd09.lng.toFixed(6) }},
                    {{ lastPickerResult.coords.bd09.lat.toFixed(6) }}</code
                  >
                </div>
              </div>
            </div>

            <div v-else class="result-empty">
              请在地图上搜索或点击选点，随后点击底部【确定选择】查看解析载荷
            </div>

            <div class="log-header" style="margin-top: 14px">
              <h3>选点实时事件流</h3>
            </div>
            <div class="log-list">
              <div v-for="(log, idx) in pickerLogs" :key="idx" class="log-item">
                {{ log }}
              </div>
              <div v-if="pickerLogs.length === 0" class="log-empty">等待选点事件触发...</div>
            </div>
          </div>
        </div>
      </section>

      <!-- 看板 3: 空间电子围栏与越界告警 -->
      <section v-else-if="activeTab === 'board3'" class="board-card">
        <div class="card-header">
          <h2>空间电子围栏与越界告警看板</h2>
          <div class="toolbar">
            <button
              class="btn-action"
              :class="{ 'btn-active': isPatrolling }"
              @click="togglePatrolSimulation"
            >
              {{ isPatrolling ? '⏸ 停止巡检模拟' : '▶ 启动目标巡检模拟 (穿越围栏)' }}
            </button>
            <button
              class="btn-toggle"
              :class="{ active: fenceDark }"
              @click="fenceDark = !fenceDark"
            >
              {{ fenceDark ? '🌙 暗黑模式' : '☀️ 浅色模式' }}
            </button>
          </div>
        </div>

        <div class="map-container-layout">
          <div class="map-wrapper picker-box">
            <AtengMapFence
              v-model:fences="demoFences"
              v-model:draw-mode="fenceDrawMode"
              v-model:active-id="activeFenceId"
              :check-points="patrolPoint"
              :dark="fenceDark"
              height="540px"
              @point-enter="onPointEnter"
              @point-inside="onPointInside"
              @point-leave="onPointLeave"
            />
          </div>

          <div class="log-panel">
            <div class="log-header">
              <h3>空间入侵与告警感知看板</h3>
              <span class="status-indicator ready">
                {{ isPatrolling ? '● 模拟目标巡航中' : '○ 待机' }}
              </span>
            </div>

            <div class="patrol-info">
              <div>
                当前模拟目标坐标：<code
                  >[{{ patrolPoint.lng.toFixed(5) }}, {{ patrolPoint.lat.toFixed(5) }}]</code
                >
              </div>
              <div class="patrol-tip">目标自西向东移动，自动触发电子围栏穿透进入与离开告警</div>
            </div>

            <div class="log-header" style="margin-top: 12px">
              <h3>越界判定实时报警流</h3>
            </div>
            <div class="log-list">
              <div
                v-for="(item, idx) in fenceAlarmLogs"
                :key="idx"
                class="log-item"
                :class="'alarm-' + item.type"
              >
                <span class="log-time">[{{ item.time }}]</span> {{ item.text }}
              </div>
              <div v-if="fenceAlarmLogs.length === 0" class="log-empty">
                点击上方【启动目标巡检模拟】或在地图上手动绘制围栏产生告警...
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 看板 4: 历史轨迹回放、海量点聚合与行政区划遮罩 -->
      <section v-else-if="activeTab === 'board4'" class="board-card">
        <div class="card-header">
          <h2>历史轨迹回放、海量点聚合与行政区划遮罩看板</h2>
          <div class="toolbar">
            <div class="sub-tab-group">
              <button
                class="btn-subtab"
                :class="{ active: board4SubTab === 'track' }"
                @click="board4SubTab = 'track'"
              >
                🚀 历史轨迹平滑回放
              </button>
              <button
                class="btn-subtab"
                :class="{ active: board4SubTab === 'cluster' }"
                @click="board4SubTab = 'cluster'"
              >
                🌐 海量点网格聚合
              </button>
              <button
                class="btn-subtab"
                :class="{ active: board4SubTab === 'mask' }"
                @click="board4SubTab = 'mask'"
              >
                🗺️ 行政区划反向遮罩
              </button>
            </div>
          </div>
        </div>

        <!-- 子场景 1: 轨迹回放 -->
        <div v-if="board4SubTab === 'track'" class="map-container-layout">
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
              <button
                class="btn-toggle"
                :class="{ active: trackDark }"
                @click="trackDark = !trackDark"
              >
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
        <div v-else-if="board4SubTab === 'cluster'" class="map-container-layout">
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
                支持墨卡托网格分桶聚合，放大到极限层级点击聚合圈自动触发 Spiderfy
                蜘蛛网环状发散扩散。
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
              <button
                class="btn-toggle"
                :class="{ active: maskDark }"
                @click="maskDark = !maskDark"
              >
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
    </main>
  </div>
</template>

<style scoped>
.sample-map-app {
  max-width: 1440px;
  margin: 0 auto;
  padding: 24px;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
  color: #1e293b;
}

.sample-header {
  margin-bottom: 24px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
}

.badge {
  background: #3b82f6;
  color: #fff;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.subtitle {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 14px;
}

.board-nav {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 8px;
}

.board-nav button {
  padding: 8px 16px;
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.board-nav button.active {
  background: #3b82f6;
  color: #fff;
  border-color: #3b82f6;
}

.board-viewport {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  min-height: 520px;
  padding: 24px;
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
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
}

.control-label {
  font-size: 14px;
  color: #475569;
}

.select-box {
  padding: 6px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 14px;
  background: #fff;
}

.btn-toggle {
  padding: 6px 14px;
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-toggle.active {
  background: #0f172a;
  color: #f8fafc;
  border-color: #0f172a;
}

.btn-action {
  padding: 6px 14px;
  border: 1px solid #cbd5e1;
  background: #f1f5f9;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-action.btn-active {
  background: #10b981;
  color: #ffffff;
  border-color: #10b981;
}

.btn-action:hover {
  background: #e2e8f0;
}

.btn-action.btn-active:hover {
  background: #059669;
}

.city-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.city-selector .label {
  font-size: 13px;
  color: #64748b;
}

.city-chip {
  padding: 4px 10px;
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 14px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.city-chip:hover {
  border-color: #3b82f6;
  color: #3b82f6;
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
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.picker-box {
  border: none;
  box-shadow: none;
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

.status-indicator {
  font-size: 12px;
  color: #94a3b8;
}

.status-indicator.ready {
  color: #10b981;
}

.log-meta {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #e2e8f0;
  line-height: 1.6;
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
  font-family: monospace;
  word-break: break-all;
}

.log-item.alarm-enter {
  background: #fef2f2;
  color: #dc2626;
  border-left: 3px solid #ef4444;
}

.log-item.alarm-inside {
  background: #eff6ff;
  color: #2563eb;
  border-left: 3px solid #3b82f6;
}

.log-item.alarm-leave {
  background: #f0fdf4;
  color: #16a34a;
  border-left: 3px solid #22c55e;
}

.log-empty {
  font-size: 12px;
  color: #94a3b8;
  text-align: center;
  padding: 20px 0;
}

.result-card {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 6px;
  padding: 12px;
  font-size: 12px;
}

.result-title {
  font-weight: 700;
  color: #166534;
  margin-bottom: 8px;
}

.result-row {
  margin-bottom: 6px;
  line-height: 1.5;
}

.result-row .k {
  color: #64748b;
}

.result-row .v.highlight {
  font-weight: 600;
  color: #0f172a;
}

.coords-box {
  margin-top: 10px;
  background: #ffffff;
  border: 1px solid #dcfce7;
  border-radius: 4px;
  padding: 8px;
}

.coords-header {
  font-size: 11px;
  font-weight: 600;
  color: #15803d;
  margin-bottom: 6px;
}

.coord-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 11px;
}

.coord-line .tag {
  background: #e2e8f0;
  padding: 1px 4px;
  border-radius: 3px;
  font-family: monospace;
}

.result-empty {
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 6px;
  padding: 16px;
  font-size: 12px;
  color: #64748b;
  text-align: center;
  line-height: 1.5;
}

.patrol-info {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 10px;
  font-size: 12px;
  line-height: 1.6;
}

.patrol-tip {
  color: #64748b;
  font-size: 11px;
  margin-top: 4px;
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
</style>
