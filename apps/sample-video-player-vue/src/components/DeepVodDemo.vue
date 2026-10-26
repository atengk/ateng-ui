<script setup lang="ts">
/**
 * DeepVodDemo: 点播深水区特性自验演示面板。
 *
 * 验证：键盘全局快捷键体系、逐帧微调步进、时间轴打点高亮与点击跳帧、
 * 进度条缩略图悬浮卡片、以及本地播放历史记忆续播与一键重放。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { ref } from 'vue';
import {
  formatVideoTime,
  type AtengVideoPlayerInstance,
  type IVideoPlayerEngine,
  type VideoMarkerItem,
  type VideoThumbnailOptions,
} from '@atengk/video-player-vue';

const playerRef = ref<AtengVideoPlayerInstance | null>(null);
const videoUrl = ref('https://artplayer.org/assets/sample/video.mp4');
const posterUrl = ref('https://artplayer.org/assets/sample/poster.jpg');

const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const lastEventLog = ref<string[]>([]);
const currentMarker = ref<string>('未命中关键打点');

// 缩略图配置
const thumbnailConfig: VideoThumbnailOptions = {
  url: 'https://artplayer.org/assets/sample/thumbnails.png',
  number: 60,
  column: 10,
  width: 160,
  height: 90,
  scale: 1,
};

// 时间轴事件打点清单
const markers: VideoMarkerItem[] = [
  { time: 5, text: '开篇片段', color: '#38bdf8' },
  { time: 15, text: '精彩进球高光', color: '#f59e0b' },
  { time: 30, text: '战术复盘关键帧', color: '#10b981' },
  { time: 50, text: '终场采访花絮', color: '#ec4899' },
];

const log = (msg: string) => {
  const time = new Date().toLocaleTimeString();
  lastEventLog.value.unshift(`[${time}] ${msg}`);
  if (lastEventLog.value.length > 20) {
    lastEventLog.value.pop();
  }
};

const onReady = (engine: IVideoPlayerEngine) => {
  duration.value = engine.duration;
  log(`播放引擎就绪 (总时长: ${formatVideoTime(engine.duration)})`);
};

const onPlay = () => {
  isPlaying.value = true;
  log('开始播放');
};

const onPause = () => {
  isPlaying.value = false;
  log(`暂停播放 (当前位置: ${formatVideoTime(currentTime.value)})`);
};

const onTimeUpdate = (time: number) => {
  currentTime.value = Math.floor(time);
  const matched = markers.find(m => Math.abs(m.time - time) <= 1);
  if (matched) {
    currentMarker.value = `${matched.text} (${formatVideoTime(matched.time)})`;
  }
};

const onResume = (time: number) => {
  log(`✨ 成功还原历史记忆进度: ${formatVideoTime(time)}`);
};

const onMarkerClick = (marker: VideoMarkerItem) => {
  log(`🎯 点击时间轴打点: ${marker.text} (跳转至 ${formatVideoTime(marker.time)})`);
};

// 交互操作命令
const handlePlay = () => playerRef.value?.play();
const handlePause = () => playerRef.value?.pause();
const handleSeek = (seconds: number) => {
  playerRef.value?.seek(seconds);
  log(`精准 Seek 跳转至: ${formatVideoTime(seconds)}`);
};
const handleStep = (seconds: number) => {
  playerRef.value?.step(seconds);
  log(`步进微调: ${seconds > 0 ? `+${seconds}` : seconds}s`);
};
const handleStepFrame = (frames: number) => {
  playerRef.value?.stepFrame(frames, 30);
  log(`逐帧微调: ${frames > 0 ? `+${frames}` : frames} 帧`);
};
const handleReplay = async () => {
  log('点击【一键重新播放】');
  await playerRef.value?.replay();
};
const handleClearHistory = () => {
  playerRef.value?.clearPlaybackHistory();
  log('已清理当前视频本地记忆续播缓存');
};
const handleMockWriteHistory = () => {
  localStorage.setItem(
    `at_video_resume_${videoUrl.value}`,
    JSON.stringify({ time: 35, updatedAt: Date.now() }),
  );
  log('已模拟写入历史进度点 00:35（刷新或重新载入可验证自动续播）');
};
</script>

<template>
  <div class="deep-vod-demo">
    <div class="deep-vod-demo__main">
      <!-- 播放器视口 -->
      <div class="deep-vod-demo__player-box">
        <AtengVideoPlayer
          ref="playerRef"
          :url="videoUrl"
          :poster="posterUrl"
          title="点播深水区全景演练 (记忆续播/热键/打点/缩略图)"
          :auto-resume="true"
          :auto-play-resume="false"
          :markers="markers"
          :thumbnails="thumbnailConfig"
          :hotkey="true"
          theme="#38bdf8"
          @ready="onReady"
          @play="onPlay"
          @pause="onPause"
          @timeupdate="onTimeUpdate"
          @resume="onResume"
          @marker-click="onMarkerClick"
        />
      </div>

      <!-- 控制面板与特性演示区 -->
      <div class="deep-vod-demo__controls">
        <!-- 逐帧步进与精准 Seek -->
        <section class="control-card">
          <h4>⏱️ 精准 Seek 与逐帧微调步进</h4>
          <div class="btn-group">
            <button type="button" class="action-btn" @click="handlePlay">播放</button>
            <button type="button" class="action-btn" @click="handlePause">暂停</button>
            <button type="button" class="action-btn action-btn--secondary" @click="handleStep(-5)">
              ⏪ 快退 5s
            </button>
            <button type="button" class="action-btn action-btn--secondary" @click="handleStep(5)">
              ⏩ 快进 5s
            </button>
            <button
              type="button"
              class="action-btn action-btn--accent"
              @click="handleStepFrame(-1)"
            >
              ◀ 步退 1 帧
            </button>
            <button type="button" class="action-btn action-btn--accent" @click="handleStepFrame(1)">
              步进 1 帧 ▶
            </button>
          </div>
          <p class="stat-hint">
            当前播放进度：<span class="mono">{{ formatVideoTime(currentTime) }}</span> /
            <span class="mono">{{ formatVideoTime(duration) }}</span>
            &nbsp;|&nbsp; 命中事件：<span class="badge-text">{{ currentMarker }}</span>
          </p>
        </section>

        <!-- 时间轴打点事件跳帧 -->
        <section class="control-card">
          <h4>📍 时间轴打点与关键帧快速跳转 (Markers)</h4>
          <div class="marker-list">
            <button
              v-for="m in markers"
              :key="m.time"
              type="button"
              class="marker-chip"
              :style="{ borderLeftColor: m.color || '#38bdf8' }"
              @click="handleSeek(m.time)"
            >
              <span class="marker-dot" :style="{ backgroundColor: m.color || '#38bdf8' }"></span>
              <span class="marker-text">{{ m.text }}</span>
              <span class="marker-time">{{ formatVideoTime(m.time) }}</span>
            </button>
          </div>
        </section>

        <!-- 记忆续播测试与缓存管理 -->
        <section class="control-card">
          <h4>💾 本地播放历史与记忆续播 (Playback Resume)</h4>
          <div class="btn-group">
            <button type="button" class="action-btn action-btn--success" @click="handleReplay">
              🔄 从头重新播放
            </button>
            <button
              type="button"
              class="action-btn action-btn--secondary"
              @click="handleMockWriteHistory"
            >
              📝 模拟写入 00:35 历史
            </button>
            <button type="button" class="action-btn action-btn--danger" @click="handleClearHistory">
              🗑️ 清除本地续播记录
            </button>
          </div>
        </section>

        <!-- 快捷键指南 -->
        <section class="control-card control-card--hotkeys">
          <h4>⌨️ 键盘全局快捷键体系</h4>
          <div class="hotkey-grid">
            <div class="hotkey-item"><kbd>空格 Space</kbd><span>播放 / 暂停</span></div>
            <div class="hotkey-item"><kbd>← 方向左</kbd><span>快退 5 秒</span></div>
            <div class="hotkey-item"><kbd>→ 方向右</kbd><span>快进 5 秒</span></div>
            <div class="hotkey-item"><kbd>↑ / ↓</kbd><span>音量 ±10%</span></div>
            <div class="hotkey-item"><kbd>F</kbd><span>进入/退出全屏</span></div>
            <div class="hotkey-item"><kbd>M</kbd><span>静音 / 取消静音</span></div>
            <div class="hotkey-item"><kbd>[ 或 ,</kbd><span>逐帧后退 1 帧</span></div>
            <div class="hotkey-item"><kbd>] 或 .</kbd><span>逐帧前进 1 帧</span></div>
          </div>
        </section>
      </div>
    </div>

    <!-- 侧边实时事件日志 -->
    <aside class="deep-vod-demo__sidebar">
      <div class="log-panel">
        <div class="log-panel__header">
          <h3>📋 实时交互与状态机流转日志</h3>
          <button type="button" class="clear-btn" @click="lastEventLog = []">清空</button>
        </div>
        <div class="log-panel__body">
          <div v-for="(item, idx) in lastEventLog" :key="idx" class="log-item">
            {{ item }}
          </div>
          <div v-if="lastEventLog.length === 0" class="log-empty">
            暂无事件日志，请操作播放器进行交互
          </div>
        </div>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.deep-vod-demo {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 20px;
}

.deep-vod-demo__main {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.deep-vod-demo__player-box {
  width: 100%;
  height: 480px;
  background-color: #000;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.deep-vod-demo__controls {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.control-card {
  background-color: #ffffff;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.control-card h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.btn-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 6px 14px;
  background-color: #3b82f6;
  border: none;
  border-radius: 4px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background-color: #2563eb;
}

.action-btn--secondary {
  background-color: #64748b;
}

.action-btn--secondary:hover {
  background-color: #475569;
}

.action-btn--accent {
  background-color: #8b5cf6;
}

.action-btn--accent:hover {
  background-color: #7c3aed;
}

.action-btn--success {
  background-color: #10b981;
}

.action-btn--success:hover {
  background-color: #059669;
}

.action-btn--danger {
  background-color: #ef4444;
}

.action-btn--danger:hover {
  background-color: #dc2626;
}

.stat-hint {
  margin: 10px 0 0 0;
  font-size: 12px;
  color: #64748b;
}

.mono {
  font-family: monospace;
  font-weight: 600;
  color: #0284c7;
}

.badge-text {
  font-weight: 600;
  color: #f59e0b;
}

.marker-list {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.marker-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-left-width: 4px;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.marker-chip:hover {
  background-color: #f1f5f9;
  transform: translateY(-1px);
}

.marker-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.marker-text {
  font-size: 13px;
  font-weight: 500;
  color: #1e293b;
}

.marker-time {
  font-size: 11px;
  font-family: monospace;
  color: #64748b;
  background-color: #e2e8f0;
  padding: 1px 6px;
  border-radius: 4px;
}

.hotkey-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.hotkey-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #475569;
}

kbd {
  background-color: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 2px 6px;
  font-family: monospace;
  font-size: 11px;
  color: #0f172a;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.deep-vod-demo__sidebar {
  display: flex;
  flex-direction: column;
}

.log-panel {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  height: 100%;
  min-height: 400px;
  display: flex;
  flex-direction: column;
}

.log-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
}

.log-panel__header h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}

.clear-btn {
  background: none;
  border: none;
  color: #64748b;
  font-size: 12px;
  cursor: pointer;
}

.clear-btn:hover {
  color: #0f172a;
}

.log-panel__body {
  padding: 12px;
  flex: 1;
  overflow-y: auto;
  font-family: monospace;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.log-item {
  padding: 4px 8px;
  background-color: #f8fafc;
  border-radius: 4px;
  color: #334155;
  line-height: 1.4;
  word-break: break-all;
}

.log-empty {
  color: #94a3b8;
  text-align: center;
  margin-top: 40px;
}
</style>
