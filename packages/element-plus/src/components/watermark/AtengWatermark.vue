<script setup lang="ts">
/**
 * 企业级安全防篡改水印容器组件。
 *
 * 核心技术特征：
 * 1. 采用 Canvas 离屏绘制高清抗锯齿旋转文本/图片背景图，支持多行文本与颜色、角度、间距自定义，具备 SVG 零依赖环境安全降级；
 * 2. 默认局部容器定位（自动装配 position: relative 上下文），支持 full 属性启用 position: fixed 全屏视口覆盖；
 * 3. 深度结合 MutationObserver 严密监听水印遮罩物理删除与 style/class 属性篡改，提供微任务级即时重建与自愈保护；
 * 4. 遮罩样式强制设定 pointer-events: none，穿透任何用户交互，绝不阻断底层业务操作；
 * 5. 严格遵守确定性生命周期治理，组件销毁时 100% 释放 MutationObserver 监听器。
 *
 * @author Ateng
 * @since 2026-10-23
 */

import { ref, computed, watch, onMounted, onBeforeUnmount, type CSSProperties } from 'vue';
import type { AtengWatermarkProps } from './types';

defineOptions({
  name: 'AtengWatermark',
});

const props = withDefaults(defineProps<AtengWatermarkProps>(), {
  content: 'Ateng UI',
  image: undefined,
  width: 240,
  height: 140,
  rotate: -22,
  zIndex: 9,
  gap: () => [100, 100],
  offset: undefined,
  font: undefined,
  antiTamper: true,
  full: false,
});

// 1. 节点引用与状态模型
const containerRef = ref<HTMLDivElement | null>(null);
const maskRef = ref<HTMLDivElement | null>(null);
const watermarkUrl = ref<string>('');
let observer: MutationObserver | null = null;
let isInternalModifying = false;

// 2. 规整样式与字体配置
const resolvedFont = computed(() => ({
  color: props.font?.color ?? 'rgba(0, 0, 0, 0.12)',
  fontSize: props.font?.fontSize ?? 14,
  fontWeight: props.font?.fontWeight ?? 'normal',
  fontFamily: props.font?.fontFamily ?? 'sans-serif',
  fontStyle: props.font?.fontStyle ?? 'normal',
}));

const resolvedOffset = computed<[number, number]>(() => {
  if (props.offset) {
    return props.offset;
  }
  return [props.gap[0] / 2, props.gap[1] / 2];
});

/**
 * 响应式遮罩样式对象。
 */
const maskStyle = computed<CSSProperties>(() => ({
  position: props.full ? 'fixed' : 'absolute',
  top: '0',
  left: '0',
  right: '0',
  bottom: '0',
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
  zIndex: props.zIndex,
  backgroundImage: watermarkUrl.value ? `url("${watermarkUrl.value}")` : 'none',
  backgroundRepeat: 'repeat',
  backgroundPosition: `${resolvedOffset.value[0]}px ${resolvedOffset.value[1]}px`,
  display: 'block',
  opacity: '1',
  visibility: 'visible',
}));

/**
 * SVG 矢量文本降级生成 DataURL（无 Canvas 环境或离线自洽保底）。
 */
const createSvgDataUrl = (
  textLines: string[],
  canvasWidth: number,
  canvasHeight: number,
  rotate: number,
  color: string,
): string => {
  const lineHeight = resolvedFont.value.fontSize * 1.5;
  const startY = canvasHeight / 2 - ((textLines.length - 1) * lineHeight) / 2;

  const textElements = textLines
    .map(
      (line, idx) =>
        `<text x="${canvasWidth / 2}" y="${startY + idx * lineHeight}" fill="${color}" font-style="${resolvedFont.value.fontStyle}" font-weight="${resolvedFont.value.fontWeight}" font-size="${resolvedFont.value.fontSize}px" font-family="${resolvedFont.value.fontFamily}" text-anchor="middle" dominant-baseline="middle">${line}</text>`,
    )
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}"><g transform="rotate(${rotate} ${canvasWidth / 2} ${canvasHeight / 2})">${textElements}</g></svg>`;

  const base64 =
    typeof Buffer !== 'undefined'
      ? Buffer.from(svg, 'utf-8').toString('base64')
      : typeof btoa !== 'undefined'
        ? btoa(unescape(encodeURIComponent(svg)))
        : '';

  return `data:image/svg+xml;base64,${base64}`;
};

/**
 * 离屏渲染生成水印 DataURL。
 */
