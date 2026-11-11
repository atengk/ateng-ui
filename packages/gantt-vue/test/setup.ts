/**
 * @atengk/gantt-vue 单元测试全局环境配置。
 *
 * 为 happy-dom 环境补充 Canvas 2D 上下文、ResizeObserver 与 matchMedia 等运行环境。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { beforeEach, afterEach, vi } from 'vitest';

class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

function createMockContext2D(): Record<string, unknown> {
  const ctx = {
    canvas: {},
    dpr: 1,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    miterLimit: 10,
    shadowBlur: 0,
    shadowColor: '',
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    direction: 'inherit',
    imageSmoothingEnabled: true,
    filter: 'none',
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    measureText: vi.fn().mockImplementation((text: string) => ({
      width: (text?.length ?? 0) * 8,
      actualBoundingBoxAscent: 8,
      actualBoundingBoxDescent: 2,
    })),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    arc: vi.fn(),
    arcTo: vi.fn(),
    ellipse: vi.fn(),
    rect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    clip: vi.fn(),
    isPointInPath: vi.fn().mockReturnValue(false),
    isPointInStroke: vi.fn().mockReturnValue(false),
    setTransform: vi.fn(),
    getTransform: vi.fn().mockReturnValue({
      a: 1,
      b: 0,
      c: 0,
      d: 1,
      e: 0,
      f: 0,
      is2D: true,
      isIdentity: true,
    }),
    resetTransform: vi.fn(),
    transform: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
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
    createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
    createRadialGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
    createConicGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
    createPattern: vi.fn(),
  };
  return ctx;
}

// 模块级前置注入，确保在顶层 import 阶段执行的第三库（如 lottie-web）具备 2D 上下文
if (typeof window !== 'undefined') {
  if (!window.ResizeObserver) {
    window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  }

  if (!window.matchMedia) {
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  }

  if (typeof HTMLCanvasElement !== 'undefined') {
    HTMLCanvasElement.prototype.getContext = vi
      .fn()
      .mockImplementation(() =>
        createMockContext2D(),
      ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.toBlob = vi
      .fn()
      .mockImplementation((callback: BlobCallback, type = 'image/png') => {
        callback(new Blob(['mock-binary-data'], { type }));
      });
    HTMLCanvasElement.prototype.toDataURL = vi
      .fn()
      .mockReturnValue('data:image/png;base64,mockBase64Data');
  }
}

beforeEach(() => {
  if (typeof document !== 'undefined') {
    document.body.innerHTML = '';
  }
});

afterEach(() => {
  // 严格遵守 ADR-0008，清理每个测试用例中残留的 DOM 节点
  if (typeof document !== 'undefined') {
    document.body.innerHTML = '';
  }
  vi.clearAllMocks();
});
