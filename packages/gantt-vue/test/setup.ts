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

beforeEach(() => {
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

    if (typeof document !== 'undefined') {
      const originalCreateElement = document.createElement.bind(document);
      document.createElement = function (tagName: string, options?: ElementCreationOptions) {
        const el = originalCreateElement(tagName, options);
        if (tagName && tagName.toLowerCase() === 'canvas') {
          const canvasEl = el as HTMLCanvasElement;
          canvasEl.getContext = vi.fn().mockImplementation(() => ({
            canvas: canvasEl,
            fillRect: vi.fn(),
            clearRect: vi.fn(),
            getImageData: vi.fn(),
            putImageData: vi.fn(),
            createImageData: vi.fn(),
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
            createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
            createRadialGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
            createPattern: vi.fn(),
            drawImage: vi.fn(),
            save: vi.fn(),
            fillText: vi.fn(),
            strokeText: vi.fn(),
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
            clip: vi.fn(),
            measureText: vi.fn().mockReturnValue({ width: 0 }),
            webkitBackingStorePixelRatio: 1,
          }));
        }
        return el;
      };
    }
  }
});

afterEach(() => {
  vi.clearAllMocks();
});
