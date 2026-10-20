/**
 * HttpClient 工业级集成装配与全局单例测试套件。
 *
 * 验证：
 * 1. 工厂函数 createHttpClient 与全局单例 http
 * 2. 默认响应解包 Promise<T> 与 { unwrap: false } 逃生门返回 Promise<Result<T>>
 * 3. 业务状态码非 200 与 HTTP 4xx/5xx 错误统一转译为 BusinessException 并保留 cause
 * 4. 双轨 Token 请求头注入与 401 自动清理凭据闭环
 * 5. 微服务网关路由前缀匹配与 service 显式覆盖
 * 6. cancelDuplicate: true 防竞态自动中断前序请求
 * 7. http.download 文件下载、Content-Disposition 提取与 saveBlobAsFile 闭环
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import {
  createHttpClient,
  http,
  BusinessException,
  createAuthManager,
  MemoryAuthStorage,
  createTenantManager,
  MemoryTenantStorage,
  type Result,
} from '../src/index';

/**
 * 辅助函数：通过 mock Axios adapter 验证真实拦截器全链路管道
 */
function mockAdapter(
  client: { instance: { defaults: { adapter: unknown } } },
  handler: (config: InternalAxiosRequestConfig) => Promise<AxiosResponse> | AxiosResponse,
) {
  client.instance.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    return handler(config);
  };
}

const originalHttpAdapter = http.instance.defaults.adapter;

