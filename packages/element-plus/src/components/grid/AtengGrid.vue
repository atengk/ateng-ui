<script setup lang="ts">
/**
 * 企业级容器查询自适应流式网格组件。
 *
 * 核心技术特征：
 * 1. 采用原生 CSS Grid repeat(auto-fill, minmax(minItemWidth, 1fr)) 机制实现真正感知容器物理宽度的流式排版；
 * 2. 突破传统 @media 媒体查询依赖视口宽度的局限，在分栏拖拽（AtengSplitLayout）或弹层中自洽换行；
 * 3. 根节点内置 container-type: inline-size，天然就绪现代 CSS 容器查询（Container Queries）能力；
 * 4. 具备零 JS 尺寸监听、零重流抖动与极高渲染性能优势，支持 cols 显式固定列数快速切换。
 *
 * @author Ateng
 * @since 2026-10-23
 */

import { computed, type CSSProperties } from 'vue';
import type { AtengGridProps, AtengGridGapValue } from './types';

defineOptions({
  name: 'AtengGrid',
});

const props = withDefaults(defineProps<AtengGridProps>(), {
  minItemWidth: '260px',
  gap: '16px',
  rowGap: undefined,
  colGap: undefined,
  cols: undefined,
  align: 'stretch',
  justify: 'stretch',
  tag: 'div',
});

/**
 * 规整尺寸参数为 CSS 规范字符串（纯数字自动补齐 px）。
 */
const normalizeSize = (val?: AtengGridGapValue): string => {
  if (val === undefined || val === null || val === '') {
    return '';
  }
  if (typeof val === 'number') {
    return `${val}px`;
  }
  return String(val).trim();
};

/**
 * 解析计算最小单元格宽度。
 */
const resolvedMinWidth = computed<string>(() => {
  const normalized = normalizeSize(props.minItemWidth);
  return normalized || '260px';
});

/**
 * 解析计算网格间距（行间距与列间距）。
 */
const resolvedGaps = computed<{ rowGap: string; colGap: string }>(() => {
  let baseRowGap = '16px';
  let baseColGap = '16px';

  if (Array.isArray(props.gap)) {
    baseRowGap = normalizeSize(props.gap[0]) || '16px';
    baseColGap = normalizeSize(props.gap[1]) || '16px';
  } else {
    const single = normalizeSize(props.gap) || '16px';
    baseRowGap = single;
    baseColGap = single;
  }

  // 单独指定的优先级高于统一 gap
  const finalRowGap = props.rowGap !== undefined ? normalizeSize(props.rowGap) : baseRowGap;
  const finalColGap = props.colGap !== undefined ? normalizeSize(props.colGap) : baseColGap;

  return {
    rowGap: finalRowGap,
    colGap: finalColGap,
  };
});

/**
 * 组合计算原生 Grid 核心样式。
 */
const gridStyle = computed<CSSProperties>(() => {
  const isFixedCols = typeof props.cols === 'number' && props.cols > 0;

  // 固定列数模式 vs 自适应流式模式（minmax(0, 1fr) 防止长字符撑破单元格）
  const columnsRule = isFixedCols
    ? `repeat(${props.cols}, minmax(0, 1fr))`
    : `repeat(auto-fill, minmax(${resolvedMinWidth.value}, 1fr))`;

  return {
    display: 'grid',
    containerType: 'inline-size',
    gridTemplateColumns: columnsRule,
    rowGap: resolvedGaps.value.rowGap,
    columnGap: resolvedGaps.value.colGap,
    alignItems: props.align,
    justifyItems: props.justify,
  };
});
</script>

<template>
  <component :is="tag" class="at-grid" :style="gridStyle">
    <slot />
  </component>
</template>

<style scoped>
.at-grid {
  box-sizing: border-box;
  width: 100%;
}
</style>
