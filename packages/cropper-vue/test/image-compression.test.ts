/**
 * ImageCompressionPipeline 图像压缩管道单元测试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect, vi } from 'vitest';
import { ImageCompressionPipeline } from '../src/utils/image-compression';

describe('ImageCompressionPipeline', () => {
  it('当输入尺寸超过 4096 护栏时，自动等比缩小在安全上限内', async () => {
    const rawCanvas = document.createElement('canvas');
    rawCanvas.width = 8000;
    rawCanvas.height = 6000;

    const result = await ImageCompressionPipeline.compress(rawCanvas, {
      maxWidth: 4096,
      maxHeight: 4096,
    });

    expect(result.canvas.width).toBeLessThanOrEqual(4096);
    expect(result.canvas.height).toBeLessThanOrEqual(4096);
    expect(result.canvas.width / result.canvas.height).toBeCloseTo(8000 / 6000, 1);
  });

  it('未设置 maxByteSize 时，直接返回初次导出结果', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    const result = await ImageCompressionPipeline.compress(canvas);

    expect(result.blob).toBeDefined();
    expect(result.canvas.width).toBe(800);
    expect(result.canvas.height).toBe(600);
  });

  it('当指定 maxByteSize 且当前体积超限时，应触发降级收敛', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 2000;
    canvas.height = 2000;

    // 动态让 toBlob 随着尺寸缩小返回更小的 mock Blob
    let customCallCount = 0;
    HTMLCanvasElement.prototype.toBlob = vi.fn().mockImplementation((callback: BlobCallback) => {
      customCallCount++;
      // 随着压缩调用，体积逐渐缩小
      const mockSize = Math.max(500, 50000 - customCallCount * 8000);
      callback(new Blob([new Uint8Array(mockSize)], { type: 'image/jpeg' }));
    });

    const result = await ImageCompressionPipeline.compress(canvas, {
      format: 'image/jpeg',
      maxByteSize: 10000,
    });

    expect(result.blob.size).toBeLessThanOrEqual(10000);
  });
});
