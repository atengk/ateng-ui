<script setup lang="ts">
/**
 * LiveDemo: HLS / HTTP-FLV 低延迟直播与断流指数退避重连演示面板。
 *
 * 验证：
 * 1. HlsDriver HLS (.m3u8) 实时直播与自适应码率 (ABR)；
 * 2. MpegtsDriver HTTP-FLV 低延迟直播与毫秒级智能追帧 (Latency Chasing)；
 * 3. useStreamReconnect 断流指数退避重连、倒计时浮层与硬失败缺省插槽。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { ref } from 'vue';
import {
  AtengVideoPlayer,
  type AtengVideoPlayerInstance,
  type IVideoPlayerEngine,
} from '@atengk/video-player-vue';

const playerRef = ref<AtengVideoPlayerInstance | null>(null);

// 预设流媒体直播演示源
const streamPresets = [
  {
    name: 'HLS 演示直播流 (Big Buck Bunny)',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    type: 'hls' as const,
  },
  {
    name: 'HLS 音画双轨测试源',
    url: 'https://multiplatform-f.akamaihd.net/i/multi/will/bunny/big_buck_bunny_,640x360_400,640x360_700,640x360_1000,960x540_1500,1280x720_2000,1280x720_3000,.f4v.cpm/master.m3u8',
    type: 'hls' as const,
  },
  {
    name: 'HTTP-FLV 自定义流 (模拟故障源)',
    url: 'https://live-offline.example.com/live/stream.flv',
    type: 'flv' as const,
  },
];

const selectedStream = ref(streamPresets[0].url);
const streamType = ref<'auto' | 'hls' | 'flv'>('hls');
const isLive = ref(true);
const enableChasing = ref(true);
const chaseThreshold = ref(3);
const maxRetries = ref(3);
const isReconnectEnabled = ref(true);

const logs = ref<
  Array<{ time: string; type: 'info' | 'warn' | 'error' | 'success'; text: string }>
>([]);

const addLog = (type: 'info' | 'warn' | 'error' | 'success', text: string): void => {
  const time = new Date().toLocaleTimeString();
  logs.value.unshift({ time, type, text });
  if (logs.value.length > 50) {
    logs.value.pop();
  }
};

const handleSelectPreset = (preset: (typeof streamPresets)[0]): void => {
  selectedStream.value = preset.url;
  streamType.value = preset.type;
  addLog('info', `切换直播预设源: ${preset.name}`);
};

const handleCutStream = (): void => {
  selectedStream.value = 'https://mock-disconnected-stream.example.com/live.flv';
  streamType.value = 'flv';
  addLog('warn', '手动制造断流故障：注入失效直播源，触发指数退避自动重连机制');
};

const onReady = (_engine: IVideoPlayerEngine): void => {
  addLog('success', '直播流引擎握手成功，播放管道已就绪');
};

const onError = (err: unknown): void => {
  const msg = err instanceof Error ? err.message : String(err);
  addLog('error', `流传输捕获异常: ${msg}`);
};
</script>

<template>
  <div class="live-demo">
    <!-- 左侧：直播播放窗口与插槽 -->
    <div class="demo-player-col">
      <div class="player-wrapper">
        <AtengVideoPlayer
          ref="playerRef"
          :url="selectedStream"
          :type="streamType"
          :is-live="isLive"
          :live-buffer-latency-chasing="enableChasing"
          :chase-threshold="chaseThreshold"
          :reconnect="
            isReconnectEnabled
              ? {
                  maxRetries,
                  baseDelay: 1000,
                  maxDelay: 8000,
                  onRetry: (attempt, delay) => {
                    addLog('warn', `正在触发第 ${attempt} 次重试，等待延迟: ${delay}ms`);
                  },
                  onFail: () => {
                    addLog('error', '重试次数已达上限，熔断进入硬失败状态');
                  },
                }
              : false
          "
          title="低延迟流媒体实时直播"
          @ready="onReady"
          @error="onError"
        >
          <!-- 自定义硬失败状态插槽 -->
          <template #reconnect-failed="{ retry }">
            <div class="reconnect-fail-box">
              <span class="fail-icon">📡</span>
              <h4>直播信号源连接已中断</h4>
              <p>系统已尝试自动重连 {{ maxRetries }} 次，当前主播或推流网关暂时离线。</p>
              <button type="button" class="btn btn--primary" @click="retry">手动重新拉流</button>
            </div>
          </template>
        </AtengVideoPlayer>
      </div>

      <!-- 直播流切换与故障演练控制 -->
      <div class="card">
        <h4 class="card-title">流媒体直播预设源与演练</h4>
        <div class="btn-group">
          <button
            v-for="(p, idx) in streamPresets"
            :key="idx"
            type="button"
            class="btn"
            :class="{ 'btn--primary': selectedStream === p.url }"
            @click="handleSelectPreset(p)"
          >
            {{ p.name }}
          </button>
          <button type="button" class="btn btn--danger" @click="handleCutStream">
            ⚡ 模拟推流中断 (制造断流)
          </button>
        </div>
      </div>
    </div>

    <!-- 右侧：流媒体参数调节与审计日志 -->
    <div class="demo-console-col">
      <!-- 直播特性开关 -->
      <div class="card">
        <h4 class="card-title">流媒体驱动策略配置</h4>
        <div class="control-grid">
          <label class="control-item">
            <input v-model="isLive" type="checkbox" />
            <span>开启直播态标记 (isLive)</span>
          </label>
          <label class="control-item">
            <input v-model="enableChasing" type="checkbox" />
            <span>毫秒级低延迟追帧 (Latency Chasing)</span>
          </label>
          <label class="control-item">
            <input v-model="isReconnectEnabled" type="checkbox" />
            <span>指数退避断流自动重连</span>
          </label>
        </div>

        <div class="form-item">
          <span class="form-label">追帧触发门限：{{ chaseThreshold }} 秒 (积压超门限加速追平)</span>
          <input
            v-model.number="chaseThreshold"
            type="range"
            min="1"
            max="10"
            step="1"
            class="range-slider"
          />
        </div>

        <div class="form-item">
          <span class="form-label">最大重试上限：{{ maxRetries }} 次</span>
          <input
            v-model.number="maxRetries"
            type="range"
            min="1"
            max="10"
            step="1"
            class="range-slider"
          />
        </div>
      </div>

      <!-- 审计日志 -->
      <div class="card card--logs">
        <div class="card-title-row">
          <h4 class="card-title">直播解复用与重连事件流</h4>
          <button type="button" class="btn btn--sm" @click="logs = []">清屏</button>
        </div>
        <div class="log-stream">
          <div
            v-for="(item, idx) in logs"
            :key="idx"
            class="log-item"
            :class="`log-item--${item.type}`"
          >
            <span class="log-time">{{ item.time }}</span>
            <span class="log-text">{{ item.text }}</span>
          </div>
          <div v-if="logs.length === 0" class="log-empty">暂无日志，可操作左侧切换流或断流测试</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.live-demo {
  display: grid;
  grid-template-columns: 1fr 440px;
  gap: 20px;
}

@media (max-width: 1024px) {
  .live-demo {
    grid-template-columns: 1fr;
  }
}

.demo-player-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.player-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background-color: #000;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.reconnect-fail-box {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(15, 23, 42, 0.95);
  color: #fff;
  gap: 12px;
  padding: 24px;
  text-align: center;
}

.fail-icon {
  font-size: 40px;
}

.reconnect-fail-box h4 {
  margin: 0;
  font-size: 16px;
  color: #f87171;
}

.reconnect-fail-box p {
  margin: 0;
  font-size: 13px;
  color: #94a3b8;
  max-width: 360px;
}

.demo-console-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card {
  background-color: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
}

.btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.btn {
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background-color: #fff;
  color: #334155;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:hover {
  background-color: #f1f5f9;
}

.btn--primary {
  background-color: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.btn--primary:hover {
  background-color: #1d4ed8;
}

.btn--danger {
  background-color: #ef4444;
  border-color: #ef4444;
  color: #fff;
}

.btn--danger:hover {
  background-color: #dc2626;
}

.btn--sm {
  padding: 4px 8px;
  font-size: 12px;
}

.control-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.control-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #334155;
  cursor: pointer;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 12px;
  color: #64748b;
}

.range-slider {
  width: 100%;
}

.card--logs {
  flex: 1;
  min-height: 240px;
}

.log-stream {
  flex: 1;
  max-height: 280px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background-color: #0f172a;
  border-radius: 6px;
  padding: 10px;
}

.log-item {
  display: flex;
  gap: 8px;
  font-size: 12px;
  line-height: 1.4;
  font-family: monospace;
}

.log-time {
  color: #64748b;
  flex-shrink: 0;
}

.log-item--info .log-text {
  color: #94a3b8;
}

.log-item--success .log-text {
  color: #34d399;
}

.log-item--warn .log-text {
  color: #fbbf24;
}

.log-item--error .log-text {
  color: #f87171;
}

.log-empty {
  color: #64748b;
  font-size: 12px;
  text-align: center;
  padding: 40px 0;
}
</style>
