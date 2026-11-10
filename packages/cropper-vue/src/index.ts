/**
 * @atengk/cropper-vue 图片裁剪与图像处理扩展模块入口。
 *
 * 遵循四层洋葱拓扑之 L2 专用能力/领域扩展层架构契约。
 *
 * @author Ateng
 * @since 2026-11-10
 */

export * from './types';
export * from './guards/blob-url-guard';
export * from './guards/canvas-taint-guard';
export * from './utils/circle-clip';
export * from './utils/watermark-engine';
export * from './utils/image-compression';
export * from './utils/clipboard-receiver';
export * from './composables/use-cropper';
export { default as AtengCropper } from './components/AtengCropper.vue';
export { default as AtengCropperModal } from './components/AtengCropperModal.vue';
export { default as AtengCropperPreview } from './components/AtengCropperPreview.vue';
