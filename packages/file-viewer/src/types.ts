/**
 * @atengk/file-viewer 核心类型与契约定义。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import type { ComponentPublicInstance } from 'vue';

export type FileViewerTheme = 'light' | 'dark' | 'auto';

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
    retry: () => void;
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
