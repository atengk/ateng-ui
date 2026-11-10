<script setup lang="ts">
/**
 * AtengBarcode 一维条码统一高保真表现容器组件。
 *
 * 支持 SVG 纯矢量与 Canvas 双模渲染、严格离线格式防崩溃校验与多态优雅降级。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref, computed, watch, onMounted, nextTick } from 'vue';
import type {
  BarcodeFormat,
  BarcodeRenderType,
  BarcodeTextPosition,
  BarcodeTextAlign,
} from '../types';
import { useBarcode } from '../composables/useBarcode';

interface Props {
  /** 条码原始字符串内容 */
  value: string;
  /** 条码格式编码，默认 CODE128 */
  format?: BarcodeFormat;
  /** 底层渲染模式，默认 'svg' 矢量输出 */
  renderType?: BarcodeRenderType;
  /** 单个条块的基准宽度倍率 (px)，默认 2 */
  width?: number;
  /** 条形码高度 (px)，默认 100 */
  height?: number;
  /** 是否展示文本内容，默认 true */
  displayValue?: boolean;
  /** 展示文本的位置，默认 'bottom' */
  textPosition?: BarcodeTextPosition;
  /** 展示文本的水平对齐方式，默认 'center' */
  textAlign?: BarcodeTextAlign;
  /** 展示文本字号 (px)，默认 20 */
  fontSize?: number;
  /** 字体族名称，默认 'monospace' */
  font?: string;
  /** 条码条块与文字之间的垂直间距 (px)，默认 2 */
  textMargin?: number;
  /** 四周统一安全静区边距 (Quiet Zone, px)，默认 10 */
  margin?: number;
  /** 顶部静区边距 */
  marginTop?: number;
  /** 底部静区边距 */
  marginBottom?: number;
  /** 左侧静区边距 */
  marginLeft?: number;
  /** 右侧静区边距 */
  marginRight?: number;
  /** 条码线条及文本颜色，默认 '#000000' */
  lineColor?: string;
  /** 背景填充颜色，默认 '#ffffff' */
  background?: string;
  /** 自定义展示文本格式化函数 */
  formatText?: (code: string) => string;
  /** 校验失败时的默认兜底提示文本 */
  fallbackText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  format: 'CODE128',
  renderType: 'svg',
  width: 2,
  height: 100,
  displayValue: true,
  textPosition: 'bottom',
  textAlign: 'center',
  fontSize: 20,
  font: 'monospace',
  textMargin: 2,
  margin: 10,
  marginTop: undefined,
  marginBottom: undefined,
  marginLeft: undefined,
  marginRight: undefined,
  lineColor: '#000000',
  background: '#ffffff',
  formatText: undefined,
  fallbackText: '条码格式错误或内容无效',
});

const emit = defineEmits<{
  (e: 'error', payload: { message: string; value: string; format: BarcodeFormat }): void;
  (
    e: 'rendered',
    payload: { value: string; format: BarcodeFormat; renderType: BarcodeRenderType },
  ): void;
}>();

const svgRef = ref<SVGSVGElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

const { isValid, errorMessage, render } = useBarcode();

/**
 * 执行底层渲染调度。
 */
const triggerRender = async () => {
  await nextTick();
  const targetEl = props.renderType === 'svg' ? svgRef.value : canvasRef.value;
  if (!targetEl) return;

  const result = render(targetEl, props.value, {
    format: props.format,
    renderType: props.renderType,
    width: props.width,
    height: props.height,
    displayValue: props.displayValue,
    textPosition: props.textPosition,
    textAlign: props.textAlign,
    fontSize: props.fontSize,
    font: props.font,
    textMargin: props.textMargin,
    margin: props.margin,
    marginTop: props.marginTop,
    marginBottom: props.marginBottom,
    marginLeft: props.marginLeft,
    marginRight: props.marginRight,
    lineColor: props.lineColor,
    background: props.background,
    formatText: props.formatText,
  });

  if (!result.valid) {
    emit('error', {
      message: result.message ?? props.fallbackText,
      value: props.value,
      format: props.format,
    });
  } else {
    emit('rendered', {
      value: props.value,
      format: props.format,
      renderType: props.renderType,
    });
  }
};

onMounted(() => {
  triggerRender();
});

watch(
  () => [
    props.value,
    props.format,
    props.renderType,
    props.width,
    props.height,
    props.displayValue,
    props.textPosition,
    props.textAlign,
    props.fontSize,
    props.font,
    props.textMargin,
    props.margin,
    props.marginTop,
    props.marginBottom,
    props.marginLeft,
    props.marginRight,
    props.lineColor,
    props.background,
    props.formatText,
  ],
  () => {
    triggerRender();
  },
  { deep: true },
);

defineExpose({
  render: triggerRender,
  isValid: computed(() => isValid.value),
  errorMessage: computed(() => errorMessage.value),
  getElement: () => (props.renderType === 'svg' ? svgRef.value : canvasRef.value),
});
</script>

<template>
  <div
    class="at-barcode"
    :class="{
      'at-barcode--invalid': !isValid,
      'at-barcode--svg': renderType === 'svg',
      'at-barcode--canvas': renderType === 'canvas',
    }"
  >
    <!-- 校验通过态：正常渲染条码 -->
    <template v-if="isValid">
      <svg v-if="renderType === 'svg'" ref="svgRef" class="at-barcode__svg" aria-label="barcode" />
      <canvas v-else ref="canvasRef" class="at-barcode__canvas" aria-label="barcode" />
    </template>

    <!-- 校验失败态：优雅降级插槽或默认骨架占位 -->
    <template v-else>
      <slot name="error" :message="errorMessage" :value="value">
        <div class="at-barcode__error" role="alert">
          <span class="at-barcode__error-icon">⚠️</span>
          <span class="at-barcode__error-text">{{ errorMessage || fallbackText }}</span>
        </div>
      </slot>
    </template>
  </div>
</template>

<style scoped>
.at-barcode {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  max-width: 100%;
  box-sizing: border-box;
}

.at-barcode__svg,
.at-barcode__canvas {
  display: block;
  max-width: 100%;
  height: auto;
}

.at-barcode__error {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 16px;
  background-color: var(--at-barcode-error-bg, rgba(239, 68, 68, 0.08));
  border: 1px dashed var(--at-barcode-error-border, rgba(239, 68, 68, 0.35));
  border-radius: 6px;
  color: var(--at-barcode-error-color, #ef4444);
  font-size: 13px;
  font-family: inherit;
  box-sizing: border-box;
}

.at-barcode__error-icon {
  font-size: 14px;
  line-height: 1;
}

.at-barcode__error-text {
  font-weight: 500;
  line-height: 1.4;
}
</style>
