<script setup lang="ts">
/**
 * AtengPageCanvas: A4 物理仿真纸张排版容器与动态分页画布。
 *
 * 遵循四层洋葱拓扑之 L2 专用扩展层规范，提供：
 * 1. A4 纵横向物理规格（210mm × 297mm / 297mm × 210mm）与仿真纸张阴影；
 * 2. 页面边距预设（standard/narrow/wide/custom）解析与注入；
 * 3. ResizeObserver 实时内容高度测量与不破坏编辑的虚拟分页槽计算；
 * 4. 双击交互式页眉与页脚编辑，支持动态页码标签与文字对齐；
 * 5. 顶部可选悬浮毫米标尺与 @media print A4 1:1 打印样式优化。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import type { AtengPageCanvasProps } from '../types/docx';
import AtengPageRuler from './AtengPageRuler.vue';

interface PageCanvasEmits {
  (e: 'update:header', value: string): void;
  (e: 'update:footer', value: string): void;
  (e: 'pageCountChange', totalPages: number): void;
}

const props = withDefaults(defineProps<AtengPageCanvasProps>(), {
  orientation: 'portrait',
  pageMargin: 'standard',
  showRuler: true,
  header: '关于加快推进数字化基础设施转型的指导意见',
  footer: '机密公文 · 内部流通',
  showPageNumber: true,
  headerAlign: 'center',
  footerAlign: 'center',
  editableHeaderFooter: true,
});

const emit = defineEmits<PageCanvasEmits>();

// 内部响应式状态
const contentContainerRef = ref<HTMLElement | null>(null);
const sheetRef = ref<HTMLElement | null>(null);
const totalPages = ref<number>(1);
const contentHeight = ref<number>(0);

// 页眉页脚编辑激活态
const isEditingHeader = ref<boolean>(false);
const isEditingFooter = ref<boolean>(false);
const headerInput = ref<string>(props.header);
const footerInput = ref<string>(props.footer);
const headerInputRef = ref<HTMLInputElement | null>(null);
const footerInputRef = ref<HTMLInputElement | null>(null);

// 监听外部 props 变化同步内部输入
watch(
  () => props.header,
  val => {
    headerInput.value = val ?? '';
  },
);

watch(
  () => props.footer,
  val => {
    footerInput.value = val ?? '';
  },
);

// 边距换算工具：解析为数字（mm）与 CSS 属性值
interface ResolvedMargins {
  topMm: number;
  bottomMm: number;
  leftMm: number;
  rightMm: number;
  topCss: string;
  bottomCss: string;
  leftCss: string;
  rightCss: string;
}

const resolvedMargins = computed<ResolvedMargins>(() => {
  const margin = props.pageMargin;
  if (typeof margin === 'string') {
    if (margin === 'narrow') {
      return {
        topMm: 12.7,
        bottomMm: 12.7,
        leftMm: 12.7,
        rightMm: 12.7,
        topCss: '12.7mm',
        bottomCss: '12.7mm',
        leftCss: '12.7mm',
        rightCss: '12.7mm',
      };
    }
    if (margin === 'wide') {
      return {
        topMm: 25.4,
        bottomMm: 25.4,
        leftMm: 50.8,
        rightMm: 50.8,
        topCss: '25.4mm',
        bottomCss: '25.4mm',
        leftCss: '50.8mm',
        rightCss: '50.8mm',
      };
    }
    // standard 标准 Office 边距
    return {
      topMm: 25.4,
      bottomMm: 25.4,
      leftMm: 31.8,
      rightMm: 31.8,
      topCss: '25.4mm',
      bottomCss: '25.4mm',
      leftCss: '31.8mm',
      rightCss: '31.8mm',
    };
  }

  // 自定义对象
  const parseCssToMm = (val?: string, fallback = 25.4): number => {
    if (!val) return fallback;
    const num = parseFloat(val);
    if (Number.isNaN(num)) return fallback;
    if (val.endsWith('mm')) return num;
    if (val.endsWith('cm')) return num * 10;
    if (val.endsWith('in')) return num * 25.4;
    if (val.endsWith('px')) return num / 3.7795;
    return num;
  };

  const topMm = parseCssToMm(margin?.top, 25.4);
  const bottomMm = parseCssToMm(margin?.bottom, 25.4);
  const leftMm = parseCssToMm(margin?.left, 31.8);
  const rightMm = parseCssToMm(margin?.right, 31.8);

  return {
    topMm,
    bottomMm,
    leftMm,
    rightMm,
    topCss: margin?.top ?? '25.4mm',
    bottomCss: margin?.bottom ?? '25.4mm',
    leftCss: margin?.left ?? '31.8mm',
    rightCss: margin?.right ?? '31.8mm',
  };
});

// 计算 A4 物理毫米规格
const pageSpecs = computed(() => {
  const isLandscape = props.orientation === 'landscape';
  return {
    widthMm: isLandscape ? 297 : 210,
    heightMm: isLandscape ? 210 : 297,
  };
});

// 屏幕 96 DPI 下，1mm ≈ 3.7795px
const MM_TO_PX = 3.7795;

// 计算单页物理高度（像素）与可用排版高度（像素）
const singlePageHeightPx = computed(() => pageSpecs.value.heightMm * MM_TO_PX);
const usableHeightPx = computed(() => {
  const margins = resolvedMargins.value;
  // 留出页眉 (约 36px) 与页脚 (约 36px)
  const headerFooterReserved = 72;
  const marginVerticalPx = (margins.topMm + margins.bottomMm) * MM_TO_PX;
  return Math.max(200, singlePageHeightPx.value - marginVerticalPx - headerFooterReserved);
});

// 动态测量排版内容高度与总页数
let resizeObserver: ResizeObserver | null = null;

const updatePageCalculation = (): void => {
  if (!contentContainerRef.value) return;
  const measured = contentContainerRef.value.scrollHeight || contentContainerRef.value.offsetHeight;
  contentHeight.value = measured;

  const calculatedPages = Math.max(1, Math.ceil(measured / usableHeightPx.value));
  if (calculatedPages !== totalPages.value) {
    totalPages.value = calculatedPages;
    emit('pageCountChange', calculatedPages);
  }
};

onMounted(() => {
  if (contentContainerRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      updatePageCalculation();
    });
    resizeObserver.observe(contentContainerRef.value);
  }
  updatePageCalculation();
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});

// 计算虚拟断页槽的位置列表（例如第 2 页起始断点、第 3 页起始断点...）
interface VirtualPageBreak {
  pageNumber: number; // 当前断开进入的页码（2, 3...）
  topPx: number; // 距离顶部的像素位置
}

const virtualBreaks = computed<VirtualPageBreak[]>(() => {
  const breaks: VirtualPageBreak[] = [];
  const count = totalPages.value;
  const pageH = singlePageHeightPx.value;
  for (let p = 2; p <= count; p++) {
    breaks.push({
      pageNumber: p,
      topPx: (p - 1) * pageH,
    });
  }
  return breaks;
});

// 双击交互激活编辑页眉
const handleDblClickHeader = (): void => {
  if (!props.editableHeaderFooter) return;
  isEditingHeader.value = true;
  nextTick(() => {
    headerInputRef.value?.focus();
    headerInputRef.value?.select();
  });
};

const handleFinishHeader = (): void => {
  isEditingHeader.value = false;
  emit('update:header', headerInput.value);
};

// 双击交互激活编辑页脚
const handleDblClickFooter = (): void => {
  if (!props.editableHeaderFooter) return;
  isEditingFooter.value = true;
  nextTick(() => {
    footerInputRef.value?.focus();
    footerInputRef.value?.select();
  });
};

const handleFinishFooter = (): void => {
  isEditingFooter.value = false;
  emit('update:footer', footerInput.value);
};

// 计算页眉页脚文本展示（支持动态占位符）
const formatText = (template: string, pageNum: number, total: number): string => {
  return template.replace(/\{page\}/g, String(pageNum)).replace(/\{totalPages\}/g, String(total));
};

// 暴露对外属性与方法
defineExpose({
  totalPages,
  contentHeight,
  orientation: computed(() => props.orientation),
  recalculate: updatePageCalculation,
});
</script>

<template>
  <div class="at-page-canvas" :class="[`at-page-canvas--${orientation}`]" data-test="page-canvas">
    <!-- 顶部毫米标尺（可选悬浮） -->
    <div v-if="showRuler" class="at-page-canvas__ruler-wrapper">
      <div
        class="at-page-canvas__ruler-container"
        :style="{
          width: `${pageSpecs.widthMm}mm`,
        }"
      >
        <AtengPageRuler
          :width="pageSpecs.widthMm"
          :margin-left="resolvedMargins.leftMm"
          :margin-right="resolvedMargins.rightMm"
          :orientation="orientation"
        />
      </div>
    </div>

    <!-- 仿真工作台背景与居中 A4 纸张主体 -->
    <div class="at-page-canvas__stage">
      <div
        ref="sheetRef"
        class="at-page-canvas__sheet"
        :style="{
          width: `${pageSpecs.widthMm}mm`,
          minHeight: `${singlePageHeightPx * totalPages}px`,
          paddingTop: resolvedMargins.topCss,
          paddingBottom: resolvedMargins.bottomCss,
          paddingLeft: resolvedMargins.leftCss,
          paddingRight: resolvedMargins.rightCss,
        }"
        data-test="page-sheet"
      >
        <!-- 第一页页眉 -->
        <header
          class="at-page-canvas__header"
          :class="[
            `at-page-canvas__header--${headerAlign}`,
            { 'at-page-canvas__header--editable': editableHeaderFooter },
          ]"
          data-test="page-header"
          @dblclick="handleDblClickHeader"
        >
          <template v-if="isEditingHeader">
            <input
              ref="headerInputRef"
              v-model="headerInput"
              class="at-page-canvas__input"
              type="text"
              placeholder="请输入页眉文字（按回车或失焦完成）"
              @blur="handleFinishHeader"
              @keydown.enter="handleFinishHeader"
              @keydown.esc="isEditingHeader = false"
            />
          </template>
          <template v-else>
            <span class="at-page-canvas__header-text">
              {{ formatText(headerInput, 1, totalPages) }}
            </span>
            <span v-if="editableHeaderFooter" class="at-page-canvas__hint" title="双击进入行内编辑">
              (双击编辑)
            </span>
          </template>
        </header>

        <!-- 编辑器正文插槽容器 -->
        <main ref="contentContainerRef" class="at-page-canvas__content" data-test="page-content">
          <slot />
        </main>

        <!-- 第一页页脚（含动态页码） -->
        <footer
          class="at-page-canvas__footer"
          :class="[
            `at-page-canvas__footer--${footerAlign}`,
            { 'at-page-canvas__footer--editable': editableHeaderFooter },
          ]"
          data-test="page-footer"
          @dblclick="handleDblClickFooter"
        >
          <template v-if="isEditingFooter">
            <input
              ref="footerInputRef"
              v-model="footerInput"
              class="at-page-canvas__input"
              type="text"
              placeholder="请输入页脚文字（按回车或失焦完成）"
              @blur="handleFinishFooter"
              @keydown.enter="handleFinishFooter"
              @keydown.esc="isEditingFooter = false"
            />
          </template>
          <template v-else>
            <span class="at-page-canvas__footer-text">
              {{ formatText(footerInput, 1, totalPages) }}
            </span>
            <span v-if="showPageNumber" class="at-page-canvas__page-number">
              第 1 页 / 共 {{ totalPages }} 页
            </span>
            <span v-if="editableHeaderFooter" class="at-page-canvas__hint" title="双击进入行内编辑">
              (双击编辑)
            </span>
          </template>
        </footer>

        <!-- 虚拟动态断页槽线（不破坏底层 ProseMirror 文档树与编辑光标） -->
        <template v-for="item in virtualBreaks" :key="item.pageNumber">
          <div
            class="at-page-canvas__break-line"
            :style="{ top: `${item.topPx}px` }"
            data-test="virtual-break"
          >
            <div class="at-page-canvas__break-tag">
              <span class="at-page-canvas__break-icon">📄</span>
              第 {{ item.pageNumber }} 页 · 虚拟断页槽
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.at-page-canvas {
  width: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--at-editor-docx-bg, #eaedf1);
  box-sizing: border-box;
  user-select: text;
  position: relative;
}

/* 标尺外层包装 */
.at-page-canvas__ruler-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
  background-color: var(--at-editor-docx-bg, #eaedf1);
  padding: 8px 0 2px 0;
  box-sizing: border-box;
  position: sticky;
  top: 0;
  z-index: 10;
}

