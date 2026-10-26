<script setup lang="ts">
/**
 * AtengPtzControl 安防云台八方向控制盘与变焦面板组件。
 *
 * 提供八方向罗盘、光学变焦/聚焦/光圈调控、速度滑块及预置位管理，
 * 100% 派发语义化 @command 事件，与底层网络协议纯解耦。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { computed, ref, watch } from 'vue';
import type {
  PtzAction,
  PtzCommand,
  PtzControlEmits,
  PtzControlProps,
  PtzPresetItem,
} from '../types';

const props = withDefaults(defineProps<PtzControlProps>(), {
  speed: 5,
  minSpeed: 1,
  maxSpeed: 10,
  presets: () => [],
  disabled: false,
  showPresets: true,
  showSpeed: true,
  showOptical: true,
  themeColor: '#38bdf8',
});

const emit = defineEmits<PtzControlEmits>();

// 内部速度状态
const currentSpeed = ref<number>(props.speed);
watch(
  () => props.speed,
  val => {
    currentSpeed.value = val;
  },
);

// 新增预置位表单输入
const newPresetIndex = ref<number>(1);
const newPresetName = ref<string>('');

// 当前按下的动作状态（用于高亮反馈）
const activePressedAction = ref<PtzAction | null>(null);

/**
 * 八方向罗盘配置定义。
 */
const directionButtons: {
  action: PtzAction;
  label: string;
  gridArea: string;
  arrow: string;
}[] = [
  { action: 'up-left', label: '左上', gridArea: 'ul', arrow: '↖' },
  { action: 'up', label: '向上', gridArea: 'u', arrow: '↑' },
  { action: 'up-right', label: '右上', gridArea: 'ur', arrow: '↗' },
  { action: 'left', label: '向左', gridArea: 'l', arrow: '←' },
  { action: 'right', label: '向右', gridArea: 'r', arrow: '→' },
  { action: 'down-left', label: '左下', gridArea: 'dl', arrow: '↙' },
  { action: 'down', label: '向下', gridArea: 'd', arrow: '↓' },
  { action: 'down-right', label: '右下', gridArea: 'dr', arrow: '↘' },
];

/**
 * 发送语义化云台控制指令。
 */
const sendCommand = (action: PtzAction, extra: Partial<PtzCommand> = {}): void => {
  if (props.disabled && action !== 'stop') {
    return;
  }

  const cmd: PtzCommand = {
    action,
    speed: currentSpeed.value,
    timestamp: Date.now(),
    ...extra,
  };

  emit('command', cmd);
};

/**
 * 按钮按下：启动云台移动/调焦。
 */
const handlePressStart = (action: PtzAction): void => {
  if (props.disabled) {
    return;
  }
  activePressedAction.value = action;
  sendCommand(action);
};

/**
 * 按钮松开/移出：发送停止指令。
 */
const handlePressEnd = (action: PtzAction): void => {
  if (activePressedAction.value === action) {
    activePressedAction.value = null;
    sendCommand('stop');
  }
};

/**
 * 速度变更。
 */
const handleSpeedInput = (event: Event): void => {
  const target = event.target as HTMLInputElement;
  const val = Number(target.value);
  currentSpeed.value = val;
  emit('update:speed', val);
  emit('speed-change', val);
};

/**
 * 调用指定预置位。
 */
const handleGotoPreset = (item: PtzPresetItem): void => {
  sendCommand('preset-goto', {
    presetIndex: item.index,
    presetName: item.name,
  });
};

/**
 * 添加并保存预置位。
 */
const handleAddPreset = (): void => {
  if (!newPresetName.value.trim()) {
    newPresetName.value = `预置位 ${newPresetIndex.value}`;
  }
  const item: PtzPresetItem = {
    index: newPresetIndex.value,
    name: newPresetName.value.trim(),
  };

  sendCommand('preset-set', {
    presetIndex: item.index,
    presetName: item.name,
  });
  emit('preset-add', item);

  // 步进索引并清空别名
  newPresetIndex.value = Math.max(...props.presets.map(p => p.index), newPresetIndex.value) + 1;
  newPresetName.value = '';
};

/**
 * 删除预置位。
 */
const handleDeletePreset = (index: number): void => {
  sendCommand('preset-delete', { presetIndex: index });
  emit('preset-delete', index);
};

/**
 * 暴露的方法。
 */