const generateWatermark = (): void => {
  const canvasWidth = props.width + props.gap[0];
  const canvasHeight = props.height + props.gap[1];
  const lines = Array.isArray(props.content) ? props.content : [props.content];

  if (typeof document === 'undefined') {
    watermarkUrl.value = createSvgDataUrl(
      lines,
      canvasWidth,
      canvasHeight,
      props.rotate,
      resolvedFont.value.color,
    );
    applyMaskStyle();
    return;
  }

  // 1. 若配置了图片水印优先加载与渲染图片
  if (props.image) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = window.devicePixelRatio || 1;
      canvas.width = canvasWidth * ratio;
      canvas.height = canvasHeight * ratio;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return;
      }
      ctx.scale(ratio, ratio);
      ctx.translate(canvasWidth / 2, canvasHeight / 2);
      ctx.rotate((props.rotate * Math.PI) / 180);
      ctx.drawImage(img, -props.width / 2, -props.height / 2, props.width, props.height);
      watermarkUrl.value = canvas.toDataURL('image/png');
      applyMaskStyle();
    };
    img.src = props.image;
    return;
  }

  // 2. 纯文本 Canvas 渲染
  const canvas = document.createElement('canvas');
  const ratio = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  canvas.width = canvasWidth * ratio;
  canvas.height = canvasHeight * ratio;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    watermarkUrl.value = createSvgDataUrl(
      lines,
      canvasWidth,
      canvasHeight,
      props.rotate,
      resolvedFont.value.color,
    );
    applyMaskStyle();
    return;
  }

  ctx.scale(ratio, ratio);
  ctx.translate(canvasWidth / 2, canvasHeight / 2);
  ctx.rotate((props.rotate * Math.PI) / 180);

  const fontStr = `${resolvedFont.value.fontStyle} ${resolvedFont.value.fontWeight} ${resolvedFont.value.fontSize}px ${resolvedFont.value.fontFamily}`;
  ctx.font = fontStr;
  ctx.fillStyle = resolvedFont.value.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const lineHeight = resolvedFont.value.fontSize * 1.5;
  const startY = -((lines.length - 1) * lineHeight) / 2;

  lines.forEach((line, index) => {
    ctx.fillText(line, 0, startY + index * lineHeight);
  });

  watermarkUrl.value = canvas.toDataURL('image/png');
  applyMaskStyle();
};

/**
 * 将水印背景样式安全装配到遮罩节点（强制属性防篡改防御）。
 */
const applyMaskStyle = (): void => {
  if (!maskRef.value) return;
  isInternalModifying = true;
  const mask = maskRef.value;
  mask.className = 'at-watermark__mask';
  mask.style.position = props.full ? 'fixed' : 'absolute';
  mask.style.top = '0';
  mask.style.left = '0';
  mask.style.right = '0';
  mask.style.bottom = '0';
  mask.style.width = '100%';
  mask.style.height = '100%';
  mask.style.pointerEvents = 'none';
  mask.style.zIndex = String(props.zIndex);
  mask.style.backgroundImage = `url("${watermarkUrl.value}")`;
  mask.style.backgroundRepeat = 'repeat';
  mask.style.backgroundPosition = `${resolvedOffset.value[0]}px ${resolvedOffset.value[1]}px`;
  mask.style.display = 'block';
  mask.style.opacity = '1';
  mask.style.visibility = 'visible';

  // 确保处于微任务队列末尾释放内部状态锁
  queueMicrotask(() => {
    isInternalModifying = false;
  });
};

/**
 * 启动 MutationObserver 防篡改主动防御守护。
 */
const startObserver = (): void => {
  if (!props.antiTamper || typeof MutationObserver === 'undefined') {
    return;
  }

  stopObserver();

  observer = new MutationObserver(() => {
    if (isInternalModifying) return;

    // 1. 验证遮罩节点是否仍存在于容器中（防 DOM 物理删除）
    const container = containerRef.value;
    if (container && maskRef.value && !container.contains(maskRef.value)) {
      isInternalModifying = true;
      container.appendChild(maskRef.value);
      applyMaskStyle();
      return;
    }

    // 2. 验证样式是否被篡改（防 display: none / opacity: 0 / visibility: hidden / pointer-events 篡改）
    if (maskRef.value) {
      const mask = maskRef.value;
      if (
        mask.style.display === 'none' ||
        mask.style.opacity === '0' ||
        mask.style.visibility === 'hidden' ||
        mask.style.pointerEvents !== 'none' ||
        !mask.style.backgroundImage.includes(watermarkUrl.value)
      ) {
        applyMaskStyle();
      }
    }
  });

  if (containerRef.value) {
    observer.observe(containerRef.value, {
      childList: true,
      subtree: true,
    });
  }

  if (maskRef.value) {
    observer.observe(maskRef.value, {
      attributes: true,
      attributeFilter: ['style', 'class', 'hidden'],
    });
  }
};

/**
 * 停止并释放 MutationObserver 监听。
 */
const stopObserver = (): void => {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
};

// 3. 响应式监听与重绘
watch(
  [
    () => props.content,
    () => props.image,
    () => props.width,
    () => props.height,
    () => props.rotate,
    () => props.zIndex,
    () => props.gap,
    () => props.offset,
    () => props.font,
    () => props.full,
  ],
  () => {
    generateWatermark();
  },
  { deep: true },
);

watch(
  () => props.antiTamper,
  val => {
    if (val) {
      startObserver();
    } else {
      stopObserver();
    }
  },
);

onMounted(() => {
  generateWatermark();
  startObserver();
});

onBeforeUnmount(() => {
  stopObserver();
});

defineExpose({
  containerRef,
  maskRef,
  generateWatermark,
});
</script>

<template>
  <div ref="containerRef" :class="['at-watermark', { 'at-watermark--full': full }]">
    <slot />
    <div ref="maskRef" class="at-watermark__mask" :style="maskStyle" />
  </div>
</template>

<style scoped>
.at-watermark {
  position: relative;
  width: 100%;
}

.at-watermark--full {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
}

.at-watermark__mask {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  background-repeat: repeat;
}
</style>
