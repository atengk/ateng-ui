<script setup lang="ts">
/**
 * BoardPicker 看板 2：坐标拾取与逆地理纠偏看板。
 *
 * 遵循工业级组件设计与样式隔离规范。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { ref } from 'vue';
import {
  AtengMapPicker,
  type MapCoordinate,
  type PickerResult,
  type PickerMode,
  type CoordType,
} from '@atengk/map-vue';

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
</script>

<template>
  <section class="board-card">
    <div class="card-header">
      <h2>坐标拾取与逆地理纠偏看板</h2>
      <div class="toolbar">
        <label class="control-label">选点模式：</label>
        <select v-model="pickerMode" class="select-box">
          <option value="marker">📍 自由图钉拖拽 (marker)</option>
          <option value="crosshair">🎯 中心十字准星 (crosshair)</option>
        </select>

        <label class="control-label">输出坐标系：</label>
        <select v-model="pickerCoordType" class="select-box">
          <option value="GCJ02">GCJ02 (国测局火星坐标)</option>
          <option value="WGS84">WGS84 (GPS/OSM 国际标准)</option>
          <option value="BD09">BD09 (百度二次加密)</option>
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
          :mode="pickerMode"
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
          <h3>坐标与逆地理反查结果</h3>
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

.control-label {
  font-size: 13px;
  color: #475569;
}

.select-box {
  padding: 6px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 13px;
  background: #fff;
  cursor: pointer;
}

.btn-toggle {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
  transition: all 0.15s;
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

.result-card {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 6px;
  padding: 12px;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.result-title {
  font-weight: 600;
  color: #166534;
  margin-bottom: 4px;
}

.result-row {
  display: flex;
  line-height: 1.5;
}

.result-row .k {
  color: #64748b;
  width: 70px;
  flex-shrink: 0;
}

.result-row .v {
  color: #1e293b;
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
  border-left: 3px solid #10b981;
  word-break: break-all;
}

.log-empty {
  font-size: 12px;
  color: #94a3b8;
  text-align: center;
  padding: 24px 0;
}
</style>
