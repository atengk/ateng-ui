<script setup lang="ts">
/**
 * @atengk/barcode-vue 艺术二维码工业表现容器组件。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref, computed, watch } from 'vue';
import type QRCodeStyling from 'qr-code-styling';
import { useQRCode } from '../composables/useQRCode';
import type {
  QRCodePreset,
  QRCodeDotsOptions,
  QRCodeCornersSquareOptions,
  QRCodeCornersDotOptions,
  QRCodeBackgroundOptions,
  QRCodeImageOptions,
  QRCodeEncodingOptions,
  ExportQRCodeOptions,
  DownloadQRCodeOptions,
  DrawType,
  ShapeType,
} from '../types/qrcode';

defineOptions({
  name: 'AtengQRCode',
});

interface AtengQRCodeProps {
  /**
   * 二维码内容字符串。
   */
  value: string;
  /**
   * 六大企业级设计主题预设。
   * @default 'standard'
   */
  preset?: QRCodePreset;
  /**
   * 渲染引擎形态：Canvas 或矢量 SVG。
   * @default 'canvas'
   */
  type?: DrawType;
  /**
   * 逻辑宽度（像素）。
   * @default 200
   */
  width?: number;
  /**
   * 逻辑高度（像素）。
   * @default 200
   */
  height?: number;
  /**
   * 二维码外边距。
   * @default 0
   */
  margin?: number;
  /**
   * 二维码整体构型：方形或圆形。
   * @default 'square'
   */
  shape?: ShapeType;
  /**
   * 是否开启高分屏 Retina Canvas 像素比自动自适应倍率渲染。
   * @default true
   */
  autoDpr?: boolean;
  /**
   * 中心 Logo 图标地址或 Base64 编码。
   */
  image?: string;
  /**
   * 码点微观形态与色彩选项。
   */
  dotsOptions?: QRCodeDotsOptions;
  /**
   * 码眼外框形态与色彩选项。
   */
  cornersSquareOptions?: QRCodeCornersSquareOptions;
  /**
   * 码眼中心点形态与色彩选项。
   */
  cornersDotOptions?: QRCodeCornersDotOptions;
  /**
   * 背景形态与色彩选项。
   */
  backgroundOptions?: QRCodeBackgroundOptions;
  /**
   * 中心 Logo 图标高级选项。
   */
  imageOptions?: QRCodeImageOptions;
  /**
   * 二维码容错率与底层编码配置。
   */
  qrOptions?: QRCodeEncodingOptions;
}

const props = withDefaults(defineProps<AtengQRCodeProps>(), {
  preset: 'standard',
  type: 'canvas',
  width: 200,
  height: 200,
  margin: 0,
  shape: 'square',
  autoDpr: true,
  image: undefined,
  dotsOptions: undefined,
  cornersSquareOptions: undefined,
  cornersDotOptions: undefined,
  backgroundOptions: undefined,
  imageOptions: undefined,
  qrOptions: undefined,
});

const emit = defineEmits<{
  (e: 'render-success', instance: QRCodeStyling): void;
  (e: 'render-error', error: Error): void;
}>();

const qrContainerRef = ref<HTMLDivElement | null>(null);

const resolvedOptions = computed(() => ({
  preset: props.preset,
  type: props.type,
  width: props.width,
  height: props.height,
  margin: props.margin,
  shape: props.shape,
  autoDpr: props.autoDpr,
  image: props.image,
  dotsOptions: props.dotsOptions,
  cornersSquareOptions: props.cornersSquareOptions,
  cornersDotOptions: props.cornersDotOptions,
  backgroundOptions: props.backgroundOptions,
  imageOptions: props.imageOptions,
  qrOptions: props.qrOptions,
}));

const { qrCodeInstance, isRendered, error, refresh, exportAsImage, download } = useQRCode(
  qrContainerRef,
  () => props.value,
  resolvedOptions,
);

watch(
  () => isRendered.value,
  rendered => {
    if (rendered && qrCodeInstance.value) {
      emit('render-success', qrCodeInstance.value);
    }
  },
);

watch(
  () => error.value,
  err => {
    if (err) {
      emit('render-error', err);
    }
  },
);

defineExpose({
  /**
   * 获取底层 QRCodeStyling 实例。
   */
  getRawInstance: () => qrCodeInstance.value,
  /**
   * 手动触发重绘刷新。
   */
  refresh,
  /**
   * 导出二维码图像数据（PNG / JPEG / SVG / Blob）。
   */
  exportAsImage: (options?: ExportQRCodeOptions) => exportAsImage(options),
  /**
   * 一键触发浏览器端图像文件下载。
   */
  download: (options?: DownloadQRCodeOptions) => download(options),
});
</script>

<template>
  <div
    class="at-qrcode"
    :class="{
      'at-qrcode--rendered': isRendered,
      'at-qrcode--error': !!error,
    }"
  >
    <div
      ref="qrContainerRef"
      class="at-qrcode__canvas"
      :style="{
        width: `${width}px`,
        height: `${height}px`,
      }"
    />

    <div v-if="!isRendered && !error" class="at-qrcode__loading">
      <slot name="loading">
        <span class="at-qrcode__loading-text">正在生成二维码...</span>
      </slot>
    </div>

    <div v-if="error" class="at-qrcode__error-tip">
      <slot name="error" :error="error">
        <span class="at-qrcode__error-msg">{{ error.message }}</span>
      </slot>
    </div>

    <div v-if="$slots.default" class="at-qrcode__extra">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.at-qrcode {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  box-sizing: border-box;
}

.at-qrcode__canvas {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: var(--at-border-radius-base, 4px);
}

.at-qrcode__loading,
.at-qrcode__error-tip {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--at-bg-color-overlay, rgba(255, 255, 255, 0.85));
  font-size: var(--at-font-size-small, 12px);
}

.at-qrcode__loading-text {
  color: var(--at-text-color-secondary, #64748b);
}

.at-qrcode__error-msg {
  color: var(--at-color-danger, #ef4444);
  padding: 4px 8px;
  text-align: center;
}

.at-qrcode__extra {
  margin-top: 8px;
  font-size: var(--at-font-size-base, 14px);
  color: var(--at-text-color-primary, #1e293b);
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