.at-page-canvas__ruler-container {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* 舞台容器 */
.at-page-canvas__stage {
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 16px 20px 48px 20px;
  box-sizing: border-box;
  overflow-x: auto;
}

/* A4 仿真纸张主体 */
.at-page-canvas__sheet {
  background-color: #ffffff;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.05),
    0 8px 24px -4px rgba(0, 0, 0, 0.12);
  box-sizing: border-box;
  position: relative;
  transition:
    width 0.2s ease,
    min-height 0.2s ease;
  display: flex;
  flex-direction: column;
}

/* 页眉区域 */
.at-page-canvas__header {
  padding-bottom: 8px;
  margin-bottom: 16px;
  border-bottom: 1px dashed #cbd5e1;
  font-size: 12px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  user-select: none;
}

.at-page-canvas__header--left {
  justify-content: flex-start;
}

.at-page-canvas__header--center {
  justify-content: center;
}

.at-page-canvas__header--right {
  justify-content: flex-end;
}

.at-page-canvas__header--editable:hover,
.at-page-canvas__footer--editable:hover {
  cursor: pointer;
  background-color: #f8fafc;
}

/* 页脚区域 */
.at-page-canvas__footer {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px dashed #cbd5e1;
  font-size: 12px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 28px;
  user-select: none;
}

.at-page-canvas__footer--left {
  justify-content: flex-start;
}

.at-page-canvas__footer--center {
  justify-content: center;
}

.at-page-canvas__footer--right {
  justify-content: flex-end;
}

.at-page-canvas__page-number {
  font-weight: 500;
  color: #475569;
}

.at-page-canvas__hint {
  font-size: 11px;
  color: #94a3b8;
  opacity: 0.6;
}

.at-page-canvas__sheet:hover .at-page-canvas__hint {
  opacity: 1;
}

/* 行内编辑输入框 */
.at-page-canvas__input {
  width: 100%;
  max-width: 420px;
  border: 1px solid #3b82f6;
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 12px;
  outline: none;
  background-color: #ffffff;
  color: #1e293b;
  text-align: inherit;
}

/* 正文编辑区容器 */
.at-page-canvas__content {
  flex: 1 0 auto;
  min-height: 100px;
}

/* 虚拟断页槽指示线 */
.at-page-canvas__break-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 0;
  border-top: 2px dashed #94a3b8;
  z-index: 5;
  pointer-events: none;
}

