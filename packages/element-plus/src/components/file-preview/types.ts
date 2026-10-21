/**
 * AtengFilePreview 多格式文件在线预览门户类型定义。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { ComputedRef } from 'vue';

export type PreviewFileType =
  'auto' | 'image' | 'pdf' | 'video' | 'audio' | 'code' | 'text' | 'unknown';

export type PreviewDisplayMode = 'inline' | 'dialog';

/**
 * AtengFilePreview 属性接口。
 */
export interface AtengFilePreviewProps {
  /**
   * 文件访问 URL 或 Base64 编码路径。
   */
  url?: string;

  /**
   * 本地 File 或 Blob 实体。
   */
  file?: File | Blob;

  /**
   * 纯文本内容（当预览动态生成的日志或数据时直接传入）。
   */
  content?: string;

  /**
   * 文件名称（包含扩展名，如 'report.pdf', 'data.json'），用于自动探测格式。
   */
  name?: string;

  /**
   * 显式指定文件类型（默认 'auto' 智能推导）。
   * @default 'auto'
   */
  fileType?: PreviewFileType;

  /**
   * 展示交互模式（'inline' 内联嵌入或 'dialog' 弹窗浮层）。
   * @default 'inline'
   */
  mode?: PreviewDisplayMode;

  /**
   * 弹窗模式下的可见状态（支持 v-model:visible）。
   * @default false
   */
  visible?: boolean;

  /**
   * 弹窗模式下的标题。
   */
  title?: string;

  /**
   * 弹窗宽度。
   * @default '80%'
   */
  dialogWidth?: string | number;

  /**
   * 容器/弹窗内嵌视口高度。
   * @default '520px'
   */
  height?: string | number;

  /**
   * 是否支持一键下载。
   * @default true
   */
  downloadable?: boolean;

  /**
   * 根容器自定义样式类名。
   */
  customClass?: string;
}

/**
 * AtengFilePreview 事件接口。
 */
export interface AtengFilePreviewEmits {
  (e: 'update:visible', val: boolean): void;
  (e: 'close'): void;
  (e: 'download', filename: string): void;
  (e: 'error', error: unknown): void;
}

/**
 * AtengFilePreview 插槽接口。
 */
export interface AtengFilePreviewSlots {
  /**
   * 自定义未知类型降级渲染。
   */
  unsupported?: (scope: { filename: string; url?: string; download: () => void }) => unknown;
}

/**
 * AtengFilePreview Expose 实例接口。
 */
export interface AtengFilePreviewExpose {
  /**
   * 触发下载该文件。
   */
  download: () => void;

  /**
   * 获取解析出的文件类型。
   */
  detectedType: ComputedRef<PreviewFileType>;
}

export type AtengFilePreviewInstance = AtengFilePreviewExpose;
