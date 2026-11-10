/**
 * @atengk/barcode-vue 单元测试全局环境配置。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { beforeEach, afterEach, vi } from 'vitest';

export function mockCanvas2D(): void {
  const mockContext = {
    canvas: {},
    dpr: 1,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn().mockImplementation((_x = 0, _y = 0, w = 10, h = 10) => ({
      width: w,
      height: h,
      data: new Uint8ClampedArray(w * h * 4),
    })),
    putImageData: vi.fn(),
    createImageData: vi.fn().mockImplementation((w = 10, h = 10) => ({
      width: w,
      height: h,
      data: new Uint8ClampedArray(w * h * 4),
    })),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    fillText: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 0 }),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
  };

  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockContext);
}

beforeEach(() => {
  mockCanvas2D();
});

afterEach(() => {
  // 严格遵守 ADR-0008，清理每个测试用例中残留的 DOM 节点
  document.body.innerHTML = '';
});
