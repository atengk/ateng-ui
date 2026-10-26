<script setup lang="ts">
/**
 * AtengVideoPlayer 单路音视频与流媒体播放核心容器组件。
 *
 * 内置纯 CSS/SVG 现代控制栏、缓冲进度感知与状态反馈，支持插槽全量定制，
 * 专职处理 MP4/WebM 点播、HLS/FLV 低延迟直播及全屏安全水印渲染。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ArtplayerEngine } from '../engine/ArtplayerEngine';
import { BlobJsonGuard } from '../security';
import { useStreamReconnect } from '../composables/useStreamReconnect';
import { useVideoPlaybackHistory } from '../composables/useVideoPlaybackHistory';
import type {
  AtengVideoPlayerEmits,
  AtengVideoPlayerProps,
  IVideoPlayerEngine,
  StreamReconnectOptions,
} from '../types';

const props = withDefaults(defineProps<AtengVideoPlayerProps>(), {
  type: 'auto',
  poster: '',
  title: '',
  autoplay: false,
  muted: false,
  loop: false,
  volume: 0.7,
  playbackRates: () => [0.5, 0.75, 1.0, 1.25, 1.5, 2.0],
  pip: true,
  fullscreen: true,
  fullscreenWeb: true,
  miniProgressBar: true,
  theme: '#409EFF',
  hotkey: true,
  screenshot: true,
  auth: true,
  probeStream: false,
  isLive: false,
  liveBufferLatencyChasing: true,
  chaseThreshold: 3,
  reconnect: false,
  quality: () => [],
  markers: () => [],
  thumbnails: undefined,
  autoResume: false,
  autoPlayResume: false,
  customType: undefined,
});

const emit = defineEmits<AtengVideoPlayerEmits>();

defineSlots<{
  /**
   * 默认插槽：挂载于播放器容器内的自由图层。
   */
  default?: (props: { engine: IVideoPlayerEngine | null }) => unknown;
  /**
   * 顶部覆盖层插槽（常用于展示自定义标题栏、返回键或状态指示）。
   */
  top?: (props: { engine: IVideoPlayerEngine | null; title: string }) => unknown;
  /**
   * 底部覆盖层插槽。
   */
  bottom?: (props: { engine: IVideoPlayerEngine | null }) => unknown;
  /**
   * 安全水印专用插槽。
   */
  watermark?: (props: { engine: IVideoPlayerEngine | null }) => unknown;
  /**
   * 异常错误缺省插槽。
   */
  error?: (props: { error: unknown; retry: () => void }) => unknown;
  /**
   * 重连达到最大上限硬失败时的插槽。
   */
  'reconnect-failed'?: (props: { error: unknown; retry: () => void }) => unknown;
  /**
   * 记忆续播浮层提示插槽。
   */
  'resume-prompt'?: (props: {
    time: number;
    formattedTime: string;
    replay: () => void;
    close: () => void;
  }) => unknown;
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const engineRef = ref<IVideoPlayerEngine | null>(null);
const isReady = ref(false);
const errorState = ref<unknown | null>(null);

// 记忆续播状态机
const historyState = useVideoPlaybackHistory(
  () => props.url,
  () => props.autoResume,
  () => props.autoPlayResume,
);

// 直播流判定
const isLiveStream = computed(() => {
  return (
    props.isLive ||
    props.type === 'flv' ||
    (props.url.includes('.m3u8') && props.isLive) ||
    props.url.includes('.flv')
  );
});

// 断流重连状态机装配
const reconnectConfig = computed<StreamReconnectOptions>(() => {
  if (typeof props.reconnect === 'object') {
    return props.reconnect;
  }
  return {};
});

const reconnectState = useStreamReconnect(reconnectConfig.value, async () => {
  await initPlayer();
});

const formattedError = computed(() => {
  if (!errorState.value) {
    return null;
  }
  return BlobJsonGuard.toBusinessException(errorState.value);
});

/**
 * 初始化底层播放引擎。
 */
