<script setup lang="ts">
/**
 * AtengVideoWatermark 企业级防录屏安全水印组件。
 *
 * 具备 Canvas 高清动态平铺渲染、微位移随机浮动防录屏反算法，
 * 以及 MutationObserver DOM 审查防篡改与毫秒级自愈防线。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { VideoWatermarkEmits, VideoWatermarkProps, WatermarkTamperDetail } from '../types';

const props = withDefaults(defineProps<VideoWatermarkProps>(), {
  content: () => ['涉密视频', '严禁录屏'],
  fontSize: 16,
  fontFamily: 'sans-serif',
  color: '#ffffff',
  opacity: 0.15,
  rotate: -22,
  gapX: 160,
  gapY: 120,
  tamperProof: true,
  floating: true,
  floatInterval: 3000,
  floatDistance: 15,
  zIndex: 30,
});

const emit = defineEmits<VideoWatermarkEmits>();

const rootRef = ref<HTMLDivElement | null>(null);
const watermarkElRef = ref<HTMLDivElement | null>(null);
const backgroundUrl = ref<string>('');
const currentTranslate = ref<{ x: number; y: number }>({ x: 0, y: 0 });

let floatTimer: ReturnType<typeof setInterval> | null = null;
let nodeObserver: MutationObserver | null = null;
let parentObserver: MutationObserver | null = null;
let isSelfHealing = false;

/**
 * 文本列表归一化。
 */
const textLines = computed<string[]>(() => {
  if (Array.isArray(props.content)) {
    return props.content.filter(Boolean);
  }
  if (typeof props.content === 'string') {
    return [props.content];
  }
  return ['涉密资产'];
});

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 安全将 UTF-8 字符串转换为 Base64 编码（跨浏览器与 Node SSR 兼容）。
 */
function toBase64(str: string): string {
  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    return window.btoa(unescape(encodeURIComponent(str)));
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf-8').toString('base64');
  }
  return '';
}

/**
 * 基于 Canvas 或 SVG 矢量动态渲染平铺水印切片。
 */
const generateWatermarkPattern = (): string => {
  if (typeof document === 'undefined') {
    return '';
  }

  const fontSize = props.fontSize;
  const lineHeight = fontSize * 1.4;
  const lines = textLines.value;
  const textTotalHeight = lines.length * lineHeight;
  const boxWidth = Math.max(props.gapX + 100, 160);
  const boxHeight = Math.max(props.gapY + textTotalHeight, 120);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // 若运行宿主无 2D Canvas 引擎（如 happy-dom/SSR），无缝降级为纯矢量 Base64 SVG DataURL
  if (!ctx) {
    const textSpans = lines
      .map((line, index) => {
        const y = -(textTotalHeight / 2) + lineHeight / 2 + index * lineHeight;
        return `<tspan x="0" y="${y}">${escapeXml(line)}</tspan>`;
      })
      .join('');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${boxWidth}" height="${boxHeight}"><g transform="translate(${boxWidth / 2}, ${boxHeight / 2}) rotate(${props.rotate})"><text text-anchor="middle" dominant-baseline="central" font-size="${fontSize}" font-family="${props.fontFamily}" fill="${props.color}" fill-opacity="${props.opacity}">${textSpans}</text></g></svg>`;

    return `data:image/svg+xml;base64,${toBase64(svg)}`;
  }

  const ratio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  // 1. 测量文本宽度
  ctx.font = `${fontSize}px ${props.fontFamily}`;
  let maxTextWidth = 0;
  for (const line of lines) {
    const metrics = ctx.measureText(line);
    if (metrics.width > maxTextWidth) {
      maxTextWidth = metrics.width;
    }
  }

  const dynamicWidth = Math.max(props.gapX + maxTextWidth, 120);
  const dynamicHeight = Math.max(props.gapY + textTotalHeight, 80);

  // 2. 高分屏倍率缩放
  canvas.width = dynamicWidth * ratio;
  canvas.height = dynamicHeight * ratio;
  canvas.style.width = `${dynamicWidth}px`;
  canvas.style.height = `${dynamicHeight}px`;

  ctx.scale(ratio, ratio);

  // 3. 变换原点至中心并旋转倾斜角
  ctx.translate(dynamicWidth / 2, dynamicHeight / 2);
  ctx.rotate((props.rotate * Math.PI) / 180);

  // 4. 绘制文字
  ctx.font = `${fontSize}px ${props.fontFamily}`;
  ctx.fillStyle = props.color;
  ctx.globalAlpha = props.opacity;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const startY = -(textTotalHeight / 2) + lineHeight / 2;
  lines.forEach((line, index) => {
    ctx.fillText(line, 0, startY + index * lineHeight);
  });

  return canvas.toDataURL('image/png');
};

/**
 * 刷新水印背景。
 */
const renderWatermark = (): void => {
  backgroundUrl.value = generateWatermarkPattern();
  applyWatermarkStyle();
};

/**
 * 强制应用法定水印样式。
 */
