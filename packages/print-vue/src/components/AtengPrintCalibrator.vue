<script setup lang="ts">
/**
 * 预印套打毫米级走纸校准器组件。
 *
 * 提供 X/Y 轴毫米级走纸偏差测量输入、十字参考标尺测试单据输出与硬件打印机级 localStorage 持久化绑定。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref, watch, onMounted } from 'vue';
import type { AtengPrintCalibratorProps } from '../types/components';

const props = withDefaults(defineProps<AtengPrintCalibratorProps>(), {
  printerName: 'default',
  offsetX: 0,
  offsetY: 0,
  step: 0.5,
  min: -20,
  max: 20,
  autoSave: true,
  storageKeyPrefix: 'ateng_print_calibration_',
  showTestCard: true,
});

const emit = defineEmits<{
  (e: 'update:offsetX', val: number): void;
  (e: 'update:offsetY', val: number): void;
  (e: 'change', val: { offsetX: number; offsetY: number }): void;
  (e: 'save', val: { offsetX: number; offsetY: number; printerName?: string }): void;
  (e: 'reset'): void;
  (e: 'print-test'): void;
}>();

const currentX = ref<number>(props.offsetX);
const currentY = ref<number>(props.offsetY);

/** 生成当前打印机专享的 localStorage 键名 */
const getStorageKey = (): string => {
  return `${props.storageKeyPrefix}${props.printerName || 'default'}`;
};

/** 从 localStorage 恢复当前打印机的校准参数 */
const load = (): void => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  try {
    const raw = localStorage.getItem(getStorageKey());
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.offsetX === 'number' && typeof parsed?.offsetY === 'number') {
        currentX.value = parsed.offsetX;
        currentY.value = parsed.offsetY;
        notifyChange();
      }
    }
  } catch {
    // 忽略异常
  }
};

/** 将当前校准参数持久化至 localStorage */
const save = (): void => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  try {
    const data = { offsetX: currentX.value, offsetY: currentY.value };
    localStorage.setItem(getStorageKey(), JSON.stringify(data));
    emit('save', { ...data, printerName: props.printerName });
  } catch {
    // 忽略异常
  }
};

/** 重置校准偏移量 */
const reset = (): void => {
  currentX.value = 0;
  currentY.value = 0;
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(getStorageKey());
    } catch {
      // 忽略异常
    }
  }
  notifyChange();
  emit('reset');
};

/** 通知外部偏移变化 */
const notifyChange = (): void => {
  emit('update:offsetX', currentX.value);
  emit('update:offsetY', currentY.value);
  emit('change', { offsetX: currentX.value, offsetY: currentY.value });
  if (props.autoSave) {
    save();
  }
};

/** 设置偏移 */
const setOffset = (x: number, y: number): void => {
  currentX.value = Math.max(props.min, Math.min(props.max, x));
  currentY.value = Math.max(props.min, Math.min(props.max, y));
  notifyChange();
};

const getOffsets = (): { offsetX: number; offsetY: number } => {
  return {
    offsetX: currentX.value,
    offsetY: currentY.value,
  };
};

/** 步进调整水平偏移 */
const adjustX = (delta: number): void => {
  setOffset(Math.round((currentX.value + delta) * 10) / 10, currentY.value);
};

/** 步进调整垂直偏移 */
const adjustY = (delta: number): void => {
  setOffset(currentX.value, Math.round((currentY.value + delta) * 10) / 10);
};

// 监听 printerName 切换时自动加载
watch(
  () => props.printerName,
  () => {
    load();
  },
);

onMounted(() => {
  load();
});

defineExpose({
  offsetX: currentX,
  offsetY: currentY,
  setOffset,
  getOffsets,
  save,
  load,
  reset,
  printTestPage: () => emit('print-test'),
});
</script>