const initPlayer = async (): Promise<void> => {
  if (!containerRef.value) {
    return;
  }

  // 1. 若存量已存在引擎实例，先彻底销毁清理（六步防线）
  destroyPlayer();

  try {
    errorState.value = null;

    // 2. 若开启前置流媒体双态探测，主动检测 401/403/500 JSON 异常
    if (props.probeStream && props.url) {
      await BlobJsonGuard.probeMediaStream(props.url, {
        auth: props.auth,
      });
    }

    const engine = new ArtplayerEngine(
      containerRef.value,
      {
        url: props.url,
        type: props.type,
        poster: props.poster,
        title: props.title,
        autoplay: props.autoplay,
        muted: props.muted,
        loop: props.loop,
        volume: props.volume,
        playbackRates: props.playbackRates,
        pip: props.pip,
        fullscreen: props.fullscreen,
        fullscreenWeb: props.fullscreenWeb,
        miniProgressBar: props.miniProgressBar,
        theme: props.theme,
        hotkey: props.hotkey,
        screenshot: props.screenshot,
        quality: props.quality,
        markers: props.markers,
        thumbnails: props.thumbnails,
        customType: props.customType,
        auth: props.auth,
        probeStream: props.probeStream,
        isLive: isLiveStream.value,
        liveBufferLatencyChasing: props.liveBufferLatencyChasing,
        chaseThreshold: props.chaseThreshold,
      },
      {
        onReady: eng => {
          isReady.value = true;
          // 连接成功重置重连状态
          reconnectState.reset();

          // 记忆续播尝试恢复
          const restored = historyState.checkAndApplyResume(eng, eng.duration);
          if (restored !== null) {
            emit('resume', restored);
          }

          emit('ready', eng);
        },
        onPlay: () => emit('play'),
        onPause: () => {
          if (engineRef.value) {
            historyState.saveProgress(engineRef.value.currentTime, engineRef.value.duration);
          }
          emit('pause');
        },
        onTimeUpdate: time => {
          if (engineRef.value) {
            historyState.saveProgress(time, engineRef.value.duration);
          }
          emit('timeupdate', time);
        },
        onEnded: () => {
          historyState.clearHistory();
          emit('ended');
        },
        onError: err => {
          const businessErr = BlobJsonGuard.toBusinessException(err);
          errorState.value = businessErr;
          emit('error', businessErr);

          // 若开启重连且未达上限，触发自动指数退避重试
          if (props.reconnect !== false && !reconnectState.hasFailed.value) {
            reconnectState.triggerReconnect(businessErr);
          }
        },
        onFullscreen: state => emit('fullscreen', state),
        onFullscreenWeb: state => emit('fullscreenWeb', state),
        onMarkerClick: marker => {
          emit('marker-click', marker);
          emit('markerClick', marker);
        },
      },
    );

    engineRef.value = engine;
  } catch (err: unknown) {
    const businessErr = BlobJsonGuard.toBusinessException(err);
    errorState.value = businessErr;
    emit('error', businessErr);

    if (props.reconnect !== false && !reconnectState.hasFailed.value) {
      reconnectState.triggerReconnect(businessErr);
    }
  }
};

/**
 * 确定性销毁当前播放器内核（固化确定性销毁六步防线）。
 */
const destroyPlayer = (): void => {
  if (engineRef.value) {
    engineRef.value.destroy();
    engineRef.value = null;
  }
  isReady.value = false;
};

/**
 * 从头重新开始播放并关闭续播提示条。
 */
const handleReplayFromBeginning = async (): Promise<void> => {
  historyState.closePrompt();
  if (engineRef.value) {
    engineRef.value.seek(0);
    await engineRef.value.play();
  }
};

// 监听 URL 变化平滑切流
watch(
  () => props.url,
  newUrl => {
    if (engineRef.value && newUrl) {
      void engineRef.value.switchUrl(newUrl, props.type);
    }
  },
);

onMounted(() => {
  void initPlayer();
});

onBeforeUnmount(() => {
  destroyPlayer();
});

/**
 * 对外暴露的命令式门面。
 */
