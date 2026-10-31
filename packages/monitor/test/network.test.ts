/**
 * NetworkPlugin 原生网络通信嗅探与 TraceId 协同拦截器单元测试。
 *
 * @author Ateng
 * @since 2026-10-31
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createNetworkPlugin, createCoreAxiosMonitorInterceptor } from '../src/plugins/network';
import { createBreadcrumbPlugin } from '../src/plugins/breadcrumb';
import { MonitorKernel } from '../src/core/MonitorKernel';
import type { MonitorEvent, NetworkPayload, ErrorPayload } from '../src/types/event';
import { MONITOR_SKIP_HEADER } from '../src/transport/transport';

describe('NetworkPlugin & TraceId Interceptor', () => {
  let kernel: MonitorKernel;
  let reporterSpy: ReturnType<typeof vi.fn>;
  let originalFetch: typeof window.fetch;
  let originalXhr: typeof window.XMLHttpRequest;
  let originalXhrSend: typeof window.XMLHttpRequest.prototype.send;
  let mockNativeFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    reporterSpy = vi.fn().mockResolvedValue(undefined);
    originalFetch = window.fetch;
    originalXhr = window.XMLHttpRequest;
    originalXhrSend = window.XMLHttpRequest.prototype.send;

    mockNativeFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 200, data: 'ok' }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'x-trace-id': 'trace-test-12345',
        },
      }),
    );
    window.fetch = mockNativeFetch;
    window.XMLHttpRequest.prototype.send = vi.fn();

    kernel = new MonitorKernel({
      batchSize: 1,
      reportUrl: 'http://localhost:8080/api/monitor/report',
      reporter: reporterSpy,
      plugins: [createBreadcrumbPlugin(), createNetworkPlugin()],
    });
    kernel.init();
  });

  afterEach(async () => {
    await kernel.destroy();
    window.fetch = originalFetch;
    window.XMLHttpRequest = originalXhr;
    window.XMLHttpRequest.prototype.send = originalXhrSend;
    vi.restoreAllMocks();
  });

  describe('原生 window.fetch 嗅探代理', () => {
    it('成功请求时应当采集耗时、状态码，派发 network 事件与面包屑', async () => {
      const res = await window.fetch('http://localhost:3000/api/users?keyword=ateng');
      expect(res.status).toBe(200);

      // 1. 验证派发了 network 监控事件
      const networkCalls = reporterSpy.mock.calls.filter(call => call[0][0]?.type === 'network');
      expect(networkCalls.length).toBe(1);
      const networkEvent: MonitorEvent<NetworkPayload> = networkCalls[0][0][0];

      expect(networkEvent.payload.url).toContain('/api/users');
      expect(networkEvent.payload.method).toBe('GET');
      expect(networkEvent.payload.status).toBe(200);
      expect(networkEvent.payload.success).toBe(true);
      expect(networkEvent.payload.traceId).toBe('trace-test-12345');
      expect(typeof networkEvent.payload.duration).toBe('number');

      // 2. 验证 TraceId 自动同步到了 contextStore
      expect(kernel.contextStore.getContext().tags.traceId).toBe('trace-test-12345');

      // 3. 验证写入了 breadcrumb 面包屑
      const breadcrumbPlugin = kernel.getPlugin('breadcrumb') as
        { getBreadcrumbs: () => unknown[] } | undefined;
      const breadcrumbs = breadcrumbPlugin?.getBreadcrumbs() ?? [];
      expect(breadcrumbs.some(b => (b as { type: string }).type === 'network')).toBe(true);
    });

    it('当 fetch 响应状态码 >= 400 时应当派发 HTTP_ERROR 监控事件', async () => {
      mockNativeFetch.mockResolvedValueOnce(
        new Response('Not Found', {
          status: 404,
          headers: { 'x-trace-id': 'trace-404' },
        }),
      );

      await window.fetch('http://localhost:3000/api/non-existing');

      const errorCalls = reporterSpy.mock.calls.filter(call => call[0][0]?.type === 'error');
      expect(errorCalls.length).toBe(1);
      const errorEvent: MonitorEvent<ErrorPayload> = errorCalls[0][0][0];

      expect(errorEvent.payload.name).toBe('HTTP_ERROR');
      expect(errorEvent.payload.message).toContain('404');
    });

    it('当 fetch 抛出网络中断时应当派发 HTTP_ERROR 且不吞咽业务异常', async () => {
      mockNativeFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(window.fetch('http://localhost:3000/api/offline')).rejects.toThrow(
        'Failed to fetch',
      );

      const errorCalls = reporterSpy.mock.calls.filter(call => call[0][0]?.type === 'error');
      expect(errorCalls.length).toBe(1);
      const errorEvent: MonitorEvent<ErrorPayload> = errorCalls[0][0][0];

      expect(errorEvent.payload.name).toBe('HTTP_ERROR');
      expect(errorEvent.payload.message).toContain('Failed to fetch');
    });
  });

  describe('防死循环协议与黑名单过滤', () => {
    it('当请求带有 X-Ateng-Monitor-Skip 标记时应直接放行，不产生任何监控数据', async () => {
      await window.fetch('http://localhost:3000/api/internal', {
        headers: {
          [MONITOR_SKIP_HEADER]: 'true',
        },
      });

      // 应当完全没有产生 network 事件
      const networkCalls = reporterSpy.mock.calls.filter(call => call[0][0]?.type === 'network');
      expect(networkCalls.length).toBe(0);
      expect(mockNativeFetch).toHaveBeenCalledTimes(1);
    });

    it('当请求地址为监控上报 reportUrl 端点时应自动跳过嗅探，杜绝自死循环', async () => {
      await window.fetch('http://localhost:8080/api/monitor/report', {
        method: 'POST',
        body: JSON.stringify([]),
      });

      const networkCalls = reporterSpy.mock.calls.filter(call => call[0][0]?.type === 'network');
      expect(networkCalls.length).toBe(0);
      expect(mockNativeFetch).toHaveBeenCalledTimes(1);
    });

    it('当请求地址匹配 ignoreUrls 黑名单规则时应自动跳过嗅探', async () => {
      const customNetwork = createNetworkPlugin({
        ignoreUrls: ['/api/ignore-me', /^https?:\/\/analytics\./],
      });
      kernel.registerPlugin(customNetwork);

      await window.fetch('http://localhost:3000/api/ignore-me?test=1');
      await window.fetch('http://analytics.company.com/track');

      const networkCalls = reporterSpy.mock.calls.filter(
        call =>
          call[0][0]?.payload?.url?.includes('ignore-me') ||
          call[0][0]?.payload?.url?.includes('analytics'),
      );
      expect(networkCalls.length).toBe(0);
    });
  });

  describe('XMLHttpRequest 原生嗅探代理', () => {
    it('XHR 请求成功完成应当捕获状态码、耗时并派发 network 事件', () => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', 'http://localhost:3000/api/orders');

      // 模拟 XHR 交互
      xhr.send();

      // 模拟 XHR 响应完成
      Object.defineProperty(xhr, 'status', { value: 200 });
      vi.spyOn(xhr, 'getResponseHeader').mockImplementation(header => {
        if (header.toLowerCase() === 'x-trace-id') return 'trace-xhr-999';
        return null;
      });

      xhr.dispatchEvent(new Event('loadend'));

      const networkCalls = reporterSpy.mock.calls.filter(call => call[0][0]?.type === 'network');
      expect(networkCalls.length).toBe(1);
      const networkEvent: MonitorEvent<NetworkPayload> = networkCalls[0][0][0];

      expect(networkEvent.payload.method).toBe('GET');
      expect(networkEvent.payload.status).toBe(200);
      expect(networkEvent.payload.traceId).toBe('trace-xhr-999');
      expect(networkEvent.payload.requestType).toBe('xhr');
      expect(kernel.contextStore.getContext().tags.traceId).toBe('trace-xhr-999');
    });

    it('XHR 请求包含 X-Ateng-Monitor-Skip 请求头时应当忽略', () => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'http://localhost:3000/api/test');
      xhr.setRequestHeader(MONITOR_SKIP_HEADER, 'true');
      xhr.send();

      Object.defineProperty(xhr, 'status', { value: 200 });
      xhr.dispatchEvent(new Event('loadend'));

      const networkCalls = reporterSpy.mock.calls.filter(call => call[0][0]?.type === 'network');
      expect(networkCalls.length).toBe(0);
    });

    it('XHR 请求状态码 >= 400 时应当派发 HTTP_ERROR 监控事件', () => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', 'http://localhost:3000/api/error-endpoint');
      xhr.send();

      Object.defineProperty(xhr, 'status', { value: 500 });
      xhr.dispatchEvent(new Event('loadend'));

      const errorCalls = reporterSpy.mock.calls.filter(call => call[0][0]?.type === 'error');
      expect(errorCalls.length).toBe(1);
      const errorEvent: MonitorEvent<ErrorPayload> = errorCalls[0][0][0];

      expect(errorEvent.payload.name).toBe('HTTP_ERROR');
      expect(errorEvent.payload.message).toContain('500');
    });
  });

  describe('@atengk/core Axios 协同拦截器 (createCoreAxiosMonitorInterceptor)', () => {
    it('应当能从响应体 Result<T> 中提取 traceId 并同步到 contextStore', () => {
      const interceptor = createCoreAxiosMonitorInterceptor(kernel);

      const fakeResponse = {
        status: 200,
        headers: {},
        data: {
          code: 200,
          data: { id: 1 },
          msg: 'ok',
          traceId: 'trace-from-result-body',
        },
      };

      const result = interceptor.responseInterceptor(fakeResponse);
      expect(result).toBe(fakeResponse);
      expect(kernel.contextStore.getContext().tags.traceId).toBe('trace-from-result-body');
    });

    it('应当能从响应异常中提取 traceId 并同步到 contextStore', async () => {
      const interceptor = createCoreAxiosMonitorInterceptor(kernel);

      const fakeError = {
        message: 'Request failed with status code 500',
        response: {
          status: 500,
          headers: { 'x-trace-id': 'trace-from-error-header' },
          data: { code: 500, msg: 'Internal Server Error' },
        },
      };

      await expect(interceptor.responseErrorInterceptor(fakeError)).rejects.toBe(fakeError);
      expect(kernel.contextStore.getContext().tags.traceId).toBe('trace-from-error-header');
    });

    it('应当支持一键安装到 Axios 实例并支持注销清理', () => {
      const interceptor = createCoreAxiosMonitorInterceptor(kernel);
      const useMock = vi.fn().mockReturnValue(1);
      const ejectMock = vi.fn();

      const fakeAxios = {
        interceptors: {
          request: { use: vi.fn(), eject: vi.fn() },
          response: { use: useMock, eject: ejectMock },
        },
      };

      const uninstall = interceptor.install(fakeAxios);
      expect(useMock).toHaveBeenCalledTimes(1);

      uninstall();
      expect(ejectMock).toHaveBeenCalledWith(1);
    });
  });

  describe('确定性生命周期与还原 (teardown)', async () => {
    it('销毁插件后应当 100% 还原原生 fetch 与 XMLHttpRequest', async () => {
      const currentFetch = window.fetch;
      const currentXhrOpen = XMLHttpRequest.prototype.open;

      await kernel.destroy();

      // 验证原生方法已复原，不再指向插件内的包装函数
      expect(window.fetch).not.toBe(currentFetch);
      expect(XMLHttpRequest.prototype.open).not.toBe(currentXhrOpen);
    });
  });
});
