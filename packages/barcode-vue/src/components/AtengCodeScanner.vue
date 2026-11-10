<script setup lang="ts">
/**
 * @atengk/barcode-vue AtengCodeScanner 核心表现容器。
 *
 * 依据 ADR-0047，提供摄像头视觉扫码、长宽比构型自适应、激光扫码线动画、
 * 手电筒补光与镜头翻转控制，具备确定性硬件生命周期管理。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref, onMounted, watch } from 'vue';
import type { ScanResult, ScannerCameraDevice, AtengCodeScannerProps } from '../types/scanner';
import { useCodeScanner } from '../composables/useCodeScanner';

export type { AtengCodeScannerProps };

const props = withDefaults(defineProps<AtengCodeScannerProps>(), {
  scanMode: 'all',
  facingMode: 'environment',
  cameraId: undefined,
  fps: 10,
  aspectRatio: undefined,
  qrbox: undefined,
  autoStart: true,
  showControls: true,
  showTorchButton: true,
  showSwitchCameraButton: true,
  showLaser: true,
  loadingText: '正在启动摄像头扫码器...',
});

const emit = defineEmits<{
  (e: 'scan', result: ScanResult): void;
  (e: 'error', error: Error): void;
  (e: 'cameraReady', cameras: ScannerCameraDevice[]): void;
}>();

const viewportRef = ref<HTMLDivElement | null>(null);

const {
  isScanning,
  isLoading,
  isPaused,
  torchActive,
  torchSupported,
  cameras,
  currentCameraId,
  error,
  start: internalStart,
  stop,
  pause,
  resume,
  toggleTorch,
  switchCamera: internalSwitchCamera,
  getCameras,
} = useCodeScanner({
  onScan: result => emit('scan', result),
  onError: err => emit('error', err),
});

/** 启动当前容器上的扫码 */
const start = async (): Promise<void> => {
  if (!viewportRef.value) {
    return;
  }
  await internalStart(viewportRef.value, {
    scanMode: props.scanMode,
    facingMode: props.facingMode,
    cameraId: props.cameraId,
    fps: props.fps,
    aspectRatio: props.aspectRatio,
    qrbox: props.qrbox,
  });
};

/** 翻转摄像头朝向 */
const flipCamera = async (): Promise<void> => {
  const nextFacing = props.facingMode === 'environment' ? 'user' : 'environment';
  await internalSwitchCamera(nextFacing);
};

onMounted(async () => {
  const devs = await getCameras();
  emit('cameraReady', devs);

  if (props.autoStart && viewportRef.value) {
    try {
      await start();
    } catch {
      // 错误已由 emit('error') 派发
    }
  }
});

// 监听 scanMode 等核心属性动态切换
watch(
  () => [props.scanMode, props.cameraId, props.facingMode],
  async () => {
    if (isScanning.value && viewportRef.value) {
      await start();
    }
  },
);

defineExpose({
  isScanning,
  isLoading,
  isPaused,
  torchActive,
  torchSupported,
  cameras,
  currentCameraId,
  error,
  start,
  stop,
  pause,
  resume,
  toggleTorch,
  switchCamera: internalSwitchCamera,
  getCameras,
  flipCamera,
});
</script>

