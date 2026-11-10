<script setup lang="ts">
/**
 * AtengCropperModal 轻量脱壳图片裁剪模态弹窗组件。
 *
 * 遵循 ADR-0002、ADR-0009、ADR-0021 与 ADR-0048 规范，
 * 基于纯原生 Vue 3 Teleport 与 --at-cropper-* CSS 变量驱动，100% 物理脱耦具体 UI 库，
 * 内置空状态拖拽/剪贴板拾取、快捷比例预设切换、调平微调滑块与多尺寸实时缩略预览。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import type {
  CropperSource,
  CropperShape,
  CropperPreset,
  CropperResult,
  CropperExportOptions,
} from '../types';
import AtengCropper from './AtengCropper.vue';
import AtengCropperPreview from './AtengCropperPreview.vue';
import { ClipboardReceiver } from '../utils/clipboard-receiver';
import '../styles/index.css';

interface Props {
  /** 模态弹窗显隐状态双向绑定 */
  modelValue?: boolean;
  /** 弹窗标题，默认 "图片裁剪" */
  title?: string;
  /** 弹窗宽度，默认 "840px" */
  width?: string;
  /** 图片数据源（支持 HTTP URL、Base64、Blob、File） */
  source?: CropperSource;
  /** 裁剪框宽高比（如 1、16/9），默认 NaN 自由比例 */
  aspectRatio?: number;
  /** 裁切框形状，默认 "rect" */
  shape?: CropperShape;
  /** 快捷场景预设 */
  preset?: CropperPreset;
  /** 是否在右侧展示多尺寸缩略预览面板，默认 true */
  showPreview?: boolean;
  /** 预览面板规格列表，默认 [128, 64, 32] */
  previewSizes?: number[];
  /** 是否允许按 Ctrl+V / Cmd+V 自动捕获剪贴板图片，默认 true */
  pasteable?: boolean;
  /** 导出文件名（可选） */
  fileName?: string;
  /** 导出选项配置 */
  exportOptions?: CropperExportOptions;
  /** 确认按钮文本，默认 "确定" */
  confirmText?: string;
  /** 取消按钮文本，默认 "取消" */
  cancelText?: string;
  /** 点击遮罩层是否允许关闭，默认 true */
  closeOnClickModal?: boolean;
  /** 按 Escape 键是否允许关闭，默认 true */
  closeOnPressEscape?: boolean;
  /** 远程图片跨域请求凭据策略，默认 "anonymous" */
  crossOrigin?: '' | 'anonymous' | 'use-credentials';
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  title: '图片裁剪',
  width: '840px',
  source: undefined,
  aspectRatio: NaN,
  shape: 'rect',
  preset: undefined,
  showPreview: true,
  previewSizes: () => [128, 64, 32],
  pasteable: true,
  fileName: undefined,
  exportOptions: undefined,
  confirmText: '确定',
  cancelText: '取消',
  closeOnClickModal: true,
  closeOnPressEscape: true,
  crossOrigin: 'anonymous',
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'confirm', result: CropperResult): void;
  (e: 'cancel'): void;
}>();

const cropperRef = ref<InstanceType<typeof AtengCropper> | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const internalSource = ref<CropperSource>(props.source);
const currentAspectRatio = ref<number>(props.aspectRatio);
const currentShape = ref<CropperShape>(props.shape);
const angleSlider = ref<number>(0);
const livePreviewUrl = ref<string>('');
const isDraggingOver = ref<boolean>(false);
const exporting = ref<boolean>(false);

// 依据预设初始化长宽比与形状
const applyPreset = (presetName?: CropperPreset): void => {
  if (presetName === 'avatar') {
    currentAspectRatio.value = 1;
    currentShape.value = 'circle';
  } else if (presetName === 'banner') {
    currentAspectRatio.value = 16 / 9;
    currentShape.value = 'rect';
  } else if (presetName === 'product') {
    currentAspectRatio.value = 1;
    currentShape.value = 'rect';
  } else if (presetName === 'id-card') {
    currentAspectRatio.value = 85.6 / 54;
    currentShape.value = 'rect';
  } else if (presetName === 'free') {
    currentAspectRatio.value = NaN;
    currentShape.value = 'rect';
  }
};

watch(
  () => props.preset,
  newPreset => {
    if (newPreset) {
      applyPreset(newPreset);
    }
  },
  { immediate: true },
);

watch(
  () => props.source,
  newSource => {
    internalSource.value = newSource;
  },
);

