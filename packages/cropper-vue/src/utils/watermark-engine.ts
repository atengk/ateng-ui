/**
 * 离屏 Canvas 2D 倾斜防伪文字水印合成引擎。
 *
 * 遵循 ADR-0048 规范，在离屏 Canvas 阶段对位图进行倾斜平铺防伪文字合成，
 * 用于企业级资质证件（如身份证、营业执照）的合规流转与防泄漏防伪。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import type { CropperWatermarkOptions } from '../types';

export class WatermarkEngine {
  /**
   * 将声明式防伪倾斜水印合成到目标 Canvas 副本上。
   *
   * @param sourceCanvas 原始图像 Canvas
   * @param options 防伪水印配置项
   * @returns 带有合成水印的新 Canvas 实例（若未配置水印则直接返回原始 Canvas）
   */
  public static apply(
    sourceCanvas: HTMLCanvasElement,
    options?: CropperWatermarkOptions,
  ): HTMLCanvasElement {
    if (!options || !options.text || !options.text.trim()) {
      return sourceCanvas;
    }

    const width = sourceCanvas.width;
    const height = sourceCanvas.height;

    // 创建离屏 Canvas 副本，杜绝破坏原画布
    const targetCanvas = document.createElement('canvas');
    targetCanvas.width = width;
    targetCanvas.height = height;

    const ctx = targetCanvas.getContext('2d');
    if (!ctx) {
      return sourceCanvas;
    }

    // 1. 绘制底层原图
    ctx.drawImage(sourceCanvas, 0, 0);

    // 2. 配置水印绘制参数
    const text = options.text.trim();
    const fontSize = options.fontSize ?? Math.max(14, Math.round(width / 25));
    const color = options.color ?? 'rgba(180, 180, 180, 0.4)';
    const rotateDegree = options.rotate ?? -22;
    const rad = (rotateDegree * Math.PI) / 180;
    const repeat = options.repeat ?? true;

    ctx.save();
    ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (repeat) {
      // 全图倾斜网格平铺
      const metrics = ctx.measureText(text);
      const textWidth = Math.max(metrics.width, fontSize * text.length * 0.8);
      const stepX = Math.max(textWidth + 80, 180);
      const stepY = Math.max(fontSize * 4, 110);

      // 扩大网格绘制边界，确保旋转后整个可见区域被充分覆盖
      const startX = -width * 0.5;
      const endX = width * 1.5;
      const startY = -height * 0.5;
      const endY = height * 1.5;

      for (let y = startY; y < endY; y += stepY) {
        for (let x = startX; x < endX; x += stepX) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rad);
          ctx.fillText(text, 0, 0);
          ctx.restore();
        }
      }
    } else {
      // 单中心水印
      ctx.translate(width / 2, height / 2);
      ctx.rotate(rad);
      ctx.fillText(text, 0, 0);
    }

    ctx.restore();
    return targetCanvas;
  }
}
