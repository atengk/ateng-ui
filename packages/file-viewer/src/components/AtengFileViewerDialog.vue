<script setup lang="ts">
/**
 * AtengFileViewerDialog 声明式全屏文档预览弹窗组件。
 *
 * 封装自适应视口尺寸、原生 ESC 快捷退出、全屏沉浸式切换、点击遮罩关闭、
 * 以及对 AtengFileViewer 所有输入属性、插槽与事件的 100% 完整透明透传。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import AtengFileViewer from './AtengFileViewer.vue';
import type {
  AtengFileViewerDialogProps,
  AtengFileViewerDialogEmits,
  AtengFileViewerDialogSlots,
  AtengFileViewerDialogExpose,
  AtengFileViewerInstance,
} from '../types';

defineOptions({
  name: 'AtengFileViewerDialog',
});

const props = withDefaults(defineProps<AtengFileViewerDialogProps>(), {
  modelValue: false,
  visible: undefined,
  title: '',
  fullscreen: false,
  dialogWidth: '85vw',
  dialogHeight: '85vh',
  closeOnClickModal: true,
  closeOnPressEscape: true,
  showClose: true,
  showFullscreen: true,
  destroyOnClose: true,
  appendToBody: true,
  zIndex: 2000,
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
  assetBaseUrl: undefined,
  preset: undefined,
  maxSize: undefined,
  password: '',
});

const emit = defineEmits<AtengFileViewerDialogEmits>();
defineSlots<AtengFileViewerDialogSlots>();

const viewerRef = ref<AtengFileViewerInstance | null>(null);
const internalFullscreen = ref<boolean>(props.fullscreen);

// 监听外部全屏属性变更
watch(
  () => props.fullscreen,
  val => {
    internalFullscreen.value = val;
  },
);

// 弹窗显隐状态计算
const isVisible = computed<boolean>(() => {
  if (props.visible !== undefined) return props.visible;
  return props.modelValue;
});

// 计算弹窗顶栏展示标题
const computedTitle = computed<string>(() => {
  if (props.title) return props.title;
  if (props.fileName) return props.fileName;
  if (viewerRef.value?.getFileName) {
    const name = viewerRef.value.getFileName();
    if (name) return name;
  }
  return '文档预览';
});

// 计算对话框主体尺寸
const dialogContentStyle = computed(() => {
  if (internalFullscreen.value) {
    return {
      width: '100vw',
      height: '100vh',
      borderRadius: '0px',
    };
  }

  const w = typeof props.dialogWidth === 'number' ? `${props.dialogWidth}px` : props.dialogWidth;
  const h = typeof props.dialogHeight === 'number' ? `${props.dialogHeight}px` : props.dialogHeight;

  return {
    width: w,
    height: h,
    maxWidth: '96vw',
    maxHeight: '94vh',
  };
});

function open(): void {
  emit('update:modelValue', true);
  emit('update:visible', true);
  emit('open');
}

function close(): void {
  emit('update:modelValue', false);
  emit('update:visible', false);
  emit('close');
}

function toggleFullscreen(target?: boolean): void {
  const next = target !== undefined ? target : !internalFullscreen.value;
  internalFullscreen.value = next;
  emit('update:fullscreen', next);
}

function handleMaskClick(): void {
  if (props.closeOnClickModal) {
    close();
  }
}

function handleKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && props.closeOnPressEscape && isVisible.value) {
    close();
  }
}

watch(
  isVisible,
  val => {
    if (val) {
      if (typeof window !== 'undefined') {
        window.addEventListener('keydown', handleKeyDown);
      }
      emit('open');
      nextTick(() => {
        emit('opened');
      });
    } else {
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', handleKeyDown);
      }
      emit('closed');
    }
  },
  { immediate: true },
);

onMounted(() => {
  if (isVisible.value && typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown);
  }
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeyDown);
  }
});

defineExpose<AtengFileViewerDialogExpose>({
  open,
  close,
  toggleFullscreen,
  getViewerInstance: () => viewerRef.value,
  zoomIn: () => viewerRef.value?.zoomIn(),
  zoomOut: () => viewerRef.value?.zoomOut(),
  resetZoom: () => viewerRef.value?.resetZoom(),
  rotate: () => viewerRef.value?.rotate(),
  download: () => viewerRef.value?.download(),
  print: () => viewerRef.value?.print(),
  retry: () => viewerRef.value?.retry(),
  forceRender: () => viewerRef.value?.forceRender(),
  isSizeGuarded: () => viewerRef.value?.isSizeGuarded() ?? false,
  getProgress: () =>
    viewerRef.value?.getProgress() ?? {
      loaded: 0,
      percent: 0,
      speed: 0,
      formattedLoaded: '0 B',
      formattedTotal: '未知大小',
      formattedSpeed: '0 KB/s',
    },
  getFileSize: () => viewerRef.value?.getFileSize() ?? 0,
  getDiagnostic: () => viewerRef.value?.getDiagnostic() ?? null,
  submitPassword: pwd => viewerRef.value?.submitPassword(pwd) ?? Promise.resolve(false),
  isPasswordRequired: () => viewerRef.value?.isPasswordRequired() ?? false,
  getFileName: () => viewerRef.value?.getFileName() ?? computedTitle.value,
  getFileType: () => viewerRef.value?.getFileType() ?? '',
  getPage: () => viewerRef.value?.getPage() ?? 1,
  getPageCount: () => viewerRef.value?.getPageCount() ?? 1,
  setPage: p => viewerRef.value?.setPage(p) ?? Promise.resolve(false),
  prevPage: () => viewerRef.value?.prevPage() ?? Promise.resolve(false),
  nextPage: () => viewerRef.value?.nextPage() ?? Promise.resolve(false),
  getSheet: () => viewerRef.value?.getSheet() ?? 0,
  getSheets: () => viewerRef.value?.getSheets() ?? [],
  setSheet: s => viewerRef.value?.setSheet(s) ?? Promise.resolve(false),
  getTocList: () => viewerRef.value?.getTocList() ?? [],
  isTocOpen: () => viewerRef.value?.isTocOpen() ?? false,
  toggleToc: o => viewerRef.value?.toggleToc(o),
  openToc: () => viewerRef.value?.openToc(),
  closeToc: () => viewerRef.value?.closeToc(),
  scrollToAnchor: a => viewerRef.value?.scrollToAnchor(a) ?? Promise.resolve(false),
  getAssetBaseUrl: () => viewerRef.value?.getAssetBaseUrl() ?? '',
  getPresets: () => viewerRef.value?.getPresets() ?? [],
  getViewState: () => viewerRef.value?.getViewState() ?? null,
  applyViewState: s => viewerRef.value?.applyViewState(s) ?? Promise.resolve(null),
});
</script>

<template>
  <Teleport to="body" :disabled="!appendToBody">
    <Transition name="at-fvd-fade">
      <div
        v-if="isVisible"
        class="at-file-viewer-dialog__overlay"
        :style="{ zIndex }"
        @click.self="handleMaskClick"
      >
        <div
          class="at-file-viewer-dialog__content"
          :class="[
            customClass,
            {
              'is-fullscreen': internalFullscreen,
            },
          ]"
          :style="dialogContentStyle"
        >
          <!-- 弹窗顶栏 -->
          <header class="at-file-viewer-dialog__header">
            <slot
              name="header"
              :title="computedTitle"
              :close="close"
              :toggle-fullscreen="toggleFullscreen"
            >
              <div class="at-file-viewer-dialog__title" :title="computedTitle">
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  stroke="currentColor"
                  fill="none"
                  stroke-width="2"
                  class="at-file-viewer-dialog__title-icon"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <span>{{ computedTitle }}</span>
              </div>
              <div class="at-file-viewer-dialog__controls">
                <button
                  v-if="showFullscreen"
                  type="button"
                  class="at-file-viewer-dialog__btn"
                  :title="internalFullscreen ? '还原窗口' : '全屏展示'"
                  :aria-label="internalFullscreen ? '还原窗口' : '全屏展示'"
                  @click="toggleFullscreen()"
                >
                  <svg
                    v-if="internalFullscreen"
                    viewBox="0 0 24 24"
                    width="15"
                    height="15"
                    stroke="currentColor"
                    fill="none"
                    stroke-width="2"
                  >
                    <polyline points="4 14 10 14 10 20"></polyline>
                    <polyline points="20 10 14 10 14 4"></polyline>
                    <line x1="14" y1="10" x2="21" y2="3"></line>
                    <line x1="3" y1="21" x2="10" y2="14"></line>
                  </svg>
                  <svg
                    v-else
                    viewBox="0 0 24 24"
                    width="15"
                    height="15"
                    stroke="currentColor"
                    fill="none"
                    stroke-width="2"
                  >
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <polyline points="9 21 3 21 3 15"></polyline>
                    <line x1="21" y1="3" x2="14" y2="10"></line>
                    <line x1="3" y1="21" x2="10" y2="14"></line>
                  </svg>
                </button>
                <button
                  v-if="showClose"
                  type="button"
                  class="at-file-viewer-dialog__btn at-file-viewer-dialog__btn--close"
                  title="关闭 (Esc)"
                  aria-label="关闭弹窗"
                  @click="close"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    stroke="currentColor"
                    fill="none"
                    stroke-width="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </slot>
          </header>

          <!-- 弹窗主渲染区 -->
          <div class="at-file-viewer-dialog__body">
            <AtengFileViewer
              v-if="!destroyOnClose || isVisible"
              ref="viewerRef"
              :url="url"
              :file="file"
              :file-name="fileName"
              :file-type="fileType"
              :page="page"
              :sheet="sheet"
              :sheets="sheets"
              :show-sheet-bar="showSheetBar"
              :show-toc="showToc"
              :toc-list="tocList"
              :preserve-view-state="preserveViewState"
              :height="'100%'"
              :width="'100%'"
              :show-toolbar="showToolbar"
              :theme="theme"
              :auth="auth"
              :headers="headers"
              :options="options"
              :downloadable="downloadable"
              :printable="printable"
              :copyable="copyable"
              :context-menu="contextMenu"
              :watermark="watermark"
              :asset-base-url="assetBaseUrl"
              :preset="preset"
              :max-size="maxSize"
              :password="password"
              @load="emit('load', $event)"
              @error="emit('error', $event)"
              @unload="emit('unload', $event)"
              @update:page="emit('update:page', $event)"
              @page-change="emit('page-change', $event)"
              @update:sheet="emit('update:sheet', $event)"
              @sheet-change="emit('sheet-change', $event)"
              @update:toc-open="emit('update:toc-open', $event)"
              @toc-change="emit('toc-change', $event)"
              @view-state-change="emit('view-state-change', $event)"
              @progress="emit('progress', $event)"
              @size-guard="emit('size-guard', $event)"
              @diagnostic="emit('diagnostic', $event)"
              @password-submit="emit('password-submit', $event)"
              @password-success="emit('password-success')"
              @password-error="emit('password-error', $event)"
            >
              <template #toolbar="scope">
                <slot name="toolbar" v-bind="scope" />
              </template>
              <template #sheetBar="scope">
                <slot name="sheetBar" v-bind="scope" />
              </template>
              <template #toc="scope">
                <slot name="toc" v-bind="scope" />
              </template>
              <template #loading="scope">
                <slot name="loading" v-bind="scope" />
              </template>
              <template #sizeGuard="scope">
                <slot name="sizeGuard" v-bind="scope" />
              </template>
              <template #error="scope">
                <slot name="error" v-bind="scope" />
              </template>
              <template #password="scope">
                <slot name="password" v-bind="scope" />
              </template>
            </AtengFileViewer>
          </div>

          <!-- 可选弹窗底栏 -->
          <footer v-if="$slots.footer" class="at-file-viewer-dialog__footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.at-file-viewer-dialog__overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(4px);
  padding: 16px;
  box-sizing: border-box;
}

.at-file-viewer-dialog__content {
  display: flex;
  flex-direction: column;
  position: relative;
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.1);
  overflow: hidden;
  box-sizing: border-box;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.at-file-viewer-dialog__content.is-fullscreen {
  max-width: 100vw !important;
  max-height: 100vh !important;
  border-radius: 0 !important;
}

.at-file-viewer-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
  background-color: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  box-sizing: border-box;
  flex-shrink: 0;
}

.at-file-viewer-dialog__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.at-file-viewer-dialog__title-icon {
  color: #2563eb;
  flex-shrink: 0;
}

.at-file-viewer-dialog__controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.at-file-viewer-dialog__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s ease;
}

.at-file-viewer-dialog__btn:hover {
  background-color: #f1f5f9;
  color: #1e293b;
}

.at-file-viewer-dialog__btn--close:hover {
  background-color: #fee2e2;
  color: #dc2626;
}

.at-file-viewer-dialog__body {
  position: relative;
  flex: 1;
  width: 100%;
  height: calc(100% - 48px);
  overflow: hidden;
  box-sizing: border-box;
}

.at-file-viewer-dialog__footer {
  padding: 10px 16px;
  border-top: 1px solid #e2e8f0;
  background-color: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

/* 弹窗打开动效 */
.at-fvd-fade-enter-active,
.at-fvd-fade-leave-active {
  transition: opacity 0.2s ease;
}

.at-fvd-fade-enter-active .at-file-viewer-dialog__content,
.at-fvd-fade-leave-active .at-file-viewer-dialog__content {
  transition:
    transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.2s ease;
}

.at-fvd-fade-enter-from,
.at-fvd-fade-leave-to {
  opacity: 0;
}

.at-fvd-fade-enter-from .at-file-viewer-dialog__content,
.at-fvd-fade-leave-to .at-file-viewer-dialog__content {
  transform: scale(0.96) translateY(8px);
  opacity: 0;
}
</style>
