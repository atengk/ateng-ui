/**
 * useFileViewer 统一无头文档渲染状态机与指令控制 Hook。
 *
 * 遵循 L1 无头响应式设计，完全解耦具体 UI 展现，
 * 封装分页跳转、工作表切换、目录大纲锚点导航、视口缩放/旋转、
 * 打印/下载/重试等底层控制能力，导出受 readonly 保护的单向数据流状态。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { ref, computed, readonly, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue';
import type {
  AtengFileViewerInstance,
  FileViewerDocumentAnchor,
  FileViewerSheet,
  FileViewerPreset,
} from '../types';
import { resolveThreeTierAssetBaseUrl } from '../utils/assets';
import { resolvePresets } from '../utils/presets';

export interface UseFileViewerOptions {
  /**
   * 待预览文件的访问 URL (支持响应式或 Getter)。
   */
  url?: MaybeRefOrGetter<string | undefined>;

  /**
   * 待预览的本地二进制文件对象 (支持响应式或 Getter)。
   */
  file?: MaybeRefOrGetter<File | Blob | undefined>;

  /**
   * 显式指定文件名。
   */
  fileName?: MaybeRefOrGetter<string | undefined>;

  /**
   * 显式指定文件类型/扩展名。
   */
  fileType?: MaybeRefOrGetter<string | undefined>;

  /**
   * 初始或受控展示页码 (从 1 开始)。
   */
  page?: MaybeRefOrGetter<number | undefined>;

  /**
   * 初始或受控工作表 ID 或名称。
   */
  sheet?: MaybeRefOrGetter<number | string | undefined>;

  /**
   * 绑定的 AtengFileViewer 组件 Ref 实例。
   */
  viewerRef?: MaybeRefOrGetter<AtengFileViewerInstance | null | undefined>;

  /**
   * 静态资产基地址覆盖 (遵循三级弹性寻址)。
   */
  assetBaseUrl?: MaybeRefOrGetter<string | URL | null | undefined>;

  /**
   * 动态重载扩展预设 (如 CAD、3D 模型、OFD 等)。
   */
  preset?: MaybeRefOrGetter<FileViewerPreset | FileViewerPreset[] | undefined>;

  /**
   * 是否允许下载 (DLP 控制)。
   */
  downloadable?: MaybeRefOrGetter<boolean | undefined>;

  /**
   * 是否允许打印 (DLP 控制)。
   */
  printable?: MaybeRefOrGetter<boolean | undefined>;
}

export interface UseFileViewerReturn {
  // 只读响应式状态
  isLoading: Readonly<Ref<boolean>>;
  error: Readonly<Ref<unknown>>;
  fileName: Readonly<Ref<string>>;
  fileType: Readonly<Ref<string>>;
  page: Readonly<Ref<number>>;
  pageCount: Readonly<Ref<number>>;
  sheet: Readonly<Ref<number | string>>;
  sheets: Readonly<Ref<FileViewerSheet[]>>;
  zoomScale: Readonly<Ref<number>>;
  rotation: Readonly<Ref<number>>;
  tocList: Readonly<Ref<FileViewerDocumentAnchor[]>>;
  isTocOpen: Readonly<Ref<boolean>>;
  downloadable: Readonly<Ref<boolean>>;
  printable: Readonly<Ref<boolean>>;

  // 绑定与底层实例访问
  bindViewer: (instance: AtengFileViewerInstance | null) => void;
  getViewerInstance: () => AtengFileViewerInstance | null;
  getAssetBaseUrl: () => string;
  getPresets: () => FileViewerPreset[];

  // 控制指令集
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  rotate: () => void;
  setPage: (page: number) => Promise<boolean>;
  prevPage: () => Promise<boolean>;
  nextPage: () => Promise<boolean>;
  setSheet: (sheet: number | string) => Promise<boolean>;
  toggleToc: (open?: boolean) => void;
  openToc: () => void;
  closeToc: () => void;
  scrollToAnchor: (anchor: FileViewerDocumentAnchor | string) => Promise<boolean>;
  download: () => void;
  print: () => void;
  retry: () => void;
  destroy: () => void;
  getViewState: () => Record<string, unknown> | null;
  applyViewState: (state: Record<string, unknown>) => Promise<unknown>;
}

