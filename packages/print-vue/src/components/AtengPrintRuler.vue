<script setup lang="ts">
/**
 * 物理毫米网格标尺辅助组件。
 *
 * 用于在单据排版与预览时提供精确的横纵向毫米（mm）刻度线、辅助参考线与鼠标物理坐标感知。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref, computed } from 'vue';
import type { AtengPrintRulerProps } from '../types/components';

const props = withDefaults(defineProps<AtengPrintRulerProps>(), {
  width: 210,
  height: 297,
  scale: 1,
  rulerThickness: 24,
  showCrosshair: true,
  gridLines: false,
});

const contentAreaRef = ref<HTMLElement | null>(null);

/** 解析出毫米数值 */
const widthMm = computed(() => {
  if (typeof props.width === 'number') return props.width;
  const p = parseFloat(props.width);
  return isNaN(p) ? 210 : p;
});

const heightMm = computed(() => {
  if (typeof props.height === 'number') return props.height;
  if (props.height === 'auto') return 300;
  const p = parseFloat(props.height);
  return isNaN(p) ? 297 : p;
});

/** 标尺刻度集计算（每 10mm 一个主刻度与文字，每 5mm 一个中刻度，每 1mm 一个细刻度） */
// 1mm 约等于 3.7795275591 px (96 DPI 屏幕基准)
const MM_TO_PX = 3.7795275591;

/** 鼠标实时悬浮坐标（单位 mm 与 px） */
const isHovering = ref(false);
const cursorX = ref(0);
const cursorY = ref(0);

const handleMouseMove = (e: MouseEvent) => {
  if (!contentAreaRef.value) return;
  const rect = contentAreaRef.value.getBoundingClientRect();
  const currentScale = props.scale || 1;

  const rawX = (e.clientX - rect.left) / currentScale;
  const rawY = (e.clientY - rect.top) / currentScale;

  const clampedX = Math.max(0, Math.min(rawX, widthMm.value * MM_TO_PX));
  const clampedY = Math.max(0, Math.min(rawY, heightMm.value * MM_TO_PX));

  cursorX.value = clampedX / MM_TO_PX;
  cursorY.value = clampedY / MM_TO_PX;
  isHovering.value = true;
};

const handleMouseLeave = () => {
  isHovering.value = false;
};

/** 刻度计算 */
const horizontalTicks = computed(() => {
  const ticks: Array<{ mm: number; posPx: number; type: 'major' | 'medium' | 'minor' }> = [];
  const total = Math.ceil(widthMm.value);
  for (let mm = 0; mm <= total; mm++) {
    const type = mm % 10 === 0 ? 'major' : mm % 5 === 0 ? 'medium' : 'minor';
    ticks.push({
      mm,
      posPx: mm * MM_TO_PX,
      type,
    });
  }
  return ticks;
});

const verticalTicks = computed(() => {
  const ticks: Array<{ mm: number; posPx: number; type: 'major' | 'medium' | 'minor' }> = [];
  const total = Math.ceil(heightMm.value);
  for (let mm = 0; mm <= total; mm++) {
    const type = mm % 10 === 0 ? 'major' : mm % 5 === 0 ? 'medium' : 'minor';
    ticks.push({
      mm,
      posPx: mm * MM_TO_PX,
      type,
    });
  }
  return ticks;
});
</script>

