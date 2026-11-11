/**
 * @atengk/map-vue 单元测试全局环境配置。
 *
 * 为 happy-dom 环境补充 ResizeObserver、matchMedia 与 Leaflet 运行环境。
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
}

beforeEach(() => {
  if (typeof document !== 'undefined') {
    document.body.innerHTML = '';
  }
});

afterEach(() => {
  if (typeof document !== 'undefined') {
    document.body.innerHTML = '';
  }
  vi.clearAllMocks();
});
