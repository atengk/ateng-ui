<script setup lang="ts">
/**
 * VodDemo: 标准富媒体点播自验演示面板。
 *
 * 验证 MP4/WebM 点播、控制栏交互、倍速切换、截图导出与命令式 API 联动。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { ref } from 'vue';
import type { AtengVideoPlayerInstance, IVideoPlayerEngine } from '@atengk/video-player-vue';

const playerRef = ref<AtengVideoPlayerInstance | null>(null);
const currentUrl = ref('https://artplayer.org/assets/sample/video.mp4');
const posterUrl = ref('https://artplayer.org/assets/sample/poster.jpg');

const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const isFullscreen = ref(false);
const isWebFullscreen = ref(false);
const screenshotUrl = ref<string>('');
const screenshotTip = ref<string>('');

const onReady = (engine: IVideoPlayerEngine) => {
  duration.value = engine.duration;
};

const onPlay = () => {
  isPlaying.value = true;
};

const onPause = () => {
  isPlaying.value = false;
};

const onTimeUpdate = (time: number) => {
  currentTime.value = Math.floor(time);
};

const handlePlay = () => {
  void playerRef.value?.play();
};

const handlePause = () => {
  playerRef.value?.pause();
};

const handleSeek = (seconds: number) => {
  playerRef.value?.seek(seconds);
};

const handleVolume = (vol: number) => {
  playerRef.value?.setVolume(vol);
};

const handleSpeed = (rate: number) => {
  playerRef.value?.setPlaybackRate(rate);
};

const handleScreenshot = async () => {
  if (playerRef.value) {
    screenshotTip.value = '';
    const dataUrl = await playerRef.value.screenshot();
    if (dataUrl) {
      screenshotUrl.value = dataUrl;
    } else {
      screenshotTip.value =
        '⚠️ 当前视频源由于跨域限制未响应 CORS 授权头，浏览器原生 Canvas 触发 Tainted 安全隔离限制导出。支持同源或配置了 Access-Control-Allow-Origin: * 的视频源正常抓拍。';
    }
  }
};

const handleToggleFullscreen = () => {
  playerRef.value?.toggleFullscreen();
};

const handleToggleWebFullscreen = () => {
  playerRef.value?.toggleWebFullscreen();
};
</script>

<template>
  <div class="vod-demo">
    <div class="vod-demo__main">
      <!-- 播放器主视口 -->
      <div class="vod-demo__player-box">
        <AtengVideoPlayer
          ref="playerRef"
          :url="currentUrl"
          :poster="posterUrl"
          title="官方高清测试视频 (Artplayer Sample)"
          :autoplay="false"
          :playback-rates="[0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0]"
          theme="#1890ff"
          @ready="onReady"
          @play="onPlay"
          @pause="onPause"
          @timeupdate="onTimeUpdate"
          @fullscreen="state => (isFullscreen = state)"
          @fullscreen-web="state => (isWebFullscreen = state)"
        >
          <!-- 顶部状态插槽 -->
          <template #top="{ title }">
            <div class="vod-demo__custom-top">
              <span class="vod-demo__tag">1080P 全高清</span>
              <span class="vod-demo__title">{{ title }}</span>
            </div>
          </template>
        </AtengVideoPlayer>
      </div>

      <!-- 控制台面板 -->
      <div class="vod-demo__console">
        <h3>控制台与命令式门面联调 (Console & Commands)</h3>

        <div class="vod-demo__status-bar">
          <div class="status-pill">
            <span class="label">播放状态:</span>
            <span class="val" :class="{ 'val--active': isPlaying }">{{
              isPlaying ? '播放中 ▶' : '已暂停 ⏸'
            }}</span>
          </div>
          <div class="status-pill">
            <span class="label">时间进度:</span>
            <span class="val">{{ currentTime }}s / {{ Math.floor(duration) }}s</span>
          </div>
          <div class="status-pill">
            <span class="label">全屏状态:</span>
            <span class="val">{{
              isFullscreen ? '物理全屏' : isWebFullscreen ? '网页全屏' : '窗口'
            }}</span>
          </div>
        </div>

        <div class="vod-demo__actions">
          <div class="action-group">
            <span class="group-title">播放操作：</span>
            <button class="btn btn--primary" @click="handlePlay">播放 (Play)</button>
            <button class="btn" @click="handlePause">暂停 (Pause)</button>
          </div>

          <div class="action-group">
            <span class="group-title">精准跳转：</span>
            <button class="btn" @click="handleSeek(10)">跳转至 10s</button>
            <button class="btn" @click="handleSeek(30)">跳转至 30s</button>
            <button class="btn" @click="handleSeek(60)">跳转至 60s</button>
          </div>

          <div class="action-group">
            <span class="group-title">倍速调节：</span>
            <button class="btn" @click="handleSpeed(0.75)">0.75x</button>
            <button class="btn" @click="handleSpeed(1.0)">1.0x (正常)</button>
            <button class="btn" @click="handleSpeed(1.5)">1.5x</button>
            <button class="btn" @click="handleSpeed(2.0)">2.0x (双倍速)</button>
          </div>

          <div class="action-group">
            <span class="group-title">音量控制：</span>
            <button class="btn" @click="handleVolume(0)">静音 (0%)</button>
            <button class="btn" @click="handleVolume(0.3)">低音量 (30%)</button>
            <button class="btn" @click="handleVolume(0.8)">正常 (80%)</button>
          </div>

          <div class="action-group">
            <span class="group-title">窗口与抓拍：</span>
            <button class="btn" @click="handleToggleFullscreen">切换物理全屏</button>
            <button class="btn" @click="handleToggleWebFullscreen">切换网页全屏</button>
            <button class="btn btn--success" @click="handleScreenshot">单帧抓拍截图</button>
          </div>
        </div>

        <!-- 截图抓拍预览 -->
        <div v-if="screenshotTip" class="vod-demo__screenshot-tip">
          <p>{{ screenshotTip }}</p>
        </div>
        <div v-if="screenshotUrl" class="vod-demo__screenshot-box">
          <h4>抓拍截图结果 (Base64 Snapshot)：</h4>
          <img :src="screenshotUrl" alt="抓拍快照" class="screenshot-img" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vod-demo {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.vod-demo__main {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

@media (min-width: 1024px) {
  .vod-demo__main {
    grid-template-columns: 3fr 2fr;
  }
}

.vod-demo__player-box {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  background-color: #000;
}

.vod-demo__custom-top {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.7), transparent);
  color: #fff;
  font-size: 14px;
}

.vod-demo__tag {
  background-color: #1890ff;
  color: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
}

.vod-demo__title {
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}

.vod-demo__console {
  background-color: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.vod-demo__console h3 {
  margin: 0;
  font-size: 16px;
  color: #1f2937;
}

.vod-demo__status-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  background-color: #f8fafc;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.status-pill {
  font-size: 13px;
  display: flex;
  gap: 6px;
}

.status-pill .label {
  color: #64748b;
}

.status-pill .val {
  font-weight: 600;
  color: #0f172a;
}

.status-pill .val--active {
  color: #10b981;
}

.vod-demo__actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.group-title {
  font-size: 13px;
  color: #475569;
  min-width: 80px;
}

.btn {
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid #cbd5e1;
  background-color: #fff;
  color: #334155;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.btn--primary {
  background-color: #1890ff;
  border-color: #1890ff;
  color: #fff;
}

.btn--primary:hover {
  background-color: #40a9ff;
  color: #fff;
}

.btn--success {
  background-color: #10b981;
  border-color: #10b981;
  color: #fff;
}

.btn--success:hover {
  background-color: #059669;
  color: #fff;
}

.vod-demo__screenshot-box {
  margin-top: 12px;
  border-top: 1px dashed #e2e8f0;
  padding-top: 12px;
}

.vod-demo__screenshot-box h4 {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #475569;
}

.screenshot-img {
  max-width: 100%;
  max-height: 180px;
  border-radius: 4px;
  border: 1px solid #cbd5e1;
}

.vod-demo__screenshot-tip {
  margin-top: 12px;
  background-color: #fffbeb;
  border: 1px solid #fef3c7;
  color: #b45309;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.5;
}

.vod-demo__screenshot-tip p {
  margin: 0;
}
</style>
