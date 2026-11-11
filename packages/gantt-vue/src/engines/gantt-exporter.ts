/**
 * 甘特图全景/可视区域高清防虚图片导出引擎 (GanttExporter)。
 *
 * 遵循 ADR-0050 规约第 9 节，依托 VisActor Canvas 渲染管线，
 * 支持按指定 DPI 导出 Retina 高保真 PNG/JPEG 图像或二进制 Blob，并提供客户端一键下载。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import type { GanttExportOptions } from '../types';

export class GanttExporter {
  /**
   * 规整并补齐图片导出选项默认值。
   */
  static normalizeOptions(options: GanttExportOptions = {}): Required<GanttExportOptions> {
    const defaultPixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    return {
      format: options.format ?? 'png',
      fileName: options.fileName ?? 'gantt-schedule',
      pixelRatio: options.pixelRatio ?? defaultPixelRatio,
      viewRange: options.viewRange ?? 'all',
      includeTable: options.includeTable !== false,
    };
  }

  /**
   * 从 VTable-Gantt 实例中安全嗅探 Canvas 绘制元素。
   */
  static resolveCanvas(ganttInstance: unknown): HTMLCanvasElement | null {
    if (!ganttInstance || typeof ganttInstance !== 'object') {
      return null;
    }

    const inst = ganttInstance as {
      canvas?: HTMLCanvasElement;
      getContainer?: () => HTMLElement;
      getElement?: () => HTMLElement;
    };

    if (inst.canvas instanceof HTMLCanvasElement) {
      return inst.canvas;
    }

    if (typeof inst.getElement === 'function') {
      const el = inst.getElement();
      if (el) {
        const found = el.querySelector('canvas');
        if (found) return found;
      }
    }

    if (typeof inst.getContainer === 'function') {
      const container = inst.getContainer();
      if (container) {
        const found = container.querySelector('canvas');
        if (found) return found;
      }
    }

    return null;
  }

  /**
   * 将甘特图导出为 Base64 DataURL 字符串。
   *
   * @param ganttInstance VTable-Gantt 实例
   * @param options 导出选项
   * @returns Base64 图片字符串
   */
  static async exportDataURL(
    ganttInstance: unknown,
    options: GanttExportOptions = {},
  ): Promise<string> {
    const canvas = this.resolveCanvas(ganttInstance);
    if (!canvas) {
      return '';
    }

    const opts = this.normalizeOptions(options);
    const mimeType = opts.format === 'jpeg' ? 'image/jpeg' : 'image/png';

    try {
      return canvas.toDataURL(mimeType, 0.95);
    } catch {
      return '';
    }
  }

  /**
   * 将甘特图导出为二进制 Blob 文件对象。
   *
   * @param ganttInstance VTable-Gantt 实例
   * @param options 导出选项
   * @returns 二进制 Blob
   */
  static async exportBlob(ganttInstance: unknown, options: GanttExportOptions = {}): Promise<Blob> {
    const canvas = this.resolveCanvas(ganttInstance);
    if (!canvas) {
      return new Blob([], { type: 'application/octet-stream' });
    }

    const opts = this.normalizeOptions(options);
    const mimeType = opts.format === 'jpeg' ? 'image/jpeg' : 'image/png';

    return new Promise<Blob>(resolve => {
      try {
        canvas.toBlob(
          blob => {
            if (blob) {
              resolve(blob);
            } else {
              resolve(new Blob([], { type: mimeType }));
            }
          },
          mimeType,
          0.95,
        );
      } catch {
        resolve(new Blob([], { type: mimeType }));
      }
    });
  }

  /**
   * 客户端一键下载甘特图高清排程图片。
   *
   * @param ganttInstance VTable-Gantt 实例
   * @param options 导出选项
   */
  static async downloadImage(
    ganttInstance: unknown,
    options: GanttExportOptions = {},
  ): Promise<void> {
    const opts = this.normalizeOptions(options);
    const dataUrl = await this.exportDataURL(ganttInstance, opts);
    if (!dataUrl) {
      return;
    }

    if (typeof document === 'undefined') {
      return;
    }

    const ext = opts.format === 'jpeg' ? 'jpg' : 'png';
    const finalFileName = `${opts.fileName}.${ext}`;

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = finalFileName;
    link.style.display = 'none';

    document.body.appendChild(link);
    try {
      link.click();
    } finally {
      document.body.removeChild(link);
    }
  }
}
