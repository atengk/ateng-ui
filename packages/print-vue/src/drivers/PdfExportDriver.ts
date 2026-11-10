/**
 * 纯前端逐页切片高保真 PDF 导出驱动。
 *
 * 基于 jsPDF 与 html2canvas 实行每页 DOM 隔离切片渲染，处理完单页即时清空
 * Canvas 尺寸释放 GPU 显存，前置嗅探外部跨域图片并具备 Tainted Canvas 降级逃生门。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { PrintErrorCode, PrintException } from '../errors/PrintException';
import { type PaperPreset, type PaperOrientation, resolvePaperDimensions } from '../types/paper';
import type { PrintDriver, PrintOptions, PdfExportOptions } from '../types';

export class PdfExportDriver implements PrintDriver {
  public readonly name = 'pdf';

  /**
   * 探测当前运行环境是否支持纯前端 PDF 导出。
   */
  public async isAvailable(): Promise<boolean> {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
  }

  /**
   * 实现 PrintDriver SPI 打印契约（默认触发 PDF 导出并自动下载）。
   *
   * @param target 打印目标选择器或 DOM 节点
   * @param options 打印选项
   */
  public async print(target: HTMLElement | string, options?: PrintOptions): Promise<void> {
    await this.exportPdf(target, {
      ...options,
      download: true,
    });
  }

  /**
   * 执行高保真逐页切片 PDF 导出，生成合规二进制 Blob 并支持自动下载。
   *
   * @param target 目标元素或 CSS 选择器
   * @param options PDF 专属导出参数
   * @returns 生成的 PDF 二进制 Blob 对象
   */
  public async exportPdf(target: HTMLElement | string, options?: PdfExportOptions): Promise<Blob> {
    // 1. 目标 DOM 节点卫语句校验
    let targetEl: HTMLElement | null = null;
    if (typeof target === 'string') {
      targetEl = document.querySelector<HTMLElement>(target);
    } else if (target instanceof HTMLElement) {
      targetEl = target;
    }

    if (!targetEl) {
      throw new PrintException(
        '未找到有效的 PDF 导出目标 DOM 节点',
        PrintErrorCode.INVALID_TARGET,
        { target },
      );
    }

    // 2. 检测是否存在由 AtengPrintSheet 切割出的子页集合（Per-Page Slicing）
    let pageElements = Array.from(targetEl.querySelectorAll<HTMLElement>('.at-print-page'));
    if (pageElements.length === 0) {
      pageElements = Array.from(targetEl.querySelectorAll<HTMLElement>('.at-print-sheet'));
    }
    if (pageElements.length === 0) {
      pageElements = [targetEl];
    }

    // 3. 计算目标纸张几何规格与方向
    const orientation: PaperOrientation = options?.orientation || 'portrait';
    const preset: PaperPreset = options?.preset || 'a4';
    const dim = resolvePaperDimensions(preset, undefined, undefined, orientation);
    const pdfFormat: [number, number] = [dim.widthMm, dim.heightMm > 0 ? dim.heightMm : 297];

    // 4. 初始化 jsPDF 实例
    const doc = new jsPDF({
      orientation,
      unit: 'mm',
      format: pdfFormat,
      compress: true,
    });

    const scale =
      options?.scale ?? (typeof window !== 'undefined' ? window.devicePixelRatio || 2 : 2);
    const useCORS = options?.useCORS ?? true;
    const backgroundColor = options?.backgroundColor ?? '#ffffff';

    // 5. 逐页 DOM 隔离切片管线（Per-Page Slicing）
    for (let i = 0; i < pageElements.length; i++) {
      const pageEl = pageElements[i];
      if (!pageEl) continue;

      // 首页已默认存在，续页追加新页面
      if (i > 0) {
        doc.addPage(pdfFormat, orientation);
      }

      // 跨域图片防污损前置卫语句配置
      this.sanitizeImages(pageEl, useCORS);

      let canvas: HTMLCanvasElement;
      try {
        canvas = await html2canvas(pageEl, {
          scale,
          useCORS,
          allowTaint: false,
          backgroundColor,
          logging: false,
        });
      } catch (renderError) {
        // 捕获跨域图片引发的异常并尝试安全降级重试
        canvas = await this.renderFallbackCanvas(pageEl, scale, backgroundColor, renderError);
      }

      try {
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        doc.addImage(imgData, 'JPEG', 0, 0, pdfFormat[0], pdfFormat[1], undefined, 'FAST');
      } catch (taintErr) {
        throw new PrintException(
          'Canvas 导出受到外部跨域图片污染 (Tainted Canvas)',
          PrintErrorCode.TAINTED_CANVAS,
          { pageIndex: i + 1 },
          taintErr,
        );
      } finally {
        // 显式清空宽高释放 GPU 显存，规避长单据内存泄露
        canvas.width = 0;
        canvas.height = 0;
      }
    }

    // 6. 生成输出 Blob
    const blob = doc.output('blob');

    // 7. 触发浏览器自动下载
    const shouldDownload = options?.download ?? true;
    if (shouldDownload && typeof window !== 'undefined') {
      const filename = options?.filename || `document_${Date.now()}.pdf`;
      this.triggerDownload(blob, filename);
    }

    return blob;
  }

  /**
   * 前置嗅探当前节点内的远程图片并声明 anonymous 跨域凭据。
   */
  private sanitizeImages(el: HTMLElement, useCORS: boolean): void {
    if (!useCORS || typeof window === 'undefined') return;
    const images = Array.from(el.querySelectorAll<HTMLImageElement>('img'));
    for (const img of images) {
      if (img.src && !img.src.startsWith('data:') && !img.src.startsWith('blob:')) {
        try {
          const url = new URL(img.src, window.location.href);
          if (url.origin !== window.location.origin) {
            img.crossOrigin = 'anonymous';
          }
        } catch {
          // 容错忽略格式异常的 URL
        }
      }
    }
  }

  /**
   * 跨域图片污损时的安全降级渲染。
   *
   * 临时隐藏非同源图片重新渲染，确保单据文字与表格核心内容导出不发生白屏中断。
   */
  private async renderFallbackCanvas(
    el: HTMLElement,
    scale: number,
    backgroundColor: string,
    cause: unknown,
  ): Promise<HTMLCanvasElement> {
    const remoteImages = Array.from(el.querySelectorAll<HTMLImageElement>('img')).filter(img => {
      return img.src && !img.src.startsWith('data:') && !img.src.startsWith('blob:');
    });

    const originalVisibilities = remoteImages.map(img => img.style.visibility);
    remoteImages.forEach(img => {
      img.style.visibility = 'hidden';
    });

    try {
      return await html2canvas(el, {
        scale,
        useCORS: false,
        allowTaint: false,
        backgroundColor,
        logging: false,
      });
    } catch (secondErr) {
      throw new PrintException(
        'PDF 光栅化渲染失败，请检查单据 DOM 结构与外部图片资源',
        PrintErrorCode.EXPORT_FAILED,
        {},
        secondErr || cause,
      );
    } finally {
      // 还原图片样式，杜绝宿主 DOM 污染
      remoteImages.forEach((img, idx) => {
        img.style.visibility = originalVisibilities[idx] ?? '';
      });
    }
  }

  /**
   * 安全触发浏览器原生二进制文件下载，并确定性释放 ObjectURL。
   */
  private triggerDownload(blob: Blob, filename: string): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    // 确定性回收内存临时凭据（ADR-0008 与第 2 道防线）
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }
}
