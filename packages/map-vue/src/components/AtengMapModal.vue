<script setup lang="ts">
/**
 * AtengMapModal 轻量脱壳模态弹窗组件。
 *
 * 遵循 ADR-0002、ADR-0009、ADR-0021、ADR-0029 与 ADR-0051 规范，
 * 纯原生 Vue 3 Teleport 驱动，真全屏视口切换，100% 物理脱耦具体 UI 库。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { ref, watch, onBeforeUnmount } from 'vue';
import type { AtengMapModalProps, AtengMapModalEmits, AtengMapModalInstance } from '../types';

const props = withDefaults(defineProps<AtengMapModalProps>(), {
  modelValue: false,
  title: '地图窗口',
  width: '920px',
  height: '620px',
  fullscreen: false,
  showFullscreenBtn: true,
  showCloseBtn: true,
  showFooter: true,
  confirmText: '确定',
  cancelText: '取消',
  teleportTo: 'body',
  closeOnClickOverlay: false,
  dark: 'auto',
  customClass: '',
});

const emit = defineEmits<AtengMapModalEmits>();

const isFullscreen = ref<boolean>(props.fullscreen);

watch(
  () => props.fullscreen,
  val => {
    isFullscreen.value = val;
  },
);

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value;
  emit('update:fullscreen', isFullscreen.value);
}

function handleClose() {
  emit('update:modelValue', false);
  emit('close');
}

function handleOverlayClick() {
  if (props.closeOnClickOverlay) {
    handleClose();
  }
}

function handleCancel() {
  emit('cancel');
  handleClose();
}

function handleConfirm() {
  emit('confirm');
}

function open() {
  emit('update:modelValue', true);
  emit('open');
}

function close() {
  handleClose();
}

// 监听弹窗打开时锁定页面滚动，关闭时恢复
watch(
  () => props.modelValue,
  val => {
    if (val) {
      document.body.style.overflow = 'hidden';
      emit('open');
    } else {
      document.body.style.overflow = '';
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  document.body.style.overflow = '';
});

defineExpose<AtengMapModalInstance>({
  open,
  close,
  toggleFullscreen,
});
</script>

<template>
  <Teleport :to="teleportTo">
    <Transition name="at-map-modal-fade">
      <div
        v-if="modelValue"
        :class="['at-map-modal-mask', customClass, { 'is-dark': dark === true }]"
        @click.self="handleOverlayClick"
      >
        <div
          :class="['at-map-modal-dialog', { 'is-fullscreen': isFullscreen }]"
          :style="
            isFullscreen
              ? undefined
              : {
                  width,
                  height,
                  maxWidth: '92vw',
                  maxHeight: '92vh',
                }
          "
        >
          <!-- 弹窗头部 -->
          <div class="at-map-modal-header">
            <slot name="title">
              <span class="at-map-modal-title">{{ title }}</span>
            </slot>

            <div class="at-map-modal-actions">
              <button
                v-if="showFullscreenBtn"
                type="button"
                class="at-map-modal-icon-btn"
                :title="isFullscreen ? '还原窗口' : '全屏放大'"
                @click="toggleFullscreen"
              >
                {{ isFullscreen ? '🗗' : '⛶' }}
              </button>
              <button
                v-if="showCloseBtn"
                type="button"
                class="at-map-modal-icon-btn at-map-modal-close-btn"
                title="关闭"
                @click="handleClose"
              >
                ✕
              </button>
            </div>
          </div>

          <!-- 弹窗内容主体 -->
          <div class="at-map-modal-body">
            <slot />
          </div>

          <!-- 弹窗底部操作条 -->
          <div v-if="showFooter" class="at-map-modal-footer">
            <slot name="footer">
              <button
                type="button"
                class="at-map-modal-btn at-map-modal-btn-cancel"
                @click="handleCancel"
              >
                {{ cancelText }}
              </button>
              <button
                type="button"
                class="at-map-modal-btn at-map-modal-btn-confirm"
                @click="handleConfirm"
              >
                {{ confirmText }}
              </button>
            </slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.at-map-modal-mask {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.at-map-modal-dialog {
  display: flex;
  flex-direction: column;
  background: var(--at-map-modal-bg, #ffffff);
  border: 1px solid var(--at-map-border-color, #e2e8f0);
  border-radius: 12px;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.2),
    0 8px 10px -6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.at-map-modal-dialog.is-fullscreen {
  width: 100vw !important;
  height: 100vh !important;
  max-width: 100vw !important;
  max-height: 100vh !important;
  border-radius: 0;
  border: none;
}

.at-map-modal-header {
  padding: 12px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--at-map-border-color, #e2e8f0);
  background: var(--at-map-header-bg, #f8fafc);
}

.at-map-modal-title {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}

.at-map-modal-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.at-map-modal-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: #64748b;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.at-map-modal-icon-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.at-map-modal-close-btn:hover {
  background: #fee2e2;
  color: #ef4444;
}

.at-map-modal-body {
  flex: 1;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}

.at-map-modal-footer {
  padding: 12px 18px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  border-top: 1px solid var(--at-map-border-color, #e2e8f0);
  background: var(--at-map-footer-bg, #f8fafc);
}

.at-map-modal-btn {
  padding: 7px 16px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.at-map-modal-btn-cancel {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #475569;
}

.at-map-modal-btn-cancel:hover {
  background: #f1f5f9;
}

.at-map-modal-btn-confirm {
  border: 1px solid #2563eb;
  background: #3b82f6;
  color: #ffffff;
}

.at-map-modal-btn-confirm:hover {
  background: #2563eb;
}

/* 渐变过渡动画 */
.at-map-modal-fade-enter-active,
.at-map-modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.at-map-modal-fade-enter-from,
.at-map-modal-fade-leave-to {
  opacity: 0;
}
</style>