const applyWatermarkStyle = (): void => {
  const el = watermarkElRef.value;
  if (!el) {
    return;
  }

  isSelfHealing = true;
  el.style.position = 'absolute';
  el.style.inset = `-${props.floatDistance * 2}px`; // 预留浮动边距，防止平铺露白
  el.style.zIndex = String(props.zIndex);
  el.style.pointerEvents = 'none';
  el.style.userSelect = 'none';
  el.style.display = 'block';
  el.style.visibility = 'visible';
  el.style.opacity = '1';
  el.style.backgroundImage = `url("${backgroundUrl.value}")`;
  el.style.backgroundRepeat = 'repeat';
  el.style.backgroundPosition = '0 0';
  el.style.transform = `translate3d(${currentTranslate.value.x}px, ${currentTranslate.value.y}px, 0)`;
  el.style.transition = 'transform 1.2s cubic-bezier(0.25, 1, 0.5, 1)';

  void nextTick(() => {
    isSelfHealing = false;
  });
};

/**
 * 启动微位移随机浮动定时器。
 */
const startFloating = (): void => {
  stopFloating();
  if (!props.floating) {
    return;
  }

  floatTimer = setInterval(
    () => {
      const range = props.floatDistance;
      const dx = Math.round((Math.random() - 0.5) * 2 * range);
      const dy = Math.round((Math.random() - 0.5) * 2 * range);
      currentTranslate.value = { x: dx, y: dy };
      if (watermarkElRef.value) {
        watermarkElRef.value.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      }
    },
    Math.max(props.floatInterval, 1000),
  );
};

const stopFloating = (): void => {
  if (floatTimer) {
    clearInterval(floatTimer);
    floatTimer = null;
  }
};

/**
 * 触发安全告警事件并派发。
 */
const triggerTamperAlert = (type: 'style' | 'removal'): void => {
  const detail: WatermarkTamperDetail = {
    type,
    timestamp: Date.now(),
  };
  emit('watermark-tampered', detail);
  emit('watermarkTampered', detail);
};

/**
 * 挂载防篡改 MutationObserver 监听器。
 */
const setupTamperProofObserver = (): void => {
  teardownTamperProofObserver();
  if (!props.tamperProof || typeof MutationObserver === 'undefined') {
    return;
  }

  const targetEl = watermarkElRef.value;
  const parentEl = rootRef.value;
  if (!targetEl || !parentEl) {
    return;
  }

  // 1. 监听水印节点自身的属性/样式修改
  nodeObserver = new MutationObserver(() => {
    if (isSelfHealing) {
      return;
    }
    // 校验关键样式是否被恶意注入修改
    const style = targetEl.style;
    const parsedOpacity = parseFloat(style.opacity);
    const isOpacityTampered =
      style.opacity === '0' || (Number.isFinite(parsedOpacity) && parsedOpacity <= 0.05);

    const isHidden =
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      isOpacityTampered ||
      targetEl.hidden;

    if (isHidden || !style.backgroundImage.includes(backgroundUrl.value)) {
      triggerTamperAlert('style');
      applyWatermarkStyle();
    }
  });

  nodeObserver.observe(targetEl, {
    attributes: true,
    attributeFilter: ['style', 'class', 'hidden'],
  });

  // 2. 监听父容器子节点移除（防审查直接从 DOM 树删除节点）
  parentObserver = new MutationObserver(mutations => {
    if (isSelfHealing) {
      return;
    }
    for (const m of mutations) {
      for (let i = 0; i < m.removedNodes.length; i++) {
        const removed = m.removedNodes[i];
        if (removed === targetEl) {
          triggerTamperAlert('removal');
          // 毫秒级自愈挂回父容器
          isSelfHealing = true;
          parentEl.appendChild(targetEl);
          applyWatermarkStyle();
          void nextTick(() => {
            isSelfHealing = false;
          });
          return;
        }
      }
    }
  });

  parentObserver.observe(parentEl, {
    childList: true,
  });
};

const teardownTamperProofObserver = (): void => {
  if (nodeObserver) {
    nodeObserver.disconnect();
    nodeObserver = null;
  }
  if (parentObserver) {
    parentObserver.disconnect();
    parentObserver = null;
  }
};

// 监听参数变化重新渲染水印切片
watch(
  () => [
    props.content,
    props.fontSize,
    props.fontFamily,
    props.color,
    props.opacity,
    props.rotate,
    props.gapX,
    props.gapY,
  ],
  () => {
    renderWatermark();
  },
  { deep: true },
);

watch(
  () => [props.floating, props.floatInterval, props.floatDistance],
  () => {
    startFloating();
  },
);

onMounted(() => {
  renderWatermark();
  startFloating();
  setupTamperProofObserver();
});

onBeforeUnmount(() => {
  stopFloating();
  teardownTamperProofObserver();
});

defineExpose({
  refresh: (): void => {
    renderWatermark();
  },
  destroy: (): void => {
    stopFloating();
    teardownTamperProofObserver();
  },
});
</script>

<template>
  <div ref="rootRef" class="at-video-watermark-wrapper">
    <div
      ref="watermarkElRef"
      class="at-video-watermark"
      data-testid="at-video-watermark"
      aria-hidden="true"
    ></div>
  </div>
</template>

<style scoped>
.at-video-watermark-wrapper {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 30;
}

.at-video-watermark {
  position: absolute;
  inset: 0;
  pointer-events: none;
  user-select: none;
}
</style>
