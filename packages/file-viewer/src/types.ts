/**
 * @atengk/file-viewer 核心类型与契约定义。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import type { ComponentPublicInstance } from 'vue';
import type { FileViewerPreset } from './utils/presets';
import type { FileViewerDownloadProgress } from './utils/sizeGuard';
import type { FileViewerDiagnostic } from './utils/diagnostic';

export type { FileViewerPreset } from './utils/presets';
export type { FileViewerGlobalConfig } from './utils/assets';
export type { FileViewerDownloadProgress, CalculateProgressInput } from './utils/sizeGuard';
export type {
  FileViewerErrorCategory,
  FileViewerDiagnostic,
  DiagnoseContext,
} from './utils/diagnostic';

export type FileViewerTheme = 'light' | 'dark' | 'auto';

/**
 * 水印详细配置参数。
 */
export interface WatermarkOptions {
  /**
   * 是否启用水印 (默认 true)。
   */
  enabled?: boolean;

  /**
   * 水印文本内容 (支持如 '张三 10086 2026-10-26')。
   */
  text?: string;

  /**
   * 水印图片 URL (与 text 互斥，优先使用 image)。
   */
  image?: string;

  /**
   * 字体大小 (px，默认 16)。
   */
  fontSize?: number;

  /**
   * 字体颜色 (默认 'rgba(0, 0, 0, 0.15)')。
   */
  color?: string;

  /**
   * 字体族 (默认 "Aptos, 'Segoe UI', -apple-system, sans-serif")。
   */
  fontFamily?: string;

  /**
   * 旋转倾斜角度 (deg，默认 -22)。
   */
  rotate?: number;

  /**
   * 水印透明度 (0 ~ 1，默认 0.18)。
   */
  opacity?: number;

  /**
   * 水平间距/网格单元宽度 (px，默认 260)。
   */
  gapX?: number;

  /**
   * 垂直间距/网格单元高度 (px，默认 180)。
   */
  gapY?: number;

  /**
   * 水印内容宽度 (px，默认 200)。
   */
  width?: number;

  /**
   * 水印内容高度 (px，默认 60)。
   */
  height?: number;

  /**
   * 水印图层 z-index (默认 9999)。
   */
  zIndex?: number;
}

/**
 * 水印入参类型 (支持纯文本简写、详细配置对象或 false 关闭)。
 */
export type FileViewerWatermark = string | WatermarkOptions | false;

/**
 * 文档章节、大纲或分页锚点定义。
 */
export interface FileViewerDocumentAnchor {
  id: string;
  index: number;
  label: string;
  text?: string;
  page?: number;
  line?: number;
  type?: 'page' | 'line' | 'block' | 'heading';
  top?: number;
  left?: number;
}

/**
 * 表格多工作表定义。
 */
export interface FileViewerSheet {
  id: number | string;
  name: string;
  hidden?: boolean;
}

export interface AtengFileViewerProps {
  /**
   * 待预览文件的访问 URL (支持 HTTP/HTTPS、相对路径或 ObjectURL)。
   */
  url?: string;

  /**
   * 待预览的本地二进制文件对象 (File 或 Blob)。
   */
  file?: File | Blob;

  /**
   * 显式指定文件名 (用于类型推导与下载提示)。
   */
  fileName?: string;

  /**
   * 显式指定文件类型/扩展名 (如 'docx', 'xlsx', 'pdf', 'pptx')。
   */
  fileType?: string;

  /**
   * 当前展示/受控页码 (从 1 开始，支持 v-model:page 双向绑定)。
   */
  page?: number;

  /**
   * 当前展示/受控工作表 ID 或名称 (支持 v-model:sheet 双向绑定)。
   */
  sheet?: number | string;

  /**
   * 显式指定或外部注入的多工作表列表 (若不传则从底层表格引擎自动解析)。
   */
  sheets?: FileViewerSheet[];

  /**
   * 是否在 Excel 表格等包含多工作表时渲染底栏工作表 Tab 条 (默认 true)。
   */
  showSheetBar?: boolean;

  /**
   * 是否启用文档目录大纲 (TOC) 折叠抽屉与侧边导航 (默认 true)。
   */
  showToc?: boolean;

  /**
   * 显式指定或外部注入的文档目录大纲 (TOC) 列表 (若不传则从底层引擎自动收集)。
   */
  tocList?: FileViewerDocumentAnchor[];

  /**
   * 是否开启阅读状态记忆与弱引用自动复原 (默认 true)。
   * 在组件短暂重绘或切 Tab 时自动复原上一次的滚动位置、缩放比与旋转角度。
   */
  preserveViewState?: boolean;

  /**
   * 容器高度 (支持 CSS 尺寸表达式，默认 '100%')。
   */
  height?: string | number;

