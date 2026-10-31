/**
 * ErrorPlugin 运行时异常与资源崩溃捕获插件单元测试。
 *
 * @author Ateng
 * @since 2026-10-31
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createErrorPlugin,
  captureVueError,
  createVueErrorHandler,
  getElementSelector,
  getVueComponentName,
} from '../src/plugins/error';
import { MonitorKernel } from '../src/core/MonitorKernel';
import type { MonitorEvent, ErrorPayload } from '../src/types/event';

describe('ErrorPlugin', () => {
  let kernel: MonitorKernel;
  let reporterSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    reporterSpy = vi.fn().mockResolvedValue(undefined);
    kernel = new MonitorKernel({
      batchSize: 1, // 立即上报以供同步断言
      reporter: reporterSpy,
      plugins: [createErrorPlugin()],
    });
    kernel.init();
  });

  afterEach(async () => {
    await kernel.destroy();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('应当在全局 error 事件中捕获 JS 运行时异常', () => {
    const errorObj = new ReferenceError('foo is not defined');
    const errorEvent = new ErrorEvent('error', {
      message: 'Uncaught ReferenceError: foo is not defined',
      filename: 'http://localhost:3000/main.js',
      lineno: 42,
      colno: 12,
      error: errorObj,
    });

    window.dispatchEvent(errorEvent);

    expect(reporterSpy).toHaveBeenCalledTimes(1);
    const event: MonitorEvent<ErrorPayload> = reporterSpy.mock.calls[0][0][0];

    expect(event.type).toBe('error');
    expect(event.level).toBe('error');
    expect(event.payload.category).toBe('js');
    expect(event.payload.name).toBe('ReferenceError');
    expect(event.payload.message).toContain('foo is not defined');
    expect(event.payload.filename).toBe('http://localhost:3000/main.js');
    expect(event.payload.lineno).toBe(42);
    expect(event.payload.colno).toBe(12);
  });

  it('应当在事件捕获阶段精确识别静态资源（图片/脚本）加载失败', () => {
    const img = document.createElement('img');
    img.src = 'https://cdn.example.com/assets/banner.png';
    img.id = 'hero-img';
    img.className = 'banner-img promo';
    document.body.appendChild(img);

    // 模拟资源加载崩溃触发 error 事件
    const resourceErrorEvent = new Event('error', { bubbles: false, cancelable: true });
    img.dispatchEvent(resourceErrorEvent);

    expect(reporterSpy).toHaveBeenCalledTimes(1);
    const event: MonitorEvent<ErrorPayload> = reporterSpy.mock.calls[0][0][0];

    expect(event.type).toBe('error');
    expect(event.payload.category).toBe('resource');
    expect(event.payload.name).toBe('ResourceError');
    expect(event.payload.filename).toBe('https://cdn.example.com/assets/banner.png');
    expect(event.payload.selector).toBe('img#hero-img.banner-img.promo');
    expect(event.payload.message).toContain('<img');
  });

  it('应当捕获未决 Promise 拒付 (unhandledrejection)', () => {
    const rejectionError = new Error('Async request timeout');
    const rejectionEvent = new Event('unhandledrejection') as PromiseRejectionEvent;
    Object.defineProperty(rejectionEvent, 'reason', {
      value: rejectionError,
    });

    window.dispatchEvent(rejectionEvent);

    expect(reporterSpy).toHaveBeenCalledTimes(1);
    const event: MonitorEvent<ErrorPayload> = reporterSpy.mock.calls[0][0][0];

    expect(event.type).toBe('error');
    expect(event.payload.category).toBe('promise');
    expect(event.payload.name).toBe('Error');
    expect(event.payload.message).toBe('Async request timeout');
  });

  it('应当支持纯字符串或未知对象的 Promise 拒付格式化', () => {
    const rejectionEvent = new Event('unhandledrejection') as PromiseRejectionEvent;
    Object.defineProperty(rejectionEvent, 'reason', {
      value: 'Custom string rejection reason',
    });

    window.dispatchEvent(rejectionEvent);

    const event: MonitorEvent<ErrorPayload> = reporterSpy.mock.calls[0][0][0];
    expect(event.payload.category).toBe('promise');
    expect(event.payload.message).toBe('Custom string rejection reason');
  });

  it('应当代理并捕获 console.error 调用同时保留原生输出', () => {
    console.error('API service 500 error', { service: 'order-service' });

    expect(reporterSpy).toHaveBeenCalledTimes(1);
    const event: MonitorEvent<ErrorPayload> = reporterSpy.mock.calls[0][0][0];

    expect(event.type).toBe('error');
    expect(event.payload.category).toBe('console');
    expect(event.payload.message).toContain('API service 500 error');
    expect(event.payload.message).toContain('"service":"order-service"');
  });

  it('插件 teardown 应当正确解绑全局事件并恢复原始 console.error', async () => {
    // 先销毁 beforeEach 中的实例
    await kernel.destroy();

    const rawConsole = console.error;
    const testKernel = new MonitorKernel({
      batchSize: 1,
      reporter: reporterSpy,
      plugins: [createErrorPlugin()],
    });

    testKernel.init();
    expect(console.error).not.toBe(rawConsole); // 已被代理包装

    await testKernel.destroy();
    expect(console.error).toBe(rawConsole); // 销毁后完全恢复原始控制台函数

    // 验证事件解绑后不派发事件
    window.dispatchEvent(
      new ErrorEvent('error', {
        message: 'Ignored after teardown',
      }),
    );
    expect(reporterSpy).not.toHaveBeenCalled();
  });

  describe('Vue 错误适配器 (captureVueError & createVueErrorHandler)', () => {
    it('应当准确捕获 Vue 组件错误并格式化组件名与生命周期', () => {
      const mockComponent = {
        type: { name: 'UserProfileCard' },
      };

      const handler = createVueErrorHandler(kernel);
      const testError = new TypeError('Cannot read property of null');

      handler(testError, mockComponent, 'mounted hook');

      expect(reporterSpy).toHaveBeenCalledTimes(1);
      const event: MonitorEvent<ErrorPayload> = reporterSpy.mock.calls[0][0][0];

      expect(event.payload.category).toBe('vue');
      expect(event.payload.name).toBe('TypeError');
      expect(event.payload.message).toContain('UserProfileCard: mounted hook');
    });

    it('当组件无显式名称时应当保底返回 AnonymousComponent', () => {
      expect(getVueComponentName(null)).toBe('AnonymousComponent');
      expect(getVueComponentName({})).toBe('AnonymousComponent');

      captureVueError(kernel, 'Simple string error', undefined, 'render function');
      const event: MonitorEvent<ErrorPayload> = reporterSpy.mock.calls[0][0][0];
      expect(event.payload.message).toContain('AnonymousComponent: render function');
    });
  });

  describe('getElementSelector 辅助工具', () => {
    it('能够准确解析带有 id 与 class 的元素选择器', () => {
      const div = document.createElement('div');
      div.id = 'app-root';
      div.className = 'container main-box extra';
      expect(getElementSelector(div)).toBe('div#app-root.container.main-box');
    });

    it('对无属性元素返回小写标签名', () => {
      const p = document.createElement('p');
      expect(getElementSelector(p)).toBe('p');
    });
  });

  describe('window.onerror 独立全局捕获', () => {
    it('原生 window.onerror 触发时应当捕获并向外部 oldOnError 传递', async () => {
      const externalOnError = vi.fn();
      window.onerror = externalOnError;

      const reporterSpy = vi.fn().mockResolvedValue(undefined);
      const plugin = createErrorPlugin({ enableJsError: true });
      const kernel = new MonitorKernel({
        batchSize: 1,
        reporter: reporterSpy,
        plugins: [plugin],
      });
      kernel.init();

      const err = new Error('Direct window.onerror invocation');
      if (typeof window.onerror === 'function') {
        window.onerror('Direct window.onerror invocation', 'test.js', 10, 20, err);
      }

      expect(reporterSpy).toHaveBeenCalledTimes(1);
      const event: MonitorEvent<ErrorPayload> = reporterSpy.mock.calls[0][0][0];
      expect(event.payload.category).toBe('js');
      expect(event.payload.message).toBe('Direct window.onerror invocation');
      expect(event.payload.filename).toBe('test.js');
      expect(externalOnError).toHaveBeenCalledTimes(1);

      await kernel.destroy();
      expect(window.onerror).toBe(externalOnError);
      window.onerror = null;
    });
  });
});