/**
 * 核心无头状态机 Hook 实现。
 *
 * @param options 可配置选项
 * @returns 包含只读响应式状态与底层控制指令的门面对象
 */
export function useFileViewer(options: UseFileViewerOptions = {}): UseFileViewerReturn {
  // 1. 内部私有可变状态
  const internalViewerInstance = ref<AtengFileViewerInstance | null>(null);
  const isLoading = ref<boolean>(false);
  const error = ref<unknown>(null);
  const zoomScale = ref<number>(1);
  const rotation = ref<number>(0);
  const page = ref<number>(toValue(options.page) ?? 1);
  const pageCount = ref<number>(1);
  const sheet = ref<number | string>(toValue(options.sheet) ?? 0);
  const isTocOpen = ref<boolean>(false);

  // 2. 解析当前绑定的组件实例
  const activeInstance = computed<AtengFileViewerInstance | null>(() => {
    const fromOptions = toValue(options.viewerRef);
    return fromOptions || internalViewerInstance.value;
  });

  // 3. 计算文件名与文件类型
  const fileName = computed<string>(() => {
    const explicit = toValue(options.fileName);
    if (explicit) return explicit;
    const instance = activeInstance.value;
    if (instance?.getFileName) {
      const name = instance.getFileName();
      if (name) return name;
    }
    const file = toValue(options.file);
    if (file instanceof File) return file.name;
    const url = toValue(options.url);
    if (url) {
      const clean = url.split('?')[0]?.split('#')[0] || '';
      const slashIdx = clean.lastIndexOf('/');
      if (slashIdx >= 0) {
        const extracted = clean.slice(slashIdx + 1);
        if (extracted) return decodeURIComponent(extracted);
      }
    }
    return '';
  });

  const fileType = computed<string>(() => {
    const explicit = toValue(options.fileType);
    if (explicit) return explicit.toLowerCase().replace(/^\./, '');
    const instance = activeInstance.value;
    if (instance?.getFileType) {
      const type = instance.getFileType();
      if (type) return type;
    }
    const name = fileName.value;
    const dotIdx = name.lastIndexOf('.');
    if (dotIdx >= 0) {
      return name.slice(dotIdx + 1).toLowerCase();
    }
    return '';
  });

  // 4. 计算工作表与目录大纲 (空安全保底返回空数组)
  const sheets = computed<FileViewerSheet[]>(() => {
    const instance = activeInstance.value;
    if (instance?.getSheets) {
      const list = instance.getSheets();
      if (Array.isArray(list)) return list;
    }
    return [];
  });

  const tocList = computed<FileViewerDocumentAnchor[]>(() => {
    const instance = activeInstance.value;
    if (instance?.getTocList) {
      const list = instance.getTocList();
      if (Array.isArray(list)) return list;
    }
    return [];
  });

  const downloadable = computed<boolean>(() => {
    const val = toValue(options.downloadable);
    return val !== false;
  });

  const printable = computed<boolean>(() => {
    const val = toValue(options.printable);
    return val !== false;
  });

  // 5. 监听 options 入参变化并同步内部状态
  watch(
    () => toValue(options.page),
    newPage => {
      if (newPage !== undefined && newPage !== page.value) {
        setPage(newPage);
      }
    },
  );

  watch(
    () => toValue(options.sheet),
    newSheet => {
      if (newSheet !== undefined && newSheet !== sheet.value) {
        setSheet(newSheet);
      }
    },
  );

  // 6. 控制指令实现
  function bindViewer(instance: AtengFileViewerInstance | null): void {
    internalViewerInstance.value = instance;
    if (instance) {
      if (instance.getPage) page.value = instance.getPage();
      if (instance.getPageCount) pageCount.value = instance.getPageCount();
      if (instance.getSheet) sheet.value = instance.getSheet();
      if (instance.isTocOpen) isTocOpen.value = instance.isTocOpen();
    }
  }

  function getViewerInstance(): AtengFileViewerInstance | null {
    return activeInstance.value;
  }

  function zoomIn(): void {
    zoomScale.value = Math.min(zoomScale.value + 0.15, 3.0);
    activeInstance.value?.zoomIn();
  }

  function zoomOut(): void {
    zoomScale.value = Math.max(zoomScale.value - 0.15, 0.4);
    activeInstance.value?.zoomOut();
  }

  function resetZoom(): void {
    zoomScale.value = 1.0;
    activeInstance.value?.resetZoom();
  }

  function rotate(): void {
    rotation.value = (rotation.value + 90) % 360;
    activeInstance.value?.rotate();
  }

  async function setPage(targetPage: number): Promise<boolean> {
    page.value = targetPage;
    const instance = activeInstance.value;
    if (instance?.setPage) {
      return instance.setPage(targetPage);
    }
    return true;
  }

  async function prevPage(): Promise<boolean> {
    const instance = activeInstance.value;
    if (instance?.prevPage) {
      return instance.prevPage();
    }
    if (page.value > 1) {
      return setPage(page.value - 1);
    }
    return false;
  }

  async function nextPage(): Promise<boolean> {
    const instance = activeInstance.value;
    if (instance?.nextPage) {
      return instance.nextPage();
    }
    return setPage(page.value + 1);
  }

  async function setSheet(targetSheet: number | string): Promise<boolean> {
    sheet.value = targetSheet;
    const instance = activeInstance.value;
    if (instance?.setSheet) {
      return instance.setSheet(targetSheet);
    }
    return true;
  }

  function toggleToc(open?: boolean): void {
    isTocOpen.value = open !== undefined ? open : !isTocOpen.value;
    activeInstance.value?.toggleToc(open);
  }

  function openToc(): void {
    toggleToc(true);
  }

  function closeToc(): void {
    toggleToc(false);
  }

  async function scrollToAnchor(anchor: FileViewerDocumentAnchor | string): Promise<boolean> {
    const instance = activeInstance.value;
    if (instance?.scrollToAnchor) {
      return instance.scrollToAnchor(anchor);
    }
    return false;
  }

  function download(): void {
    activeInstance.value?.download();
  }

  function print(): void {
    activeInstance.value?.print();
  }

  function retry(): void {
    activeInstance.value?.retry();
  }

  function destroy(): void {
    internalViewerInstance.value = null;
    isLoading.value = false;
    error.value = null;
  }

  function getViewState(): Record<string, unknown> | null {
    return activeInstance.value?.getViewState?.() || null;
  }

  function applyViewState(state: Record<string, unknown>): Promise<unknown> {
    return activeInstance.value?.applyViewState?.(state) || Promise.resolve(null);
  }

  return {
    // 只读响应式状态
    isLoading: readonly(isLoading) as Readonly<Ref<boolean>>,
    error: readonly(error) as Readonly<Ref<unknown>>,
    fileName: readonly(fileName) as Readonly<Ref<string>>,
    fileType: readonly(fileType) as Readonly<Ref<string>>,
    page: readonly(page) as Readonly<Ref<number>>,
    pageCount: readonly(pageCount) as Readonly<Ref<number>>,
    sheet: readonly(sheet) as Readonly<Ref<number | string>>,
    sheets: readonly(sheets) as Readonly<Ref<FileViewerSheet[]>>,
    zoomScale: readonly(zoomScale) as Readonly<Ref<number>>,
    rotation: readonly(rotation) as Readonly<Ref<number>>,
    tocList: readonly(tocList) as Readonly<Ref<FileViewerDocumentAnchor[]>>,
    isTocOpen: readonly(isTocOpen) as Readonly<Ref<boolean>>,
    downloadable: readonly(downloadable) as Readonly<Ref<boolean>>,
    printable: readonly(printable) as Readonly<Ref<boolean>>,

    // 绑定与实例获取
    bindViewer,
    getViewerInstance,
    getAssetBaseUrl: () => {
      const fromInstance = activeInstance.value?.getAssetBaseUrl?.();
      if (fromInstance) return fromInstance;
      return resolveThreeTierAssetBaseUrl({ localOverride: toValue(options.assetBaseUrl) });
    },
    getPresets: () => {
      const fromInstance = activeInstance.value?.getPresets?.();
      if (fromInstance) return fromInstance;
      return resolvePresets(toValue(options.preset));
    },

    // 指令集
    zoomIn,
    zoomOut,
    resetZoom,
    rotate,
    setPage,
    prevPage,
    nextPage,
    setSheet,
    toggleToc,
    openToc,
    closeToc,
    scrollToAnchor,
    download,
    print,
    retry,
    destroy,
    getViewState,
    applyViewState,
  };
}
