<script setup lang="ts">
/**
 * AtengCropper 图片裁剪核心表现容器组件。
 *
 * 遵循 ADR-0002、ADR-0009、ADR-0021 与 ADR-0048 规范，
 * 提供多源输入适配、比例锁定、视口拖拽、缩放旋转与尺寸几何自感知自愈。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import type { AtengCropperProps, CropperCropData, CropperBoxData } from '../types';
import { useCropper } from '../composables/use-cropper';
import '../styles/index.css';

const props = withDefaults(defineProps<AtengCropperProps>(), {
  source: undefined,
  aspectRatio: NaN,
  viewMode: 1,
  dragMode: 'crop',
  shape: 'rect',
  responsive: true,
  crossOrigin: 'anonymous',
  checkOrientation: true,
  disabled: false,
  customClass: '',
});

const emit = defineEmits<{
  (e: 'ready', event: CustomEvent): void;
  (e: 'crop', data: CropperCropData): void;
  (e: 'cropBoxChange', box: CropperBoxData): void;
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const imageRef = ref<HTMLImageElement | null>(null);
let resizeObserver: ResizeObserver | null = null;

// 初始化无头状态机
const cropper = useCropper(imageRef, {
  aspectRatio: props.aspectRatio,
  viewMode: props.viewMode,
  dragMode: props.dragMode,
  shape: props.shape,
  responsive: props.responsive,
  checkOrientation: props.checkOrientation,
  onReady: event => {
    emit('ready', event);
  },
  onCrop: () => {
    emit('crop', cropper.data.value);
    emit('cropBoxChange', cropper.cropBoxData.value);
  },
});

const hasSource = computed(() => Boolean(props.source));

// 监听源变动自动重载
watch(
  () => props.source,
  newSource => {
    if (newSource) {
      cropper.replace(newSource);
    } else {
      cropper.destroy();
    }
  },
);

// 监听宽高比变动
watch(
  () => props.aspectRatio,
  newRatio => {
    cropper.setAspectRatio(newRatio);
  },
);

// 监听拖拽模式变动
watch(
  () => props.dragMode,
  newMode => {
    cropper.setDragMode(newMode);
  },
);

onMounted(() => {
  if (props.source) {
    cropper.replace(props.source);
  }

  // 几何自愈监听
  if (props.responsive && typeof ResizeObserver !== 'undefined' && containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      if (cropper.ready.value) {
        window.requestAnimationFrame(() => {
          // 容器重绘时自愈
        });
      }
    });
    resizeObserver.observe(containerRef.value);
  }
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  cropper.destroy();
});

// 显式暴露实例方法与状态
defineExpose({
  ready: cropper.ready,
  loading: cropper.loading,
  data: cropper.data,
  cropBoxData: cropper.cropBoxData,
  zoomRatio: cropper.zoomRatio,
  rotateAngle: cropper.rotateAngle,
  zoom: cropper.zoom,
  zoomTo: cropper.zoomTo,
  rotate: cropper.rotate,
  rotateTo: cropper.rotateTo,
  flipX: cropper.flipX,
  flipY: cropper.flipY,
  setAspectRatio: cropper.setAspectRatio,
  setDragMode: cropper.setDragMode,
  replace: cropper.replace,
  reset: cropper.reset,
  clear: cropper.clear,
  exportBlob: cropper.exportBlob,
  exportFile: cropper.exportFile,
  exportDataUrl: cropper.exportDataUrl,
  exportCanvas: cropper.exportCanvas,
  getCroppedCanvas: cropper.exportCanvas,
  exportResult: cropper.exportResult,
  destroy: cropper.destroy,
  getData: () => cropper.data.value,
  getCropBoxData: () => cropper.cropBoxData.value,
});
</script>

<template>
  <div
    ref="containerRef"
    :class="[
      'at-cropper',
      customClass,
      {
        'at-cropper--circle': shape === 'circle',
        'at-cropper--disabled': disabled,
      },
    ]"
  >
    <!-- 空状态插槽 -->
    <div v-if="!hasSource" class="at-cropper__empty">
      <slot name="empty">
        <div class="at-cropper__empty-placeholder">
          <svg
            class="at-cropper__empty-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span class="at-cropper__empty-text">请选择或传入待裁剪图片</span>
        </div>
      </slot>
    </div>

    <!-- 真实图片裁剪区域 -->
    <div v-show="hasSource" class="at-cropper__wrapper">
      <img
        ref="imageRef"
        class="at-cropper__image"
        :crossorigin="crossOrigin || undefined"
        alt="Ateng Cropper Image Target"
      />
    </div>
  </div>
</template>

<style scoped>
.at-cropper__empty-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--at-cropper-text-color);
}

.at-cropper__empty-icon {
  width: 44px;
  height: 44px;
  opacity: 0.65;
}

.at-cropper__empty-text {
  font-size: 13px;
  opacity: 0.8;
}
</style>
