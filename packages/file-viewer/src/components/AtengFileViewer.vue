<script setup lang="ts">
/**
 * AtengFileViewer 核心文档与工程图纸浏览器原生渲染容器。
 *
 * 封装上游专业渲染核心与常用 Office 预设（Word/Excel/PPT/PDF），
 * 提供三阶智能类型嗅探、双轨 Token 注入、ADR-0004 Blob-JSON 双态拦截、
 * 确定性请求取消、四维 DLP 安全防护、动态防篡改水印，
 * 以及多页受控翻页、多工作表底栏切换、文档大纲 TOC 抽屉与弱引用状态记忆恢复。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import {
  computed,
  ref,
  watch,
  nextTick,
  onMounted,
  onUnmounted,
  type ComponentPublicInstance,
} from 'vue';
import { FileViewer } from '@file-viewer/vue3';
import '@file-viewer/preset-office';
import { BusinessException } from '@atengk/core';
import type {
  AtengFileViewerProps,
  AtengFileViewerEmits,
  AtengFileViewerSlots,
  AtengFileViewerExpose,
  FileViewerDocumentAnchor,
  FileViewerSheet,
} from '../types';
import { detectFileType } from '../utils/sniff';
import { fetchRemoteFileStream } from '../utils/fetcher';
import {
  normalizeWatermark,
  createWatermarkOverlay,
  type WatermarkInstance,
} from '../utils/watermark';
import { setupDlpProtection, type DlpController } from '../utils/dlp';
import {
  resolveViewStateKey,
  saveViewStateHistory,
  restoreViewStateHistory,
} from '../utils/viewStateHistory';

defineOptions({
  name: 'AtengFileViewer',
});

interface InnerViewerPublicMethods {
  zoomIn?: () => void;
  zoomOut?: () => void;
  resetZoom?: () => void;
  rotate?: () => void;
  downloadOriginalFile?: () => Promise<void>;
  printRenderedHtml?: () => Promise<void>;
  getViewState?: () => Record<string, unknown> | null;
  applyViewState?: (state: Record<string, unknown>, options?: unknown) => Promise<unknown>;
  collectDocumentAnchors?: () => Promise<FileViewerDocumentAnchor[]>;
  scrollToAnchor?: (anchor: FileViewerDocumentAnchor | string) => Promise<boolean>;
  getScrollContainer?: () => HTMLElement | null;
  destroy?: () => void;
}

const props = withDefaults(defineProps<AtengFileViewerProps>(), {
  url: '',
  file: undefined,
  fileName: '',
  fileType: '',
  page: undefined,
  sheet: undefined,
  sheets: () => [],
  showSheetBar: true,
  showToc: true,
  tocList: () => [],
  preserveViewState: true,
  height: '100%',
  width: '100%',
  showToolbar: true,
  theme: 'auto',
  auth: true,
  headers: () => ({}),
  options: () => ({}),
  customClass: '',
  downloadable: true,
  printable: true,
  copyable: true,
  contextMenu: true,
  watermark: undefined,
});

const emit = defineEmits<AtengFileViewerEmits>();
defineSlots<AtengFileViewerSlots>();

// 内部核心容器引用与渲染状态
const containerRef = ref<HTMLElement | null>(null);
const innerFileViewerRef = ref<(ComponentPublicInstance & InnerViewerPublicMethods) | null>(null);
const isLoading = ref<boolean>(true);
const loadError = ref<unknown>(null);
const reloadKey = ref<number>(0);
const zoomScale = ref<number>(1);
const rotationDegree = ref<number>(0);

// 多页受控状态
const currentPage = ref<number>(props.page ?? 1);
const pageCount = ref<number>(props.page ? Math.max(props.page, 1) : 1);
const inputPage = ref<number>(props.page ?? 1);

// 多工作表受控状态
const currentSheet = ref<number | string>(props.sheet ?? 0);
const detectedSheets = ref<FileViewerSheet[]>([]);

// 目录大纲 (TOC) 状态
const isTocOpen = ref<boolean>(false);
const internalTocList = ref<FileViewerDocumentAnchor[]>([]);
const resolvedTocList = computed<FileViewerDocumentAnchor[]>(() => {
  if (props.tocList && props.tocList.length > 0) {
    return props.tocList;
  }
  return internalTocList.value;
});

// DLP 与水印运行时实例引用
let watermarkInstance: WatermarkInstance | null = null;
let dlpController: DlpController | null = null;

// 远程拉取结果与取消令牌
const resolvedFile = ref<File | undefined>(undefined);
const resolvedFileName = ref<string>('');
const resolvedFileType = ref<string>('');
const createdObjectUrl = ref<string>('');
let activeAbortController: AbortController | null = null;

// 释放前序创建的 ObjectURL
function releaseObjectUrl() {
  if (createdObjectUrl.value && typeof URL !== 'undefined') {
    URL.revokeObjectURL(createdObjectUrl.value);
    createdObjectUrl.value = '';
  }
}

// 计算当前展示的文件名
const computedFileName = computed<string>(() => {
  if (props.fileName) return props.fileName;
  if (resolvedFileName.value) return resolvedFileName.value;
  if (props.file instanceof File) return props.file.name;
  if (props.url) {
    const part0 = props.url.split('?')[0];
    const clean = part0 ? part0.split('#')[0] : '';
    if (clean) {
      const slashIdx = clean.lastIndexOf('/');
      if (slashIdx >= 0) {
        const extracted = clean.slice(slashIdx + 1);
        if (extracted) return decodeURIComponent(extracted);
      }
    }
  }
  return 'document';
});

// 计算当前展示的文件类型/扩展名
const computedFileType = computed<string>(() => {
  if (props.fileType) return props.fileType.toLowerCase().replace(/^\./, '');
  if (resolvedFileType.value) return resolvedFileType.value;
  const name = computedFileName.value;
  const dotIdx = name.lastIndexOf('.');
  if (dotIdx >= 0) {
    return name.slice(dotIdx + 1).toLowerCase();
  }
  return '';
});

// 计算合并后的工作表列表 (保底返回数组)
const resolvedSheets = computed<FileViewerSheet[]>(() => {
  if (props.sheets && props.sheets.length > 0) {
    return props.sheets;
  }
  if (detectedSheets.value.length > 0) {
    return detectedSheets.value;
  }
  const ext = computedFileType.value;
  if (['xlsx', 'xls', 'csv', 'tsv', 'ods', 'fods'].includes(ext)) {
    return [{ id: 0, name: 'Sheet1' }];
  }
  return [];
});

// 是否展示底栏工作表 Tab 条
const shouldShowSheetBar = computed<boolean>(() => {
  if (props.showSheetBar === false) return false;
  return resolvedSheets.value.length > 0;
});

// 计算容器样式
const containerStyle = computed(() => {
  const h = typeof props.height === 'number' ? `${props.height}px` : props.height;
  const w = typeof props.width === 'number' ? `${props.width}px` : props.width;
  return {
    height: h,
    width: w,
  };
});

// 规范化文件来源对象: Blob 自动包装为带文件名的 File
const normalizedFile = computed<File | Blob | undefined>(() => {
  if (resolvedFile.value) return resolvedFile.value;
  if (!props.file) return undefined;
  if (props.file instanceof File) return props.file;
  if (props.file instanceof Blob && typeof File !== 'undefined') {
    const name = computedFileName.value.includes('.')
      ? computedFileName.value
      : `${computedFileName.value}.${computedFileType.value || 'bin'}`;
    return new File([props.file], name, { type: props.file.type });
  }
  return props.file;
});

// 获取用于记忆阅读状态的唯一标识
function getStorageKey(): unknown {
  return resolveViewStateKey({
    file: props.file || resolvedFile.value,
    url: props.url,
    fileName: computedFileName.value,
  });
}

// 计算传递给底层渲染器的 options
const mergedOptions = computed(() => {
  return {
    theme: props.theme,
    styleIsolation: 'shadow',
    toolbar: {
      position: 'bottom-right',
    },
    ...props.options,
  };
});

// 错误信息展示计算
const errorMessage = computed<string>(() => {
  if (!loadError.value) return '';
  if (loadError.value instanceof BusinessException) {
    return loadError.value.msg || loadError.value.message || '业务接口异常';
  }
  if (loadError.value instanceof Error) {
    return loadError.value.message;
  }
  return '文档预览加载失败';
});

const errorTraceId = computed<string>(() => {
  if (loadError.value instanceof BusinessException && loadError.value.traceId) {
    return loadError.value.traceId;
  }
  return '';
});

// 保存当前阅读状态至 WeakMap / LRU
function captureAndSaveViewState(): void {
  if (!props.preserveViewState) return;
  const key = getStorageKey();
  if (!key) return;

  const inner = innerFileViewerRef.value;
  const innerState = inner?.getViewState ? inner.getViewState() : null;
  const scrollContainer = inner?.getScrollContainer ? inner.getScrollContainer() : null;

  saveViewStateHistory(key, {
    page: currentPage.value,
    sheet: currentSheet.value,
    zoomScale: zoomScale.value,
    rotation: rotationDegree.value,
    scroll: scrollContainer
      ? { top: scrollContainer.scrollTop, left: scrollContainer.scrollLeft }
      : undefined,
    viewState: innerState || undefined,
  });
}

// 恢复历史阅读状态
async function restoreSavedViewState(): Promise<void> {
  if (!props.preserveViewState) return;
  const key = getStorageKey();
  if (!key) return;

  const saved = restoreViewStateHistory(key);
  if (!saved) return;

  if (typeof saved.zoomScale === 'number') {
    zoomScale.value = saved.zoomScale;
  }
  if (typeof saved.rotation === 'number') {
    rotationDegree.value = saved.rotation;
  }
  if (typeof saved.page === 'number' && saved.page > 0) {
    currentPage.value = saved.page;
    inputPage.value = saved.page;
  }
  if (saved.sheet !== undefined) {
    currentSheet.value = saved.sheet;
  }

  await nextTick();
  const inner = innerFileViewerRef.value;
  if (inner) {
    if (saved.viewState && inner.applyViewState) {
      try {
        await inner.applyViewState(saved.viewState);
      } catch {
        // 忽略底层不支持的状态应用
      }
    }
    if (saved.scroll && inner.getScrollContainer) {
      const scrollEl = inner.getScrollContainer();
      if (scrollEl) {
        if (saved.scroll.top !== undefined) scrollEl.scrollTop = saved.scroll.top;
        if (saved.scroll.left !== undefined) scrollEl.scrollLeft = saved.scroll.left;
      }
    }
  }
}

// 异步加载与类型嗅探流程
async function loadSource() {
  if (activeAbortController) {
    if (typeof activeAbortController.abort === 'function') {
      activeAbortController.abort();
    }
    activeAbortController = null;
  }
  releaseObjectUrl();

  resolvedFile.value = undefined;
  resolvedFileName.value = '';
  resolvedFileType.value = '';
  loadError.value = null;
  isLoading.value = true;
  zoomScale.value = 1;
  rotationDegree.value = 0;
  internalTocList.value = [];
  detectedSheets.value = [];

  // 本地文件模式
  if (props.file) {
    if (props.file instanceof Blob) {
      try {
        const slice = props.file.slice(0, 2048);
        const buf = await slice.arrayBuffer();
        const detected = detectFileType({
          explicitType: props.fileType,
          fileName: props.fileName || (props.file instanceof File ? props.file.name : undefined),
          buffer: buf,
        });
        if (detected) {
          resolvedFileType.value = detected;
        }
      } catch {
        // 忽略嗅探异常
      }
    }
    isLoading.value = false;
    return;
  }

  // 远程 URL 模式
  if (props.url) {
    const isHttpUrl = /^(?:https?:\/\/|\/)/i.test(props.url);
    if (!isHttpUrl) {
      isLoading.value = false;
      return;
    }

    activeAbortController = new AbortController();
    try {
      const result = await fetchRemoteFileStream(props.url, {
        signal: activeAbortController.signal,
        fileName: props.fileName,
        fileType: props.fileType,
        headers: props.headers,
        auth: props.auth,
      });

      resolvedFile.value = result.file;
      resolvedFileName.value = result.fileName;
      resolvedFileType.value = result.fileType;
      createdObjectUrl.value = result.objectUrl;
      isLoading.value = false;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      isLoading.value = false;
      loadError.value = err;
      emit('error', err);
    }
    return;
  }

  isLoading.value = false;
}

// 监听文件来源变化
watch(
  () => [props.url, props.file, reloadKey.value],
  () => {
    loadSource();
  },
  { immediate: true },
);

// 监听外部受控页码变化
watch(
  () => props.page,
  newPage => {
    if (newPage !== undefined && newPage !== currentPage.value) {
      setPage(newPage);
    }
  },
);

// 监听外部受控工作表变化
watch(
  () => props.sheet,
  newSheet => {
    if (newSheet !== undefined && newSheet !== currentSheet.value) {
      setSheet(newSheet);
    }
  },
);

function applyWatermark(): void {
  if (watermarkInstance) {
    watermarkInstance.destroy();
    watermarkInstance = null;
  }
  const container = containerRef.value;
  if (!container) return;

  const normalized = normalizeWatermark(props.watermark);
  if (normalized) {
    watermarkInstance = createWatermarkOverlay(container, normalized);
  }
}

onMounted(() => {
  const container = containerRef.value;
  if (container) {
    dlpController = setupDlpProtection(container, () => ({
      downloadable: props.downloadable,
      printable: props.printable,
      copyable: props.copyable,
      contextMenu: props.contextMenu,
    }));
    applyWatermark();
  }
});

watch(
  () => props.watermark,
  () => {
    applyWatermark();
  },
  { deep: true },
);

watch(
  () => [props.downloadable, props.printable, props.copyable, props.contextMenu],
  () => {
    dlpController?.update();
  },
);

onUnmounted(() => {
  captureAndSaveViewState();
  if (activeAbortController) {
    if (typeof activeAbortController.abort === 'function') {
      activeAbortController.abort();
    }
    activeAbortController = null;
  }
  releaseObjectUrl();
  if (watermarkInstance) {
    watermarkInstance.destroy();
    watermarkInstance = null;
  }
  if (dlpController) {
    dlpController.destroy();
    dlpController = null;
  }
});

// 底层加载成功回调
async function handleLoadComplete() {
  isLoading.value = false;
  loadError.value = null;

  // 1. 尝试收集目录大纲
  if (innerFileViewerRef.value?.collectDocumentAnchors) {
    try {
      const anchors = await innerFileViewerRef.value.collectDocumentAnchors();
      if (Array.isArray(anchors) && anchors.length > 0) {
        internalTocList.value = anchors;
        emit('toc-change', anchors);
      }
    } catch {
      // 容错兜底
    }
  }

  // 2. 自动恢复阅读历史
  await restoreSavedViewState();

  emit('load', {
    fileName: computedFileName.value,
    fileType: computedFileType.value,
  });
}

function handleError(err: unknown) {
  isLoading.value = false;
  loadError.value = err;
  emit('error', err);
}

function handleUnloadComplete(event?: { reason?: string }) {
  captureAndSaveViewState();
  emit('unload', { reason: event?.reason });
}

// 监听底层 view-state-change 事件
function handleViewStateChange(change: unknown) {
  if (!change || typeof change !== 'object') return;
  const rawState =
    (change as { state?: Record<string, unknown> }).state || (change as Record<string, unknown>);
  emit('view-state-change', rawState);

  // 1. 页码同步
  if (typeof rawState.page === 'number' && rawState.page > 0) {
    if (currentPage.value !== rawState.page) {
      currentPage.value = rawState.page;
      inputPage.value = rawState.page;
      emit('update:page', rawState.page);
      emit('page-change', rawState.page, pageCount.value);
    }
  }
  if (typeof rawState.pageCount === 'number' && rawState.pageCount > 0) {
    pageCount.value = rawState.pageCount;
  }

  // 2. 工作表同步
  if (rawState.spreadsheet && typeof rawState.spreadsheet === 'object') {
    const sp = rawState.spreadsheet as { sheetId?: number };
    if (sp.sheetId !== undefined && sp.sheetId !== currentSheet.value) {
      currentSheet.value = sp.sheetId;
      emit('update:sheet', sp.sheetId);
      emit('sheet-change', sp.sheetId);
    }
  }

  // 3. 记忆当前状态
  captureAndSaveViewState();
}

// 页码受控控制
async function setPage(targetPage: number): Promise<boolean> {
  const bounded = Math.max(1, targetPage);
  if (bounded > pageCount.value) {
    pageCount.value = bounded;
  }
  currentPage.value = bounded;
  inputPage.value = bounded;
  emit('update:page', bounded);
  emit('page-change', bounded, pageCount.value);

  const inner = innerFileViewerRef.value;
  if (inner?.applyViewState) {
    try {
      await inner.applyViewState({ page: bounded });
    } catch {
      // 忽略不支持
    }
  }
  captureAndSaveViewState();
  return true;
}

function prevPage(): Promise<boolean> {
  if (currentPage.value <= 1) return Promise.resolve(false);
  return setPage(currentPage.value - 1);
}

function nextPage(): Promise<boolean> {
  return setPage(currentPage.value + 1);
}

function handlePageInputSubmit(): void {
  const num = Number(inputPage.value);
  if (!Number.isNaN(num) && num > 0) {
    setPage(num);
  } else {
    inputPage.value = currentPage.value;
  }
}

// 工作表受控控制
async function setSheet(sheetIdOrName: number | string): Promise<boolean> {
  currentSheet.value = sheetIdOrName;
  const matched = resolvedSheets.value.find(
    s => s.id === sheetIdOrName || s.name === sheetIdOrName,
  );
  const sheetName = matched ? matched.name : String(sheetIdOrName);
  emit('update:sheet', sheetIdOrName);
  emit('sheet-change', sheetIdOrName, sheetName);

  const inner = innerFileViewerRef.value;
  if (inner?.applyViewState) {
    try {
      const sheetId = typeof sheetIdOrName === 'number' ? sheetIdOrName : matched?.id;
      if (typeof sheetId === 'number') {
        await inner.applyViewState({ spreadsheet: { sheetId } });
      }
    } catch {
      // 容错兜底
    }
  }
  captureAndSaveViewState();
  return true;
}

// 目录大纲控制
function toggleToc(open?: boolean): void {
  isTocOpen.value = open !== undefined ? open : !isTocOpen.value;
  emit('update:toc-open', isTocOpen.value);
}

function openToc(): void {
  toggleToc(true);
}

function closeToc(): void {
  toggleToc(false);
}

async function scrollToAnchor(anchor: FileViewerDocumentAnchor | string): Promise<boolean> {
  if (typeof anchor === 'object' && anchor !== null && anchor.page) {
    await setPage(anchor.page);
  }
  const inner = innerFileViewerRef.value;
  let success = false;
  if (inner?.scrollToAnchor) {
    try {
      success = await inner.scrollToAnchor(anchor);
    } catch {
      success = false;
    }
  }
  return success;
}

// 缩放与旋转控制
function zoomIn() {
  zoomScale.value = Math.min(zoomScale.value + 0.15, 3.0);
  innerFileViewerRef.value?.zoomIn?.();
  captureAndSaveViewState();
}

function zoomOut() {
  zoomScale.value = Math.max(zoomScale.value - 0.15, 0.4);
  innerFileViewerRef.value?.zoomOut?.();
  captureAndSaveViewState();
}

function resetZoom() {
  zoomScale.value = 1.0;
  innerFileViewerRef.value?.resetZoom?.();
  captureAndSaveViewState();
}

function rotate() {
  rotationDegree.value = (rotationDegree.value + 90) % 360;
  innerFileViewerRef.value?.rotate?.();
  captureAndSaveViewState();
}

function download() {
  if (props.downloadable === false) {
    return;
  }
  const fileToDownload = normalizedFile.value;
  if (fileToDownload instanceof Blob && typeof window !== 'undefined') {
    const blobUrl = URL.createObjectURL(fileToDownload);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = computedFileName.value;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    return;
  }
  if (props.url && typeof window !== 'undefined') {
    const a = document.createElement('a');
    a.href = props.url;
    a.download = computedFileName.value;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

function print() {
  if (props.printable === false) {
    return;
  }
  if (typeof window !== 'undefined') {
    window.print();
  }
}

function retry() {
  reloadKey.value++;
}

defineExpose<AtengFileViewerExpose>({
  zoomIn,
  zoomOut,
  resetZoom,
  rotate,
  download,
  print,
  retry,
  getFileName: () => computedFileName.value,
  getFileType: () => computedFileType.value,
  getPage: () => currentPage.value,
  getPageCount: () => pageCount.value,
  setPage,
  prevPage,
  nextPage,
  getSheet: () => currentSheet.value,
  getSheets: () => resolvedSheets.value,
  setSheet,
  getTocList: () => resolvedTocList.value,
  isTocOpen: () => isTocOpen.value,
  toggleToc,
  openToc,
  closeToc,
  scrollToAnchor,
  handleLoadComplete,
  getViewState: () => innerFileViewerRef.value?.getViewState?.() || null,
  applyViewState: state =>
    innerFileViewerRef.value?.applyViewState?.(state) || Promise.resolve(null),
});
</script>

<template>
  <div
    ref="containerRef"
    class="at-file-viewer"
    :class="[customClass, `at-file-viewer--theme-${theme}`]"
    :style="containerStyle"
  >
    <!-- 顶部操作栏 -->
    <header v-if="showToolbar" class="at-file-viewer__toolbar">
      <slot
        name="toolbar"
        :file-name="computedFileName"
        :file-type="computedFileType"
        :page="currentPage"
        :page-count="pageCount"
        :prev-page="prevPage"
        :next-page="nextPage"
        :set-page="setPage"
        :sheet="currentSheet"
        :sheets="resolvedSheets"
        :set-sheet="setSheet"
        :is-toc-open="isTocOpen"
        :toggle-toc="toggleToc"
        :zoom-in="zoomIn"
        :zoom-out="zoomOut"
        :rotate="rotate"
        :download="download"
        :print="print"
        :retry="retry"
        :downloadable="downloadable"
        :printable="printable"
      >
        <div class="at-file-viewer__meta">
          <button
            v-if="showToc"
            type="button"
            class="at-file-viewer__btn at-file-viewer__toc-btn"
            :class="{ 'is-active': isTocOpen }"
            title="文档目录大纲"
            aria-label="文档目录大纲"
            @click="toggleToc()"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              stroke="currentColor"
              fill="none"
              stroke-width="2"
            >
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="15" y2="12"></line>
              <line x1="3" y1="18" x2="18" y2="18"></line>
            </svg>
          </button>
          <span class="at-file-viewer__badge">{{ computedFileType.toUpperCase() || 'FILE' }}</span>
          <span class="at-file-viewer__filename" :title="computedFileName">{{
            computedFileName
          }}</span>
        </div>

        <!-- 中部受控翻页控制器 (在有多页或分页属性时展示) -->
        <div v-if="pageCount > 1 || page !== undefined" class="at-file-viewer__pagination">
          <button
            type="button"
            class="at-file-viewer__btn at-file-viewer__page-btn"
            :disabled="currentPage <= 1"
            title="上一页"
            aria-label="上一页"
            @click="prevPage"
          >
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              stroke="currentColor"
              fill="none"
              stroke-width="2"
            >
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <div class="at-file-viewer__page-indicator">
            <input
              v-model.number="inputPage"
              type="number"
              class="at-file-viewer__page-input"
              :min="1"
              :max="pageCount"
              @blur="handlePageInputSubmit"
              @keyup.enter="handlePageInputSubmit"
            />
            <span class="at-file-viewer__page-total">/ {{ pageCount }}</span>
          </div>
          <button
            type="button"
            class="at-file-viewer__btn at-file-viewer__page-btn"
            :disabled="currentPage >= pageCount"
            title="下一页"
            aria-label="下一页"
            @click="nextPage"
          >
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              stroke="currentColor"
              fill="none"
              stroke-width="2"
            >
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>

        <div class="at-file-viewer__actions">
          <button
            type="button"
            class="at-file-viewer__btn"
            title="放大"
            aria-label="放大"
            @click="zoomIn"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              stroke="currentColor"
              fill="none"
              stroke-width="2"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="11" y1="8" x2="11" y2="14"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </button>
          <button
            type="button"
            class="at-file-viewer__btn"
            title="缩小"
            aria-label="缩小"
            @click="zoomOut"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              stroke="currentColor"
              fill="none"
              stroke-width="2"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </button>
          <button
            type="button"
            class="at-file-viewer__btn"
            title="重置缩放"
            aria-label="重置缩放"
            @click="resetZoom"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              stroke="currentColor"
              fill="none"
              stroke-width="2"
            >
              <path d="M15 3h6v6"></path>
              <path d="M9 21H3v-6"></path>
              <path d="M21 3l-7 7"></path>
              <path d="M3 21l7-7"></path>
            </svg>
          </button>
          <button
            type="button"
            class="at-file-viewer__btn"
            title="旋转"
            aria-label="旋转"
            @click="rotate"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              stroke="currentColor"
              fill="none"
              stroke-width="2"
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
            </svg>
          </button>
          <button
            v-if="printable"
            type="button"
            class="at-file-viewer__btn"
            title="打印文档"
            aria-label="打印文档"
            @click="print"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              stroke="currentColor"
              fill="none"
              stroke-width="2"
            >
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path
                d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"
              ></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
          </button>
          <button
            type="button"
            class="at-file-viewer__btn"
            title="刷新重试"
            aria-label="刷新重试"
            @click="retry"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              stroke="currentColor"
              fill="none"
              stroke-width="2"
            >
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </button>
          <button
            v-if="downloadable"
            type="button"
            class="at-file-viewer__btn at-file-viewer__btn--primary"
            title="下载原文件"
            aria-label="下载原文件"
            @click="download"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              stroke="currentColor"
              fill="none"
              stroke-width="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>
        </div>
      </slot>
    </header>

    <!-- 主工作区 (包含抽屉与渲染主体) -->
    <div class="at-file-viewer__workspace">
      <!-- 目录大纲 (TOC) 侧边抽屉 -->
      <transition name="at-fv-slide">
        <aside v-if="isTocOpen" class="at-file-viewer__toc-drawer">
          <slot
            name="toc"
            :anchors="resolvedTocList"
            :scroll-to-anchor="scrollToAnchor"
            :close-toc="closeToc"
          >
            <div class="at-file-viewer__toc-header">
              <div class="at-file-viewer__toc-title">
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  stroke="currentColor"
                  fill="none"
                  stroke-width="2"
                >
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="12" x2="15" y2="12"></line>
                  <line x1="3" y1="18" x2="18" y2="18"></line>
                </svg>
                <span>目录大纲</span>
                <span class="at-file-viewer__toc-count">({{ resolvedTocList.length }})</span>
              </div>
              <button
                type="button"
                class="at-file-viewer__btn at-file-viewer__toc-close"
                title="关闭目录"
                aria-label="关闭目录"
                @click="closeToc"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  stroke="currentColor"
                  fill="none"
                  stroke-width="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div class="at-file-viewer__toc-content">
              <ul v-if="resolvedTocList.length > 0" class="at-file-viewer__toc-list">
                <li
                  v-for="(anchor, idx) in resolvedTocList"
                  :key="anchor.id || idx"
                  class="at-file-viewer__toc-item"
                  @click="scrollToAnchor(anchor)"
                >
                  <span class="at-file-viewer__toc-label">{{
                    anchor.label || anchor.text || `章节 ${idx + 1}`
                  }}</span>
                  <span v-if="anchor.page" class="at-file-viewer__toc-page"
                    >P{{ anchor.page }}</span
                  >
                </li>
              </ul>
              <div v-else class="at-file-viewer__toc-empty">
                <span>暂无文档大纲目录</span>
              </div>
            </div>
          </slot>
        </aside>
      </transition>

      <!-- 主渲染容器 -->
      <main class="at-file-viewer__body">
        <!-- 加载中遮罩 -->
        <div v-if="isLoading" class="at-file-viewer__loading">
          <slot name="loading" :percent="undefined">
            <div class="at-file-viewer__spinner" aria-hidden="true"></div>
            <span class="at-file-viewer__loading-text">正在解析并渲染文档...</span>
          </slot>
        </div>

        <!-- 渲染失败状态 (包含 ADR-0004 异常卡片与 traceId 展示) -->
        <div v-if="loadError" class="at-file-viewer__error">
          <slot name="error" :error="loadError" :retry="retry" :download="download">
            <svg
              viewBox="0 0 24 24"
              width="40"
              height="40"
              stroke="#f56c6c"
              fill="none"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <p class="at-file-viewer__error-msg">{{ errorMessage }}</p>
            <p v-if="errorTraceId" class="at-file-viewer__error-trace">
              TraceId: {{ errorTraceId }}
            </p>
            <div class="at-file-viewer__error-actions">
              <button type="button" class="at-file-viewer__error-btn" @click="retry">
                重试加载
              </button>
              <button
                v-if="downloadable"
                type="button"
                class="at-file-viewer__error-btn at-file-viewer__error-btn--primary"
                @click="download"
              >
                下载原文件
              </button>
            </div>
          </slot>
        </div>

        <!-- 底层多格式渲染引擎 -->
        <div
          v-if="(url || file || resolvedFile) && !loadError"
          :key="reloadKey"
          class="at-file-viewer__engine"
          :style="{
            transform: `rotate(${rotationDegree}deg) scale(${zoomScale})`,
            transformOrigin: 'center center',
            transition: 'transform 0.2s ease',
          }"
        >
          <FileViewer
            ref="innerFileViewerRef"
            :file="normalizedFile"
            :options="mergedOptions"
            @load-complete="handleLoadComplete"
            @error="handleError"
            @unload-complete="handleUnloadComplete"
            @view-state-change="handleViewStateChange"
          />
        </div>

        <!-- 空状态 -->
        <div v-else-if="!loadError && !isLoading" class="at-file-viewer__empty">
          <p>暂无文件输入</p>
        </div>
      </main>
    </div>

    <!-- Excel 等多工作表底栏 Tab 切换条 -->
    <footer v-if="shouldShowSheetBar" class="at-file-viewer__sheet-bar">
      <slot name="sheetBar" :sheet="currentSheet" :sheets="resolvedSheets" :set-sheet="setSheet">
        <div class="at-file-viewer__sheet-tabs" role="tablist">
          <button
            v-for="sheetItem in resolvedSheets"
            :key="sheetItem.id"
            type="button"
            class="at-file-viewer__sheet-tab"
            :class="{
              'is-active': currentSheet === sheetItem.id || currentSheet === sheetItem.name,
            }"
            role="tab"
            :aria-selected="currentSheet === sheetItem.id || currentSheet === sheetItem.name"
            @click="setSheet(sheetItem.id)"
          >
            <svg
              viewBox="0 0 24 24"
              width="13"
              height="13"
              stroke="currentColor"
              fill="none"
              stroke-width="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
            <span class="at-file-viewer__sheet-name">{{ sheetItem.name }}</span>
          </button>
        </div>
      </slot>
    </footer>
  </div>
</template>

<style scoped>
.at-file-viewer {
  display: flex;
  flex-direction: column;
  position: relative;
  background-color: var(--at-fv-bg, #ffffff);
  border: 1px solid var(--at-fv-border, #e4e7ed);
  border-radius: 8px;
  overflow: hidden;
  box-sizing: border-box;
}

.at-file-viewer__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background-color: var(--at-fv-toolbar-bg, #f8fafc);
  border-bottom: 1px solid var(--at-fv-border, #e4e7ed);
  min-height: 44px;
  box-sizing: border-box;
  gap: 12px;
  flex-shrink: 0;
}

.at-file-viewer__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.at-file-viewer__badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: var(--at-fv-badge-bg, #e2e8f0);
  color: var(--at-fv-badge-color, #475569);
  letter-spacing: 0.5px;
}

.at-file-viewer__filename {
  font-size: 13px;
  font-weight: 600;
  color: var(--at-fv-text, #1e293b);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 220px;
}

.at-file-viewer__pagination {
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: var(--at-fv-bg, #ffffff);
  border: 1px solid var(--at-fv-border, #e2e8f0);
  padding: 2px 6px;
  border-radius: 6px;
}

.at-file-viewer__page-btn {
  padding: 2px 4px !important;
  height: 24px !important;
  width: 24px !important;
}

.at-file-viewer__page-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #64748b;
}

.at-file-viewer__page-input {
  width: 36px;
  height: 22px;
  text-align: center;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #1e293b;
  padding: 0;
}

.at-file-viewer__page-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.at-file-viewer__page-total {
  font-size: 12px;
  color: #64748b;
  user-select: none;
}

.at-file-viewer__actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.at-file-viewer__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  background-color: transparent;
  color: var(--at-fv-text-subtle, #475569);
  cursor: pointer;
  transition: all 0.15s ease-in-out;
  box-sizing: border-box;
}

.at-file-viewer__btn:hover:not(:disabled) {
  background-color: var(--at-fv-btn-hover-bg, #e2e8f0);
  color: var(--at-fv-text, #0f172a);
}

.at-file-viewer__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.at-file-viewer__btn.is-active {
  background-color: #e0e7ff;
  color: #4338ca;
}

.at-file-viewer__btn--primary {
  background-color: var(--at-fv-btn-primary-bg, #3b82f6);
  color: #ffffff;
}

.at-file-viewer__btn--primary:hover:not(:disabled) {
  background-color: var(--at-fv-btn-primary-hover-bg, #2563eb);
  color: #ffffff;
}

.at-file-viewer__workspace {
  display: flex;
  flex: 1;
  position: relative;
  min-height: 0;
  overflow: hidden;
}

.at-file-viewer__toc-drawer {
  width: 260px;
  max-width: 40%;
  height: 100%;
  background-color: #ffffff;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  z-index: 20;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.04);
}

.at-file-viewer__toc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid #f1f5f9;
  background-color: #f8fafc;
}

.at-file-viewer__toc-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.at-file-viewer__toc-count {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 400;
}

.at-file-viewer__toc-close {
  height: 24px !important;
  width: 24px !important;
  padding: 0 !important;
}

.at-file-viewer__toc-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.at-file-viewer__toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.at-file-viewer__toc-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 13px;
  color: #334155;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.at-file-viewer__toc-item:hover {
  background-color: #f1f5f9;
  color: #2563eb;
}

.at-file-viewer__toc-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.at-file-viewer__toc-page {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
  margin-left: 8px;
}

.at-file-viewer__toc-empty {
  padding: 32px 16px;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
}

.at-fv-slide-enter-active,
.at-fv-slide-leave-active {
  transition:
    transform 0.25s ease,
    opacity 0.25s ease;
}

.at-fv-slide-enter-from,
.at-fv-slide-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

.at-file-viewer__body {
  position: relative;
  flex: 1;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: var(--at-fv-body-bg, #f1f5f9);
  min-height: 200px;
}

.at-file-viewer__loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(2px);
  z-index: 10;
  gap: 12px;
}

.at-file-viewer__spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: at-fv-spin 0.8s linear infinite;
}

@keyframes at-fv-spin {
  to {
    transform: rotate(360deg);
  }
}

.at-file-viewer__loading-text {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.at-file-viewer__error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #ffffff;
  z-index: 10;
  padding: 24px;
  text-align: center;
  box-sizing: border-box;
}

.at-file-viewer__error-msg {
  font-size: 14px;
  color: #1e293b;
  font-weight: 600;
  margin: 12px 0 4px;
  max-width: 480px;
}

.at-file-viewer__error-trace {
  font-size: 11px;
  color: #94a3b8;
  font-family: monospace;
  margin: 0 0 16px;
}

.at-file-viewer__error-actions {
  display: flex;
  gap: 10px;
}

.at-file-viewer__error-btn {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid #cbd5e1;
  background-color: #ffffff;
  color: #334155;
  transition: all 0.15s ease;
}

.at-file-viewer__error-btn:hover {
  background-color: #f8fafc;
  border-color: #94a3b8;
}

.at-file-viewer__error-btn--primary {
  background-color: #3b82f6;
  border-color: #3b82f6;
  color: #ffffff;
}

.at-file-viewer__error-btn--primary:hover {
  background-color: #2563eb;
  border-color: #2563eb;
}

.at-file-viewer__engine {
  width: 100%;
  height: 100%;
  overflow: auto;
}

.at-file-viewer__engine :deep(.file-viewer) {
  height: 100%;
  width: 100%;
}

.at-file-viewer__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #94a3b8;
  font-size: 14px;
}

/* 底栏工作表 Tab 条 */
.at-file-viewer__sheet-bar {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  background-color: #f8fafc;
  border-top: 1px solid #e2e8f0;
  min-height: 36px;
  box-sizing: border-box;
  flex-shrink: 0;
}

.at-file-viewer__sheet-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  overflow-x: auto;
  max-width: 100%;
  scrollbar-width: thin;
}

.at-file-viewer__sheet-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 12px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  background-color: #ffffff;
  color: #475569;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.at-file-viewer__sheet-tab:hover {
  background-color: #f1f5f9;
  color: #1e293b;
}

.at-file-viewer__sheet-tab.is-active {
  background-color: #2563eb;
  border-color: #2563eb;
  color: #ffffff;
  font-weight: 600;
}

.at-file-viewer--theme-dark {
  --at-fv-bg: #0f172a;
  --at-fv-border: #334155;
  --at-fv-toolbar-bg: #1e293b;
  --at-fv-body-bg: #0b0f19;
  --at-fv-text: #f8fafc;
  --at-fv-text-subtle: #94a3b8;
  --at-fv-btn-hover-bg: #334155;
  --at-fv-badge-bg: #334155;
  --at-fv-badge-color: #cbd5e1;
}
</style>
