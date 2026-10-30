/**
 * 单元测试全局 DOM 与 Canvas Mock 配置。
 *
 * 为 happy-dom 环境补充 Monaco Editor 所需的 Canvas 2D 上下文与 Range API。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { beforeEach, afterEach, vi } from 'vitest';
import * as monaco from 'monaco-editor';

// 在单测离线环境中禁用 TS/JS 后台异步诊断轮询，杜绝哑 Worker 引发未捕获 RPC 异常
if (monaco.languages?.typescript) {
  monaco.languages.typescript.typescriptDefaults?.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: true,
    noSuggestionDiagnostics: true,
  });
  monaco.languages.typescript.javascriptDefaults?.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: true,
    noSuggestionDiagnostics: true,
  });
}

const _originalGetContext = HTMLCanvasElement.prototype.getContext;

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

  if (typeof navigator !== 'undefined') {
    try {
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        configurable: true,
        writable: true,
      });
    } catch {
      // 容错处理
    }
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
});

afterEach(() => {
  // 保持 Canvas 2D Mock 存活以支撑异步 Monaco 标尺渲染
});
