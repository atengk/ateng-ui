<script setup lang="ts">
/**
 * AtengMapPicker 通用地理坐标与地址拾取器。
 *
 * 遵循 ADR-0002、ADR-0009、ADR-0021、ADR-0029 与 ADR-0051 规范，
 * 封装中心十字准星与自由 Pin 标记双模选点、POI 防抖搜索、
 * 省市区街道逆地理反查与三维坐标系防漂移多态计算能力。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { ref, computed, watch } from 'vue';
import type {
  AtengMapPickerProps,
  AtengMapPickerEmits,
  GeocodeResult,
  MapCoordinate,
  MapMarker,
  PickerMode,
} from '../types';
import { DEFAULT_MAP_CENTER } from '../constants';
import AtengMap from './AtengMap.vue';
import { useMapPicker } from '../composables/use-map-picker';

const props = withDefaults(defineProps<AtengMapPickerProps>(), {
  defaultCenter: () => DEFAULT_MAP_CENTER,
  zoom: 15,
  coordType: 'GCJ02',
  mode: 'marker',
  searchDebounceMs: 300,
  dark: 'auto',
  height: '480px',
  showModeSwitch: true,
  showCopyButton: true,
  customClass: '',
});

const emit = defineEmits<AtengMapPickerEmits>();

// 内部搜索防抖定时器
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const isCopied = ref<boolean>(false);
let copyFeedbackTimer: ReturnType<typeof setTimeout> | null = null;

// 初始化无头状态机
const picker = useMapPicker({
  modelValue: () => props.modelValue,
  defaultCenter: () => props.defaultCenter,
  coordType: () => props.coordType,
  mode: () => props.mode,
  geocodeProvider: props.geocodeProvider,
  debounceMs: props.searchDebounceMs,
  onPick: res => {
    emit('update:modelValue', res.coordinate);
    emit('change', res);
  },
  onReset: () => {
    emit('reset');
  },
});

const {
  selectedCoord,
  selectedAddress,
  coordsMap,
  searchKeyword,
  searchResults,
  searching,
  geocoding,
  mode,
  setMode,
  pickCoord,
  search,
  selectSearchResult,
  getPickerResult,
  reset: resetPicker,
} = picker;

// 当前 Pin 模式下的标记点集合
const markers = computed<MapMarker[]>(() => {
  if (mode.value !== 'marker') return [];
  return [
    {
      id: 'picker-target-marker',
      coordinate: selectedCoord.value,
      title:
        selectedAddress.value?.poiName || selectedAddress.value?.formattedAddress || '选定位置',
    },
  ];
});

// 处理输入框实时输入与防抖搜索
function handleInput(e: Event) {
  const target = e.target as HTMLInputElement;
  const val = target.value;
  searchKeyword.value = val;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    search(val);
  }, props.searchDebounceMs);
}

// 清除搜索框内容
function handleClearSearch() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  searchKeyword.value = '';
  searchResults.value = [];
}

// 地图点击选点 (Marker 模式)
function handleMapClick(payload: { coordinate: MapCoordinate }) {
  if (mode.value === 'marker') {
    pickCoord(payload.coordinate, true);
  }
}

// 地图平移停止选点 (Crosshair 模式)
function handleMapMoveEnd(center: MapCoordinate) {
  if (mode.value === 'crosshair') {
    pickCoord(center, true);
  }
}

// 切换选点模式
function handleToggleMode(newMode: PickerMode) {
  setMode(newMode);
}

// 选中下拉候选项
function handleSelectCandidate(item: GeocodeResult) {
  selectSearchResult(item);
}

// 确认选择
function handleConfirm() {
  const result = getPickerResult();
  emit('confirm', result);
}

// 重置操作
function handleReset() {
  resetPicker();
}

// 一键复制当前坐标
async function handleCopyCoordinate() {
  const coord = selectedCoord.value;
  const text = `${coord.lng.toFixed(6)}, ${coord.lat.toFixed(6)}`;

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    isCopied.value = true;
    if (copyFeedbackTimer) clearTimeout(copyFeedbackTimer);
    copyFeedbackTimer = setTimeout(() => {
      isCopied.value = false;
    }, 2000);
  } catch {
    // 复制静默降级
  }
}

// 监听模式变更同步
watch(
  () => props.mode,
  val => {
    if (val && val !== mode.value) {
      setMode(val);
    }
  },
);

defineExpose({
  selectedCoord,
  selectedAddress,
  coordsMap,
  mode,
  setMode,
  pickCoord,
  search,
  getPickerResult,
  reset: handleReset,
});
</script>

<template>
  <div :class="['at-map-picker', customClass]" :style="{ height }">
    <!-- 顶部搜索与模式切换控制栏 -->
    <div class="at-map-picker__header">
      <div class="at-map-picker__search-box">
        <span class="at-map-picker__search-icon" aria-hidden="true">🔍</span>
        <input
          type="text"
          class="at-map-picker__input"
          :value="searchKeyword"
          placeholder="搜索地名、POI 建筑物或直接输入经纬度 (如 116.40, 39.90)..."
          @input="handleInput"
        />
        <button
          v-if="searchKeyword"
          type="button"
          class="at-map-picker__clear-btn"
          title="清空"
          @click="handleClearSearch"
        >
          ✕
        </button>

        <!-- 候选下拉列表 -->
        <div v-if="searchResults.length > 0 || searching" class="at-map-picker__dropdown">
          <div v-if="searching" class="at-map-picker__dropdown-loading">搜索中...</div>
          <div
            v-for="(item, idx) in searchResults"
            :key="idx"
            class="at-map-picker__dropdown-item"
            @click="handleSelectCandidate(item)"
          >
            <div class="at-map-picker__item-title">
              {{ item.poiName || item.formattedAddress }}
            </div>
            <div class="at-map-picker__item-desc">
              {{ item.formattedAddress }}
            </div>
          </div>
        </div>
      </div>

      <!-- 模式切换开关 -->
      <div v-if="showModeSwitch" class="at-map-picker__mode-toggle">
        <button
          type="button"
          class="at-map-picker__mode-btn"
          :class="{ 'is-active': mode === 'marker' }"
          @click="handleToggleMode('marker')"
        >
          📍 Pin 标记
        </button>
        <button
          type="button"
          class="at-map-picker__mode-btn"
          :class="{ 'is-active': mode === 'crosshair' }"
          @click="handleToggleMode('crosshair')"
        >
          🎯 准星十字
        </button>
      </div>
    </div>

    <!-- 地图核心工作区 -->
    <div class="at-map-picker__body">
      <AtengMap
        :center="selectedCoord"
        :zoom="zoom"
        :dark="dark"
        :tile-preset="tilePreset"
        :coord-type="coordType"
        :markers="markers"
        @map-click="handleMapClick"
        @map-move-end="handleMapMoveEnd"
      />

      <!-- 中心十字准星靶标 (Crosshair 模式) -->
      <div v-if="mode === 'crosshair'" class="at-map-picker__crosshair" aria-hidden="true">
        <svg viewBox="0 0 40 40" class="at-map-picker__crosshair-svg">
          <circle cx="20" cy="20" r="14" fill="none" stroke="currentColor" stroke-width="1.5" />
          <circle cx="20" cy="20" r="3" fill="currentColor" />
          <line x1="20" y1="0" x2="20" y2="10" stroke="currentColor" stroke-width="2" />
          <line x1="20" y1="30" x2="20" y2="40" stroke="currentColor" stroke-width="2" />
          <line x1="0" y1="20" x2="10" y2="20" stroke="currentColor" stroke-width="2" />
          <line x1="30" y1="20" x2="40" y2="20" stroke="currentColor" stroke-width="2" />
        </svg>
      </div>
    </div>

    <!-- 底部信息与操作底栏 -->
    <div class="at-map-picker__footer">
      <div class="at-map-picker__info">
        <div class="at-map-picker__coord">
          <span class="at-map-picker__coord-badge">{{ selectedCoord.coordType || coordType }}</span>
          <span class="at-map-picker__coord-text">
            经度: {{ selectedCoord.lng.toFixed(6) }}，纬度: {{ selectedCoord.lat.toFixed(6) }}
          </span>
        </div>
        <div class="at-map-picker__address" :title="selectedAddress?.formattedAddress || ''">
          <span v-if="geocoding" class="at-map-picker__loading-text">正在反查地址...</span>
          <span v-else>
            {{ selectedAddress?.formattedAddress || '正在解析当前位置...' }}
          </span>
        </div>
      </div>

      <div class="at-map-picker__actions">
        <button
          v-if="showCopyButton"
          type="button"
          class="at-map-picker__btn at-map-picker__copy-btn"
          :class="{ 'is-copied': isCopied }"
          @click="handleCopyCoordinate"
        >
          {{ isCopied ? '✓ 已复制' : '📋 复制坐标' }}
        </button>
        <button
          type="button"
          class="at-map-picker__btn at-map-picker__reset-btn"
          @click="handleReset"
        >
          重置
        </button>
        <button
          type="button"
          class="at-map-picker__btn at-map-picker__confirm-btn"
          @click="handleConfirm"
        >
          确定选择
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.at-map-picker {
  display: flex;
  flex-direction: column;
  position: relative;
  background: var(--at-map-bg, #ffffff);
  border: 1px solid var(--at-map-border, #cbd5e1);
  border-radius: 8px;
  overflow: hidden;
  box-sizing: border-box;
}

.at-map-picker__header {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  z-index: 1000;
  display: flex;
  gap: 10px;
  pointer-events: auto;
}

.at-map-picker__search-box {
  flex: 1;
  position: relative;
  background: #ffffff;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
}

.at-map-picker__search-icon {
  padding-left: 10px;
  font-size: 14px;
  color: #94a3b8;
}

.at-map-picker__input {
  flex: 1;
  padding: 8px 10px;
  border: none;
  outline: none;
  font-size: 14px;
  background: transparent;
  color: #1e293b;
}

.at-map-picker__clear-btn {
  padding: 6px 10px;
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 14px;
}

.at-map-picker__clear-btn:hover {
  color: #475569;
}

.at-map-picker__dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #ffffff;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  max-height: 240px;
  overflow-y: auto;
  z-index: 1001;
}

.at-map-picker__dropdown-loading {
  padding: 12px;
  text-align: center;
  font-size: 13px;
  color: #64748b;
}

.at-map-picker__dropdown-item {
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid #f1f5f9;
  transition: background 0.15s;
}

.at-map-picker__dropdown-item:hover {
  background: #f8fafc;
}

.at-map-picker__item-title {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.at-map-picker__item-desc {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}

.at-map-picker__mode-toggle {
  display: flex;
  background: #ffffff;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.at-map-picker__mode-btn {
  padding: 6px 12px;
  border: none;
  background: transparent;
  font-size: 13px;
  cursor: pointer;
  color: #475569;
  transition: all 0.2s;
}

.at-map-picker__mode-btn.is-active {
  background: var(--at-map-primary, #3b82f6);
  color: #ffffff;
  font-weight: 600;
}

.at-map-picker__body {
  flex: 1;
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 280px;
}

.at-map-picker__crosshair {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  z-index: 999;
  pointer-events: none;
  color: #ef4444;
}

.at-map-picker__crosshair-svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.5));
}

.at-map-picker__footer {
  background: #ffffff;
  border-top: 1px solid var(--at-map-border, #e2e8f0);
  padding: 10px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  z-index: 1000;
}

.at-map-picker__info {
  flex: 1;
  min-width: 0;
}

.at-map-picker__coord {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.at-map-picker__coord-badge {
  background: #e2e8f0;
  color: #475569;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.at-map-picker__coord-text {
  color: #0f172a;
  font-family: monospace;
}

.at-map-picker__address {
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.at-map-picker__loading-text {
  color: #3b82f6;
}

.at-map-picker__actions {
  display: flex;
  gap: 8px;
}

.at-map-picker__btn {
  padding: 6px 12px;
  font-size: 13px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.at-map-picker__btn:hover {
  background: #f8fafc;
}

.at-map-picker__copy-btn.is-copied {
  background: #10b981;
  color: #ffffff;
  border-color: #10b981;
}

.at-map-picker__confirm-btn {
  background: var(--at-map-primary, #3b82f6);
  color: #ffffff;
  border-color: var(--at-map-primary, #3b82f6);
  font-weight: 600;
}

.at-map-picker__confirm-btn:hover {
  background: #2563eb;
  border-color: #2563eb;
}
</style>
