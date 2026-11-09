<script setup lang="ts">
/**
 * AtengSignature 原生轻量手写电子签名板组件。
 *
 * 遵循 ADR-0021、ADR-0044 规约：
 * 1. 基于 HTML5 Canvas 原生实现，零第三方笨重依赖；
 * 2. 支持画笔线宽、颜色配置、一键清除与撤销笔迹；
 * 3. 双向绑定 Base64 DataURL 字符串，表单提交即时可用；
 * 4. 严格生命周期管理，卸载时注销全部事件监听与画布引用。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref, onMounted, onUnmounted, watch } from 'vue';

interface Props {
  modelValue?: string;
  width?: number | string;
  height?: number | string;
  strokeColor?: string;
  strokeWidth?: number;
  disabled?: boolean;
  placeholder?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  width: '100%',
  height: 180,
  strokeColor: '#000000',
  strokeWidth: 3,
  disabled: false,
  placeholder: '请在此区域内使用手写笔或鼠标签名',
});

const emit = defineEmits<{
  'update:modelValue': [val: string];
  change: [val: string];
  clear: [];
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const isDrawing = ref(false);
const hasDrawn = ref(false);
let ctx: CanvasRenderingContext2D | null = null;
let strokeHistory: ImageData[] = [];

const initCanvas = (): void => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 适配物理像素比（高分屏抗锯齿）
  const rect = canvas.getBoundingClientRect();
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  canvas.width = rect.width * dpr;
  canvas.height = (typeof props.height === 'number' ? props.height : 180) * dpr;

  ctx.scale(dpr, dpr);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = props.strokeColor;
  ctx.lineWidth = props.strokeWidth;

  // 如果已有初始图片回显
  if (props.modelValue && props.modelValue.startsWith('data:image')) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (ctx && canvas) {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        hasDrawn.value = true;
      }
    };
    img.src = props.modelValue;
  }
};

const getCanvasPos = (evt: MouseEvent | TouchEvent): { x: number; y: number } => {
  const canvas = canvasRef.value;
  if (!canvas) return { x: 0, y: 0 };
  const rect = canvas.getBoundingClientRect();
  const clientX = 'touches' in evt ? (evt.touches[0]?.clientX ?? 0) : evt.clientX;
  const clientY = 'touches' in evt ? (evt.touches[0]?.clientY ?? 0) : evt.clientY;
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
};

const handleStart = (evt: MouseEvent | TouchEvent): void => {
  if (props.disabled || !ctx || !canvasRef.value) return;
  evt.preventDefault();
  isDrawing.value = true;
  hasDrawn.value = true;

  // 保存当前快照供撤销
  const canvas = canvasRef.value;
  try {
    strokeHistory.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (strokeHistory.length > 20) {
      strokeHistory.shift();
    }
  } catch {
    // 跨域污染等边界防御
  }

  const { x, y } = getCanvasPos(evt);
  ctx.beginPath();
  ctx.moveTo(x, y);
};

const handleMove = (evt: MouseEvent | TouchEvent): void => {
  if (!isDrawing.value || props.disabled || !ctx) return;
  evt.preventDefault();
  const { x, y } = getCanvasPos(evt);
  ctx.lineTo(x, y);
  ctx.stroke();
};

const handleEnd = (): void => {
  if (!isDrawing.value || !canvasRef.value) return;
  isDrawing.value = false;
  if (ctx) {
    ctx.closePath();
  }

  // 生成 Base64 DataURL
  try {
    const dataUrl = canvasRef.value.toDataURL('image/png');
    emit('update:modelValue', dataUrl);
    emit('change', dataUrl);
  } catch {
    // ignore
  }
};

const handleClear = (): void => {
  const canvas = canvasRef.value;
  if (canvas && ctx) {
    try {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    } catch {
      // ignore
    }
  }
  strokeHistory = [];
  hasDrawn.value = false;
  emit('update:modelValue', '');
  emit('change', '');
  emit('clear');
};

const handleUndo = (): void => {
  const canvas = canvasRef.value;
  if (!canvas || !ctx || strokeHistory.length === 0) return;
  const lastState = strokeHistory.pop();
  if (lastState) {
    ctx.putImageData(lastState, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');
    emit('update:modelValue', dataUrl);
    emit('change', dataUrl);
  }
};

onMounted(() => {
  initCanvas();
  window.addEventListener('resize', initCanvas);
});

onUnmounted(() => {
  window.removeEventListener('resize', initCanvas);
  strokeHistory = [];
  ctx = null;
});

watch(
  () => props.strokeColor,
  newColor => {
    if (ctx) ctx.strokeStyle = newColor;
  },
);

watch(
  () => props.strokeWidth,
  newWidth => {
    if (ctx) ctx.lineWidth = newWidth;
  },
);

defineExpose({
  clear: handleClear,
  undo: handleUndo,
  isEmpty: () => !hasDrawn.value,
  getDataUrl: () => canvasRef.value?.toDataURL('image/png') ?? '',
});
</script>

<template>
  <div class="at-signature-box" :class="{ 'is-disabled': disabled }">
    <div
      class="at-signature-body"
      :style="{ height: typeof height === 'number' ? `${height}px` : height }"
    >
      <canvas
        ref="canvasRef"
        class="at-signature-canvas"
        @mousedown="handleStart"
        @mousemove="handleMove"
        @mouseup="handleEnd"
        @mouseleave="handleEnd"
        @touchstart.passive="handleStart"
        @touchmove.passive="handleMove"
        @touchend="handleEnd"
      />
      <div v-if="!hasDrawn && !modelValue" class="at-signature-placeholder">
        {{ placeholder }}
      </div>
    </div>

    <div v-if="!disabled" class="at-signature-actions">
      <button
        type="button"
        class="at-signature-btn"
        :disabled="strokeHistory.length === 0"
        @click="handleUndo"
      >
        ↩️ 撤销笔迹
      </button>
      <button type="button" class="at-signature-btn is-danger" @click="handleClear">
        🗑️ 清除重签
      </button>
    </div>
  </div>
</template>

<style scoped>
.at-signature-box {
  width: 100%;
  display: flex;
  flex-direction: column;
  border: 1px dashed var(--el-border-color, #dcdfe6);
  border-radius: 6px;
  background-color: var(--el-bg-color, #ffffff);
  overflow: hidden;
  box-sizing: border-box;
}

.at-signature-box.is-disabled {
  background-color: var(--el-fill-color-light, #f5f7fa);
  cursor: not-allowed;
  opacity: 0.75;
}

.at-signature-body {
  position: relative;
  width: 100%;
  touch-action: none;
}

.at-signature-canvas {
  width: 100%;
  height: 100%;
  display: block;
  cursor: crosshair;
}

.at-signature-placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  font-size: 13px;
  color: var(--el-text-color-placeholder, #a8abb2);
  user-select: none;
}

.at-signature-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 6px 12px;
  background-color: var(--el-fill-color-lighter, #fafafa);
  border-top: 1px solid var(--el-border-color-lighter, #ebeef5);
}

.at-signature-btn {
  padding: 3px 8px;
  font-size: 11px;
  border-radius: 4px;
  border: 1px solid var(--el-border-color, #dcdfe6);
  background: var(--el-bg-color, #ffffff);
  color: var(--el-text-color-regular, #606266);
  cursor: pointer;
  transition: all 0.2s ease;
}

.at-signature-btn:hover:not(:disabled) {
  color: var(--el-color-primary, #409eff);
  border-color: var(--el-color-primary-light-5, #a0cfff);
}

.at-signature-btn.is-danger:hover {
  color: var(--el-color-danger, #f56c6c);
  border-color: var(--el-color-danger-light-5, #f89898);
}

.at-signature-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
