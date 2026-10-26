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
import type { AtengVideoPlayerEmits, AtengVideoPlayerProps, IVideoPlayerEngine } from '../types';

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
  quality: () => [],
  markers: () => [],
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
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const engineRef = ref<IVideoPlayerEngine | null>(null);
const isReady = ref(false);
const errorState = ref<unknown | null>(null);

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
        customType: props.customType,
        auth: props.auth,
        probeStream: props.probeStream,
      },
      {
        onReady: eng => {
          isReady.value = true;
          emit('ready', eng);
        },
        onPlay: () => emit('play'),
        onPause: () => emit('pause'),
        onTimeUpdate: time => emit('timeupdate', time),
        onEnded: () => emit('ended'),
        onError: err => {
          const businessErr = BlobJsonGuard.toBusinessException(err);
          errorState.value = businessErr;
          emit('error', businessErr);
        },
        onFullscreen: state => emit('fullscreen', state),
        onFullscreenWeb: state => emit('fullscreenWeb', state),
      },
    );

    engineRef.value = engine;
  } catch (err: unknown) {
    const businessErr = BlobJsonGuard.toBusinessException(err);
    errorState.value = businessErr;
    emit('error', businessErr);
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
});
</script>

<template>
  <div class="at-video-player" :class="{ 'at-video-player--ready': isReady }">
    <!-- Artplayer 挂载的物理渲染容器 -->
    <div ref="containerRef" class="at-video-player__art-container"></div>

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

    <!-- ADR-0004 异常错误缺省插槽 -->
    <div v-if="formattedError" class="at-video-player__error-layer">
      <slot name="error" :error="formattedError" :retry="initPlayer">
        <div class="at-video-player__error-box">
          <span class="at-video-player__error-icon">⚠️</span>
          <p class="at-video-player__error-title">{{ formattedError.msg }}</p>
          <div class="at-video-player__error-meta">
            <span v-if="formattedError.code" class="meta-tag">Code: {{ formattedError.code }}</span>
            <span v-if="formattedError.traceId" class="meta-tag"
              >TraceId: {{ formattedError.traceId }}</span
            >
          </div>
          <button type="button" class="at-video-player__error-retry-btn" @click="initPlayer">
            重新尝试连接
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
</style>