describe('HttpClient Integration Suite (Issue #9)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    http.instance.defaults.adapter = originalHttpAdapter;
  });

  describe('1. 基础单例与工厂模式 (Factory & Singleton)', () => {
    it('应成功导出开箱即用的 http 全局单例', () => {
      expect(http).toBeDefined();
      expect(typeof http.get).toBe('function');
      expect(typeof http.post).toBe('function');
      expect(typeof http.put).toBe('function');
      expect(typeof http.delete).toBe('function');
      expect(typeof http.patch).toBe('function');
      expect(typeof http.download).toBe('function');
      expect(typeof http.request).toBe('function');
      expect(http.instance).toBeDefined();
      expect(http.authManager).toBeDefined();
      expect(http.abortCoordinator).toBeDefined();
    });

    it('createHttpClient 应能创建独立实例，拥有独立的路由与鉴权配置', () => {
      const customStorage = new MemoryAuthStorage();
      const customAuth = createAuthManager({ storage: customStorage });
      customAuth.setToken('custom-token-xyz');

      const customClient = createHttpClient({
        baseURL: 'https://api.custom.com',
        authManager: customAuth,
        timeout: 5000,
        routes: [{ prefix: '/order', target: 'https://order-service' }],
      });

      expect(customClient).not.toBe(http);
      expect(customClient.authManager.getToken()).toBe('custom-token-xyz');
      expect(customClient.instance.defaults.baseURL).toBe('https://api.custom.com');
      expect(customClient.instance.defaults.timeout).toBe(5000);
    });
  });

  describe('2. 默认自动解包与 { unwrap: false } 逃生门', () => {
    it('默认情况下请求成功 (code === 200) 应直接解包返回 data 实体', async () => {
      const mockResult: Result<{ id: string; name: string }> = {
        code: 200,
        msg: 'ok',
        traceId: 'tr-001',
        data: { id: '9007199254740995', name: 'Ateng' },
      };

      mockAdapter(http, async config => ({
        data: mockResult,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }));

      const data = await http.get<{ id: string; name: string }>('/user/detail');
      expect(data).toEqual({ id: '9007199254740995', name: 'Ateng' });
    });

    it('指定 { unwrap: false } 时应保留完整的 Result<T> 信封结构', async () => {
      const mockResult: Result<{ id: string; name: string }> = {
        code: 200,
        msg: 'ok',
        traceId: 'tr-002',
        data: { id: '1001', name: 'Dev' },
      };

      mockAdapter(http, async config => ({
        data: mockResult,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }));

      const res = await http.get<{ id: string; name: string }>('/user/detail', {
        unwrap: false,
      });

      expect(res.code).toBe(200);
      expect(res.msg).toBe('ok');
      expect(res.traceId).toBe('tr-002');
      expect(res.data).toEqual({ id: '1001', name: 'Dev' });
    });

    it('当后端返回非标准 Result 实体（如第三方原始响应）时应直接透传原始数据', async () => {
      const thirdPartyData = { thirdPartyId: 999, timestamp: 123456789 };

      mockAdapter(http, async config => ({
        data: thirdPartyData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }));

      const res = await http.get('/third-party/ping');
      expect(res).toEqual(thirdPartyData);
    });

    it('雪花 Long ID 大数防截断管道应在请求响应流中端到端生效', async () => {
      // 模拟后端返回包含 19 位无引号雪花大数的原始 JSON 响应
      const rawJson =
        '{"code":200,"data":{"id":9007199254740995123,"title":"Snowflake Post"},"msg":"ok"}';

      mockAdapter(http, async config => {
        let transformedData: unknown = rawJson;
        if (Array.isArray(config.transformResponse)) {
          for (const fn of config.transformResponse) {
            transformedData = fn(transformedData, config.headers);
          }
        }
        return {
          data: transformedData,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      });

      const res = await http.get<{ id: string; title: string }>('/snowflake/item');
      expect(typeof res.id).toBe('string');
      expect(res.id).toBe('9007199254740995123');
      expect(res.title).toBe('Snowflake Post');
    });
  });

  describe('3. 统一因果异常转译 (BusinessException & Causal Mapping)', () => {
    it('当服务端返回业务错误 (code !== 200) 时应转译并抛出 BusinessException', async () => {
      const mockFailResult: Result<null> = {
        code: 40001,
        msg: '用户名或密码错误',
        traceId: 'trace-fail-1',
        data: null,
      };

      mockAdapter(http, async config => ({
        data: mockFailResult,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }));

      await expect(http.post('/login', { username: 'test' })).rejects.toThrow(BusinessException);

      try {
        await http.post('/login', { username: 'test' });
      } catch (err) {
        expect(err).toBeInstanceOf(BusinessException);
        const be = err as BusinessException;
        expect(be.code).toBe(40001);
        expect(be.msg).toBe('用户名或密码错误');
        expect(be.traceId).toBe('trace-fail-1');
        expect(be.cause).toEqual(mockFailResult);
      }
    });

    it('当遇到 HTTP 网络异常 (如 500) 时应统一包装为 BusinessException 并保留原始 Axios 异常作为 cause', async () => {
      mockAdapter(http, async config => {
        const error = new axios.AxiosError(
          'Request failed with status code 500',
          'ERR_BAD_RESPONSE',
          config,
          {},
          {
            status: 500,
            statusText: 'Internal Server Error',
            data: { code: 50000, msg: '数据库连接超时', traceId: 'tr-500' },
            headers: {},
            config,
          },
        );
        throw error;
      });

      try {
        await http.get('/system/status');
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(BusinessException);
        const be = err as BusinessException;
        expect(be.code).toBe(50000);
        expect(be.msg).toBe('数据库连接超时');
        expect(be.traceId).toBe('tr-500');
        expect(axios.isAxiosError(be.cause)).toBe(true);
      }
    });
  });

  describe('4. 双轨 Token 请求头注入与 401 闭环', () => {
    it('请求拦截器应自动注入 token 与 Authorization: Bearer 双轨请求头', async () => {
      const storage = new MemoryAuthStorage();
      const auth = createAuthManager({ storage });
      auth.setToken('sample-jwt-token-999');

      const client = createHttpClient({ authManager: auth });

      let capturedConfig: InternalAxiosRequestConfig | undefined;
      mockAdapter(client, async cfg => {
        capturedConfig = cfg;
        return {
          data: { code: 200, data: 'success', msg: 'ok' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: cfg,
        };
      });

      await client.get('/user/info');

      expect(capturedConfig?.headers?.['token']).toBe('sample-jwt-token-999');
      expect(capturedConfig?.headers?.['Authorization']).toBe('Bearer sample-jwt-token-999');
    });

    it('请求拦截器应自动注入 X-Tenant-Id 租户请求头', async () => {
      const storage = new MemoryTenantStorage();
      const tenant = createTenantManager({ storage });
      tenant.setTenantId('tenant-corp-999');

      const client = createHttpClient({ tenantManager: tenant });

      let capturedConfig: InternalAxiosRequestConfig | undefined;
      mockAdapter(client, async cfg => {
        capturedConfig = cfg;
        return {
          data: { code: 200, data: 'success', msg: 'ok' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: cfg,
        };
      });

      await client.get('/tenant/profile');

      expect(capturedConfig?.headers?.['X-Tenant-Id']).toBe('tenant-corp-999');
    });

    it('当响应返回 HTTP 401 或业务 code 401 时应自动清空 Token 并触发 onUnauthorized', async () => {
      const storage = new MemoryAuthStorage();
      const auth = createAuthManager({ storage });
      auth.setToken('expired-token');

      const onUnauthorized = vi.fn();
      const client = createHttpClient({ authManager: auth, onUnauthorized });

      mockAdapter(client, async cfg => ({
        data: { code: 401, msg: '登录已过期', traceId: 'tr-401', data: null },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: cfg,
      }));

      await expect(client.get('/protected/resource')).rejects.toThrow(BusinessException);

      expect(auth.getToken()).toBeNull();
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
    });
  });

  describe('5. 微服务网关路由前缀分发与显式覆盖', () => {
    it('应根据 URL 前缀自动将请求分发至对应微服务网关', async () => {
      const client = createHttpClient({
        routes: [
          { prefix: '/auth', target: 'https://auth-service.cloud' },
          { prefix: '/order', target: 'https://order-service.cloud', rewritePrefix: '/api/v1' },
        ],
      });

      let capturedConfig: InternalAxiosRequestConfig | undefined;
      mockAdapter(client, async cfg => {
        capturedConfig = cfg;
        return {
          data: { code: 200, data: true, msg: 'ok' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: cfg,
        };
      });

      await client.get('/order/detail/100');

      expect(capturedConfig?.baseURL).toBe('https://order-service.cloud');
      expect(capturedConfig?.url).toBe('/api/v1/detail/100');
    });

    it('通过 config.service 显式指定服务标识时应优先路由到指定服务', async () => {
      const client = createHttpClient({
        routes: [
          { prefix: '/order', target: 'https://order-service.cloud' },
          { prefix: '/vip', target: 'https://vip-service.cloud', service: 'vip' },
        ],
      });

      let capturedConfig: InternalAxiosRequestConfig | undefined;
      mockAdapter(client, async cfg => {
        capturedConfig = cfg;
        return {
          data: { code: 200, data: true, msg: 'ok' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: cfg,
        };
      });

      await client.get('/order/detail/100', { service: 'vip' });

      expect(capturedConfig?.baseURL).toBe('https://vip-service.cloud');
    });
  });

  describe('6. cancelDuplicate: true 防竞态自动中断', () => {
    it('连续发送相同签名的未决请求时，后发请求应中断前序请求', async () => {
      const client = createHttpClient({ cancelDuplicate: true });

      mockAdapter(client, async cfg => {
        // 第一个请求模拟延迟并响应 signal 取消
        if ((cfg.params as Record<string, unknown> | undefined)?.['q'] === 'slow') {
          return new Promise<AxiosResponse>((_, reject) => {
            if (cfg.signal?.aborted) {
              reject(new axios.CanceledError(cfg.signal.reason as string));
              return;
            }
            cfg.signal?.addEventListener('abort', () => {
              reject(new axios.CanceledError(cfg.signal?.reason as string));
            });
          });
        }
        return {
          data: { code: 200, data: 'fast', msg: 'ok' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: cfg,
        };
      });

      // 1. 发起第 1 个慢请求
      const req1Promise = client.get('/api/search', { params: { q: 'slow' } });

      // 等待请求拦截器微任务就绪
      await new Promise(resolve => setTimeout(resolve, 0));

      // 验证已被登记
      expect(client.abortCoordinator.getPendingCount()).toBe(1);

      // 2. 发起第 2 个同签名请求，这将自动中断第 1 个请求
      const _req2Promise = client.get('/api/search', { params: { q: 'slow' } });

      // 第 1 个请求被中断抛出
      await expect(req1Promise).rejects.toBeDefined();

      // 清理未决
      client.abortCoordinator.cancelAll();
    });
  });

  describe('7. 便捷方法支持 (post, put, delete, patch, download)', () => {
    it('post / put / delete / patch 应正确封装方法名与载荷', async () => {
      let lastMethod = '';
      let lastData: unknown;

      mockAdapter(http, async cfg => {
        lastMethod = cfg.method || '';
        lastData = cfg.data;
        return {
          data: { code: 200, data: 'done', msg: 'ok' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: cfg,
        };
      });

      await http.post('/items', { name: 'A' });
      expect(lastMethod.toLowerCase()).toBe('post');
      expect(JSON.parse(String(lastData))).toEqual({ name: 'A' });

      await http.put('/items/1', { name: 'B' });
      expect(lastMethod.toLowerCase()).toBe('put');
      expect(JSON.parse(String(lastData))).toEqual({ name: 'B' });

      await http.delete('/items/1');
      expect(lastMethod.toLowerCase()).toBe('delete');

      await http.patch('/items/1', { status: 1 });
      expect(lastMethod.toLowerCase()).toBe('patch');
      expect(JSON.parse(String(lastData))).toEqual({ status: 1 });
    });

    it('download 应以 responseType: blob 请求并在 Node 环境防御降级返回 false', async () => {
      let requestConfig: InternalAxiosRequestConfig | undefined;

      mockAdapter(http, async cfg => {
        requestConfig = cfg;
        return {
          data: new Blob(['file content']),
          status: 200,
          statusText: 'OK',
          headers: {
            'content-disposition': "attachment; filename*=UTF-8''%e6%8a%a5%e8%a1%a8.xlsx",
          },
          config: cfg,
        };
      });

      // Node 环境下由于无 DOM，返回 false 但绝不抛出错误
      const downloadSuccess = await http.download('/export/excel');
      expect(downloadSuccess).toBe(false);
      expect(requestConfig?.responseType).toBe('blob');
    });
  });
});