defineExpose({
  get engine(): IVideoPlayerEngine | null {
    return engineRef.value;
  },
  play: async (): Promise<void> => {
    await engineRef.value?.play();
  },
  pause: (): void => {
    engineRef.value?.pause();
  },
  toggle: (): void => {
    engineRef.value?.toggle();
  },
  seek: (time: number): void => {
    engineRef.value?.seek(time);
  },
  step: (seconds: number): void => {
    engineRef.value?.step(seconds);
  },
  stepFrame: (frames = 1, fps = 30): void => {
    engineRef.value?.stepFrame(frames, fps);
  },
  setVolume: (vol: number): void => {
    engineRef.value?.setVolume(vol);
  },
  setMuted: (muted: boolean): void => {
    engineRef.value?.setMuted(muted);
  },
  setPlaybackRate: (rate: number): void => {
    engineRef.value?.setPlaybackRate(rate);
  },
  screenshot: async (): Promise<string> => {
    return (await engineRef.value?.screenshot()) ?? '';
  },
  enterFullscreen: (): void => {
    engineRef.value?.enterFullscreen();
  },
  exitFullscreen: (): void => {
    engineRef.value?.exitFullscreen();
  },
  toggleFullscreen: (): void => {
    engineRef.value?.toggleFullscreen();
  },
  enterWebFullscreen: (): void => {
    engineRef.value?.enterWebFullscreen();
  },
  exitWebFullscreen: (): void => {
    engineRef.value?.exitWebFullscreen();
  },
  toggleWebFullscreen: (): void => {
    engineRef.value?.toggleWebFullscreen();
  },
  destroy: (): void => {
    destroyPlayer();
  },
  retry: (): void => {
    void initPlayer();
  },
  clearPlaybackHistory: (): void => {
    historyState.clearHistory();
  },
  replay: async (): Promise<void> => {
    await handleReplayFromBeginning();
  },
});
</script>