const setSpeed = (spd: number): void => {
  currentSpeed.value = spd;
  emit('update:speed', spd);
  emit('speed-change', spd);
};

defineExpose({
  sendCommand,
  setSpeed,
});

const themeStyle = computed(() => ({
  '--at-ptz-theme': props.themeColor,
}));
</script>

<template>
  <div class="at-ptz-control" :class="{ 'at-ptz-control--disabled': disabled }" :style="themeStyle">
    <!-- 1. 八方向云台调谐罗盘 -->
    <div class="at-ptz-compass">
      <div class="at-ptz-compass__disc">
        <button
          v-for="btn in directionButtons"
          :key="btn.action"
          type="button"
          class="at-ptz-btn at-ptz-btn--dir"
          :class="[
            `at-ptz-btn--${btn.gridArea}`,
            { 'at-ptz-btn--active': activePressedAction === btn.action },
          ]"
          :disabled="disabled"
          :title="`${btn.label} (按住转动)`"
          @mousedown="handlePressStart(btn.action)"
          @mouseup="handlePressEnd(btn.action)"
          @mouseleave="handlePressEnd(btn.action)"
          @touchstart.prevent="handlePressStart(btn.action)"
          @touchend.prevent="handlePressEnd(btn.action)"
        >
          <span class="at-ptz-btn__arrow">{{ btn.arrow }}</span>
        </button>

        <!-- 中心停止/复位按钮 -->
        <button
          type="button"
          class="at-ptz-btn at-ptz-btn--center"
          :disabled="disabled"
          title="停止 / 复位"
          @click="sendCommand('stop')"
        >
          <span class="at-ptz-btn__stop-dot" />
        </button>
      </div>
    </div>

    <!-- 2. 光学调节按键组 (Zoom / Focus / Iris) -->
    <div v-if="showOptical" class="at-ptz-optical">
      <!-- 变倍 Zoom -->
      <div class="at-ptz-optical__group">
        <span class="at-ptz-optical__label">变倍 (Zoom)</span>
        <div class="at-ptz-optical__btns">
          <button
            type="button"
            class="at-ptz-btn at-ptz-btn--opt"
            :disabled="disabled"
            title="放大 (Zoom In)"
            @mousedown="handlePressStart('zoom-in')"
            @mouseup="handlePressEnd('zoom-in')"
            @mouseleave="handlePressEnd('zoom-in')"
            @touchstart.prevent="handlePressStart('zoom-in')"
            @touchend.prevent="handlePressEnd('zoom-in')"
          >
            <span>+</span>
          </button>
          <button
            type="button"
            class="at-ptz-btn at-ptz-btn--opt"
            :disabled="disabled"
            title="缩小 (Zoom Out)"
            @mousedown="handlePressStart('zoom-out')"
            @mouseup="handlePressEnd('zoom-out')"
            @mouseleave="handlePressEnd('zoom-out')"
            @touchstart.prevent="handlePressStart('zoom-out')"
            @touchend.prevent="handlePressEnd('zoom-out')"
          >
            <span>-</span>
          </button>
        </div>
      </div>

      <!-- 聚焦 Focus -->
      <div class="at-ptz-optical__group">
        <span class="at-ptz-optical__label">聚焦 (Focus)</span>
        <div class="at-ptz-optical__btns">
          <button
            type="button"
            class="at-ptz-btn at-ptz-btn--opt"
            :disabled="disabled"
            title="远焦 (Focus Far)"
            @mousedown="handlePressStart('focus-in')"
            @mouseup="handlePressEnd('focus-in')"
            @mouseleave="handlePressEnd('focus-in')"
            @touchstart.prevent="handlePressStart('focus-in')"
            @touchend.prevent="handlePressEnd('focus-in')"
          >
            <span>+</span>
          </button>
          <button
            type="button"
            class="at-ptz-btn at-ptz-btn--opt"
            :disabled="disabled"
            title="近焦 (Focus Near)"
            @mousedown="handlePressStart('focus-out')"
            @mouseup="handlePressEnd('focus-out')"
            @mouseleave="handlePressEnd('focus-out')"
            @touchstart.prevent="handlePressStart('focus-out')"
            @touchend.prevent="handlePressEnd('focus-out')"
          >
            <span>-</span>
          </button>
        </div>
      </div>

      <!-- 光圈 Iris -->
      <div class="at-ptz-optical__group">
        <span class="at-ptz-optical__label">光圈 (Iris)</span>
        <div class="at-ptz-optical__btns">
          <button
            type="button"
            class="at-ptz-btn at-ptz-btn--opt"
            :disabled="disabled"
            title="光圈开大 (Iris Open)"
            @mousedown="handlePressStart('iris-in')"
            @mouseup="handlePressEnd('iris-in')"
            @mouseleave="handlePressEnd('iris-in')"
            @touchstart.prevent="handlePressStart('iris-in')"
            @touchend.prevent="handlePressEnd('iris-in')"
          >
            <span>+</span>
          </button>
          <button
            type="button"
            class="at-ptz-btn at-ptz-btn--opt"
            :disabled="disabled"
            title="光圈缩小 (Iris Close)"
            @mousedown="handlePressStart('iris-out')"
            @mouseup="handlePressEnd('iris-out')"
            @mouseleave="handlePressEnd('iris-out')"
            @touchstart.prevent="handlePressStart('iris-out')"
            @touchend.prevent="handlePressEnd('iris-out')"
          >
            <span>-</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 3. 云台步进调速滑块 -->
    <div v-if="showSpeed" class="at-ptz-speed">
      <div class="at-ptz-speed__header">
        <span>云台调速:</span>
        <strong class="at-ptz-speed__val">{{ currentSpeed }} 档</strong>
      </div>
      <input
        type="range"
        class="at-ptz-speed__slider"
        :min="minSpeed"
        :max="maxSpeed"
        :value="currentSpeed"
        :disabled="disabled"
        @input="handleSpeedInput"
      />
    </div>

    <!-- 4. 预置位管理面板 -->
    <div v-if="showPresets" class="at-ptz-presets">
      <div class="at-ptz-presets__header">
        <span>预置位列表 ({{ presets.length }})</span>
      </div>

      <!-- 快速跳转列表 -->
      <div class="at-ptz-presets__list">
        <div v-for="p in presets" :key="p.index" class="at-ptz-preset-item">
          <button
            type="button"
            class="at-ptz-preset-item__call"
            :disabled="disabled"
            :title="`调用预置位: ${p.name}`"
            @click="handleGotoPreset(p)"
          >
            <span class="at-ptz-preset-item__idx">#{{ p.index }}</span>
            <span class="at-ptz-preset-item__name">{{ p.name }}</span>
          </button>
          <button
            type="button"
            class="at-ptz-preset-item__del"
            :disabled="disabled"
            title="删除此预置位"
            @click="handleDeletePreset(p.index)"
          >
            ✕
          </button>
        </div>

        <div v-if="presets.length === 0" class="at-ptz-presets__empty">暂无保存的预置位</div>
      </div>

      <!-- 添加预置位 -->
      <div class="at-ptz-presets__add-form">
        <input
          v-model.number="newPresetIndex"
          type="number"
          min="1"
          max="255"
          class="at-ptz-input at-ptz-input--idx"
          placeholder="编号"
          :disabled="disabled"
        />
        <input
          v-model="newPresetName"
          type="text"
          class="at-ptz-input at-ptz-input--name"
          placeholder="点位别名 (如: 园区东门)"
          :disabled="disabled"
          @keyup.enter="handleAddPreset"
        />
        <button
          type="button"
          class="at-ptz-btn at-ptz-btn--add"
          :disabled="disabled"
          title="将当前机位保存为预置位"
          @click="handleAddPreset"
        >
          保存
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.at-ptz-control {
  --at-ptz-theme: #38bdf8;
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 10px;
  padding: 16px;
  color: #f1f5f9;
  user-select: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  box-sizing: border-box;
}

