<script setup lang="ts">
/**
 * 企业级弹窗交互容器组件。
 *
 * 核心特性：
 * 1. 默认开启 draggable 原生可拖拽，Header 集成全屏切换与双击快速放大/还原；
 * 2. 内部内容区默认由 el-scrollbar 承载并受控最大高度，自适应视口杜绝撑破溢出；
 * 3. 异步确认 Loading 锁协议：确定时进入 loading，同步禁用取消/关闭/ESC，抛错保持开启保护现场；
 * 4. 移动端视口（< 768px）自适应全屏覆盖。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref, computed, watch, onMounted, toRef } from 'vue';
import { ElDialog, ElButton, ElScrollbar } from 'element-plus';
import type {
  AtengDialogProps,
  AtengDialogEmits,
  AtengDialogSlots,
  AtengDialogExpose,
} from './types';
import { useAsyncConfirm } from '../shared/useAsyncConfirm';

defineOptions({
  name: 'AtengDialog',
});

const props = withDefaults(defineProps<AtengDialogProps>(), {
  title: '',
  width: '50%',
  fullscreen: undefined,
  showFullscreen: true,
  draggable: true,
  maxHeight: 'calc(100vh - 160px)',
  confirmText: '确定',
  cancelText: '取消',
  showConfirm: true,
  showCancel: true,
  confirmLoading: undefined,
  beforeConfirm: undefined,
  closeOnClickModal: false,
  closeOnPressEscape: true,
  destroyOnClose: false,
  appendToBody: true,
  customClass: '',
});

const emit = defineEmits<AtengDialogEmits>();
defineSlots<AtengDialogSlots>();

// 1. 全屏状态机编排
const internalFullscreen = ref(false);
const isMobile = ref(false);

const isFullscreen = computed(() => {
  if (isMobile.value) {
    return true;
  }
  return props.fullscreen !== undefined ? props.fullscreen : internalFullscreen.value;
});

const toggleFullscreen = () => {
  if (isMobile.value) {
    return;
  }
  const nextVal = !isFullscreen.value;
  internalFullscreen.value = nextVal;
  emit('update:fullscreen', nextVal);
  emit('fullscreenChange', nextVal);
};

const handleHeaderDblClick = () => {
  if (props.showFullscreen && !isMobile.value) {
    toggleFullscreen();
  }
};

// 移动端视口探测 (< 768px)
const checkMobile = () => {
  if (typeof window !== 'undefined') {
    isMobile.value = window.innerWidth < 768;
  }
};

onMounted(() => {
  checkMobile();
});

watch(
  () => props.fullscreen,
  val => {
    if (val !== undefined) {
      internalFullscreen.value = val;
    }
  },
);

// 2. 异步确认状态机
const { isLoading, handleConfirm } = useAsyncConfirm({
  controlledLoading: toRef(props, 'confirmLoading'),
  beforeConfirm: props.beforeConfirm,
  onClose: () => {
    emit('update:modelValue', false);
    emit('close');
  },
  onSuccess: () => {
    emit('success');
  },
  onConfirmEmit: () => {
    emit('confirm');
  },
});

const handleCancel = () => {
  if (isLoading.value) {
    return;
  }
  emit('cancel');
  emit('update:modelValue', false);
  emit('close');
};

// 3. 计算内容区滚动高度
const scrollbarMaxHeight = computed(() => {
  if (isFullscreen.value) {
    return 'calc(100vh - 120px)';
  }
  return typeof props.maxHeight === 'number' ? `${props.maxHeight}px` : props.maxHeight;
});

// 4. 显式暴露方法
defineExpose<AtengDialogExpose>({
  toggleFullscreen,
  confirm: handleConfirm,
  cancel: handleCancel,
});
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    :width="isMobile ? '100%' : width"
    :fullscreen="isFullscreen"
    :draggable="draggable && !isFullscreen"
    :close-on-click-modal="isLoading ? false : closeOnClickModal"
    :close-on-press-escape="isLoading ? false : closeOnPressEscape"
    :destroy-on-close="destroyOnClose"
    :append-to-body="appendToBody"
    :show-close="false"
    :class="['at-dialog', isFullscreen && 'at-dialog--fullscreen', customClass]"
    @update:model-value="val => emit('update:modelValue', val)"
    @open="emit('open')"
    @opened="emit('opened')"
    @close="emit('close')"
    @closed="emit('closed')"
  >
    <!-- 自定义 Header：集成标题、双击区域、全屏按钮与关闭按钮 -->
    <template #header="{ close, titleId, titleClass }">
      <div class="at-dialog__header" @dblclick="handleHeaderDblClick">
        <slot name="header">
          <div class="at-dialog__title-wrapper">
            <slot name="title">
              <span :id="titleId" :class="[titleClass, 'at-dialog__title']">{{ title }}</span>
            </slot>
          </div>
          <div class="at-dialog__header-actions">
            <!-- 全屏放大/还原切换按钮 -->
            <button
              v-if="showFullscreen && !isMobile"
              type="button"
              class="at-dialog__action-btn"
              :class="{ 'is-disabled': isLoading }"
              :disabled="isLoading"
              :title="isFullscreen ? '还原' : '全屏'"
              @click="toggleFullscreen"
            >
              <svg
                v-if="!isFullscreen"
                viewBox="0 0 1024 1024"
                width="14"
                height="14"
                fill="currentColor"
              >
                <!-- 全屏图标 -->
                <path
                  d="M160 96h192a32 32 0 0 1 0 64H224v128a32 32 0 0 1-64 0V96zm672 0a32 32 0 0 1 32 32v192a32 32 0 0 1-64 0V160h-128a32 32 0 0 1 0-64h192zM192 864h128a32 32 0 0 1 0 64H160a32 32 0 0 1-32-32v-192a32 32 0 0 1 64 0v128zm640-160a32 32 0 0 1 32 32v192a32 32 0 0 1-32 32h-192a32 32 0 0 1 0-64h128v-128a32 32 0 0 1 32-32z"
                />
              </svg>
              <svg v-else viewBox="0 0 1024 1024" width="14" height="14" fill="currentColor">
                <!-- 还原图标 -->
                <path
                  d="M384 128h64a32 32 0 0 1 32 32v224a32 32 0 0 1-32 32H224a32 32 0 0 1 0-64h128V160a32 32 0 0 1 32-32zm256 0a32 32 0 0 1 32 32v192h128a32 32 0 0 1 0 64H576a32 32 0 0 1-32-32V160a32 32 0 0 1 32-32zm-224 480a32 32 0 0 1 32 32v224a32 32 0 0 1-64 0V736H224a32 32 0 0 1 0-64h192a32 32 0 0 1 32 32zm224 0a32 32 0 0 1 32-32h192a32 32 0 0 1 0 64H736v128a32 32 0 0 1-64 0V640a32 32 0 0 1 32-32z"
                />
              </svg>
            </button>
            <!-- 统一关闭按钮 -->
            <button
              type="button"
              class="at-dialog__action-btn at-dialog__close-btn"
              :class="{ 'is-disabled': isLoading }"
              :disabled="isLoading"
              title="关闭"
              @click="close"
            >
              <svg viewBox="0 0 1024 1024" width="14" height="14" fill="currentColor">
                <path
                  d="M764.288 214.592 512 466.88 259.712 214.592a31.936 31.936 0 0 0-45.12 45.12L466.752 512 214.528 764.224a31.936 31.936 0 1 0 45.12 45.184L512 557.184l252.288 252.288a31.936 31.936 0 0 0 45.12-45.12L557.12 512.064l252.288-252.352a31.936 31.936 0 1 0-45.12-45.12z"
                />
              </svg>
            </button>
          </div>
        </slot>
      </div>
    </template>

    <!-- 内部内容区默认由 el-scrollbar 包裹，受控视口高度 -->
    <div class="at-dialog__body">
      <el-scrollbar :max-height="scrollbarMaxHeight">
        <div class="at-dialog__content">
          <slot />
        </div>
      </el-scrollbar>
    </div>

    <!-- 底部标准化操作栏 -->
    <template #footer>
      <div class="at-dialog__footer">
        <slot name="footer">
          <el-button
            v-if="showCancel"
            class="at-dialog__cancel-btn"
            :disabled="isLoading"
            @click="handleCancel"
          >
            {{ cancelText }}
          </el-button>
          <el-button
            v-if="showConfirm"
            class="at-dialog__confirm-btn"
            type="primary"
            :loading="isLoading"
            @click="handleConfirm"
          >
            {{ confirmText }}
          </el-button>
        </slot>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.at-dialog {
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-right: 8px;
    user-select: none;
  }

  &__title {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  &__header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--el-text-color-secondary);
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(:disabled) {
      background-color: var(--el-fill-color-light);
      color: var(--el-color-primary);
    }

    &.is-disabled,
    &:disabled {
      cursor: not-allowed;
      color: var(--el-text-color-placeholder);
      background: transparent;
    }
  }

  &__content {
    padding: 0 4px;
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 12px;
  }
}
</style>
