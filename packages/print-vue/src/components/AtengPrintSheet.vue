<script setup lang="ts">
/**
 * 物理纸张排版统领容器组件。
 *
 * 负责定义标准物理纸张预设（A4/A5/热敏小票/连续针式多联单）、视口仿真缩放、
 * 注入 @media print 样式隔离、提供物理页边距管控，并驱动动态长单据分页防截断引擎。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import {
  type ResolvedPaperDimensions,
  resolvePaperDimensions,
  mmToPx,
  parseLengthToPx,
} from '../types/paper';
import type { AtengPrintSheetProps } from '../types/components';
import { usePrint } from '../composables/usePrint';
import type { PrintOptions } from '../types';
import { PaginationEngine, getElementHeight, type PageSlice } from '../services/PaginationEngine';

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
const sourceRef = ref<HTMLElement | null>(null);
const headerMeasureRef = ref<HTMLElement | null>(null);
const footerMeasureRef = ref<HTMLElement | null>(null);

const totalPages = ref(1);
const paginatedPages = ref<PageSlice[]>([]);
const pageMountPoints = new Map<number, HTMLElement>();

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

/** 纸张单页样式对象 */
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

/** 注册并挂载每页的切片内容 */
const setPageMountPoint = (el: HTMLElement | null, pageIndex: number) => {
  if (el) {
    pageMountPoints.set(pageIndex, el);
    const pageData = paginatedPages.value.find(p => p.pageIndex === pageIndex);
    if (pageData) {
      el.innerHTML = '';
      pageData.elements.forEach(node => {
        el.appendChild(node.cloneNode(true));
      });
    }
  } else {
    pageMountPoints.delete(pageIndex);
  }
};

/** 执行动态长单据分页计算 */
const runPagination = () => {
  if (!props.autoPaginate || !sourceRef.value) return;

  // 1. 获取物理单页高度（px）
  const pageHeightPx = dimensions.value.heightMm > 0 ? mmToPx(dimensions.value.heightMm) : 1122.5;
  const paddingTopPx = parseLengthToPx(resolvedPadding.value, mmToPx(10));
  const paddingBottomPx = paddingTopPx;

  // 2. 测量页眉与页脚插槽高度
  let headerHeight = 0;
  if (headerMeasureRef.value) {
    headerHeight = getElementHeight(headerMeasureRef.value);
  }
  let footerHeight = 0;
  if (footerMeasureRef.value) {
    footerHeight = getElementHeight(footerMeasureRef.value);
  }

  // 3. 执行切片
  const result = PaginationEngine.paginate(sourceRef.value, {
    pageHeight: pageHeightPx,
    paddingTop: paddingTopPx,
    paddingBottom: paddingBottomPx,
    headerHeight,
    footerHeight,
  });

  totalPages.value = result.totalPages;
  paginatedPages.value = result.pages;

  // 4. 将切片克隆 DOM 节点填入挂载容器
  nextTick(() => {
    result.pages.forEach(page => {
      const mountPoint = pageMountPoints.get(page.pageIndex);
      if (mountPoint) {
        mountPoint.innerHTML = '';
        page.elements.forEach(node => {
          mountPoint.appendChild(node.cloneNode(true));
        });
      }
    });
  });
};

let mutationObserver: MutationObserver | null = null;

