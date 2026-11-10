<script setup lang="ts">
/**
 * AtengCropperPreview 多规格实时预览表现组件。
 *
 * 遵循 ADR-0002、ADR-0021 与 ADR-0048 规范，
 * 将当前裁切结果在多尺寸（如 128px / 64px / 32px）与圆形/矩形形态下同步呈现。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import type { CropperShape } from '../types';

interface Props {
  /** 预览规格尺寸列表（像素），默认 [128, 64, 32] */
  sizes?: number[];
  /** 预览遮罩形状，默认 "rect" */
  shape?: CropperShape;
  /** 当前裁切实时 DataURL 或图片源 */
  url?: string;
  /** 自定义外层样式类名 */
  customClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  sizes: () => [128, 64, 32],
  shape: 'rect',
  url: '',
  customClass: '',
});
</script>

<template>
  <div :class="['at-cropper-preview', props.customClass]">
    <div v-for="size in props.sizes" :key="size" class="at-cropper-preview__item">
      <div
        :class="[
          'at-cropper-preview__box',
          { 'at-cropper-preview__box--circle': props.shape === 'circle' },
        ]"
        :style="{
          width: `${size}px`,
          height: `${size}px`,
        }"
      >
        <img
          v-if="props.url"
          :src="props.url"
          class="at-cropper-preview__img"
          alt="Preview Thumbnail"
        />
        <span v-else class="at-cropper-preview__placeholder">-</span>
      </div>
      <span class="at-cropper-preview__label">{{ size }}×{{ size }}</span>
    </div>
  </div>
</template>

<style scoped>
.at-cropper-preview__placeholder {
  font-size: 12px;
  color: var(--at-cropper-text-color);
  opacity: 0.4;
}
</style>
