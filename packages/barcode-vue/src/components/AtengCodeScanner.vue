<script setup lang="ts">
/**
 * @atengk/barcode-vue AtengCodeScanner 核心表现容器。
 *
 * 依据 ADR-0047，提供摄像头视觉扫码、长宽比构型自适应、激光扫码线动画、
 * 手电筒补光与镜头翻转控制，具备确定性硬件生命周期管理；
 * 支持流水线连续去重扫码、文件拖拽/剪贴板解码与 Web Audio 原生蜂鸣反馈。
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
  interactionMode: 'continuous',
  duplicateIntervalMs: 1500,
  beepFeedback: true,
  vibrateFeedback: true,
  facingMode: 'environment',
  cameraId: undefined,
  fps: 10,
  aspectRatio: undefined,
  qrbox: undefined,
  autoStart: true,
  enableDrop: true,
  enablePaste: true,
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
const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const isPulsing = ref(false);

const {
  isScanning,
  isLoading,
  isPaused,
  torchActive,
  torchSupported,
  cameras,
  currentCameraId,
  error,
  lastScannedResult,
  totalScannedCount,
  start: internalStart,
  stop,
  pause,
  resume,
  toggleTorch,
  switchCamera: internalSwitchCamera,
  getCameras,
  decodeFile: internalDecodeFile,
  resetDeduplication,
} = useCodeScanner({
  onScan: result => {
    isPulsing.value = true;
    setTimeout(() => {
      isPulsing.value = false;
    }, 600);
    emit('scan', result);
  },
  onError: err => emit('error', err),
});

/** 启动当前容器上的扫码 */
const start = async (): Promise<void> => {
  if (!viewportRef.value) {
    return;
  }
  await internalStart(viewportRef.value, {
    scanMode: props.scanMode,
    interactionMode: props.interactionMode,
    duplicateIntervalMs: props.duplicateIntervalMs,
    beepFeedback: props.beepFeedback,
    vibrateFeedback: props.vibrateFeedback,
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

/** 触发文件上传框选择图片 */
const triggerFileInput = (): void => {
  fileInputRef.value?.click();
};

/** 本地文件解码 API 透传 */
const decodeFile = async (fileOrBlob: File | Blob): Promise<ScanResult> => {
  return internalDecodeFile(fileOrBlob);
};

/** 处理选择本地文件事件 */
const handleFileInputChange = async (event: Event): Promise<void> => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    try {
      await decodeFile(file);
    } finally {
      target.value = '';
    }
  }
};

/** 处理拖拽文件 drop 事件 */
const handleDrop = async (event: DragEvent): Promise<void> => {
  isDragging.value = false;
  if (!props.enableDrop) {
    return;
  }
  const file = event.dataTransfer?.files?.[0];
  if (file && file.type.startsWith('image/')) {
    await decodeFile(file);
  }
};

/** 处理剪贴板粘贴 paste 事件 */
const handlePaste = async (event: ClipboardEvent): Promise<void> => {
  if (!props.enablePaste) {
    return;
  }
  const items = event.clipboardData?.items;
  if (!items) {
    return;
  }
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) {
        await decodeFile(file);
        break;
      }
    }
  }
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
  () => [props.scanMode, props.cameraId, props.facingMode, props.interactionMode],
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
  lastScannedResult,
  totalScannedCount,
  start,
  stop,
  pause,
  resume,
  toggleTorch,
  switchCamera: internalSwitchCamera,
  getCameras,
  flipCamera,
  decodeFile,
  resetDeduplication,
  triggerFileInput,
});
</script>

<template>
  <div
    class="at-code-scanner"
    tabindex="0"
    :class="[
      `at-code-scanner--${scanMode}`,
      {
        'is-scanning': isScanning,
        'is-paused': isPaused,
        'is-loading': isLoading,
        'is-dragging': isDragging,
        'is-pulsing': isPulsing,
      },
    ]"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="handleDrop"
    @paste="handlePaste"
  >
    <!-- 隐藏的文件上传 input -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      class="at-code-scanner__file-input"
      @change="handleFileInputChange"
    />

    <!-- 底层摄像头渲染视口容器 -->
    <div ref="viewportRef" class="at-code-scanner__viewport"></div>

    <!-- 拖拽提示遮罩 -->
    <div v-if="isDragging" class="at-code-scanner__drop-mask">
      <span class="at-code-scanner__drop-icon">📥</span>
      <p class="at-code-scanner__drop-text">释放图片以静默解码条码</p>
    </div>

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

    <!-- 扫码成功高亮脉冲框 -->
    <div v-if="isPulsing" class="at-code-scanner__pulse-box"></div>

    <!-- 累计件数徽章 -->
    <div v-if="totalScannedCount > 0" class="at-code-scanner__badge" title="累计扫描成功件数">
      {{ totalScannedCount }}
    </div>

    <!-- 内建轻量操作工具栏 -->
    <div v-if="showControls" class="at-code-scanner__toolbar">
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
        title="选择本地图片解码"
        @click="triggerFileInput"
      >
        📁
      </button>

      <button
        v-if="isScanning"
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
  outline: none;
  transition: box-shadow 0.2s ease;
}

.at-code-scanner:focus-visible {
  box-shadow: 0 0 0 2px var(--at-code-scanner-laser-color, #10b981);
}

.at-code-scanner__file-input {
  display: none;
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

/* 扫码成功脉冲边框与件数徽章 */
.at-code-scanner__pulse-box {
  position: absolute;
  inset: 4px;
  border: 3px solid var(--at-code-scanner-laser-color, #10b981);
  border-radius: var(--at-code-scanner-radius, 8px);
  pointer-events: none;
  animation: at-scanner-pulse 0.6s ease-out forwards;
}

@keyframes at-scanner-pulse {
  0% {
    opacity: 1;
    transform: scale(0.98);
  }
  100% {
    opacity: 0;
    transform: scale(1.02);
  }
}

.at-code-scanner__badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: var(--at-code-scanner-laser-color, #10b981);
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  z-index: 12;
}

/* 拖拽提示 */
.at-code-scanner__drop-mask {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(16, 185, 129, 0.85);
  color: #ffffff;
  z-index: 20;
  pointer-events: none;
}

.at-code-scanner__drop-icon {
  font-size: 40px;
  margin-bottom: 8px;
}

.at-code-scanner__drop-text {
  font-size: 15px;
  font-weight: 600;
  margin: 0;
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
