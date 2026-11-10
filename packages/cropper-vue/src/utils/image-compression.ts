/**
 * 图像导出智能压缩与尺寸降级重绘管道。
 *
 * 遵循 ADR-0048 规范，提供 4096 像素尺寸安全护栏与针对目标体积（maxByteSize）
 * 的 Canvas 质量二分逼近及步进降采样算法，将输出文件严格收敛至目标大小以内。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import type { CropperExportOptions } from '../types';

export interface CompressionResult {
  /** 最终导出的二进制 Blob */
  blob: Blob;
  /** 最终经过尺寸降采样重绘后的 Canvas 实例 */
  canvas: HTMLCanvasElement;
  /** 最终压缩采用的质量系数 */
  quality: number;
}

export class ImageCompressionPipeline {
  /** 默认最大像素安全护栏上限 (4096) */
  public static readonly DEFAULT_MAX_DIMENSION = 4096;

  /** 最小质量逼近下限 (0.35) */
  public static readonly MIN_QUALITY = 0.35;

  /** 降采样步进缩放系数 (0.85) */
  public static readonly DOWNSCALE_STEP = 0.85;

  /** 降采样最小尺寸下限（像素） */
  public static readonly MIN_DIMENSION = 128;

  /**
   * 将原始 Canvas 转换为指定格式与质量的 Blob。
   */
  public static toBlob(canvas: HTMLCanvasElement, format: string, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        blob => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas 转 Blob 失败。'));
          }
        },
        format,
        quality,
      );
    });
  }

  /**
   * 按比例缩放并重绘 Canvas。
   */
  public static scaleCanvas(
    source: HTMLCanvasElement,
    targetWidth: number,
    targetHeight: number,
  ): HTMLCanvasElement {
    const scaled = document.createElement('canvas');
    scaled.width = Math.max(1, Math.round(targetWidth));
    scaled.height = Math.max(1, Math.round(targetHeight));

    const ctx = scaled.getContext('2d');
    if (!ctx) {
      return source;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, scaled.width, scaled.height);

    return scaled;
  }

  /**
   * 执行完整的尺寸护栏与目标体积收敛压缩。
   *
   * @param sourceCanvas 输入的源 Canvas
   * @param options 导出选项
   */
  public static async compress(
    sourceCanvas: HTMLCanvasElement,
    options?: CropperExportOptions,
  ): Promise<CompressionResult> {
    const format = options?.format ?? 'image/png';
    const initialQuality = options?.quality ?? 0.92;
    const maxWidth = options?.maxWidth ?? ImageCompressionPipeline.DEFAULT_MAX_DIMENSION;
    const maxHeight = options?.maxHeight ?? ImageCompressionPipeline.DEFAULT_MAX_DIMENSION;
    const maxByteSize = options?.maxByteSize;

    let currentCanvas = sourceCanvas;

    // 1. 尺寸安全护栏校验与初次缩放
    if (currentCanvas.width > maxWidth || currentCanvas.height > maxHeight) {
      const scale = Math.min(maxWidth / currentCanvas.width, maxHeight / currentCanvas.height);
      currentCanvas = ImageCompressionPipeline.scaleCanvas(
        currentCanvas,
        currentCanvas.width * scale,
        currentCanvas.height * scale,
      );
    }

    // 2. 导出初次 Blob
    let currentBlob = await ImageCompressionPipeline.toBlob(currentCanvas, format, initialQuality);
    let currentQuality = initialQuality;

    // 若未限制最大字节数，或当前已满足限制，直接返回
    if (!maxByteSize || maxByteSize <= 0 || currentBlob.size <= maxByteSize) {
      return {
        blob: currentBlob,
        canvas: currentCanvas,
        quality: currentQuality,
      };
    }

    // 3. 有损格式（JPEG/WebP）执行质量二分逼近
    const isLossy = format === 'image/jpeg' || format === 'image/webp';
    if (isLossy) {
      let low = ImageCompressionPipeline.MIN_QUALITY;
      let high = initialQuality;
      let bestBlob = currentBlob;
      let bestQuality = initialQuality;

      // 二分循环 5 次
      for (let i = 0; i < 5; i++) {
        const mid = (low + high) / 2;
        const testBlob = await ImageCompressionPipeline.toBlob(currentCanvas, format, mid);

        if (testBlob.size <= maxByteSize) {
          bestBlob = testBlob;
          bestQuality = mid;
          low = mid; // 尝试更高质量
        } else {
          high = mid; // 缩小质量
        }
      }

      currentBlob = bestBlob;
      currentQuality = bestQuality;

      if (currentBlob.size <= maxByteSize) {
        return {
          blob: currentBlob,
          canvas: currentCanvas,
          quality: currentQuality,
        };
      }
    }

    // 4. 若质量降低后仍超限，或为无损 PNG 格式，执行等比降采样重绘循环
    let attempts = 0;
    while (
      currentBlob.size > maxByteSize &&
      attempts < 8 &&
      currentCanvas.width > ImageCompressionPipeline.MIN_DIMENSION &&
      currentCanvas.height > ImageCompressionPipeline.MIN_DIMENSION
    ) {
      attempts++;
      const nextW = currentCanvas.width * ImageCompressionPipeline.DOWNSCALE_STEP;
      const nextH = currentCanvas.height * ImageCompressionPipeline.DOWNSCALE_STEP;

      currentCanvas = ImageCompressionPipeline.scaleCanvas(currentCanvas, nextW, nextH);
      currentBlob = await ImageCompressionPipeline.toBlob(currentCanvas, format, currentQuality);
    }

    return {
      blob: currentBlob,
      canvas: currentCanvas,
      quality: currentQuality,
    };
  }
}
