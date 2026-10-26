/**
 * @atengk/file-viewer 核心类型与契约定义。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import type { ComponentPublicInstance } from 'vue';

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
   * 防泄密动态安全倾斜水印配置 (支持传入文本字符串或结构化对象，具备 MutationObserver 反篡改监视)。
   */
  watermark?: FileViewerWatermark;
}

export interface AtengFileViewerEmits {
  (e: 'load', payload: { fileName: string; fileType?: string }): void;
  (e: 'error', error: unknown): void;
  (e: 'unload', payload: { reason?: string }): void;
}

export interface AtengFileViewerSlots {
  default?: () => unknown;
  toolbar?: (scope: {
    fileName: string;
    fileType?: string;
    zoomIn: () => void;
    zoomOut: () => void;
    rotate: () => void;
    download: () => void;
    print: () => void;
    retry: () => void;
    downloadable: boolean;
    printable: boolean;
  }) => unknown;
  loading?: (scope: { percent?: number }) => unknown;
  error?: (scope: { error: unknown; retry: () => void; download: () => void }) => unknown;
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
   * 获取解析出的当前文件名。
   */
  getFileName: () => string;

  /**
   * 获取解析出的当前文件类型。
   */
  getFileType: () => string;
}

export type AtengFileViewerInstance = ComponentPublicInstance<
  AtengFileViewerProps,
  AtengFileViewerExpose
>;