<template>
  <div class="at-video-player" :class="{ 'at-video-player--ready': isReady }">
    <!-- Artplayer 挂载的物理渲染容器 -->
    <div ref="containerRef" class="at-video-player__art-container"></div>

    <!-- 实时直播状态徽标 -->
    <div v-if="isLiveStream" class="at-video-player__live-badge">
      <span class="live-pulse"></span>
      <span class="live-text">实时直播</span>
    </div>

    <!-- 记忆续播浮层提示卡片 -->
    <transition name="at-banner-fade">
      <div v-if="historyState.showPrompt.value" class="at-video-player__resume-banner">
        <slot
          v-if="$slots['resume-prompt']"
          name="resume-prompt"
          :time="historyState.resumeTime.value"
          :formatted-time="historyState.formattedResumeTime.value"
          :replay="handleReplayFromBeginning"
          :close="historyState.closePrompt"
        ></slot>
        <div v-else class="at-video-player__resume-inner">
          <span class="at-video-player__resume-icon">⏱️</span>
          <span class="at-video-player__resume-text">
            已恢复上次播放进度 {{ historyState.formattedResumeTime.value }}
          </span>
          <button
            type="button"
            class="at-video-player__resume-btn"
            @click="handleReplayFromBeginning"
          >
            重新播放
          </button>
          <button
            type="button"
            class="at-video-player__resume-close"
            aria-label="关闭提示"
            @click="historyState.closePrompt"
          >
            ✕
          </button>
        </div>
      </div>
    </transition>

    <!-- 顶部插槽浮层 -->
    <div v-if="$slots.top" class="at-video-player__overlay at-video-player__overlay--top">
      <slot name="top" :engine="engineRef" :title="title"></slot>
    </div>

    <!-- 底部插槽浮层 -->
    <div v-if="$slots.bottom" class="at-video-player__overlay at-video-player__overlay--bottom">
      <slot name="bottom" :engine="engineRef"></slot>
    </div>

    <!-- 安全防录屏水印插槽 -->
    <div v-if="$slots.watermark" class="at-video-player__watermark-layer">
      <slot name="watermark" :engine="engineRef"></slot>
    </div>

    <!-- 默认自由插槽图层 -->
    <slot :engine="engineRef"></slot>

    <!-- 断流自动指数退避重连状态浮层 -->
    <div v-if="reconnectState.isReconnecting.value" class="at-video-player__reconnect-layer">
      <div class="at-video-player__reconnect-box">
        <span class="reconnect-spinner"></span>
        <p class="reconnect-text">
          网络连接中断，正在第 {{ reconnectState.retryCount.value + 1 }} 次自动重连...
        </p>
        <span class="reconnect-timer">
          倒计时 {{ (reconnectState.remainingTime.value / 1000).toFixed(1) }}s
        </span>
      </div>
    </div>

    <!-- ADR-0004 异常错误缺省插槽与重连硬失败插槽 -->
    <div
      v-else-if="
        formattedError && (!reconnectState.isReconnecting.value || reconnectState.hasFailed.value)
      "
      class="at-video-player__error-layer"
    >
      <slot
        v-if="reconnectState.hasFailed.value && $slots['reconnect-failed']"
        name="reconnect-failed"
        :error="formattedError"
        :retry="reconnectState.manualRetry"
      ></slot>
      <slot v-else name="error" :error="formattedError" :retry="initPlayer">
        <div class="at-video-player__error-box">
          <span class="at-video-player__error-icon">⚠️</span>
          <p class="at-video-player__error-title">{{ formattedError.msg }}</p>
          <div class="at-video-player__error-meta">
            <span v-if="formattedError.code" class="meta-tag">Code: {{ formattedError.code }}</span>
            <span v-if="formattedError.traceId" class="meta-tag"
              >TraceId: {{ formattedError.traceId }}</span
            >
          </div>
          <button
            type="button"
            class="at-video-player__error-retry-btn"
            @click="reconnectState.hasFailed.value ? reconnectState.manualRetry() : initPlayer()"
          >
            {{ reconnectState.hasFailed.value ? '已达最大重连次数，点击手动重试' : '重新尝试连接' }}
          </button>
        </div>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.at-video-player {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 200px;
  background-color: var(--at-video-player-bg, #000000);
  overflow: hidden;
  user-select: none;
  display: flex;
  flex-direction: column;
}

.at-video-player__art-container {
  width: 100%;
  height: 100%;
  flex: 1;
}

.at-video-player__overlay {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 20;
  pointer-events: none;
}

.at-video-player__overlay--top {
  top: 0;
}

.at-video-player__overlay--bottom {
  bottom: 0;
}

.at-video-player__watermark-layer {
  position: absolute;
  inset: 0;
  z-index: 30;
  pointer-events: none;
}

.at-video-player__error-layer {
  position: absolute;
  inset: 0;
  z-index: 40;
  background-color: rgba(15, 23, 42, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.at-video-player__error-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
  max-width: 420px;
  color: #ffffff;
}

.at-video-player__error-icon {
  font-size: 36px;
}

.at-video-player__error-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #f87171;
  line-height: 1.5;
}

.at-video-player__error-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.meta-tag {
  font-size: 11px;
  background-color: rgba(255, 255, 255, 0.12);
  color: #94a3b8;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: monospace;
}

.at-video-player__error-retry-btn {
  margin-top: 8px;
  background-color: #3b82f6;
  border: none;
  color: #ffffff;
  padding: 6px 16px;
  font-size: 13px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.at-video-player__error-retry-btn:hover {
  background-color: #2563eb;
}

.at-video-player__live-badge {
  position: absolute;
  top: 14px;
  left: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  background-color: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  border-radius: 4px;
  z-index: 20;
  pointer-events: none;
}

.live-pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #ef4444;
  box-shadow: 0 0 8px #ef4444;
  animation: live-pulse-anim 1.5s infinite;
}

@keyframes live-pulse-anim {
  0% {
    transform: scale(0.95);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
  100% {
    transform: scale(0.95);
    opacity: 0.8;
  }
}

.live-text {
  font-size: 11px;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: 0.5px;
}

.at-video-player__reconnect-layer {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(3px);
  z-index: 25;
}

.at-video-player__reconnect-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: #ffffff;
  text-align: center;
}

.reconnect-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.reconnect-text {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: #e2e8f0;
}

.reconnect-timer {
  font-size: 12px;
  color: #94a3b8;
  font-family: monospace;
}

/* 记忆续播浮层提示卡片样式 */
.at-video-player__resume-banner {
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 35;
  pointer-events: auto;
}

.at-video-player__resume-inner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px;
  background-color: rgba(15, 23, 42, 0.88);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
  color: #f8fafc;
  font-size: 13px;
}

.at-video-player__resume-icon {
  font-size: 14px;
}

.at-video-player__resume-text {
  font-weight: 500;
  letter-spacing: 0.2px;
}

.at-video-player__resume-btn {
  background: none;
  border: none;
  color: #38bdf8;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.2s;
}

.at-video-player__resume-btn:hover {
  color: #7dd3fc;
  background-color: rgba(56, 189, 248, 0.15);
}

.at-video-player__resume-close {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
  padding: 2px 4px;
  line-height: 1;
  border-radius: 50%;
  transition: color 0.2s;
}

.at-video-player__resume-close:hover {
  color: #f1f5f9;
}

/* 渐隐过渡动画 */
.at-banner-fade-enter-active,
.at-banner-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.at-banner-fade-enter-from,
.at-banner-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -10px);
}
</style>
