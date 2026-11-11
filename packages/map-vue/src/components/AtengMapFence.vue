<script setup lang="ts">
/**
 * AtengMapFence 空间电子围栏交互与越界判定容器。
 *
 * 遵循 ADR-0002、ADR-0009、ADR-0021、ADR-0029 与 ADR-0051 规范，
 * 封装圆形、多边形与矩形可视化标绘、物理面积/半径实时标尺与高精度点位越界感知引擎。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { watch } from 'vue';
import type {
  AtengMapFenceProps,
  AtengMapFenceEmits,
  FenceDrawMode,
  MapCoordinate,
} from '../types';
import { DEFAULT_MAP_CENTER } from '../constants';
import AtengMap from './AtengMap.vue';
import { useMapFence } from '../composables/use-map-fence';

const props = withDefaults(defineProps<AtengMapFenceProps>(), {
  fences: () => [],
  center: () => DEFAULT_MAP_CENTER,
  zoom: 14,
  dark: 'auto',
  height: '520px',
  activeId: null,
  drawMode: 'none',
  editable: true,
  showRuler: true,
  customClass: '',
});

const emit = defineEmits<AtengMapFenceEmits>();

// 初始化无头状态机
const fenceState = useMapFence({
  initialFences: () => props.fences,
  drawMode: () => props.drawMode,
  activeId: () => props.activeId,
  onFenceCreate: f => {
    emit('update:fences', [...fences.value]);
    emit('fenceCreate', f);
  },
  onFenceUpdate: f => {
    emit('update:fences', [...fences.value]);
    emit('fenceUpdate', f);
  },
  onFenceDelete: id => {
    emit('update:fences', [...fences.value]);
    emit('fenceDelete', id);
  },
  onFenceSelect: f => {
    emit('update:activeId', f?.id ?? null);
    emit('fenceSelect', f);
  },
  onPointEnter: p => emit('pointEnter', p),
  onPointLeave: p => emit('pointLeave', p),
  onPointInside: p => emit('pointInside', p),
});

const {
  fences,
  activeId,
  drawMode,
  drawingPoints,
  setDrawMode,
  addDrawingPoint,
  finishDrawing: finishDraw,
  cancelDrawing: cancelDraw,
  addFence,
  updateFence,
  removeFence,
  clearFences: clearAll,
  selectFence,
  checkPoint,
} = fenceState;

// 格式化物理面积与半径
function formatArea(sqm?: number): string {
  if (!sqm || sqm <= 0) return '0 ㎡';
  if (sqm >= 1_000_000) {
    return `${(sqm / 1_000_000).toFixed(2)} km²`;
  }
  return `${Math.round(sqm)} ㎡`;
}

function formatRadius(m?: number): string {
  if (!m || m <= 0) return '0 m';
  if (m >= 1_000) {
    return `${(m / 1_000).toFixed(2)} km`;
  }
  return `${Math.round(m)} m`;
}

// 切换标绘模式
function handleSetMode(mode: FenceDrawMode) {
  setDrawMode(mode);
  emit('update:drawMode', mode);
}

// 地图点击：标绘中添加顶点
function handleMapClick(payload: { coordinate: MapCoordinate }) {
  if (drawMode.value !== 'none') {
    addDrawingPoint(payload.coordinate);
    // 圆形标绘在收集 2 个点（圆心与边缘）后可直接完成
    if (drawMode.value === 'circle' && drawingPoints.value.length >= 2) {
      handleFinishDrawing();
    }
  }
}

// 完成标绘
function handleFinishDrawing() {
  const created = finishDraw();
  if (created) {
    emit('update:drawMode', 'none');
  }
}

// 取消标绘
function handleCancelDrawing() {
  cancelDraw();
  emit('update:drawMode', 'none');
}

// 聚焦围栏卡片
function handleSelectFence(id: string | number) {
  selectFence(id);
}

// 删除指定围栏
function handleDeleteFence(id: string | number) {
  removeFence(id);
}

// 清空所有围栏
function handleClearAll() {
  clearAll();
  emit('update:fences', []);
}

// 监听外部巡检点位流传入
watch(
  () => props.checkPoints,
  points => {
    if (!points) return;
    if (Array.isArray(points)) {
      points.forEach(pt => checkPoint(pt));
    } else {
      checkPoint(points);
    }
  },
  { deep: true, immediate: true },
);

defineExpose({
  fences,
  activeId,
  drawMode,
  setDrawMode: handleSetMode,
  addDrawingPoint,
  finishDrawing: handleFinishDrawing,
  cancelDrawing: handleCancelDrawing,
  addFence,
  updateFence,
  removeFence,
  clearFences: handleClearAll,
  selectFence,
  checkPoint,
});
</script>

<template>
  <div :class="['at-map-fence', customClass]" :style="{ height }">
    <!-- 顶部标绘与管理工具栏 -->
    <div class="at-map-fence__toolbar">
      <div class="at-map-fence__draw-btns">
        <button
          type="button"
          class="at-map-fence__btn at-map-fence__btn--mode"
          :class="{ 'is-active': drawMode === 'circle' }"
          @click="handleSetMode('circle')"
        >
          ⭕ 标绘圆形
        </button>
        <button
          type="button"
          class="at-map-fence__btn at-map-fence__btn--mode"
          :class="{ 'is-active': drawMode === 'polygon' }"
          @click="handleSetMode('polygon')"
        >
          ⬡ 标绘多边形
        </button>
        <button
          type="button"
          class="at-map-fence__btn at-map-fence__btn--mode"
          :class="{ 'is-active': drawMode === 'rectangle' }"
          @click="handleSetMode('rectangle')"
        >
          ▭ 标绘矩形
        </button>
      </div>

      <!-- 标绘中提示与控制按钮 -->
      <div v-if="drawMode !== 'none'" class="at-map-fence__drawing-tip">
        <span class="tip-text">
          {{
            drawMode === 'circle'
              ? '请在地图上点击 2 次确定圆心与半径边缘...'
              : `正在标绘，已添加 ${drawingPoints.length} 个顶点...`
          }}
        </span>
        <button
          v-if="drawMode !== 'circle' && drawingPoints.length >= 3"
          type="button"
          class="at-map-fence__finish-btn"
          @click="handleFinishDrawing"
        >
          ✓ 完成标绘
        </button>
        <button type="button" class="at-map-fence__cancel-btn" @click="handleCancelDrawing">
          ✕ 取消
        </button>
      </div>

      <div v-else class="at-map-fence__extra-btns">
        <button
          v-if="fences.length > 0"
          type="button"
          class="at-map-fence__btn at-map-fence__clear-btn"
          @click="handleClearAll"
        >
          🗑 清空围栏
        </button>
      </div>
    </div>

    <!-- 地图视口与空间围栏叠加区 -->
    <div class="at-map-fence__viewport">
      <AtengMap
        :center="center"
        :zoom="zoom"
        :dark="dark"
        :tile-url="typeof tilePreset === 'string' ? tilePreset : undefined"
        @map-click="handleMapClick"
      />

      <!-- 侧边围栏列表卡片 (浮动侧栏) -->
      <div v-if="fences.length > 0" class="at-map-fence__sidebar">
        <div class="at-map-fence__sidebar-title">
          <span>空间电子围栏 ({{ fences.length }})</span>
        </div>
        <div class="at-map-fence__card-list">
          <div
            v-for="fence in fences"
            :key="fence.id"
            class="at-map-fence__card"
            :class="{ 'is-active': fence.id === activeId }"
            @click="handleSelectFence(fence.id)"
          >
            <div class="at-map-fence__card-header">
              <span class="shape-badge">{{ fence.shape }}</span>
              <span class="fence-name">{{ fence.name || '未命名围栏' }}</span>
              <button
                type="button"
                class="at-map-fence__del-btn"
                title="删除"
                @click.stop="handleDeleteFence(fence.id)"
              >
                ✕
              </button>
            </div>
            <div v-if="showRuler" class="at-map-fence__ruler-info">
              <span v-if="fence.shape === 'circle'">半径：{{ formatRadius(fence.radius) }}</span>
              <span v-if="fence.area">面积：{{ formatArea(fence.area) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.at-map-fence {
  display: flex;
  flex-direction: column;
  position: relative;
  background: var(--at-map-bg, #ffffff);
  border: 1px solid var(--at-map-border, #cbd5e1);
  border-radius: 8px;
  overflow: hidden;
  box-sizing: border-box;
}

.at-map-fence__toolbar {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  z-index: 1000;
  display: flex;
  justify-content: space-between;
  align-items: center;
  pointer-events: auto;
  gap: 10px;
}

.at-map-fence__draw-btns {
  display: flex;
  background: #ffffff;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.at-map-fence__btn {
  padding: 6px 12px;
  border: none;
  background: transparent;
  font-size: 13px;
  cursor: pointer;
  color: #475569;
  transition: all 0.2s;
}

.at-map-fence__btn:hover {
  background: #f8fafc;
}

.at-map-fence__btn--mode.is-active {
  background: var(--at-map-primary, #3b82f6);
  color: #ffffff;
  font-weight: 600;
}

.at-map-fence__drawing-tip {
  background: #ffffff;
  border-radius: 6px;
  padding: 4px 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #2563eb;
}

.at-map-fence__finish-btn {
  padding: 4px 10px;
  background: #10b981;
  color: #ffffff;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  font-weight: 600;
}

.at-map-fence__cancel-btn {
  padding: 4px 8px;
  background: #f1f5f9;
  color: #64748b;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.at-map-fence__clear-btn {
  background: #ffffff;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  color: #ef4444;
}

.at-map-fence__viewport {
  flex: 1;
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 320px;
}

.at-map-fence__sidebar {
  position: absolute;
  top: 60px;
  right: 12px;
  width: 260px;
  max-height: calc(100% - 72px);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(4px);
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.at-map-fence__sidebar-title {
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  border-bottom: 1px solid #f1f5f9;
}

.at-map-fence__card-list {
  padding: 8px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.at-map-fence__card {
  padding: 8px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.15s;
}

.at-map-fence__card:hover {
  border-color: #3b82f6;
}

.at-map-fence__card.is-active {
  border-color: #3b82f6;
  background: #eff6ff;
}

.at-map-fence__card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.shape-badge {
  font-size: 10px;
  background: #e2e8f0;
  color: #475569;
  padding: 1px 4px;
  border-radius: 3px;
  text-transform: uppercase;
}

.fence-name {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.at-map-fence__del-btn {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 13px;
  padding: 2px 4px;
}

.at-map-fence__del-btn:hover {
  color: #ef4444;
}

.at-map-fence__ruler-info {
  margin-top: 4px;
  font-size: 11px;
  color: #64748b;
  display: flex;
  gap: 8px;
}
</style>