<template>
  <div class="at-print-ruler-container" :style="{ '--ruler-size': `${rulerThickness}px` }">
    <!-- 左上角原点标识 -->
    <div class="at-print-ruler-corner">mm</div>

    <!-- 顶部水平标尺 -->
    <div class="at-print-ruler-top">
      <svg
        class="at-print-ruler-svg"
        :width="widthMm * MM_TO_PX"
        :height="rulerThickness"
        :style="{
          transform: scale !== 1 ? `scaleX(${scale})` : undefined,
          transformOrigin: 'left',
        }"
      >
        <g v-for="t in horizontalTicks" :key="`h-${t.mm}`">
          <line
            :x1="t.posPx"
            :y1="t.type === 'major' ? 6 : t.type === 'medium' ? 12 : 16"
            :x2="t.posPx"
            :y2="rulerThickness"
            class="at-print-ruler-tick"
            :class="`at-print-ruler-tick--${t.type}`"
          />
          <text v-if="t.type === 'major'" :x="t.posPx + 2" y="9" class="at-print-ruler-text">
            {{ t.mm }}
          </text>
        </g>
        <!-- 鼠标水平位置指示器 -->
        <line
          v-if="isHovering && showCrosshair"
          :x1="cursorX * MM_TO_PX"
          y1="0"
          :x2="cursorX * MM_TO_PX"
          :y2="rulerThickness"
          class="at-print-ruler-indicator"
        />
      </svg>
    </div>

    <!-- 左侧垂直标尺 -->
    <div class="at-print-ruler-left">
      <svg
        class="at-print-ruler-svg"
        :width="rulerThickness"
        :height="heightMm * MM_TO_PX"
        :style="{ transform: scale !== 1 ? `scaleY(${scale})` : undefined, transformOrigin: 'top' }"
      >
        <g v-for="t in verticalTicks" :key="`v-${t.mm}`">
          <line
            :x1="t.type === 'major' ? 6 : t.type === 'medium' ? 12 : 16"
            :y1="t.posPx"
            :x2="rulerThickness"
            :y2="t.posPx"
            class="at-print-ruler-tick"
            :class="`at-print-ruler-tick--${t.type}`"
          />
          <text v-if="t.type === 'major'" x="2" :y="t.posPx + 9" class="at-print-ruler-text">
            {{ t.mm }}
          </text>
        </g>
        <!-- 鼠标垂直位置指示器 -->
        <line
          v-if="isHovering && showCrosshair"
          x1="0"
          :y1="cursorY * MM_TO_PX"
          :x2="rulerThickness"
          :y2="cursorY * MM_TO_PX"
          class="at-print-ruler-indicator"
        />
      </svg>
    </div>

    <!-- 标尺内容区域（包裹排版画布） -->
    <div
      ref="contentAreaRef"
      class="at-print-ruler-content"
      :class="{ 'at-print-ruler-content--grid': gridLines }"
      @mousemove="handleMouseMove"
      @mouseleave="handleMouseLeave"
    >
      <slot />

      <!-- 十字准星与坐标气泡 -->
      <template v-if="isHovering && showCrosshair">
        <div class="at-print-crosshair-x" :style="{ left: `${cursorX * MM_TO_PX * scale}px` }" />
        <div class="at-print-crosshair-y" :style="{ top: `${cursorY * MM_TO_PX * scale}px` }" />
        <div
          class="at-print-coord-badge"
          :style="{
            left: `${cursorX * MM_TO_PX * scale + 10}px`,
            top: `${cursorY * MM_TO_PX * scale + 10}px`,
          }"
        >
          X: {{ cursorX.toFixed(1) }}mm, Y: {{ cursorY.toFixed(1) }}mm
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.at-print-ruler-container {
  display: grid;
  grid-template-columns: var(--ruler-size, 24px) 1fr;
  grid-template-rows: var(--ruler-size, 24px) 1fr;
  user-select: none;
  background-color: var(--at-print-bg, #f8fafc);
  border: 1px solid var(--at-print-border-color, #e2e8f0);
  box-sizing: border-box;
}

.at-print-ruler-corner {
  grid-column: 1;
  grid-row: 1;
  background: #f1f5f9;
  border-right: 1px solid var(--at-print-border-color, #cbd5e1);
  border-bottom: 1px solid var(--at-print-border-color, #cbd5e1);
  font-size: 10px;
  color: var(--at-print-ruler-text, #64748b);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.at-print-ruler-top {
  grid-column: 2;
  grid-row: 1;
  background: #f1f5f9;
  border-bottom: 1px solid var(--at-print-border-color, #cbd5e1);
  overflow: hidden;
}

.at-print-ruler-left {
  grid-column: 1;
  grid-row: 2;
  background: #f1f5f9;
  border-right: 1px solid var(--at-print-border-color, #cbd5e1);
  overflow: hidden;
}

.at-print-ruler-content {
  grid-column: 2;
  grid-row: 2;
  position: relative;
  overflow: auto;
  padding: 10px;
}

.at-print-ruler-content--grid {
  background-image:
    linear-gradient(to right, #f1f5f9 1px, transparent 1px),
    linear-gradient(to bottom, #f1f5f9 1px, transparent 1px);
  background-size: 10mm 10mm;
}

.at-print-ruler-tick {
  stroke: var(--at-print-ruler-color, #94a3b8);
  stroke-width: 1;
}

.at-print-ruler-tick--major {
  stroke: var(--at-print-ruler-text, #475569);
}

.at-print-ruler-text {
  font-size: 8px;
  fill: var(--at-print-ruler-text, #64748b);
}

.at-print-ruler-indicator {
  stroke: var(--at-print-crosshair, #ef4444);
  stroke-width: 1.5;
}

.at-print-crosshair-x {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  border-left: 1px dashed var(--at-print-crosshair, #ef4444);
  pointer-events: none;
  z-index: 50;
}

.at-print-crosshair-y {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  border-top: 1px dashed var(--at-print-crosshair, #ef4444);
  pointer-events: none;
  z-index: 50;
}

.at-print-coord-badge {
  position: absolute;
  background: rgba(15, 23, 42, 0.85);
  color: #ffffff;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  pointer-events: none;
  z-index: 60;
  white-space: nowrap;
  font-family: monospace;
}

@media print {
  .at-print-ruler-corner,
  .at-print-ruler-top,
  .at-print-ruler-left,
  .at-print-crosshair-x,
  .at-print-crosshair-y,
  .at-print-coord-badge {
    display: none !important;
  }

  .at-print-ruler-container {
    display: block !important;
    border: none !important;
    background: transparent !important;
  }

  .at-print-ruler-content {
    padding: 0 !important;
    overflow: visible !important;
  }
}
</style>
