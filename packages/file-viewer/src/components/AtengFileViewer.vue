<script setup lang="ts">
/**
 * AtengFileViewer 核心文档与工程图纸浏览器原生渲染容器。
 *
 * 封装上游专业渲染核心与常用 Office 预设（Word/Excel/PPT/PDF），
 * 提供轻量纯 CSS/SVG 默认操作栏、插槽全量接管以及基础错误/加载状态。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { computed, ref, watch, type ComponentPublicInstance } from 'vue';
import { FileViewer } from '@file-viewer/vue3';
import '@file-viewer/preset-office';
import type {
  AtengFileViewerProps,
  AtengFileViewerEmits,
  AtengFileViewerSlots,
  AtengFileViewerExpose,
} from '../types';

defineOptions({
  name: 'AtengFileViewer',
});

interface InnerViewerMethods {
  zoomIn?: () => void;
  zoomOut?: () => void;
  rotate?: () => void;
}

const props = withDefaults(defineProps<AtengFileViewerProps>(), {
  url: '',
  file: undefined,
  fileName: '',
  fileType: '',
  height: '100%',
  width: '100%',
  showToolbar: true,
  theme: 'auto',
  options: () => ({}),
  customClass: '',
});

const emit = defineEmits<AtengFileViewerEmits>();
defineSlots<AtengFileViewerSlots>();

// 内部状态
const innerFileViewerRef = ref<(ComponentPublicInstance & InnerViewerMethods) | null>(null);
const isLoading = ref<boolean>(true);
const loadError = ref<unknown>(null);
const reloadKey = ref<number>(0);
const zoomScale = ref<number>(1);
const rotationDegree = ref<number>(0);

// 计算有效文件名
const computedFileName = computed<string>(() => {
  if (props.fileName) return props.fileName;
  if (props.file instanceof File) return props.file.name;
  if (props.url) {
    const clean = props.url.split('?')[0].split('#')[0];
    const slashIdx = clean.lastIndexOf('/');
    if (slashIdx >= 0) {
      const extracted = clean.slice(slashIdx + 1);
      if (extracted) return decodeURIComponent(extracted);
    }
  }
  return 'document';
});

// 计算有效扩展名/类型
const computedFileType = computed<string>(() => {
  if (props.fileType) return props.fileType.toLowerCase().replace(/^\./, '');
  const name = computedFileName.value;
  const dotIdx = name.lastIndexOf('.');
  if (dotIdx >= 0) {
    return name.slice(dotIdx + 1).toLowerCase();
  }
  return '';
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

// 监听文件来源变化时重置状态
watch(
  () => [props.url, props.file, reloadKey.value],
  () => {
    isLoading.value = true;
    loadError.value = null;
    zoomScale.value = 1;
    rotationDegree.value = 0;
  },
  { immediate: true },
);

function handleLoadComplete() {
  isLoading.value = false;
  loadError.value = null;
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
  emit('unload', { reason: event?.reason });
}

// 控制指令实现
function zoomIn() {
  zoomScale.value = Math.min(zoomScale.value + 0.15, 3.0);
  if (innerFileViewerRef.value?.zoomIn) {
    try {
      innerFileViewerRef.value.zoomIn();
    } catch {
      // 容错兜底
    }
  }
}

function zoomOut() {
  zoomScale.value = Math.max(zoomScale.value - 0.15, 0.4);
  if (innerFileViewerRef.value?.zoomOut) {
    try {
      innerFileViewerRef.value.zoomOut();
    } catch {
      // 容错兜底
    }
  }
}

function rotate() {
  rotationDegree.value = (rotationDegree.value + 90) % 360;
  if (innerFileViewerRef.value?.rotate) {
    try {
      innerFileViewerRef.value.rotate();
    } catch {
      // 容错兜底
    }
  }
}

function download() {
  if (props.file instanceof Blob && typeof window !== 'undefined') {
    const blobUrl = URL.createObjectURL(props.file);
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

function retry() {
  reloadKey.value++;
}

defineExpose<AtengFileViewerExpose>({
  zoomIn,
  zoomOut,
  rotate,
  download,
  retry,
  getFileName: () => computedFileName.value,
  getFileType: () => computedFileType.value,
});
</script>

<template>
  <div
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
        :zoom-in="zoomIn"
        :zoom-out="zoomOut"
        :rotate="rotate"
        :download="download"
        :retry="retry"
      >
        <div class="at-file-viewer__meta">
          <span class="at-file-viewer__badge">{{ computedFileType.toUpperCase() || 'FILE' }}</span>
          <span class="at-file-viewer__filename" :title="computedFileName">{{
            computedFileName
          }}</span>
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

    <!-- 主渲染容器 -->
    <main class="at-file-viewer__body">
      <!-- 加载中遮罩 -->
      <div v-if="isLoading" class="at-file-viewer__loading">
        <slot name="loading" :percent="undefined">
          <div class="at-file-viewer__spinner" aria-hidden="true"></div>
          <span class="at-file-viewer__loading-text">正在解析并渲染文档...</span>
        </slot>
      </div>

      <!-- 渲染失败状态 -->
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
          <p class="at-file-viewer__error-msg">文档预览加载失败</p>
          <div class="at-file-viewer__error-actions">
            <button type="button" class="at-file-viewer__error-btn" @click="retry">重试加载</button>
            <button
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
        v-if="url || file"
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
          :url="url || undefined"
          :file="normalizedFile"
          :options="mergedOptions"
          @load-complete="handleLoadComplete"
          @error="handleError"
          @unload-complete="handleUnloadComplete"
        />
      </div>

      <!-- 空状态 -->
      <div v-else class="at-file-viewer__empty">
        <p>暂无文件输入</p>
      </div>
    </main>
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
}

.at-file-viewer__actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.at-file-viewer__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: 1px solid var(--at-fv-border, #cbd5e1);
  border-radius: 6px;
  color: var(--at-fv-text, #475569);
  cursor: pointer;
  transition: all 0.2s ease;
}

.at-file-viewer__btn:hover {
  background-color: var(--at-fv-hover-bg, #e2e8f0);
  color: var(--at-fv-hover-color, #0f172a);
}

.at-file-viewer__btn--primary {
  background-color: #3b82f6;
  border-color: #3b82f6;
  color: #ffffff;
}

.at-file-viewer__btn--primary:hover {
  background-color: #2563eb;
  border-color: #2563eb;
  color: #ffffff;
}

.at-file-viewer__body {
  position: relative;
  flex: 1;
  min-height: 0;
  width: 100%;
  height: 100%;
  display: flex;
  overflow: auto;
}

.at-file-viewer__engine {
  width: 100%;
  height: 100%;
  min-height: 100%;
}

.at-file-viewer__loading,
.at-file-viewer__error,
.at-file-viewer__empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.85);
  z-index: 10;
  gap: 12px;
}

.at-file-viewer__spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #cbd5e1;
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
}

.at-file-viewer__error-msg {
  font-size: 14px;
  color: #f56c6c;
  margin: 0;
}

.at-file-viewer__error-actions {
  display: flex;
  gap: 8px;
}

.at-file-viewer__error-btn {
  padding: 6px 14px;
  font-size: 13px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background-color: #ffffff;
  cursor: pointer;
}

.at-file-viewer__error-btn--primary {
  background-color: #3b82f6;
  border-color: #3b82f6;
  color: #ffffff;
}
</style>
