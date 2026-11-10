/**
 * @atengk/barcode-vue 艺术二维码图像导出与下载门面工具。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import type QRCodeStyling from 'qr-code-styling';
import type {
  ExportQRCodeOptions,
  DownloadQRCodeOptions,
  QRCodeExportFormat,
} from '../types/qrcode';

/**
 * 从目标容器或实例中提取 HTMLCanvasElement 或 SVGElement。
 *
 * @param target DOM 容器或 QRCodeStyling 实例
 * @returns 提取到的画布或 SVG 元素，未找到则返回 null
 */
function resolveQRCodeElement(
  target: HTMLElement | QRCodeStyling | null | undefined,
): HTMLCanvasElement | SVGElement | null {
  if (!target) {
    return null;
  }

  // 1. 若本身即为 Canvas 或 SVG
  if (target instanceof HTMLCanvasElement || target instanceof SVGElement) {
    return target;
  }

  // 2. 若为标准 DOM 容器，查询子节点
  if (target instanceof HTMLElement) {
    const canvas = target.querySelector('canvas');
    if (canvas) {
      return canvas;
    }
    const svg = target.querySelector('svg');
    if (svg) {
      return svg;
    }
  }

  // 3. 若为 QRCodeStyling 实例对象，读取内部私有节点
  const maybeInstance = target as unknown as {
    _domCanvas?: HTMLCanvasElement;
    _svg?: SVGElement;
  };
  if (maybeInstance._domCanvas instanceof HTMLCanvasElement) {
    return maybeInstance._domCanvas;
  }
  if (maybeInstance._svg instanceof SVGElement) {
    return maybeInstance._svg;
  }

  return null;
}

/**
 * 将 SVG 元素转译为离屏 Canvas，便于导出为点阵位图（PNG/JPEG/Blob）。
 *
 * @param svgElement SVG 根节点
 * @param scale 导出缩放倍率
 * @param background 背景填充色（JPEG 模式防黑底）
 * @returns Promise<HTMLCanvasElement>
 */
function svgToCanvas(
  svgElement: SVGElement,
  scale: number = 1,
  background?: string,
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const svgClone = svgElement.cloneNode(true) as SVGElement;
    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    const svgString = new XMLSerializer().serializeToString(svgClone);
    const svgBlob = new Blob([svgString], {
      type: 'image/svg+xml;charset=utf-8',
    });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      URL.revokeObjectURL(url);
      const width = (svgElement.clientWidth || img.width || 300) * scale;
      const height = (svgElement.clientHeight || img.height || 300) * scale;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('无法创建 2D 绘图上下文'));
        return;
      }

      if (background) {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('SVG 栅格化转译图像加载失败'));
    };

    img.src = url;
  });
}

/**
 * 将 Canvas 进行缩放或底色重绘。
 *
 * @param sourceCanvas 源 Canvas 元素
 * @param scale 缩放倍率
 * @param background 背景色
 * @returns 处理后的新 Canvas
 */
function scaleCanvas(
  sourceCanvas: HTMLCanvasElement,
  scale: number = 1,
  background?: string,
): HTMLCanvasElement {
  if (scale === 1 && !background) {
    return sourceCanvas;
  }

  const width = sourceCanvas.width * scale;
  const height = sourceCanvas.height * scale;

  const targetCanvas = document.createElement('canvas');
  targetCanvas.width = width;
  targetCanvas.height = height;

  const ctx = targetCanvas.getContext('2d');
  if (ctx) {
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(sourceCanvas, 0, 0, width, height);
  }

  return targetCanvas;
}

/**
 * 导出二维码图像为目标格式（PNG、JPEG、SVG 或 Blob）。
 *
 * @param target 承载二维码的 DOM 容器或 QRCodeStyling 实例
 * @param options 导出选项
 * @returns 导出的 DataURL 字符串或 Blob 二进制对象
 */
export async function exportQRCodeAsImage(
  target: HTMLElement | QRCodeStyling | null | undefined,
  options: ExportQRCodeOptions = {},
): Promise<string | Blob> {
  const element = resolveQRCodeElement(target);
  if (!element) {
    throw new Error('导出失败：未在目标中找到有效的二维码 Canvas 或 SVG 渲染节点');
  }

  const format: QRCodeExportFormat = options.format || 'png';
  const quality = options.quality ?? 0.92;
  const scale = options.scale ?? 1;
  const background = format === 'jpeg' ? options.background || '#ffffff' : options.background;

  // 1. 若要求导出 SVG
  if (format === 'svg') {
    if (element instanceof SVGElement) {
      const serializer = new XMLSerializer();
      const svgText = serializer.serializeToString(element);
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
    }
    throw new Error('当前二维码为 Canvas 渲染模式，不支持无损导出为矢量 SVG');
  }

  // 2. 若当前为 SVG 节点，需栅格化为点阵位图
  let canvas: HTMLCanvasElement;
  if (element instanceof SVGElement) {
    canvas = await svgToCanvas(element, scale, background);
  } else {
    canvas = scaleCanvas(element, scale, background);
  }

  // 3. 点阵位图导出
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';

  if (format === 'blob') {
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        blob => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas 转 Blob 失败'));
          }
        },
        'image/png',
        quality,
      );
    });
  }

  return canvas.toDataURL(mimeType, quality);
}

/**
 * 触发浏览器端二维码图像快速下载。
 *
 * @param target 承载二维码的 DOM 容器或 QRCodeStyling 实例
 * @param options 下载配置项
 */
export async function downloadQRCodeImage(
  target: HTMLElement | QRCodeStyling | null | undefined,
  options: DownloadQRCodeOptions = {},
): Promise<void> {
  const format = options.format || 'png';
  const ext = format === 'blob' ? 'png' : format;
  const filename = `${options.filename || 'qrcode'}.${ext}`;

  const result = await exportQRCodeAsImage(target, options);

  const anchor = document.createElement('a');
  let blobUrl: string | null = null;

  if (result instanceof Blob) {
    blobUrl = URL.createObjectURL(result);
    anchor.href = blobUrl;
  } else {
    anchor.href = result;
  }

  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  if (blobUrl) {
    setTimeout(() => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    }, 100);
  }
}