const hasSource = computed(() => Boolean(internalSource.value));

const close = (): void => {
  emit('update:modelValue', false);
  emit('cancel');
};

const handleMaskClick = (): void => {
  if (props.closeOnClickModal && !exporting.value) {
    close();
  }
};

// 快捷比例切换
const setRatio = (ratio: number): void => {
  currentAspectRatio.value = ratio;
};

// 调平角度滑块变化
const handleAngleSliderChange = (): void => {
  if (cropperRef.value) {
    cropperRef.value.rotateTo(angleSlider.value);
  }
};

// 工具栏操作
const handleRotate = (deg: number): void => {
  if (cropperRef.value) {
    cropperRef.value.rotate(deg);
    angleSlider.value = (angleSlider.value + deg) % 360;
  }
};

const handleFlipX = (): void => {
  cropperRef.value?.flipX();
};

const handleFlipY = (): void => {
  cropperRef.value?.flipY();
};

const handleReset = (): void => {
  angleSlider.value = 0;
  cropperRef.value?.reset();
};

// 裁剪变动时实时刷新缩略预览
const handleCropUpdate = (): void => {
  if (props.showPreview && cropperRef.value) {
    try {
      livePreviewUrl.value = cropperRef.value.exportDataUrl();
    } catch {
      // 预览失败静默保护
    }
  }
};

// 拖拽上传与文件选择
const triggerFileInput = (): void => {
  fileInputRef.value?.click();
};

const handleFileChange = (event: Event): void => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    internalSource.value = input.files[0];
  }
};

const handleDragOver = (e: DragEvent): void => {
  e.preventDefault();
  isDraggingOver.value = true;
};

const handleDragLeave = (e: DragEvent): void => {
  e.preventDefault();
  isDraggingOver.value = false;
};

const handleDrop = (e: DragEvent): void => {
  e.preventDefault();
  isDraggingOver.value = false;
  const files = e.dataTransfer?.files;
  if (files && files[0] && files[0].type.startsWith('image/')) {
    internalSource.value = files[0];
  }
};

// 剪贴板监听
const handleGlobalPaste = (event: ClipboardEvent): void => {
  if (!props.modelValue || !props.pasteable) {
    return;
  }
  const file = ClipboardReceiver.extractImage(event);
  if (file) {
    internalSource.value = file;
  }
};

const handleKeydown = (event: KeyboardEvent): void => {
  if (props.modelValue && props.closeOnPressEscape && event.key === 'Escape') {
    close();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('paste', handleGlobalPaste);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('paste', handleGlobalPaste);
});

