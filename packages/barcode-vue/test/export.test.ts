/**
 * exportBarcodeAsImage 图像导出工具链单元测试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect, vi } from 'vitest';
import { exportBarcodeAsImage, downloadBarcodeImage } from '../src/utils/export';

describe('exportBarcodeAsImage 图像导出工具链', () => {
  it('当 target 为 null 或未找到 svg/canvas 时应抛出异常', async () => {
    await expect(exportBarcodeAsImage(null)).rejects.toThrow('未找到可导出的条码 DOM 节点');

    const emptyDiv = document.createElement('div');
    await expect(exportBarcodeAsImage(emptyDiv)).rejects.toThrow(
      '容器内未找到有效的 svg 或 canvas 元素',
    );
  });

  it('支持将 SVGSVGElement 直接导出为 svg 格式的 Blob', async () => {
    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgEl.innerHTML = '<rect width="100" height="50" fill="black" />';

    const result = await exportBarcodeAsImage(svgEl, 'svg');
    expect(result).toBeInstanceOf(Blob);
    expect((result as Blob).type).toContain('image/svg+xml');
  });

  it('支持将 HTMLCanvasElement 导出为 PNG DataURL 与 Blob', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 100;
    // mock toDataURL and toBlob in happy-dom
    canvas.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,mockPngData');
    canvas.toBlob = vi.fn().mockImplementation((cb: (b: Blob) => void) => {
      cb(new Blob(['mock-png'], { type: 'image/png' }));
    });

    const dataUrl = await exportBarcodeAsImage(canvas, 'png');
    expect(dataUrl).toBe('data:image/png;base64,mockPngData');

    const blob = await exportBarcodeAsImage(canvas, 'blob');
    expect(blob).toBeInstanceOf(Blob);
    expect((blob as Blob).type).toBe('image/png');
  });

  it('downloadBarcodeImage 应当正确构造 <a> 标签并触发点击事件', async () => {
    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgEl.innerHTML = '<rect width="100" height="50" fill="black" />';

    // Mock HTMLAnchorElement click
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');

    await downloadBarcodeImage(svgEl, 'svg', 'my-barcode');

    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });
});
