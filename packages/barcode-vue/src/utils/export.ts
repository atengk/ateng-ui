/**
 * 一维条码统一高保真多格式图像导出工具链。
 *
 * 支持将 SVG 纯矢量或 Canvas 条码无损转译导出为 PNG、JPEG、SVG 及二进制 Blob。
 *
 * @author Ateng
 * @since 2026-11-10
 */

export type BarcodeExportFormat = 'png' | 'jpeg' | 'svg' | 'blob';

export interface BarcodeExportOptions {
  /** 导出图片背景填充色，默认 '#ffffff' */
  background?: string;
  /** 缩放采样倍率（高分屏抗模糊），默认 window.devicePixelRatio || 2 */
  scale?: number;
  /** JPEG 导出压缩质量 (0.1 ~ 1.0)，默认 0.95 */
  quality?: number;
  /** 导出的默认下载文件名（不含扩展名），默认 'barcode' */
  fileName?: string;
}

/**
 * 将指定 SVG 或 Canvas 节点导出为对应格式的 Data URL 字符串或 Blob 对象。
 *
 * @param target DOM 容器节点（SVGSVGElement、HTMLCanvasElement 或外层 HTMLElement）
 * @param format 目标格式：'png' | 'jpeg' | 'svg' | 'blob'
 * @param options 导出增强选项
 * @returns 导出产物 Promise（DataURL 字符串或 Blob 二进制）
 */
export function exportBarcodeAsImage(
  target: SVGSVGElement | HTMLCanvasElement | HTMLElement | null,
  format: BarcodeExportFormat = 'png',
  options?: BarcodeExportOptions,
): Promise<string | Blob> {
  return new Promise((resolve, reject) => {
    if (!target) {
      reject(new Error('未找到可导出的条码 DOM 节点'));
      return;
    }

    // 1. 定位真正的 SVG 或 Canvas 元素
    let actualEl: Element | null = target;
    if (!(target instanceof SVGSVGElement) && !(target instanceof HTMLCanvasElement)) {
      actualEl = target.querySelector('svg') || target.querySelector('canvas');
    }

    if (!actualEl) {
      reject(new Error('容器内未找到有效的 svg 或 canvas 元素'));
      return;
    }

    const scale =
      options?.scale ?? (typeof window !== 'undefined' ? window.devicePixelRatio || 2 : 2);
    const quality = options?.quality ?? 0.95;
    const background = options?.background ?? '#ffffff';
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';

    // 2. 如果目标是 HTMLCanvasElement
    if (actualEl instanceof HTMLCanvasElement) {
      if (format === 'blob') {
        actualEl.toBlob(
          blob => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas 转换为 Blob 失败'));
          },
          'image/png',
          quality,
        );
        return;
      }
      if (format === 'svg') {
        // 将 Canvas 位图包装为 SVG 数据流
        const dataUrl = actualEl.toDataURL('image/png');
        const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${actualEl.width}" height="${actualEl.height}"><image href="${dataUrl}" width="${actualEl.width}" height="${actualEl.height}" /></svg>`;
        resolve(new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' }));
        return;
      }
      resolve(actualEl.toDataURL(mimeType, quality));
      return;
    }

    // 3. 如果目标是 SVGSVGElement
    if (actualEl instanceof SVGSVGElement) {
      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(actualEl);

      // 确保 xmlns 声明存在
      if (!svgString.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
        svgString = svgString.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
      }

      if (format === 'svg') {
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        resolve(svgBlob);
        return;
      }

      // 需要将 SVG 矢量栅格化为 Canvas 位图
      const rect = actualEl.getBoundingClientRect();
      const width =
        rect.width > 0 ? rect.width : Number.parseFloat(actualEl.getAttribute('width') || '300');
      const height =
        rect.height > 0 ? rect.height : Number.parseFloat(actualEl.getAttribute('height') || '100');

      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const blobUrl = URL.createObjectURL(svgBlob);
      const img = new Image();

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(width * scale));
          canvas.height = Math.max(1, Math.round(height * scale));

          const ctx = canvas.getContext('2d');
          if (ctx) {
            // 背景填充防透明底发黑
            ctx.fillStyle = background;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          }

          URL.revokeObjectURL(blobUrl);

          if (format === 'blob') {
            canvas.toBlob(
              blob => {
                if (blob) resolve(blob);
                else reject(new Error('SVG 栅格化生成 Blob 失败'));
              },
              mimeType,
              quality,
            );
          } else {
            resolve(canvas.toDataURL(mimeType, quality));
          }
        } catch (err) {
          URL.revokeObjectURL(blobUrl);
          reject(err);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        reject(new Error('SVG 图片解析失败，无法栅格化为位图'));
      };

      img.src = blobUrl;
    }
  });
}

/**
 * 触发条形码文件下载对话框。
 *
 * @param target 条码 DOM 节点
 * @param format 目标格式，默认 'png'
 * @param fileName 文件名前缀，默认 'barcode'
 */
export async function downloadBarcodeImage(
  target: SVGSVGElement | HTMLCanvasElement | HTMLElement | null,
  format: BarcodeExportFormat = 'png',
  fileName = 'barcode',
): Promise<void> {
  const result = await exportBarcodeAsImage(target, format, { fileName });
  const ext = format === 'jpeg' ? 'jpg' : format === 'svg' ? 'svg' : 'png';
  const fullFileName = `${fileName}.${ext}`;

  let downloadUrl = '';
  let shouldRevoke = false;

  if (result instanceof Blob) {
    downloadUrl = URL.createObjectURL(result);
    shouldRevoke = true;
  } else {
    downloadUrl = result;
  }

  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = fullFileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (shouldRevoke) {
    URL.revokeObjectURL(downloadUrl);
  }
}