<template>
  <div class="at-print-calibrator">
    <!-- 校准微调控制面板 -->
    <div class="at-print-calibrator__controls">
      <div class="at-print-calibrator__header">
        <span class="at-print-calibrator__title">🎯 预印套打毫米物理校准器</span>
        <span v-if="printerName" class="at-print-calibrator__device">
          当前设备: {{ printerName }}
        </span>
      </div>

      <div class="at-print-calibrator__field">
        <label class="at-print-calibrator__label">
          X 轴水平位移: <strong>{{ currentX > 0 ? `+${currentX}` : currentX }} mm</strong>
          <span class="at-print-calibrator__tip">(正数向右，负数向左)</span>
        </label>
        <div class="at-print-calibrator__row">
          <button type="button" class="at-print-calibrator__btn" @click="adjustX(-1)">-1mm</button>
          <button type="button" class="at-print-calibrator__btn" @click="adjustX(-0.5)">
            -0.5mm
          </button>
          <input
            v-model.number="currentX"
            type="range"
            :min="min"
            :max="max"
            :step="step"
            class="at-print-calibrator__slider"
            @input="notifyChange"
          />
          <button type="button" class="at-print-calibrator__btn" @click="adjustX(0.5)">
            +0.5mm
          </button>
          <button type="button" class="at-print-calibrator__btn" @click="adjustX(1)">+1mm</button>
        </div>
      </div>

      <div class="at-print-calibrator__field">
        <label class="at-print-calibrator__label">
          Y 轴垂直位移: <strong>{{ currentY > 0 ? `+${currentY}` : currentY }} mm</strong>
          <span class="at-print-calibrator__tip">(正数向下，负数向上)</span>
        </label>
        <div class="at-print-calibrator__row">
          <button type="button" class="at-print-calibrator__btn" @click="adjustY(-1)">-1mm</button>
          <button type="button" class="at-print-calibrator__btn" @click="adjustY(-0.5)">
            -0.5mm
          </button>
          <input
            v-model.number="currentY"
            type="range"
            :min="min"
            :max="max"
            :step="step"
            class="at-print-calibrator__slider"
            @input="notifyChange"
          />
          <button type="button" class="at-print-calibrator__btn" @click="adjustY(0.5)">
            +0.5mm
          </button>
          <button type="button" class="at-print-calibrator__btn" @click="adjustY(1)">+1mm</button>
        </div>
      </div>

      <div class="at-print-calibrator__actions">
        <button type="button" class="at-print-calibrator__action-btn" @click="reset">
          重置归零 (0mm)
        </button>
        <button
          type="button"
          class="at-print-calibrator__action-btn at-print-calibrator__action-btn--primary"
          @click="emit('print-test')"
        >
          🖨️ 打印校准测试标尺页
        </button>
      </div>
    </div>

    <!-- 毫米参考十字标尺测试卡片 -->
    <div v-if="showTestCard" id="at-print-calibration-sheet" class="at-print-calibrator__test-card">
      <div class="at-print-calibrator__test-header">
        <h3>预印套打基准校对测试标尺</h3>
        <p>打印后与预印票据叠加对齐，通过透明透光测量四个十字交叉准星与标尺刻度偏差。</p>
      </div>

      <!-- 十字准星标尺 -->
      <div class="at-print-calibrator__crosshair at-print-calibrator__crosshair--top-left">
        <div class="line-h"></div>
        <div class="line-v"></div>
        <span class="mark">20mm, 20mm</span>
      </div>

      <div class="at-print-calibrator__crosshair at-print-calibrator__crosshair--center">
        <div class="line-h"></div>
        <div class="line-v"></div>
        <span class="mark">页面几何中心</span>
      </div>

      <div class="at-print-calibrator__ruler-bar">
        <div v-for="cm in 10" :key="cm" class="cm-block">
          <span class="cm-text">{{ cm }}cm</span>
          <div class="mm-ticks">
            <span v-for="mm in 10" :key="mm" class="mm-tick"></span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.at-print-calibrator {
  display: flex;
  flex-direction: column;
  gap: 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #0f172a;
}

.at-print-calibrator__controls {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
}

.at-print-calibrator__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.at-print-calibrator__title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.at-print-calibrator__device {
  font-size: 12px;
  color: #64748b;
  background-color: #e2e8f0;
  padding: 2px 8px;
  border-radius: 4px;
}

.at-print-calibrator__field {
  margin-bottom: 12px;
}

.at-print-calibrator__label {
  display: block;
  font-size: 13px;
  margin-bottom: 6px;
  color: #334155;
}

.at-print-calibrator__tip {
  font-size: 11px;
  color: #94a3b8;
  margin-left: 6px;
  font-weight: normal;
}

.at-print-calibrator__row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.at-print-calibrator__slider {
  flex: 1;
  cursor: pointer;
}

.at-print-calibrator__btn {
  background-color: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 11px;
  cursor: pointer;
  color: #334155;
  transition: all 0.15s;
}

.at-print-calibrator__btn:hover {
  background-color: #f1f5f9;
  border-color: #94a3b8;
}

.at-print-calibrator__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px dashed #cbd5e1;
}

.at-print-calibrator__action-btn {
  background-color: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  color: #475569;
}

.at-print-calibrator__action-btn:hover {
  background-color: #f1f5f9;
}

.at-print-calibrator__action-btn--primary {
  background-color: #0284c7;
  border-color: #0284c7;
  color: #ffffff;
}

.at-print-calibrator__action-btn--primary:hover {
  background-color: #0369a1;
}

/* 标尺测试卡片 */
.at-print-calibrator__test-card {
  position: relative;
  border: 1px dashed #0284c7;
  border-radius: 8px;
  padding: 24px;
  background-color: #ffffff;
  min-height: 220px;
}

.at-print-calibrator__test-header {
  text-align: center;
  margin-bottom: 24px;
}

.at-print-calibrator__test-header h3 {
  margin: 0 0 6px;
  font-size: 16px;
  color: #0f172a;
}

.at-print-calibrator__test-header p {
  margin: 0;
  font-size: 11px;
  color: #64748b;
}

.at-print-calibrator__crosshair {
  position: absolute;
  width: 40px;
  height: 40px;
}

.at-print-calibrator__crosshair .line-h {
  position: absolute;
  top: 20px;
  left: 0;
  width: 40px;
  height: 1px;
  background-color: #dc2626;
}

.at-print-calibrator__crosshair .line-v {
  position: absolute;
  top: 0;
  left: 20px;
  width: 1px;
  height: 40px;
  background-color: #dc2626;
}

.at-print-calibrator__crosshair .mark {
  position: absolute;
  top: 22px;
  left: 22px;
  font-size: 9px;
  color: #dc2626;
  white-space: nowrap;
}

.at-print-calibrator__crosshair--top-left {
  top: 20px;
  left: 20px;
}

.at-print-calibrator__crosshair--center {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.at-print-calibrator__ruler-bar {
  display: flex;
  margin-top: 40px;
  border-top: 1px solid #0f172a;
}

.cm-block {
  flex: 1;
  height: 24px;
  position: relative;
  border-right: 1px solid #0f172a;
}

.cm-text {
  position: absolute;
  top: 12px;
  left: 2px;
  font-size: 9px;
  color: #334155;
}

.mm-ticks {
  display: flex;
  height: 8px;
}

.mm-tick {
  flex: 1;
  border-right: 1px solid #94a3b8;
  height: 4px;
}

.mm-tick:nth-child(5) {
  height: 7px;
  border-right-color: #475569;
}
</style>
