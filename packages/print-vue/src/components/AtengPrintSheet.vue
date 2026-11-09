<script setup lang="ts">
/**
 * 物理纸张排版统领容器组件。
 *
 * 负责定义标准物理纸张预设（A4/A5/热敏小票/连续针式多联单）、视口仿真缩放、
 * 注入 @media print 样式隔离并提供物理页边距管控。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref, computed } from 'vue';
import { type ResolvedPaperDimensions, resolvePaperDimensions } from '../types/paper';
import type { AtengPrintSheetProps } from '../types/components';
import { usePrint } from '../composables/usePrint';
import type { PrintOptions } from '../types';

const props = withDefaults(defineProps<AtengPrintSheetProps>(), {
  preset: 'a4',
  width: undefined,
  height: undefined,
  orientation: 'portrait',
  padding: '10mm',
  scale: 1,
  showShadow: true,
  autoPaginate: false,
  offsetX: 0,
  offsetY: 0,
});

const sheetRef = ref<HTMLElement | null>(null);

/** 解析后的纸张物理尺寸 */
const dimensions = computed<ResolvedPaperDimensions>(() => {
  return resolvePaperDimensions(props.preset, props.width, props.height, props.orientation);
});

/** 解析后的物理内边距 */
const resolvedPadding = computed(() => {
  if (typeof props.padding === 'number') {
    return `${props.padding}mm`;
  }
  return props.padding || '10mm';
});

/** 纸张根节点样式对象 */
const sheetStyle = computed(() => {
  const dx = props.offsetX || 0;
  const dy = props.offsetY || 0;
  const hasOffset = dx !== 0 || dy !== 0;

  let transformStr = '';
  if (hasOffset) {
    transformStr += `translate(${dx}mm, ${dy}mm) `;
  }
  if (props.scale !== 1) {
    transformStr += `scale(${props.scale}) `;
  }

  return {
    width: dimensions.value.width,
    minHeight: dimensions.value.height,
    padding: resolvedPadding.value,
    transform: transformStr.trim() || undefined,
    transformOrigin: 'top center',
  };
});

/** 一键直接打印当前单据容器 */
const print = async (options?: PrintOptions): Promise<void> => {
  if (!sheetRef.value) return;
  const { print: doPrint } = usePrint();
  await doPrint(sheetRef.value, options);
};

defineExpose({
  sheetRef,
  dimensions,
  print,
});
</script>

<template>
  <div class="at-print-sheet-wrapper">
    <div
      ref="sheetRef"
      class="at-print-sheet"
      :class="{
        'at-print-sheet--shadow': showShadow,
        'at-print-sheet--continuous': dimensions.isContinuous,
        'at-print-sheet--landscape': orientation === 'landscape',
      }"
      :style="sheetStyle"
    >
      <slot :page-index="1" :total-pages="1" :dimensions="dimensions" />
    </div>
  </div>
</template>

<style scoped>
.at-print-sheet-wrapper {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  width: 100%;
  box-sizing: border-box;
}

.at-print-sheet {
  background-color: var(--at-print-paper-bg, #ffffff);
  box-sizing: border-box;
  color: var(--at-print-text-color, #0f172a);
  position: relative;
  transition: transform 0.15s ease-out;
}

.at-print-sheet--shadow {
  box-shadow: var(
    --at-print-shadow,
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -4px rgba(0, 0, 0, 0.1)
  );
  border: 1px solid var(--at-print-border-color, #e2e8f0);
}

@media print {
  .at-print-sheet-wrapper {
    display: block !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  .at-print-sheet {
    box-shadow: none !important;
    border: none !important;
    margin: 0 !important;
    width: 100% !important;
    transform: none !important;
  }
}
</style>
