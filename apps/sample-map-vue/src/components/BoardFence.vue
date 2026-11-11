<script setup lang="ts">
/**
 * BoardFence 看板 3：空间电子围栏与越界告警看板。
 *
 * 遵循工业级组件设计与样式隔离规范。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { ref, onBeforeUnmount } from 'vue';
import {
  AtengMapFence,
  type MapCoordinate,
  type FenceRecord,
  type FenceDrawMode,
  type FenceAlarmPayload,
} from '@atengk/map-vue';

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

const activeFenceId = ref<string | number | null>('fence-circle-01');
const fenceDrawMode = ref<FenceDrawMode>('none');
const fenceDark = ref<boolean>(false);
const isPatrolling = ref<boolean>(false);
const patrolPoint = ref<MapCoordinate>({ lng: 116.395, lat: 39.9042 });
const fenceAlarmLogs = ref<Array<{ time: string; text: string; type: string }>>([]);

let patrolInterval: ReturnType<typeof setInterval> | null = null;

function logFenceAlarm(type: 'enter' | 'inside' | 'leave', text: string) {
  const time = new Date().toLocaleTimeString();
  fenceAlarmLogs.value.unshift({ time, text, type });
  if (fenceAlarmLogs.value.length > 20) {
    fenceAlarmLogs.value.pop();
  }
}

function onPointEnter(p: FenceAlarmPayload) {
  logFenceAlarm('enter', `🚨 [入侵报警] 巡检目标已穿透进入围栏【${p.fence.name}】！`);
}

function onPointInside(p: FenceAlarmPayload) {
  logFenceAlarm('inside', `⚠️ [滞留监视] 目标持续位于【${p.fence.name}】内部`);
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

onBeforeUnmount(() => {
  if (patrolInterval) {
    clearInterval(patrolInterval);
    patrolInterval = null;
  }
});
</script>

<template>
  <section class="board-card">
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
        <button class="btn-toggle" :class="{ active: fenceDark }" @click="fenceDark = !fenceDark">
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

.btn-action.btn-active {
  background: #ef4444;
  color: #ffffff;
  border-color: #dc2626;
  font-weight: 600;
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

.status-indicator {
  font-size: 12px;
  color: #94a3b8;
}

.status-indicator.ready {
  color: #10b981;
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

.log-list {
  flex: 1;
  overflow-y: auto;
  max-height: 380px;
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
  border-left: 3px solid #cbd5e1;
  word-break: break-all;
}

.log-item.alarm-enter {
  border-left-color: #ef4444;
  background: #fef2f2;
}

.log-item.alarm-inside {
  border-left-color: #f59e0b;
  background: #fffbeb;
}

.log-item.alarm-leave {
  border-left-color: #10b981;
  background: #f0fdf4;
}

.log-empty {
  font-size: 12px;
  color: #94a3b8;
  text-align: center;
  padding: 24px 0;
}
</style>
