<script setup lang="ts">
/**
 * @atengk/barcode-vue AtengCodeScannerModal 轻量脱壳扫码弹窗容器。
 *
 * 依据 ADR-0047，纯原生 CSS 变量 + Vue Teleport 驱动，完全解耦 Element Plus，
 * 可直接在无任何 UI 库环境下独立运行；支持自愈关闭、对角框线与毛玻璃暗黑遮罩。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref, computed } from 'vue';
import type { ScanResult, AtengCodeScannerModalProps } from '../types/scanner';
import AtengCodeScanner from './AtengCodeScanner.vue';

defineOptions({
  name: 'AtengCodeScannerModal',
});

const props = withDefaults(defineProps<AtengCodeScannerModalProps>(), {
  modelValue: false,
  title: '扫码识别',
  scanMode: 'all',
  autoCloseOnSuccess: true,
  teleportTo: 'body',
  closeOnClickModal: true,
  width: '540px',
  facingMode: 'environment',
  cameraId: undefined,
  fps: 10,
  duplicateIntervalMs: 1500,
  beepFeedback: true,
  vibrateFeedback: true,
  enableDrop: true,
  enablePaste: true,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'scan', result: ScanResult): void;
  (e: 'close'): void;
}>();

const scannerRef = ref<InstanceType<typeof AtengCodeScanner> | null>(null);

const dialogWidth = computed(() => {
  return typeof props.width === 'number' ? `${props.width}px` : props.width;
});

const handleClose = (): void => {
  emit('update:modelValue', false);
  emit('close');
};

const handleMaskClick = (): void => {
  if (props.closeOnClickModal) {
    handleClose();
  }
};

const handleScan = (result: ScanResult): void => {
  emit('scan', result);
  if (props.autoCloseOnSuccess) {
    handleClose();
  }
};

defineExpose({
  scannerRef,
  close: handleClose,
});
</script>

<template>
  <Teleport :to="teleportTo">
    <Transition name="at-modal-fade">
      <div v-if="modelValue" class="at-code-scanner-modal" @click.self="handleMaskClick">
        <!-- 弹窗主体卡片 -->
        <div class="at-code-scanner-modal__dialog" :style="{ maxWidth: dialogWidth }">
          <!-- 四角对角框线装饰 -->
          <span class="at-code-scanner-modal__corner at-code-scanner-modal__corner--tl"></span>
          <span class="at-code-scanner-modal__corner at-code-scanner-modal__corner--tr"></span>
          <span class="at-code-scanner-modal__corner at-code-scanner-modal__corner--bl"></span>
          <span class="at-code-scanner-modal__corner at-code-scanner-modal__corner--br"></span>

          <!-- 弹窗标题栏 -->
          <div class="at-code-scanner-modal__header">
            <slot name="header">
              <span class="at-code-scanner-modal__title">{{ title }}</span>
            </slot>
            <button
              type="button"
              class="at-code-scanner-modal__close-btn"
              title="关闭弹窗"
              @click="handleClose"
            >
              ✕
            </button>
          </div>

          <!-- 弹窗主体视口 -->
          <div class="at-code-scanner-modal__body">
            <AtengCodeScanner
              ref="scannerRef"
              :scan-mode="scanMode"
              :facing-mode="facingMode"
              :camera-id="cameraId"
              :fps="fps"
              :duplicate-interval-ms="duplicateIntervalMs"
              :beep-feedback="beepFeedback"
              :vibrate-feedback="vibrateFeedback"
              :enable-drop="enableDrop"
              :enable-paste="enablePaste"
              :auto-start="true"
              @scan="handleScan"
            />
          </div>

          <!-- 弹窗底部插槽 -->
          <div v-if="$slots.footer" class="at-code-scanner-modal__footer">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.at-code-scanner-modal {
  position: fixed;
  inset: 0;
  z-index: var(--at-code-scanner-modal-zindex, 2000);
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--at-code-scanner-modal-mask, rgba(0, 0, 0, 0.7));
  backdrop-filter: blur(4px);
  padding: 16px;
  box-sizing: border-box;
}

.at-code-scanner-modal__dialog {
  position: relative;
  width: 100%;
  background-color: var(--at-code-scanner-modal-bg, #111827);
  border-radius: var(--at-code-scanner-radius, 12px);
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.5),
    0 8px 10px -6px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  box-sizing: border-box;
  animation: at-modal-pop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes at-modal-pop {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

/* 四角装饰对角线 */
.at-code-scanner-modal__corner {
  position: absolute;
  width: 16px;
  height: 16px;
  border-color: var(--at-code-scanner-laser-color, #10b981);
  pointer-events: none;
  z-index: 5;
}

.at-code-scanner-modal__corner--tl {
  top: 8px;
  left: 8px;
  border-top: 2px solid;
  border-left: 2px solid;
}

.at-code-scanner-modal__corner--tr {
  top: 8px;
  right: 8px;
  border-top: 2px solid;
  border-right: 2px solid;
}

.at-code-scanner-modal__corner--bl {
  bottom: 8px;
  left: 8px;
  border-bottom: 2px solid;
  border-left: 2px solid;
}

.at-code-scanner-modal__corner--br {
  bottom: 8px;
  right: 8px;
  border-bottom: 2px solid;
  border-right: 2px solid;
}

/* 标题栏 */
.at-code-scanner-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.at-code-scanner-modal__title {
  font-size: 15px;
  font-weight: 600;
  color: #f3f4f6;
}

.at-code-scanner-modal__close-btn {
  background: transparent;
  border: none;
  color: #9ca3af;
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.at-code-scanner-modal__close-btn:hover {
  color: #ffffff;
  background-color: rgba(255, 255, 255, 0.1);
}

/* 主体与视口容器 */
.at-code-scanner-modal__body {
  padding: 16px;
  display: flex;
  justify-content: center;
}

.at-code-scanner-modal__footer {
  padding: 12px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* 过渡动画 */
.at-modal-fade-enter-active,
.at-modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.at-modal-fade-enter-from,
.at-modal-fade-leave-to {
  opacity: 0;
}
</style>
