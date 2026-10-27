<script setup lang="ts">
/**
 * PtzDemo: 安防云台八方向控制盘、画面手势联动与硬件加速电子放大沙箱。
 *
 * 验证：八方向罗盘操控、光学变倍/聚焦/光圈、预置位快捷调用与保存、
 * useDigitalZoom 纯前端 1.0x~5.0x 滚轮无级电子放大与防脱框平移、
 * usePtzGesture 视频画面鼠标拖拽联动云台指令、语义化指令事件解耦。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { ref } from 'vue';
import {
  AtengPtzControl,
  AtengVideoPlayer,
  useDigitalZoom,
  usePtzGesture,
  type AtengPtzControlInstance,
  type AtengVideoPlayerInstance,
  type PtzCommand,
  type PtzPresetItem,
} from '@atengk/video-player-vue';

const playerRef = ref<AtengVideoPlayerInstance | null>(null);
const ptzRef = ref<AtengPtzControlInstance | null>(null);
const videoContainerRef = ref<HTMLElement | null>(null);

// 播放源
const videoUrl = ref('https://artplayer.org/assets/sample/video.mp4');
const posterUrl = ref('https://artplayer.org/assets/sample/poster.jpg');

// 画面交互模式：'zoom' (电子放大) 或 'ptz' (手势联动云台)
const interactMode = ref<'zoom' | 'ptz'>('zoom');

// 云台配置
const ptzSpeed = ref(5);
const ptzDisabled = ref(false);
const initialPresets: PtzPresetItem[] = [
  { index: 1, name: '东门全景高清球机' },
  { index: 2, name: '西门车辆识别卡口' },
  { index: 3, name: '核心机房走廊防区' },
  { index: 4, name: '地库负一层道闸' },
];
const presets = ref<PtzPresetItem[]>([...initialPresets]);

// 1. 纯前端硬件加速电子放大状态机 (Digital Zoom)
const zoom = useDigitalZoom({
  minScale: 1.0,
  maxScale: 5.0,
  step: 0.25,
  containerRef: videoContainerRef,
});

// 2. 视频画面手势联动状态机 (PTZ Gestures)
const gesture = usePtzGesture({
  threshold: 15,
  speed: () => ptzSpeed.value,
  onCommand: cmd => {
    handleCommand(cmd, '手势联动');
  },
});

// 3. 通信指令审计日志
const commandLogs = ref<{ id: number; time: string; source: string; cmd: PtzCommand }[]>([]);
let logIdCounter = 0;

const handleCommand = (cmd: PtzCommand, source: string = '控制盘') => {
  const time = new Date().toLocaleTimeString();
  commandLogs.value.unshift({
    id: ++logIdCounter,
    time,
    source,
    cmd,
  });

  if (commandLogs.value.length > 25) {
    commandLogs.value.pop();
  }
};

const handlePresetAdd = (item: PtzPresetItem) => {
  presets.value.push(item);
  handleCommand(
    {
      action: 'preset-set',
      presetIndex: item.index,
      presetName: item.name,
      speed: ptzSpeed.value,
    },
    '新增预置位',
  );
};

const handlePresetDelete = (index: number) => {
  presets.value = presets.value.filter(p => p.index !== index);
};

// 画面鼠标事件委托分发
const onVideoMouseDown = (e: MouseEvent) => {
  if (interactMode.value === 'zoom') {
    zoom.startDrag(e);
  } else {
    gesture.handleMouseDown(e);
  }
};

const onVideoWheel = (e: WheelEvent) => {
  if (interactMode.value === 'zoom') {
    zoom.handleWheel(e);
  } else {
    gesture.handleWheel(e);
  }
};

const onVideoDblClick = () => {
  if (interactMode.value === 'zoom') {
    zoom.resetZoom();
  }
};

// 格式化输出 GB28181 模拟指令说明
const formatProtocolDesc = (cmd: PtzCommand): string => {
  switch (cmd.action) {
    case 'up':
      return `PTZCmd: 0x08 (向上) Speed: ${cmd.speed}`;
    case 'down':
      return `PTZCmd: 0x04 (向下) Speed: ${cmd.speed}`;
    case 'left':
      return `PTZCmd: 0x02 (向左) Speed: ${cmd.speed}`;
    case 'right':
      return `PTZCmd: 0x01 (向右) Speed: ${cmd.speed}`;
    case 'up-left':
      return `PTZCmd: 0x0A (左上) Speed: ${cmd.speed}`;
    case 'up-right':
      return `PTZCmd: 0x09 (右上) Speed: ${cmd.speed}`;
    case 'down-left':
      return `PTZCmd: 0x06 (左下) Speed: ${cmd.speed}`;
    case 'down-right':
      return `PTZCmd: 0x05 (右下) Speed: ${cmd.speed}`;
    case 'stop':
      return 'PTZCmd: 0x00 (停止动作)';
    case 'zoom-in':
      return `PTZCmd: 0x10 (光学放大) Speed: ${cmd.speed}`;
    case 'zoom-out':
      return `PTZCmd: 0x20 (光学缩小) Speed: ${cmd.speed}`;
    case 'focus-in':
      return `PTZCmd: 0x41 (远焦) Speed: ${cmd.speed}`;
    case 'focus-out':
      return `PTZCmd: 0x42 (近焦) Speed: ${cmd.speed}`;
    case 'iris-in':
      return `PTZCmd: 0x44 (光圈大) Speed: ${cmd.speed}`;
    case 'iris-out':
      return `PTZCmd: 0x48 (光圈小) Speed: ${cmd.speed}`;
    case 'preset-goto':
      return `PresetCmd: 0x87 (调用预置位 #${cmd.presetIndex} [${cmd.presetName}])`;
    case 'preset-set':
      return `PresetCmd: 0x81 (设置预置位 #${cmd.presetIndex} [${cmd.presetName}])`;
    case 'preset-delete':
      return `PresetCmd: 0x83 (删除预置位 #${cmd.presetIndex})`;
    default:
      return JSON.stringify(cmd);
  }
};
</script>

<template>
  <div class="ptz-demo">
    <!-- 左侧：视频播放器与手势/电子放大交互主视口 -->
    <div class="ptz-demo__main">
      <div class="ptz-demo__header-panel">
        <div class="panel-left">
          <span class="panel-title">🕹️ 安防监控云台与电子放大沙箱</span>
          <span class="panel-sub">
            协议解耦契约：组件 100% 派发语义化 @command 事件，支持无缝桥接 GB28181 / ONVIF / 自定义
            WebSocket
          </span>
        </div>
        <div class="panel-badges">
          <span class="badge badge--tech">CSS Transform 硬件加速</span>
          <span class="badge badge--scale">当前缩放: {{ zoom.scale.value.toFixed(2) }}x</span>
          <span v-if="gesture.activeAction.value" class="badge badge--action">
            手势驱动: {{ gesture.activeAction.value }}
          </span>
        </div>
      </div>

      <!-- 视频画面容器 (结合手势与电子放大) -->
      <div
        ref="videoContainerRef"
        class="ptz-demo__video-wrapper"
        @mousedown="onVideoMouseDown"
        @wheel.prevent="onVideoWheel"
        @dblclick="onVideoDblClick"
      >
        <div class="ptz-demo__zoom-layer" :style="zoom.transformStyle.value">
          <AtengVideoPlayer
            ref="playerRef"
            :url="videoUrl"
            :poster="posterUrl"
            :autoplay="false"
            :volume="0"
          />
        </div>

        <!-- 电子放大 HUD 状态悬浮浮层 -->
        <div class="ptz-hud">
          <div class="ptz-hud__scale">
            <span
              >倍率: <strong>{{ zoom.scale.value.toFixed(2) }}x</strong></span
            >
            <button
              v-if="zoom.scale.value > 1.0"
              type="button"
              class="ptz-hud__reset-btn"
              @click.stop="zoom.resetZoom"
            >
              一键复位 (1.0x)
            </button>
          </div>
          <div
            v-if="interactMode === 'ptz' && gesture.activeAction.value"
            class="ptz-hud__direction"
          >
            <span class="dir-icon">🎯</span>
            <span class="dir-text">正在向 {{ gesture.activeAction.value }} 方向巡检...</span>
          </div>
        </div>
      </div>

      <!-- 交互模式切换栏与操作提示 -->
      <div class="ptz-demo__mode-toolbar">
        <div class="mode-buttons">
          <button
            type="button"
            class="mode-btn"
            :class="{ 'mode-btn--active': interactMode === 'zoom' }"
            @click="interactMode = 'zoom'"
          >
            🔍 硬件加速电子放大模式 (1.0x~5.0x 滚轮放大 / 拖拽平移)
          </button>
          <button
            type="button"
            class="mode-btn"
            :class="{ 'mode-btn--active': interactMode === 'ptz' }"
            @click="interactMode = 'ptz'"
          >
            🕹️ 视频画面手势联动云台 (按住拖拽八方向 / 滚轮变焦)
          </button>
        </div>

        <div class="mode-tips">
          <span v-if="interactMode === 'zoom'">
            💡 <strong>电子放大模式说明</strong>：鼠标在视频画面滚动滚轮可进行 1.0x~5.0x
            无级放大；放大后可按住左键自由平移拖拽，具备防脱框边界阻尼；双击画面可一键复位。
          </span>
          <span v-else>
            💡 <strong>手势联动模式说明</strong>：按住鼠标左键并向任意方向拖拽超过
            15px，即可实时驱动云台向对应 8 个方位转动；松开鼠标自动发送
            STOP；滚动滚轮可触发光学变倍。
          </span>
        </div>
      </div>

      <!-- 实时指令流水审计面板 (模拟 GB28181/ONVIF 协议交互) -->
      <div class="ptz-demo__protocol-card">
        <div class="card-header">
          <h4>📡 云台控制指令流实时监听与报文解析 (Protocol Pipeline)</h4>
          <button type="button" class="clear-btn" @click="commandLogs = []">清空</button>
        </div>
        <div class="protocol-list">
          <div v-for="entry in commandLogs" :key="entry.id" class="protocol-item">
            <span class="item-time">[{{ entry.time }}]</span>
            <span class="item-source">[{{ entry.source }}]</span>
            <span class="item-action" :class="`action--${entry.cmd.action}`">
              {{ entry.cmd.action }}
            </span>
            <span class="item-desc">{{ formatProtocolDesc(entry.cmd) }}</span>
          </div>
          <div v-if="commandLogs.length === 0" class="protocol-empty">
            暂无指令触发，请在右侧云台罗盘点击按键或在视频画面进行手势交互...
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧：AtengPtzControl 云台控制盘面板 -->
    <aside class="ptz-demo__sidebar">
      <div class="control-box">
        <div class="control-box__title">
          <span>云台八方向控制盘</span>
          <label class="disable-toggle">
            <input v-model="ptzDisabled" type="checkbox" />
            <span>整体禁用</span>
          </label>
        </div>

        <AtengPtzControl
          ref="ptzRef"
          v-model:speed="ptzSpeed"
          :presets="presets"
          :disabled="ptzDisabled"
          :show-optical="true"
          :show-speed="true"
          :show-presets="true"
          theme-color="#38bdf8"
          @command="cmd => handleCommand(cmd, '控制盘')"
          @preset-add="handlePresetAdd"
          @preset-delete="handlePresetDelete"
        />
      </div>
    </aside>
  </div>
</template>

<style scoped>
.ptz-demo {
  display: flex;
  gap: 20px;
  width: 100%;
  min-height: 720px;
}

.ptz-demo__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #0f172a;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
  border: 1px solid #1e293b;
}

.ptz-demo__header-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #1e293b;
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #f8fafc;
  display: block;
}

.panel-sub {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 2px;
  display: block;
}

.panel-badges {
  display: flex;
  gap: 8px;
  align-items: center;
}

.badge {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  background: #1e293b;
  color: #94a3b8;
  border: 1px solid #334155;
}

.badge--tech {
  color: #38bdf8;
  border-color: #0284c7;
}

.badge--scale {
  background: rgba(14, 165, 233, 0.15);
  color: #38bdf8;
  border-color: #0ea5e9;
  font-weight: 600;
}

.badge--action {
  background: rgba(34, 197, 94, 0.2);
  color: #4ade80;
  border-color: #22c55e;
}

.ptz-demo__video-wrapper {
  position: relative;
  width: 100%;
  height: 440px;
  background: #020617;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #1e293b;
  user-select: none;
}

.ptz-demo__zoom-layer {
  width: 100%;
  height: 100%;
}

.ptz-hud {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  pointer-events: none;
  z-index: 20;
}

.ptz-hud__scale {
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(56, 189, 248, 0.3);
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  color: #f1f5f9;
  display: flex;
  align-items: center;
  gap: 8px;
  pointer-events: auto;
}

.ptz-hud__reset-btn {
  background: #0284c7;
  border: none;
  color: #fff;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 3px;
  cursor: pointer;
}

.ptz-hud__reset-btn:hover {
  background: #0369a1;
}

.ptz-hud__direction {
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(34, 197, 94, 0.4);
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  color: #4ade80;
  display: flex;
  align-items: center;
  gap: 6px;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.ptz-demo__mode-toolbar {
  margin-top: 12px;
  background: #090d16;
  border: 1px solid #1e293b;
  border-radius: 8px;
  padding: 10px 14px;
}

.mode-buttons {
  display: flex;
  gap: 10px;
}

.mode-btn {
  flex: 1;
  padding: 8px 12px;
  font-size: 12px;
  border-radius: 6px;
  border: 1px solid #334155;
  background: #1e293b;
  color: #cbd5e1;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.mode-btn:hover {
  background: #334155;
}

.mode-btn--active {
  background: rgba(14, 165, 233, 0.2);
  border-color: #0ea5e9;
  color: #38bdf8;
  font-weight: 600;
}

.mode-tips {
  margin-top: 8px;
  font-size: 11px;
  color: #94a3b8;
  line-height: 1.5;
}

.ptz-demo__protocol-card {
  margin-top: 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #090d16;
  border: 1px solid #1e293b;
  border-radius: 8px;
  padding: 12px;
  min-height: 160px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.card-header h4 {
  margin: 0;
  font-size: 13px;
  color: #e2e8f0;
}

.clear-btn {
  background: none;
  border: none;
  color: #64748b;
  font-size: 11px;
  cursor: pointer;
}

.clear-btn:hover {
  color: #94a3b8;
}

.protocol-list {
  flex: 1;
  background: #020617;
  border-radius: 4px;
  padding: 8px;
  overflow-y: auto;
  max-height: 130px;
  font-family: monospace;
  font-size: 11px;
  border: 1px solid #1e293b;
}

.protocol-item {
  display: flex;
  gap: 8px;
  align-items: center;
  line-height: 1.6;
  border-bottom: 1px solid #0f172a;
}

.item-time {
  color: #64748b;
}

.item-source {
  color: #a855f7;
}

.item-action {
  font-weight: bold;
  padding: 1px 4px;
  border-radius: 3px;
}

.action--stop {
  color: #ef4444;
}

.action--up,
.action--down,
.action--left,
.action--right,
.action--up-left,
.action--up-right,
.action--down-left,
.action--down-right {
  color: #38bdf8;
}

.action--zoom-in,
.action--zoom-out,
.action--focus-in,
.action--focus-out,
.action--iris-in,
.action--iris-out {
  color: #f59e0b;
}

.action--preset-goto,
.action--preset-set,
.action--preset-delete {
  color: #10b981;
}

.item-desc {
  color: #cbd5e1;
}

.protocol-empty {
  color: #475569;
  text-align: center;
  padding-top: 35px;
}

.ptz-demo__sidebar {
  width: 320px;
  display: flex;
  flex-direction: column;
}

.control-box {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
}

.control-box__title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #1e293b;
  font-size: 14px;
  font-weight: 600;
  color: #f1f5f9;
}

.disable-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #94a3b8;
  cursor: pointer;
}
</style>
