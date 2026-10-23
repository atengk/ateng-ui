<script setup lang="ts">
/**
 * 企业级抽屉交互容器组件。
 *
 * 核心特性：
 * 1. 响应式尺寸断点支持（small: 360px, default: 500px, large: 720px），移动端视口（< 768px）自适应 100% 全宽；
 * 2. 异步确认 Loading 锁协议：确定时进入 loading，同步禁用取消/关闭/ESC，抛错保持开启保护现场；
 * 3. 标准化底部操作栏与全生命周期事件派发。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref, computed, watch, onMounted, toRef } from 'vue';
import { ElDrawer, ElButton, ElSkeleton } from 'element-plus';
import type {
  AtengDrawerProps,
  AtengDrawerEmits,
  AtengDrawerSlots,
  AtengDrawerExpose,
} from './types';
import { useAsyncConfirm } from '../shared/useAsyncConfirm';

defineOptions({
  name: 'AtengDrawer',
});

const props = withDefaults(defineProps<AtengDrawerProps>(), {
  title: '',
  size: 'default',
  direction: 'rtl',
  withHeader: true,
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
  lazyRender: false,
  customClass: '',
});

const emit = defineEmits<AtengDrawerEmits>();
defineSlots<AtengDrawerSlots>();

// 1. 移动端与响应式尺寸计算
const isMobile = ref(false);

const checkMobile = () => {
  if (typeof window !== 'undefined') {
    isMobile.value = window.innerWidth < 768;
  }
};

onMounted(() => {
  checkMobile();
});

const resolvedSize = computed(() => {
  // 水平方向抽屉在移动端强制全宽 100%
  if (isMobile.value && (props.direction === 'rtl' || props.direction === 'ltr')) {
    return '100%';
  }

  switch (props.size) {
    case 'small':
      return '360px';
    case 'large':
      return '720px';
    case 'default':
      return '500px';
    default:
      return typeof props.size === 'number' ? `${props.size}px` : props.size;
  }
});

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

// 3. 分帧延迟挂载 (lazy-render) 状态机编排
const isContentReady = ref(!props.lazyRender);

const handleOpened = () => {
  if (props.lazyRender && !isContentReady.value) {
    isContentReady.value = true;
  }
  emit('opened');
};

const handleClosed = () => {
  if (props.lazyRender && props.destroyOnClose) {
    isContentReady.value = false;
  }
  emit('closed');
};

watch(
  () => props.lazyRender,
  val => {
    if (!val) {
      isContentReady.value = true;
    }
  },
);

// 4. 显式暴露方法
defineExpose<AtengDrawerExpose>({
  confirm: handleConfirm,
  cancel: handleCancel,
});
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    :title="title"
    :size="resolvedSize"
    :direction="direction"
    :with-header="withHeader"
    :close-on-click-modal="isLoading ? false : closeOnClickModal"
    :close-on-press-escape="isLoading ? false : closeOnPressEscape"
    :destroy-on-close="destroyOnClose"
    :append-to-body="appendToBody"
    :show-close="false"
    :class="['at-drawer', customClass]"
    @update:model-value="val => emit('update:modelValue', val)"
    @open="emit('open')"
    @opened="handleOpened"
    @close="emit('close')"
    @closed="handleClosed"
  >
    <!-- 自定义 Header：带标题与防锁死关闭按钮 -->
    <template v-if="withHeader" #header="{ close, titleId, titleClass }">
      <div class="at-drawer__header">
        <slot name="header">
          <div class="at-drawer__title-wrapper">
            <slot name="title">
              <span :id="titleId" :class="[titleClass, 'at-drawer__title']">{{ title }}</span>
            </slot>
          </div>
          <!-- 统一关闭按钮 -->
          <button
            type="button"
            class="at-drawer__close-btn"
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
        </slot>
      </div>
    </template>

    <!-- 抽屉主要内容区 -->
    <div class="at-drawer__body">
      <template v-if="!lazyRender || isContentReady">
        <slot />
      </template>
      <template v-else>
        <slot name="placeholder">
          <el-skeleton :rows="6" animated class="at-drawer__placeholder" />
        </slot>
      </template>
    </div>

    <!-- 底部标准化操作栏 -->
    <template #footer>
      <div class="at-drawer__footer">
        <slot name="footer">
          <el-button
            v-if="showCancel"
            class="at-drawer__cancel-btn"
            :disabled="isLoading"
            @click="handleCancel"
          >
            {{ cancelText }}
          </el-button>
          <el-button
            v-if="showConfirm"
            class="at-drawer__confirm-btn"
            type="primary"
            :loading="isLoading"
            @click="handleConfirm"
          >
            {{ confirmText }}
          </el-button>
        </slot>
      </div>
    </template>
  </el-drawer>
</template>

<style scoped lang="scss">
.at-drawer {
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

  &__close-btn {
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

  &__body {
    height: 100%;
    box-sizing: border-box;
  }

  &__placeholder {
    padding: 16px 8px;
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 12px;
  }
}
</style>
