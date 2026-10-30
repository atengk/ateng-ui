<script setup lang="ts">
/**
 * AtengPageRuler: A4 物理仿真毫米级刻度标尺组件。
 *
 * 遵循四层洋葱拓扑之 L2 专用扩展层规范，纯原生 SVG/CSS 绘制 A4 页面刻度（cm/mm），
 * 标示可排版区域与左右页边距指示滑块，在打印介质下自动隐藏。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { computed } from 'vue';
import type { AtengPageRulerProps } from '../types/docx';

const props = withDefaults(defineProps<AtengPageRulerProps>(), {
  width: undefined,
  marginLeft: 25.4,
  marginRight: 25.4,
  orientation: 'portrait',
});

// 计算有效总宽度（mm）：纵向 210mm，横向 297mm
const totalMm = computed(() => {
  if (props.width !== undefined && props.width > 0) {
    return props.width;
  }
  return props.orientation === 'landscape' ? 297 : 210;
});

// 生成刻度线数据集合
interface TickMark {
  mm: number;
  isMajor: boolean; // 是否是厘米长刻度
  isMedium: boolean; // 是否是 5mm 中刻度
  label?: number;
}

const ticks = computed<TickMark[]>(() => {
  const result: TickMark[] = [];
  const max = totalMm.value;
  for (let mm = 0; mm <= max; mm++) {
    const isMajor = mm % 10 === 0;
    const isMedium = !isMajor && mm % 5 === 0;
    result.push({
      mm,
      isMajor,
      isMedium,
      label: isMajor ? mm / 10 : undefined,
    });
  }
  return result;
});

// 边距百分比或 mm 转换位置（用于 SVG viewBox）
const leftMarginMm = computed(() => Math.max(0, props.marginLeft ?? 25.4));
const rightMarginMm = computed(() => Math.max(0, props.marginRight ?? 25.4));
const contentWidthMm = computed(() =>
  Math.max(0, totalMm.value - leftMarginMm.value - rightMarginMm.value),
);
</script>

<template>
  <div class="at-page-ruler" :class="[`at-page-ruler--${orientation}`]" data-test="page-ruler">
    <svg
      class="at-page-ruler__svg"
      :viewBox="`0 0 ${totalMm} 22`"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <!-- 左侧边距阴影区 -->
      <rect :x="0" :y="0" :width="leftMarginMm" height="22" class="at-page-ruler__margin-zone" />

      <!-- 正文有效排版区（高亮白底） -->
      <rect
        :x="leftMarginMm"
        :y="0"
        :width="contentWidthMm"
        height="22"
        class="at-page-ruler__content-zone"
      />

      <!-- 右侧边距阴影区 -->
      <rect
        :x="totalMm - rightMarginMm"
        :y="0"
        :width="rightMarginMm"
        height="22"
        class="at-page-ruler__margin-zone"
      />

      <!-- 底部分割线 -->
      <line :x1="0" y1="21.5" :x2="totalMm" y2="21.5" class="at-page-ruler__baseline" />

      <!-- 刻度线与文字 -->
      <g class="at-page-ruler__ticks">
        <template v-for="tick in ticks" :key="tick.mm">
          <!-- 刻度线 -->
          <line
            :x1="tick.mm"
            :y1="tick.isMajor ? 10 : tick.isMedium ? 13 : 16"
            :x2="tick.mm"
            y2="21"
            class="at-page-ruler__tick-line"
            :class="{
              'at-page-ruler__tick-line--major': tick.isMajor,
              'at-page-ruler__tick-line--medium': tick.isMedium,
            }"
          />
          <!-- 厘米数字标注 -->
          <text
            v-if="tick.isMajor && tick.label !== undefined"
            :x="tick.mm"
            y="9"
            class="at-page-ruler__tick-text"
            text-anchor="middle"
          >
            {{ tick.label }}
          </text>
        </template>
      </g>

      <!-- 左边距游标滑块 -->
      <polygon
        :points="`${leftMarginMm - 2.5},21 ${leftMarginMm + 2.5},21 ${leftMarginMm},17`"
        class="at-page-ruler__marker"
      />

      <!-- 右边距游标滑块 -->
      <polygon
        :points="`${totalMm - rightMarginMm - 2.5},21 ${totalMm - rightMarginMm + 2.5},21 ${totalMm - rightMarginMm},17`"
        class="at-page-ruler__marker"
      />
    </svg>
  </div>
</template>

<style scoped>
.at-page-ruler {
  width: 100%;
  height: 22px;
  background-color: var(--at-editor-docx-ruler-bg, #f3f4f6);
  user-select: none;
  overflow: hidden;
  box-sizing: border-box;
}

.at-page-ruler__svg {
  width: 100%;
  height: 100%;
  display: block;
}

.at-page-ruler__margin-zone {
  fill: #e5e7eb;
}

.at-page-ruler__content-zone {
  fill: #ffffff;
}

.at-page-ruler__baseline {
  stroke: #cbd5e1;
  stroke-width: 0.5;
}

.at-page-ruler__tick-line {
  stroke: #94a3b8;
  stroke-width: 0.25;
}

.at-page-ruler__tick-line--major {
  stroke: #475569;
  stroke-width: 0.4;
}

.at-page-ruler__tick-line--medium {
  stroke: #64748b;
  stroke-width: 0.3;
}

.at-page-ruler__tick-text {
  font-size: 5px;
  fill: #64748b;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-weight: 500;
}

.at-page-ruler__marker {
  fill: #2563eb;
}

/* 打印介质下隐藏标尺 */
@media print {
  .at-page-ruler {
    display: none !important;
  }
}
</style>
