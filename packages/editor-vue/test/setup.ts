/**
 * 单元测试全局 DOM、Range 与 ResizeObserver 运行环境 Mock 配置。
 *
 * 为 happy-dom 环境补充 ProseMirror 与 TipTap 所需的 Range、Selection 与 ResizeObserver 运行时。
 *
 * @author Ateng
 * @since 2026-10-30
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

    if (typeof Range !== 'undefined' && !Range.prototype.getClientRects) {
      Range.prototype.getClientRects = () =>
        ({
          item: () => null,
          length: 0,
          [Symbol.iterator]: function* () {},
        }) as unknown as DOMRectList;
    }

    if (typeof Range !== 'undefined' && !Range.prototype.getBoundingClientRect) {
      Range.prototype.getBoundingClientRect = () =>
        ({
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          width: 0,
          height: 0,
          x: 0,
          y: 0,
          toJSON: () => {},
        }) as DOMRect;
    }
  }
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllMocks();
});
