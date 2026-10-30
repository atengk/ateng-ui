/**
 * Monaco Worker SPI 与降级策略单元测试。
 *
 * 恪守全自洽单测 3 项铁律：DOM 还原、存储零污染、100% 离线自洽。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { setupMonacoWorkers, setupViteMonacoWorkers } from '../src/workers';

describe('setupMonacoWorkers WorkerProvider SPI 测试', () => {
  const originalMonacoEnvironment = window.MonacoEnvironment;

  beforeEach(() => {
    delete window.MonacoEnvironment;
  });

  afterEach(() => {
    window.MonacoEnvironment = originalMonacoEnvironment;
    vi.restoreAllMocks();
  });

  it('默认情况下应注入具备安全降级的 getWorker', () => {
    setupMonacoWorkers();
    expect(window.MonacoEnvironment).toBeDefined();
    expect(typeof window.MonacoEnvironment?.getWorker).toBe('function');

    const worker = window.MonacoEnvironment?.getWorker?.('test', 'json');
    expect(worker).toBeDefined();
    expect(typeof worker?.postMessage).toBe('function');
  });

  it('开启 forceSingleThread 时应强制使用单线程降级 Worker', () => {
    setupMonacoWorkers({ forceSingleThread: true });
    expect(window.MonacoEnvironment).toBeDefined();
    expect(typeof window.MonacoEnvironment?.getWorker).toBe('function');

    const worker = window.MonacoEnvironment?.getWorker?.('test', 'typescript');
    expect(worker).toBeDefined();
    expect(typeof worker?.terminate).toBe('function');
  });

  it('配置 workerBaseUrl 时应正确解析生成各类语言的 worker 路径', () => {
    setupMonacoWorkers({ workerBaseUrl: 'https://cdn.example.com/monaco-workers/' });
    expect(window.MonacoEnvironment).toBeDefined();
    expect(typeof window.MonacoEnvironment?.getWorkerUrl).toBe('function');

    const getUrl = window.MonacoEnvironment?.getWorkerUrl;
    expect(getUrl).toBeDefined();
    if (getUrl) {
      expect(getUrl('1', 'json')).toBe('https://cdn.example.com/monaco-workers/json.worker.js');
      expect(getUrl('2', 'css')).toBe('https://cdn.example.com/monaco-workers/css.worker.js');
      expect(getUrl('3', 'html')).toBe('https://cdn.example.com/monaco-workers/html.worker.js');
      expect(getUrl('4', 'typescript')).toBe('https://cdn.example.com/monaco-workers/ts.worker.js');
      expect(getUrl('5', 'javascript')).toBe('https://cdn.example.com/monaco-workers/ts.worker.js');
      expect(getUrl('6', 'custom')).toBe('https://cdn.example.com/monaco-workers/editor.worker.js');
    }
  });

  it('自定义 getWorker 函数时应优先使用自定义逻辑', () => {
    const customWorker = { postMessage: vi.fn(), terminate: vi.fn() } as unknown as Worker;
    const customGetWorker = vi.fn().mockReturnValue(customWorker);

    setupMonacoWorkers({ getWorker: customGetWorker });
    expect(window.MonacoEnvironment?.getWorker).toBe(customGetWorker);

    const res = window.MonacoEnvironment?.getWorker?.('id', 'json');
    expect(res).toBe(customWorker);
    expect(customGetWorker).toHaveBeenCalledWith('id', 'json');
  });

  it('setupViteMonacoWorkers 正确挂载各类 ESM Worker 构造器与保底降级', () => {
    class MockEditorWorker {}
    class MockJsonWorker {}

    setupViteMonacoWorkers({
      editorWorker: MockEditorWorker as unknown as new () => Worker,
      jsonWorker: MockJsonWorker as unknown as new () => Worker,
    });

    const getWorker = window.MonacoEnvironment?.getWorker;
    expect(getWorker).toBeDefined();

    if (getWorker) {
      const jsonW = getWorker('1', 'json');
      expect(jsonW).toBeInstanceOf(MockJsonWorker);

      const edW = getWorker('2', 'typescript');
      expect(edW).toBeInstanceOf(MockEditorWorker);

      // 未注册的 worker 且未配置 editorWorker 时保底降级
      delete window.MonacoEnvironment;
      setupViteMonacoWorkers({});
      const fallbackW = window.MonacoEnvironment?.getWorker?.('3', 'unknown');
      expect(fallbackW).toBeDefined();
      expect(typeof fallbackW?.postMessage).toBe('function');
    }
  });
});