  /**
   * 容器宽度 (支持 CSS 尺寸表达式，默认 '100%')。
   */
  width?: string | number;

  /**
   * 是否展示默认纯 CSS/SVG 轻量操作栏 (默认 true)。
   */
  showToolbar?: boolean;

  /**
   * 主题模式 ('light' | 'dark' | 'auto'，默认 'auto')。
   */
  theme?: FileViewerTheme;

  /**
   * 底层渲染器原始高级配置项。
   */
  options?: Record<string, unknown>;

  /**
   * 是否自动注入当前登录态凭据与双轨 Token 请求头 (默认 true)。
   */
  auth?: boolean;

  /**
   * 自定义请求头映射。
   */
  headers?: Record<string, string>;

  /**
   * 自定义根容器 CSS 类名。
   */
  customClass?: string;

  /**
   * 是否允许下载原文件 (DLP 控制，默认 true)。
   * 为 false 时隐藏下载按钮，并全局/容器捕获拦截 Ctrl+S / Cmd+S 快捷键保存。
   */
  downloadable?: boolean;

  /**
   * 是否允许打印文档 (DLP 控制，默认 true)。
   * 为 false 时隐藏打印按钮、注入打印隐藏样式并拦截 Ctrl+P / Cmd+P 打印快捷键。
   */
  printable?: boolean;

  /**
   * 是否允许选中与复制文本内容 (DLP 控制，默认 true)。
   * 为 false 时向容器注入 user-select: none 并拦截 copy、cut 与 selectstart 事件。
   */
  copyable?: boolean;

  /**
   * 是否允许鼠标右键上下文菜单 (DLP 控制，默认 true)。
   * 为 false 时拦截 contextmenu 鼠标右键事件。
   */
  contextMenu?: boolean;

  /**
   * 静态资产基地址覆盖 (遵循三级弹性寻址：局部覆盖 ➔ 全局配置 ➔ 本地 public)。
   */
  assetBaseUrl?: string | URL | null;

  /**
   * 动态重载扩展预设 (如 CAD、3D 模型、OFD 等重型预设，支持单个或数组)。
   */
  preset?: FileViewerPreset | FileViewerPreset[];

  /**
   * 防泄密动态安全倾斜水印配置 (支持传入文本字符串或结构化对象，具备 MutationObserver 反篡改监视)。
   */
  watermark?: FileViewerWatermark;

  /**
   * 最大允许直接渲染的文件体积上限 (支持整数字节或 '100MB', '50M', '1GB'，默认 100MB)。
   * 超过该阈值时触发 SizeGuard 防崩护栏，阻止默认自动渲染并弹出确认卡片。
   */
  maxSize?: number | string;

  /**
   * 初始或受控解密密码 (针对受密码保护的 PDF / Office 文档)。
   */
  password?: string;
}

export interface AtengFileViewerEmits {
  (e: 'load', payload: { fileName: string; fileType?: string }): void;
  (e: 'error', error: unknown): void;
  (e: 'unload', payload: { reason?: string }): void;
  (e: 'update:page', page: number): void;
  (e: 'page-change', page: number, pageCount?: number): void;
  (e: 'update:sheet', sheet: number | string): void;
  (e: 'sheet-change', sheet: number | string, sheetName?: string): void;
  (e: 'update:toc-open', open: boolean): void;
  (e: 'toc-change', anchors: FileViewerDocumentAnchor[]): void;
  (e: 'view-state-change', change: Record<string, unknown>): void;
  (e: 'progress', progress: FileViewerDownloadProgress): void;
  (e: 'size-guard', payload: { size: number; maxSize: number }): void;
  (e: 'diagnostic', diagnostic: FileViewerDiagnostic): void;
  (e: 'password-submit', password: string): void;
  (e: 'password-success'): void;
  (e: 'password-error', error: unknown): void;
}

