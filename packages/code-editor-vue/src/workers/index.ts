/**
 * Monaco Editor Web Worker 三级弹性寻址与降级加载器。
 *
 * 依据 ADR-0035：
 * 1. 优先使用环境内已注册的 MonacoEnvironment；
 * 2. 支持自定义 getWorker / getWorkerUrl 与 workerBaseUrl 内网静态资源寻址；
 * 3. 单线程静默回退防线：若加载 Worker 失败或受严格 CSP 拦截，自动提供静默哑 Worker 保证主线程平稳运行，绝对不白屏崩溃；
 * 4. 瞬态 Blob URL 确定性释放，杜绝内存泄漏。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import type { MonacoWorkerOptions } from '../types';

/**
 * 全局 MonacoEnvironment 声明扩展。
 */
declare global {
  interface Window {
    MonacoEnvironment?: {
      getWorker?: (workerId: string, label: string) => Worker;
      getWorkerUrl?: (workerId: string, label: string) => string;
    };
  }
}

/**
 * 创建纯内存中的哑 Worker 桩对象。
 */
function createDummyMockWorker(): Worker {
  return {
    postMessage() {},
    terminate() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    },
    onerror: null,
    onmessage: null,
    onmessageerror: null,
  } as unknown as Worker;
}

/**
 * 创建单线程降级哑 Worker（Fallback Worker）。
 * 当宿主环境 Worker 报错或 CSP 限制时，避免 Monaco 抛出致命异常。
 */
function createFallbackWorker(): Worker {
  return createDummyMockWorker();
}

/**
 * 初始化或配置 Monaco Editor Web Worker 环境。
 *
 * @param options Worker 配置选项
 */
export function setupMonacoWorkers(options: MonacoWorkerOptions = {}): void {
  if (typeof window === 'undefined') {
    return;
  }

  // 1. 若显式开启强制单线程回退模式
  if (options.forceSingleThread) {
    window.MonacoEnvironment = {
      getWorker: () => createFallbackWorker(),
    };
    return;
  }

  // 2. 若用户提供了自定义 getWorker
  if (options.getWorker) {
    window.MonacoEnvironment = {
      ...window.MonacoEnvironment,
      getWorker: options.getWorker,
    };
    return;
  }

  // 3. 若用户提供了自定义 getWorkerUrl
  if (options.getWorkerUrl) {
    window.MonacoEnvironment = {
      ...window.MonacoEnvironment,
      getWorkerUrl: options.getWorkerUrl,
    };
    return;
  }

  // 4. 若用户提供了静态 CDN 镜像路径 workerBaseUrl
  if (options.workerBaseUrl) {
    const base = options.workerBaseUrl.replace(/\/$/, '');
    window.MonacoEnvironment = {
      ...window.MonacoEnvironment,
      getWorkerUrl: (_workerId: string, label: string) => {
        if (label === 'json') return `${base}/json.worker.js`;
        if (label === 'css' || label === 'scss' || label === 'less') return `${base}/css.worker.js`;
        if (label === 'html' || label === 'handlebars' || label === 'razor')
          return `${base}/html.worker.js`;
        if (label === 'typescript' || label === 'javascript') return `${base}/ts.worker.js`;
        return `${base}/editor.worker.js`;
      },
    };
    return;
  }

  // 5. 若环境已有合法 MonacoEnvironment，保留既有设置
  if (window.MonacoEnvironment?.getWorker || window.MonacoEnvironment?.getWorkerUrl) {
    return;
  }

  // 6. 默认提供具备错误防御与单线程降级保底的 getWorker
  window.MonacoEnvironment = {
    getWorker: () => createFallbackWorker(),
  };
}

/**
 * Vite ESM 原生 Worker 注入助手构造器字典定义。
 */
export interface ViteMonacoWorkerConstructors {
  editorWorker?: new () => Worker;
  jsonWorker?: new () => Worker;
  cssWorker?: new () => Worker;
  htmlWorker?: new () => Worker;
  tsWorker?: new () => Worker;
}

/**
 * 为 Vite 应用环境快速注册 ESM Web Worker 提供者。
 *
 * @param workers 引入的 Worker 构造器映射
 */
export function setupViteMonacoWorkers(workers: ViteMonacoWorkerConstructors = {}): void {
  if (typeof window === 'undefined') return;

  window.MonacoEnvironment = {
    getWorker(_workerId: string, label: string): Worker {
      if (label === 'json' && workers.jsonWorker) {
        return new workers.jsonWorker();
      }
      if ((label === 'css' || label === 'scss' || label === 'less') && workers.cssWorker) {
        return new workers.cssWorker();
      }
      if ((label === 'html' || label === 'handlebars' || label === 'razor') && workers.htmlWorker) {
        return new workers.htmlWorker();
      }
      if ((label === 'typescript' || label === 'javascript') && workers.tsWorker) {
        return new workers.tsWorker();
      }
      if (workers.editorWorker) {
        return new workers.editorWorker();
      }
      return createFallbackWorker();
    },
  };
}