onMounted(() => {
  if (props.autoPaginate) {
    nextTick(() => {
      runPagination();
    });
    if (typeof MutationObserver !== 'undefined' && sourceRef.value) {
      mutationObserver = new MutationObserver(() => {
        runPagination();
      });
      mutationObserver.observe(sourceRef.value, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
  }
});

watch(
  () => [
    props.autoPaginate,
    props.preset,
    props.width,
    props.height,
    props.orientation,
    props.padding,
  ],
  () => {
    if (props.autoPaginate) {
      nextTick(() => {
        runPagination();
      });
    }
  },
);

onUnmounted(() => {
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }
  pageMountPoints.clear();
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
  totalPages,
  runPagination,
  print,
});
</script>

<template>
  <div class="at-print-sheet-wrapper">
    <!-- 单页模式（未开启 autoPaginate 时） -->
    <div
      v-if="!autoPaginate"
      ref="sheetRef"
      class="at-print-sheet"
      :class="{
        'at-print-sheet--shadow': showShadow,
        'at-print-sheet--continuous': dimensions.isContinuous,
        'at-print-sheet--landscape': orientation === 'landscape',
      }"
      :style="sheetStyle"
    >
      <div v-if="$slots.header" class="at-print-page__header">
        <slot name="header" :page-index="1" :total-pages="1" :dimensions="dimensions" />
      </div>
      <slot :page-index="1" :total-pages="1" :dimensions="dimensions" />
      <div v-if="$slots.footer" class="at-print-page__footer">
        <slot name="footer" :page-index="1" :total-pages="1" :dimensions="dimensions" />
      </div>
    </div>

    <!-- 动态长单据分页模式（开启 autoPaginate 时） -->
    <div v-else class="at-print-sheet-pages-wrapper">
      <!-- 离屏隐藏测量容器：供 Vue 渲染真实数据，供分页引擎扫描测量尺寸 -->
      <div
        ref="sourceRef"
        class="at-print-source-hidden"
        :style="{
          width: dimensions.width,
          padding: resolvedPadding,
        }"
      >
        <slot :page-index="1" :total-pages="totalPages" :dimensions="dimensions" />
      </div>

      <!-- 页眉/页脚尺寸测量桩 -->
      <div
        v-if="$slots.header"
        ref="headerMeasureRef"
        class="at-print-measure-hidden"
        :style="{ width: dimensions.width }"
      >
        <slot name="header" :page-index="1" :total-pages="totalPages" :dimensions="dimensions" />
      </div>
      <div
        v-if="$slots.footer"
        ref="footerMeasureRef"
        class="at-print-measure-hidden"
        :style="{ width: dimensions.width }"
      >
        <slot name="footer" :page-index="1" :total-pages="totalPages" :dimensions="dimensions" />
      </div>

      <!-- 打印与预览目标主容器 -->
      <div ref="sheetRef" class="at-print-sheets-container">
        <div
          v-for="page in paginatedPages"
          :key="page.pageIndex"
          class="at-print-sheet at-print-page"
          :class="{
            'at-print-sheet--shadow': showShadow,
            'at-print-sheet--continuous': dimensions.isContinuous,
            'at-print-sheet--landscape': orientation === 'landscape',
          }"
          :style="sheetStyle"
          :data-page-index="page.pageIndex"
          :data-total-pages="totalPages"
        >
          <!-- 顶栏页眉插槽 -->
          <div v-if="$slots.header" class="at-print-page__header">
            <slot
              name="header"
              :page-index="page.pageIndex"
              :total-pages="totalPages"
              :dimensions="dimensions"
            />
          </div>

          <!-- 切片内容挂载区 -->
          <div
            :ref="el => setPageMountPoint(el as HTMLElement, page.pageIndex)"
            class="at-print-page__body"
          ></div>

          <!-- 底栏页脚插槽 -->
          <div v-if="$slots.footer" class="at-print-page__footer">
            <slot
              name="footer"
              :page-index="page.pageIndex"
              :total-pages="totalPages"
              :dimensions="dimensions"
            />
          </div>
        </div>
      </div>
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

.at-print-source-hidden,
.at-print-measure-hidden {
  position: absolute !important;
  left: -99999px !important;
  top: -99999px !important;
  visibility: hidden !important;
  pointer-events: none !important;
  box-sizing: border-box !important;
}

.at-print-sheet-pages-wrapper,
.at-print-sheets-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.at-print-sheet {
  background-color: var(--at-print-paper-bg, #ffffff);
  box-sizing: border-box;
  color: var(--at-print-text-color, #0f172a);
  position: relative;
  transition: transform 0.15s ease-out;
}

.at-print-page {
  display: flex;
  flex-direction: column;
  margin-bottom: 24px;
}

.at-print-page__header {
  flex-shrink: 0;
  margin-bottom: 8px;
}

.at-print-page__body {
  flex: 1 1 auto;
}

.at-print-page__footer {
  flex-shrink: 0;
  margin-top: auto;
  padding-top: 8px;
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

  .at-print-source-hidden,
  .at-print-measure-hidden {
    display: none !important;
  }

  .at-print-sheet {
    box-shadow: none !important;
    border: none !important;
    margin: 0 !important;
    width: 100% !important;
    transform: none !important;
  }

  .at-print-page {
    margin-bottom: 0 !important;
    break-after: page !important;
    page-break-after: always !important;
  }

  .at-print-page:last-child {
    break-after: auto !important;
    page-break-after: auto !important;
  }
}
</style>
