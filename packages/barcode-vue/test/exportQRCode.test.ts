/**
 * @atengk/barcode-vue 二维码导出与下载工具单元测试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportQRCodeAsImage, downloadQRCodeImage } from '../src/utils/exportQRCode';

describe('exportQRCodeAsImage()', () => {
  beforeEach(() => {
    // 桩函数设置
    HTMLCanvasElement.prototype.toDataURL = vi
      .fn()
      .mockImplementation((type: string) => `data:${type};base64,mockCanvasData`);
    HTMLCanvasElement.prototype.toBlob = vi
      .fn()
      .mockImplementation((callback: (b: Blob | null) => void) => {
        callback(new Blob(['mock-blob-data'], { type: 'image/png' }));
      });
  });

  it('传入空目标或无二维码节点时应快速失败', async () => {
    await expect(exportQRCodeAsImage(null)).rejects.toThrow(
      '导出失败：未在目标中找到有效的二维码 Canvas 或 SVG 渲染节点',
    );

    const emptyDiv = document.createElement('div');
    await expect(exportQRCodeAsImage(emptyDiv)).rejects.toThrow(
      '导出失败：未在目标中找到有效的二维码 Canvas 或 SVG 渲染节点',
    );
  });

  it('从包含 Canvas 的容器中成功导出 PNG', async () => {
    const container = document.createElement('div');
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    container.appendChild(canvas);

    const dataUrl = await exportQRCodeAsImage(container, { format: 'png' });
    expect(typeof dataUrl).toBe('string');
    expect(dataUrl).toContain('data:image/png;base64');
  });

  it('从包含 Canvas 的容器中成功导出 JPEG 与 Blob', async () => {
    const container = document.createElement('div');
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    container.appendChild(canvas);

    const jpegUrl = await exportQRCodeAsImage(container, { format: 'jpeg' });
    expect(jpegUrl).toContain('data:image/jpeg;base64');

    const blob = await exportQRCodeAsImage(container, { format: 'blob' });
    expect(blob).toBeInstanceOf(Blob);
  });

  it('从包含 SVG 的容器中成功导出 SVG 矢量数据', async () => {
    const container = document.createElement('div');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '200');
    svg.setAttribute('height', '200');
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    svg.appendChild(rect);
    container.appendChild(svg);

    const svgData = await exportQRCodeAsImage(container, { format: 'svg' });
    expect(typeof svgData).toBe('string');
    expect(svgData).toContain('data:image/svg+xml');
  });
});

describe('downloadQRCodeImage()', () => {
  it('应成功构建下载锚点并触发 click 事件', async () => {
    const container = document.createElement('div');
    const canvas = document.createElement('canvas');
    canvas.width = 150;
    canvas.height = 150;
    container.appendChild(canvas);

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');

    await downloadQRCodeImage(container, {
      filename: 'my-qrcode',
      format: 'png',
    });

    expect(clickSpy).toHaveBeenCalled();
  });
});