.at-ptz-control--disabled {
  opacity: 0.5;
  pointer-events: none;
}

/* 1. 八方向罗盘 */
.at-ptz-compass {
  display: flex;
  justify-content: center;
  align-items: center;
}

.at-ptz-compass__disc {
  width: 170px;
  height: 170px;
  border-radius: 50%;
  background: radial-gradient(circle, #1e293b 0%, #090d16 100%);
  border: 2px solid #334155;
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.4),
    inset 0 0 12px rgba(0, 0, 0, 0.5);
  display: grid;
  grid-template-areas:
    'ul u ur'
    'l  c r'
    'dl d dr';
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr;
  padding: 8px;
  gap: 4px;
  box-sizing: border-box;
}

.at-ptz-btn {
  border: none;
  background: transparent;
  color: #cbd5e1;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  font-family: inherit;
}

.at-ptz-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  color: var(--at-ptz-theme);
}

.at-ptz-btn:active:not(:disabled),
.at-ptz-btn--active {
  background: rgba(56, 189, 248, 0.25) !important;
  color: var(--at-ptz-theme) !important;
  transform: scale(0.92);
}

.at-ptz-btn--dir {
  font-size: 16px;
  font-weight: bold;
}

.at-ptz-btn--ul {
  grid-area: ul;
}
.at-ptz-btn--u {
  grid-area: u;
}
.at-ptz-btn--ur {
  grid-area: ur;
}
.at-ptz-btn--l {
  grid-area: l;
}
.at-ptz-btn--r {
  grid-area: r;
}
.at-ptz-btn--dl {
  grid-area: dl;
}
.at-ptz-btn--d {
  grid-area: d;
}
.at-ptz-btn--dr {
  grid-area: dr;
}