export interface AtengFileViewerSlots {
  default?: () => unknown;
  toolbar?: (scope: {
    fileName: string;
    fileType?: string;
    page: number;
    pageCount: number;
    prevPage: () => void;
    nextPage: () => void;
    setPage: (page: number) => void;
    sheet: number | string;
    sheets: FileViewerSheet[];
    setSheet: (sheet: number | string) => void;
    isTocOpen: boolean;
    toggleToc: () => void;
    zoomIn: () => void;
    zoomOut: () => void;
    rotate: () => void;
    download: () => void;
    print: () => void;
    retry: () => void;
    downloadable: boolean;
    printable: boolean;
  }) => unknown;
  sheetBar?: (scope: {
    sheet: number | string;
    sheets: FileViewerSheet[];
    setSheet: (sheet: number | string) => void;
  }) => unknown;
  toc?: (scope: {
    anchors: FileViewerDocumentAnchor[];
    scrollToAnchor: (anchor: FileViewerDocumentAnchor | string) => void;
    closeToc: () => void;
  }) => unknown;
  loading?: (
    scope: FileViewerDownloadProgress & {
      percent?: number;
    },
  ) => unknown;
  sizeGuard?: (scope: {
    size: number;
    maxSize: number;
    formattedSize: string;
    formattedMaxSize: string;
    forceRender: () => void;
    download: () => void;
  }) => unknown;
  error?: (scope: {
    diagnostic: FileViewerDiagnostic;
    error: unknown;
    retry: () => void;
    download: () => void;
  }) => unknown;
  password?: (scope: {
    submitPassword: (pwd: string) => Promise<boolean>;
    isDecrypting: boolean;
    errorMessage?: string;
    download: () => void;
  }) => unknown;
}

export interface AtengFileViewerExpose {
  /**
   * 放大视图。
   */
  zoomIn: () => void;

  /**
   * 缩小视图。
   */
  zoomOut: () => void;

  /**
   * 重置缩放为 100%。
   */
  resetZoom: () => void;

  /**
   * 顺时针旋转 90 度。
   */
  rotate: () => void;

  /**
   * 下载当前文件。
   */
  download: () => void;

  /**
   * 打印当前文档 (受 printable 控制)。
   */
  print: () => void;

  /**
   * 重新加载/重试。
   */
  retry: () => void;

  /**
   * 解除 SizeGuard 拦截并强制渲染大文件。
   */
  forceRender: () => void;

  /**
   * 获取当前是否正处于 SizeGuard 拦截状态。
   */
  isSizeGuarded: () => boolean;

  /**
   * 获取当前下载/加载进度指标。
   */
  getProgress: () => FileViewerDownloadProgress;

  /**
   * 获取当前文件体积字节数。
   */
  getFileSize: () => number;

  /**
   * 获取当前发生的结构化诊断实体 (若无异常则返回 null)。
   */
  getDiagnostic: () => FileViewerDiagnostic | null;

  /**
   * 原地提交密码重试解密。
   */
  submitPassword: (password: string) => Promise<boolean>;

  /**
   * 获取当前是否处于需要输入密码解密状态。
   */
  isPasswordRequired: () => boolean;

  /**
   * 获取解析出的当前文件名。
   */
  getFileName: () => string;

  /**
   * 获取解析出的当前文件类型。
   */
  getFileType: () => string;

  /**
   * 获取当前展示页码。
   */
  getPage: () => number;

  /**
   * 获取文档总页数。
   */
  getPageCount: () => number;

  /**
   * 跳转至指定页码。
   */
  setPage: (page: number) => Promise<boolean>;

  /**
   * 翻至上一页。
   */
  prevPage: () => Promise<boolean>;

  /**
   * 翻至下一页。
   */
  nextPage: () => Promise<boolean>;

  /**
   * 获取当前活动工作表 ID 或名称。
   */
  getSheet: () => number | string;

  /**
   * 获取已解析或配置的工作表列表。
   */
  getSheets: () => FileViewerSheet[];

  /**
   * 切换至指定工作表。
   */
  setSheet: (sheet: number | string) => Promise<boolean>;

  /**
   * 获取文档目录大纲 (TOC) 锚点列表。
   */
  getTocList: () => FileViewerDocumentAnchor[];

  /**
   * 获取当前大纲抽屉是否处于展开状态。
   */
  isTocOpen: () => boolean;

  /**
   * 切换目录大纲抽屉的展开/收起状态。
   */
  toggleToc: (open?: boolean) => void;

  /**
   * 展开目录大纲抽屉。
   */
  openToc: () => void;

  /**
   * 关闭目录大纲抽屉。
   */
  closeToc: () => void;

  /**
   * 平滑滚动定位至指定锚点或章节 ID。
   */
  scrollToAnchor: (anchor: FileViewerDocumentAnchor | string) => Promise<boolean>;

  /**
   * 手动触发或重放加载完成生命周期。
   */
  handleLoadComplete?: () => Promise<void>;

  /**
   * 获取底层原始视图状态。
   */
  getViewState: () => Record<string, unknown> | null;

  /**
   * 获取当前生效的静态资产基地址。
   */
  getAssetBaseUrl: () => string;

  /**
   * 获取当前生效的所有预设列表。
   */
  getPresets: () => FileViewerPreset[];

  /**
   * 应用或恢复视图状态。
   */
  applyViewState: (state: Record<string, unknown>) => Promise<unknown>;
}

export type AtengFileViewerInstance = ComponentPublicInstance<
  AtengFileViewerProps,
  AtengFileViewerExpose
>;