<template>
  <div
    class="at-code-scanner"
    :class="[
      `at-code-scanner--${scanMode}`,
      {
        'is-scanning': isScanning,
        'is-paused': isPaused,
        'is-loading': isLoading,
      },
    ]"
  >
    <!-- 底层摄像头渲染视口容器 -->
    <div ref="viewportRef" class="at-code-scanner__viewport"></div>

    <!-- 加载等待提示 -->
    <div v-if="isLoading" class="at-code-scanner__loading">
      <slot name="loading">
        <div class="at-code-scanner__spinner"></div>
        <span class="at-code-scanner__loading-text">{{ loadingText }}</span>
      </slot>
    </div>

    <!-- 异常降级展示 -->
    <div v-if="error && !isScanning" class="at-code-scanner__error">
      <slot name="error" :error="error">
        <div class="at-code-scanner__error-content">
          <span class="at-code-scanner__error-icon">⚠️</span>
          <p class="at-code-scanner__error-message">{{ error.message }}</p>
        </div>
      </slot>
    </div>

    <!-- 取景覆盖层与动态激光线 -->
    <div v-if="isScanning" class="at-code-scanner__overlay">
      <slot name="overlay">
        <div
          v-if="showLaser && !isPaused"
          class="at-code-scanner__laser"
          :class="`at-code-scanner__laser--${scanMode}`"
        ></div>
      </slot>
    </div>

    <!-- 内建轻量操作工具栏 -->
    <div v-if="showControls && isScanning" class="at-code-scanner__toolbar">
      <button
        v-if="showTorchButton && torchSupported"
        type="button"
        class="at-code-scanner__tool-btn"
        :class="{ 'is-active': torchActive }"
        title="手电筒补光"
        @click="toggleTorch"
      >
        💡
      </button>

      <button
        v-if="showSwitchCameraButton"
        type="button"
        class="at-code-scanner__tool-btn"
        title="翻转摄像头"
        @click="flipCamera"
      >
        🔄
      </button>

      <button
        type="button"
        class="at-code-scanner__tool-btn"
        :title="isPaused ? '恢复扫描' : '暂停扫描'"
        @click="isPaused ? resume() : pause()"
      >
        {{ isPaused ? '▶️' : '⏸️' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.at-code-scanner {
  position: relative;
  display: inline-block;
  width: 100%;
  max-width: 640px;
  min-height: 280px;
  background-color: var(--at-code-scanner-bg, #000000);
  border-radius: var(--at-code-scanner-radius, 8px);
  overflow: hidden;
  box-sizing: border-box;
}

.at-code-scanner__viewport {
  width: 100%;
  height: 100%;
  min-height: 280px;
}

/* 覆盖层与激光线动画 */
.at-code-scanner__overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.at-code-scanner__laser {
  position: absolute;
  left: 10%;
  right: 10%;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--at-code-scanner-laser-color, #10b981) 50%,
    transparent 100%
  );
  box-shadow: 0 0 8px var(--at-code-scanner-laser-color, #10b981);
  animation: at-scanner-scan-v 2s ease-in-out infinite alternate;
}

.at-code-scanner__laser--barcode {
  left: 15%;
  right: 15%;
  animation: at-scanner-scan-narrow 1.6s ease-in-out infinite alternate;
}

@keyframes at-scanner-scan-v {
  0% {
    top: 20%;
  }
  100% {
    top: 80%;
  }
}

@keyframes at-scanner-scan-narrow {
  0% {
    top: 35%;
  }
  100% {
    top: 65%;
  }
}

/* 加载与错误状态 */
.at-code-scanner__loading,
.at-code-scanner__error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--at-code-scanner-overlay, rgba(0, 0, 0, 0.75));
  color: #ffffff;
  z-index: 10;
  padding: 16px;
  text-align: center;
}

.at-code-scanner__spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top-color: var(--at-code-scanner-laser-color, #10b981);
  border-radius: 50%;
  animation: at-scanner-spin 0.8s linear infinite;
  margin-bottom: 12px;
}

@keyframes at-scanner-spin {
  to {
    transform: rotate(360deg);
  }
}

.at-code-scanner__loading-text {
  font-size: 14px;
}

.at-code-scanner__error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.at-code-scanner__error-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.at-code-scanner__error-message {
  font-size: 14px;
  color: #ff6b6b;
  margin: 0;
}

/* 浮动操作栏 */
.at-code-scanner__toolbar {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  padding: 6px 14px;
  border-radius: 20px;
  z-index: 15;
}

.at-code-scanner__tool-btn {
  background: transparent;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
  color: #ffffff;
}

.at-code-scanner__tool-btn:hover {
  background-color: rgba(255, 255, 255, 0.15);
}

.at-code-scanner__tool-btn.is-active {
  background-color: var(--at-code-scanner-laser-color, #10b981);
}
</style>