.at-ptz-btn--center {
  grid-area: c;
  background: #1e293b;
  border-radius: 50%;
  border: 2px solid #475569;
  margin: 4px;
}

.at-ptz-btn--center:hover:not(:disabled) {
  border-color: #ef4444;
}

.at-ptz-btn__stop-dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  background: #ef4444;
}

/* 2. 光学调节按键组 */
.at-ptz-optical {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  background: #090d16;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #1e293b;
}

.at-ptz-optical__group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.at-ptz-optical__label {
  font-size: 11px;
  color: #94a3b8;
}

.at-ptz-optical__btns {
  display: flex;
  gap: 4px;
}

.at-ptz-btn--opt {
  width: 28px;
  height: 26px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 4px;
  font-size: 14px;
  font-weight: bold;
  color: #e2e8f0;
}

.at-ptz-btn--opt:hover:not(:disabled) {
  background: #334155;
  border-color: var(--at-ptz-theme);
}

/* 3. 调速滑块 */
.at-ptz-speed {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.at-ptz-speed__header {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #94a3b8;
}

.at-ptz-speed__val {
  color: var(--at-ptz-theme);
  font-weight: 600;
}

.at-ptz-speed__slider {
  width: 100%;
  accent-color: var(--at-ptz-theme);
  cursor: pointer;
}

/* 4. 预置位面板 */
.at-ptz-presets {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid #1e293b;
  padding-top: 10px;
}

.at-ptz-presets__header {
  font-size: 12px;
  font-weight: 600;
  color: #cbd5e1;
}

.at-ptz-presets__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 120px;
  overflow-y: auto;
}

.at-ptz-preset-item {
  display: flex;
  align-items: center;
  background: #1e293b;
  border-radius: 4px;
  padding: 2px 6px;
  gap: 4px;
}

.at-ptz-preset-item__call {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: #f1f5f9;
  font-size: 12px;
  cursor: pointer;
  text-align: left;
  padding: 4px 0;
}

.at-ptz-preset-item__call:hover {
  color: var(--at-ptz-theme);
}

.at-ptz-preset-item__idx {
  color: var(--at-ptz-theme);
  font-weight: bold;
}

.at-ptz-preset-item__del {
  background: none;
  border: none;
  color: #64748b;
  font-size: 12px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 3px;
}

.at-ptz-preset-item__del:hover {
  background: #ef4444;
  color: #fff;
}

.at-ptz-presets__empty {
  font-size: 11px;
  color: #64748b;
  text-align: center;
  padding: 8px 0;
}

.at-ptz-presets__add-form {
  display: flex;
  gap: 6px;
}

.at-ptz-input {
  background: #020617;
  border: 1px solid #334155;
  border-radius: 4px;
  color: #f8fafc;
  padding: 4px 6px;
  font-size: 11px;
  outline: none;
}

.at-ptz-input:focus {
  border-color: var(--at-ptz-theme);
}

.at-ptz-input--idx {
  width: 48px;
}

.at-ptz-input--name {
  flex: 1;
}

.at-ptz-btn--add {
  padding: 4px 10px;
  font-size: 11px;
  background: #0284c7;
  color: #fff;
  border-radius: 4px;
}

.at-ptz-btn--add:hover:not(:disabled) {
  background: #0369a1;
}
</style>
