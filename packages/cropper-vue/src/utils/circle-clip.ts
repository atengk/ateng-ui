/**
 * 物理圆形透明 Alpha 裁剪处理工具。
 *
 * 遵循 ADR-0048 规范，使用离屏 Canvas 进行真正的物理圆形弧形剪切，
 * 剔除正方形四角背景色，形成完全透明通道的圆形位图。
 *
 * @author Ateng
 * @since 2026-11-10
 */

/**
 * 将原始矩形 Canvas 转换为物理透明底色的内切圆形 Canvas。
 *
 * @param rawCanvas 原始矩形 Canvas
 * @returns 经过圆形弧度剪裁并带有透明通道的新 Canvas 实例
 */
export function clipCircleCanvas(rawCanvas: HTMLCanvasElement): HTMLCanvasElement {
  if (!rawCanvas || typeof rawCanvas.getContext !== 'function') {
    return rawCanvas;
  }

  const width = rawCanvas.width;
  const height = rawCanvas.height;

  // 取内切圆直径
  const size = Math.min(width, height);
  const radius = size / 2;

  const circleCanvas = document.createElement('canvas');
  circleCanvas.width = size;
  circleCanvas.height = size;

  const ctx = circleCanvas.getContext('2d');
  if (!ctx) {
    return rawCanvas;
  }

  // 开启高精度图像抗锯齿平滑
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 绘制圆形裁切路径
  ctx.save();
  ctx.beginPath();
  ctx.arc(radius, radius, radius, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();

  // 居中绘制原始图象
  const offsetX = (size - width) / 2;
  const offsetY = (size - height) / 2;
  ctx.drawImage(rawCanvas, offsetX, offsetY, width, height);
  ctx.restore();

  return circleCanvas;
}
