/**
 * 物理圆形透明切片工具单元测试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect } from 'vitest';
import { clipCircleCanvas } from '../src/utils/circle-clip';

describe('clipCircleCanvas', () => {
  it('正确将矩形 Canvas 切片为等宽高的正圆 Canvas', () => {
    const rawCanvas = document.createElement('canvas');
    rawCanvas.width = 400;
    rawCanvas.height = 300;

    const circleCanvas = clipCircleCanvas(rawCanvas);

    // 应该取内切圆最小边 300
    expect(circleCanvas.width).toBe(300);
    expect(circleCanvas.height).toBe(300);
  });

  it('正方形输入时保持原尺寸切片', () => {
    const rawCanvas = document.createElement('canvas');
    rawCanvas.width = 256;
    rawCanvas.height = 256;

    const circleCanvas = clipCircleCanvas(rawCanvas);

    expect(circleCanvas.width).toBe(256);
    expect(circleCanvas.height).toBe(256);
  });
});
