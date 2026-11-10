/**
 * PdfExportDriver 纯前端逐页切片高保真 PDF 导出驱动单元测试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PdfExportDriver } from '../src/drivers/PdfExportDriver';
import { PrintErrorCode, PrintException } from '../src/errors/PrintException';
import { usePrint } from '../src/composables/usePrint';
import html2canvas from 'html2canvas';

// Mock html2canvas
vi.mock('html2canvas', () => {
  return {
    default: vi.fn(),
  };
});

describe('PdfExportDriver 逐页切片渲染 PDF 导出驱动', () => {
  let driver: PdfExportDriver;
  const createdCanvases: HTMLCanvasElement[] = [];

  const createMockCanvas = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1120;
    canvas.toDataURL = vi.fn().mockReturnValue('data:image/jpeg;base64,mockImageData');
    createdCanvases.push(canvas);
    return canvas;
  };

  beforeEach(() => {
    driver = new PdfExportDriver();
    createdCanvases.length = 0;
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('探测环境就绪：在 DOM 环境下 isAvailable 返回 true', async () => {
    const available = await driver.isAvailable();
    expect(available).toBe(true);
    expect(driver.name).toBe('pdf');
  });

  it('前置卫语句：目标 DOM 节点不存在时抛出 INVALID_TARGET 异常', async () => {
    await expect(driver.exportPdf('#non-existent-target')).rejects.toThrow(PrintException);

    try {
      await driver.exportPdf('#non-existent-target');
    } catch (err) {
      expect(err).toBeInstanceOf(PrintException);
      expect((err as PrintException).code).toBe(PrintErrorCode.INVALID_TARGET);
    }
  });

  it('单页单据导出：生成 PDF Blob 且即时将 Canvas 尺寸置零释放显存', async () => {
    const container = document.createElement('div');
    container.id = 'print-doc';
    container.innerHTML = '<h1>单页单据</h1>';
    document.body.appendChild(container);

    const mockCanvas = createMockCanvas();
    vi.mocked(html2canvas).mockResolvedValueOnce(mockCanvas);

    const blob = await driver.exportPdf(container, {
      download: false,
    });

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/pdf');
    expect(html2canvas).toHaveBeenCalledTimes(1);

    // 验证显存确定性释放（Defense #2）
    expect(mockCanvas.width).toBe(0);
    expect(mockCanvas.height).toBe(0);
  });

  it('多页切片导出：遍历每页独立 Page DOM，逐页光栅化并在续页 addPage', async () => {
    const container = document.createElement('div');
    container.id = 'multi-page-doc';

    const page1 = document.createElement('div');
    page1.className = 'at-print-page';
    page1.innerHTML = '<div>第 1 页内容</div>';

    const page2 = document.createElement('div');
    page2.className = 'at-print-page';
    page2.innerHTML = '<div>第 2 页内容</div>';

    container.appendChild(page1);
    container.appendChild(page2);
    document.body.appendChild(container);

    const canvas1 = createMockCanvas();
    const canvas2 = createMockCanvas();
    vi.mocked(html2canvas).mockResolvedValueOnce(canvas1).mockResolvedValueOnce(canvas2);

    const blob = await driver.exportPdf(container, {
      download: false,
    });

    expect(blob).toBeInstanceOf(Blob);
    // 验证逐页切片：两页分别独立调用 html2canvas
    expect(html2canvas).toHaveBeenCalledTimes(2);
    expect(html2canvas).toHaveBeenNthCalledWith(1, page1, expect.any(Object));
    expect(html2canvas).toHaveBeenNthCalledWith(2, page2, expect.any(Object));

    // 验证每页 Canvas 显存均即时释放
    expect(canvas1.width).toBe(0);
    expect(canvas1.height).toBe(0);
    expect(canvas2.width).toBe(0);
    expect(canvas2.height).toBe(0);
  });

  it('Canvas 跨域防污损降级：首次因跨域异常被拒时自动隐藏外部图片重试', async () => {
    const container = document.createElement('div');
    const remoteImg = document.createElement('img');
    remoteImg.src = 'https://external-cdn.example.com/stamp.png';
    container.appendChild(remoteImg);
    document.body.appendChild(container);

    const fallbackCanvas = createMockCanvas();

    // 第一次调用模拟由于 CORS 报错
    vi.mocked(html2canvas)
      .mockRejectedValueOnce(new Error('SecurityError: Tainted canvases may not be exported'))
      .mockResolvedValueOnce(fallbackCanvas);

    const blob = await driver.exportPdf(container, {
      download: false,
    });

    expect(blob).toBeInstanceOf(Blob);
    // 验证触发了二次降级重试
    expect(html2canvas).toHaveBeenCalledTimes(2);
    // 验证图片可见性恢复
    expect(remoteImg.style.visibility).not.toBe('hidden');
  });

  it('usePrint() 成功整合 exportPdf 接口', async () => {
    const container = document.createElement('div');
    container.id = 'composable-doc';
    document.body.appendChild(container);

    const mockCanvas = createMockCanvas();
    vi.mocked(html2canvas).mockResolvedValueOnce(mockCanvas);

    const { exportPdf } = usePrint();
    const blob = await exportPdf(container, { download: false });

    expect(blob).toBeInstanceOf(Blob);
  });
});