// 确认导出
const handleConfirm = async (): Promise<void> => {
  if (!cropperRef.value || !hasSource.value || exporting.value) {
    return;
  }

  exporting.value = true;
  try {
    const result = await cropperRef.value.exportResult(props.fileName, {
      ...props.exportOptions,
      clipCircle: currentShape.value === 'circle',
    });
    emit('confirm', result);
    emit('update:modelValue', false);
  } finally {
    exporting.value = false;
  }
};
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="at-cropper-modal">
      <!-- 半透明暗黑遮罩 -->
      <div class="at-cropper-modal__mask" @click="handleMaskClick"></div>

      <!-- 弹窗主视口容器 -->
      <div class="at-cropper-modal__container" :style="{ width: props.width }">
        <!-- 头部标题栏 -->
        <header class="at-cropper-modal__header">
          <h3 class="at-cropper-modal__title">{{ props.title }}</h3>
          <button type="button" class="at-cropper-modal__close" aria-label="Close" @click="close">
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              stroke="currentColor"
              stroke-width="2"
              fill="none"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </header>

        <!-- 弹窗内容主体 -->
        <div class="at-cropper-modal__body">
          <div class="at-cropper-modal__main">
            <!-- 画布区域 -->
            <div class="at-cropper-modal__canvas-wrapper">
              <!-- 空状态拖拽选择卡片 -->
              <div
                v-if="!hasSource"
                :class="['at-cropper-dropzone', { 'at-cropper-dropzone--active': isDraggingOver }]"
                @click="triggerFileInput"
                @dragover="handleDragOver"
                @dragleave="handleDragLeave"
                @drop="handleDrop"
              >
                <input
                  ref="fileInputRef"
                  type="file"
                  accept="image/*"
                  style="display: none"
                  @change="handleFileChange"
                />
                <svg
                  class="at-cropper-dropzone__icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.75"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
                <p class="at-cropper-dropzone__title">点击或拖拽图片到此处上传</p>
                <p class="at-cropper-dropzone__hint">
                  支持 JPG/PNG/WebP 格式，或直接按 Ctrl+V 粘贴截图
                </p>
              </div>

              <!-- 核心裁剪画布 -->
              <AtengCropper
                v-else
                ref="cropperRef"
                :source="internalSource"
                :aspect-ratio="currentAspectRatio"
                :shape="currentShape"
                :cross-origin="props.crossOrigin"
                @crop="handleCropUpdate"
              />
            </div>

            <!-- 下方工具栏 -->
            <div v-if="hasSource" class="at-cropper-modal__toolbar">
              <!-- 比例预设组 -->
              <div class="at-cropper-modal__toolbar-group">
                <button
                  type="button"
                  :class="[
                    'at-cropper-modal__btn',
                    { 'at-cropper-modal__btn--active': isNaN(currentAspectRatio) },
                  ]"
                  @click="setRatio(NaN)"
                >
                  自由
                </button>
                <button
                  type="button"
                  :class="[
                    'at-cropper-modal__btn',
                    { 'at-cropper-modal__btn--active': currentAspectRatio === 1 },
                  ]"
                  @click="setRatio(1)"
                >
                  1:1
                </button>
                <button
                  type="button"
                  :class="[
                    'at-cropper-modal__btn',
                    {
                      'at-cropper-modal__btn--active': Math.abs(currentAspectRatio - 4 / 3) < 0.01,
                    },
                  ]"
                  @click="setRatio(4 / 3)"
                >
                  4:3
                </button>
                <button
                  type="button"
                  :class="[
                    'at-cropper-modal__btn',
                    {
                      'at-cropper-modal__btn--active': Math.abs(currentAspectRatio - 16 / 9) < 0.01,
                    },
                  ]"
                  @click="setRatio(16 / 9)"
                >
                  16:9
                </button>
              </div>

              <!-- 旋转翻转组 -->
              <div class="at-cropper-modal__toolbar-group">
                <button
                  type="button"
                  class="at-cropper-modal__btn"
                  title="逆时针旋转 90 度"
                  @click="handleRotate(-90)"
                >
                  ↺
                </button>
                <button
                  type="button"
                  class="at-cropper-modal__btn"
                  title="顺时针旋转 90 度"
                  @click="handleRotate(90)"
                >
                  ↻
                </button>
                <button
                  type="button"
                  class="at-cropper-modal__btn"
                  title="水平翻转"
                  @click="handleFlipX"
                >
                  ⇄
                </button>
                <button
                  type="button"
                  class="at-cropper-modal__btn"
                  title="垂直翻转"
                  @click="handleFlipY"
                >
                  ⇅
                </button>
                <button
                  type="button"
                  class="at-cropper-modal__btn"
                  title="重置"
                  @click="handleReset"
                >
                  重置
                </button>
              </div>

              <!-- 精细调平滑块 -->
              <div class="at-cropper-modal__slider-wrap">
                <span>调平</span>
                <input
                  v-model.number="angleSlider"
                  type="range"
                  min="-45"
                  max="45"
                  step="1"
                  class="at-cropper-modal__slider"
                  @input="handleAngleSliderChange"
                />
                <span>{{ angleSlider }}°</span>
              </div>
            </div>
          </div>

          <!-- 右侧多规格实时预览侧边栏 -->
          <div v-if="props.showPreview && hasSource" class="at-cropper-modal__sidebar">
            <h4 class="at-cropper-modal__sidebar-title">实时预览</h4>
            <AtengCropperPreview
              :sizes="props.previewSizes"
              :shape="currentShape"
              :url="livePreviewUrl"
            />
          </div>
        </div>

        <!-- 底部操作按钮栏 -->
        <footer class="at-cropper-modal__footer">
          <button
            type="button"
            class="at-cropper-modal__action-btn at-cropper-modal__action-btn--cancel"
            @click="close"
          >
            {{ props.cancelText }}
          </button>
          <button
            type="button"
            :disabled="!hasSource || exporting"
            :class="[
              'at-cropper-modal__action-btn at-cropper-modal__action-btn--primary',
              { 'at-cropper-modal__action-btn--disabled': !hasSource || exporting },
            ]"
            @click="handleConfirm"
          >
            {{ exporting ? '处理中...' : props.confirmText }}
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>
