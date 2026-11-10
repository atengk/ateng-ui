<script setup lang="ts">
/**
 * 高保真电子印章组件。
 *
 * 支持纯矢量 SVG 动态印章（单位名称沿圆弧排布、五角星、法定职能名称、防伪编码）与透明 PNG 贴图双模，
 * 支持任意角度倾斜旋转、印泥通透感透明度与穿透悬浮覆盖。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { computed } from 'vue';
import type { AtengPrintSealProps } from '../types/components';

const props = withDefaults(defineProps<AtengPrintSealProps>(), {
  type: 'svg',
  src: undefined,
  company: '杭州蚂蚁智能科技有限公司',
  title: '发货专用章',
  code: '91330100MA2ABCDE12',
  centerIcon: 'star',
  size: 120,
  color: '#dc2626',
  rotate: -12,
  opacity: 0.85,
  position: 'absolute',
  top: undefined,
  right: undefined,
  bottom: undefined,
  left: undefined,
  zIndex: 10,
});

/** 动态生成唯一路径 ID，防止同页面多印章 textPath 冲突 */
const pathId = `at-seal-path-${Math.random().toString(36).slice(2, 9)}`;

const formattedSize = computed(() => {
  if (typeof props.size === 'number') {
    return `${props.size}px`;
  }
  return props.size || '120px';
});

const formatCoord = (val: string | number | undefined) => {
  if (val === undefined) return undefined;
  return typeof val === 'number' ? `${val}px` : val;
};

const sealStyle = computed(() => {
  return {
    width: formattedSize.value,
    height: formattedSize.value,
    position: props.position,
    top: formatCoord(props.top),
    right: formatCoord(props.right),
    bottom: formatCoord(props.bottom),
    left: formatCoord(props.left),
    zIndex: props.zIndex,
    opacity: props.opacity,
    transform: `rotate(${props.rotate}deg)`,
    pointerEvents: 'none' as const,
  };
});
</script>

<template>
  <div class="at-print-seal" :style="sealStyle">
    <!-- 图片贴图模式 -->
    <img v-if="type === 'image' && src" :src="src" class="at-print-seal__image" alt="Seal" />

    <!-- 纯矢量 SVG 动态公章模式 -->
    <svg v-else viewBox="0 0 120 120" class="at-print-seal__svg" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- 单位名称上部圆弧路径：从左下方逆时针向右上方弧线 -->
        <path :id="pathId" d="M 16,60 A 44,44 0 1,1 104,60" fill="none" />
      </defs>

      <!-- 外层加厚圆形边框 -->
      <circle cx="60" cy="60" r="54" :stroke="color" stroke-width="3" fill="none" />

      <!-- 内层极细圆环 -->
      <circle
        cx="60"
        cy="60"
        r="50"
        :stroke="color"
        stroke-width="0.8"
        fill="none"
        stroke-dasharray="1000"
      />

      <!-- 环绕弧形单位全称 -->
      <text
        :fill="color"
        font-size="10.5"
        font-weight="bold"
        font-family="SimSun, 'Songti SC', serif"
        letter-spacing="0.5px"
      >
        <textPath :href="`#${pathId}`" startOffset="50%" text-anchor="middle">
          {{ company }}
        </textPath>
      </text>

      <!-- 中心五角星图标 -->
      <polygon
        v-if="centerIcon === 'star'"
        points="60,36 63,45 73,45 65,51 68,60 60,54 52,60 55,51 47,45 57,45"
        :fill="color"
      />

      <!-- 印章职能横排名称 -->
      <text
        v-if="title"
        x="60"
        y="78"
        text-anchor="middle"
        font-size="11.5"
        font-weight="bold"
        font-family="SimSun, 'Songti SC', serif"
        letter-spacing="1.5px"
        :fill="color"
      >
        {{ title }}
      </text>

      <!-- 底部防伪条码或统一信用代码 -->
      <text
        v-if="code"
        x="60"
        y="96"
        text-anchor="middle"
        font-size="7"
        font-family="Arial, Helvetica, sans-serif"
        letter-spacing="1px"
        :fill="color"
      >
        {{ code }}
      </text>
    </svg>
  </div>
</template>

<style scoped>
.at-print-seal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  mix-blend-mode: multiply;
  transition: transform 0.15s ease-out;
}

.at-print-seal__image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.at-print-seal__svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}
</style>