.at-page-canvas__break-tag {
  position: absolute;
  right: 16px;
  top: -11px;
  background-color: #475569;
  color: #ffffff;
  font-size: 11px;
  font-weight: 500;
  padding: 1px 8px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.at-page-canvas__break-icon {
  font-size: 10px;
}

/* ========================================================
   @media print 打印与导出 PDF 终极 A4 1:1 纸张排版优化
   ======================================================== */
@media print {
  @page {
    size: A4 portrait;
    margin: 0;
  }

  .at-page-canvas--landscape {
    page: landscape;
  }

  @page landscape {
    size: A4 landscape;
    margin: 0;
  }

  body {
    background: transparent !important;
  }

  .at-page-canvas {
    background: transparent !important;
    padding: 0 !important;
  }

  .at-page-canvas__ruler-wrapper,
  .at-page-canvas__break-line,
  .at-page-canvas__hint {
    display: none !important;
  }

  .at-page-canvas__stage {
    padding: 0 !important;
    overflow: visible !important;
  }

  .at-page-canvas__sheet {
    box-shadow: none !important;
    border: none !important;
    margin: 0 !important;
    width: 100% !important;
    min-height: auto !important;
  }

  .at-page-canvas__header,
  .at-page-canvas__footer {
    border: none !important;
  }
}
</style>
