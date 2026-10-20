/**
 * HTTP 幂等安全重试状态机 (RetryPolicy) 单元与集成测试。
 *
 * 验证：
 * 1. 幂等 HTTP 方法检测与非幂等写操作拦截
 * 2. 瞬态故障（5xx、网络中断、超时）与客户端错误判定
 * 3. 指数退避延迟算法（Exponential Backoff）
 * 4. HttpClient 管道集成：GET 请求网络抖动重试成功与耗尽抛出
 * 5. 安全重试不变量：POST/PUT/DELETE 写操作严格禁止自动重试
 * 6. 4xx 客户端错误不予重试
 * 7. 自定义 shouldRetry 条件重写与 AbortSignal 中断级联
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import {
  isIdempotentMethod,
  isRetriableError,
  calculateBackoffDelay,
  createHttpClient,
  BusinessException,
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

describe('RetryPolicy Suite (Issue #14)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. 纯函数原语与幂等性判定 (Idempotency & Retriable Rules)', () => {
    it('isIdempotentMethod 应准确识别 GET, HEAD, OPTIONS 为幂等方法，其余为写操作', () => {
      expect(isIdempotentMethod('GET')).toBe(true);
      expect(isIdempotentMethod('get')).toBe(true);
      expect(isIdempotentMethod('HEAD')).toBe(true);
      expect(isIdempotentMethod('OPTIONS')).toBe(true);
      expect(isIdempotentMethod(undefined)).toBe(true); // 默认当作 GET

      expect(isIdempotentMethod('POST')).toBe(false);
      expect(isIdempotentMethod('PUT')).toBe(false);
      expect(isIdempotentMethod('DELETE')).toBe(false);
      expect(isIdempotentMethod('PATCH')).toBe(false);
    });

    it('isRetriableError 应针对 5xx、超时与网络中断返回 true，对 4xx 返回 false', () => {
      // 5xx 服务端异常
      const err500 = new BusinessException(500, 'Internal Server Error');
      const err502 = new BusinessException(502, 'Bad Gateway');
      const err503 = new BusinessException(503, 'Service Unavailable');
      const err504 = new BusinessException(504, 'Gateway Timeout');
      expect(isRetriableError(err500)).toBe(true);
      expect(isRetriableError(err502)).toBe(true);
      expect(isRetriableError(err503)).toBe(true);
      expect(isRetriableError(err504)).toBe(true);

      // 网络与超时异常
      const networkErr = new BusinessException(500, 'Network Error');
      const timeoutErr = new BusinessException(408, 'timeout of 5000ms exceeded');
      expect(isRetriableError(networkErr)).toBe(true);
      expect(isRetriableError(timeoutErr)).toBe(true);

      // 4xx 客户端异常（严禁自动重试）
      const err400 = new BusinessException(400, 'Bad Request');
      const err401 = new BusinessException(401, 'Unauthorized');
      const err403 = new BusinessException(403, 'Forbidden');
      const err404 = new BusinessException(404, 'Not Found');
      expect(isRetriableError(err400)).toBe(false);
      expect(isRetriableError(err401)).toBe(false);
      expect(isRetriableError(err403)).toBe(false);
      expect(isRetriableError(err404)).toBe(false);
    });

    it('calculateBackoffDelay 应根据重试轮次呈指数级退避计算等待时间', () => {
      const baseDelay = 100;
      expect(calculateBackoffDelay(0, baseDelay)).toBe(100); // 100 * 2^0
      expect(calculateBackoffDelay(1, baseDelay)).toBe(200); // 100 * 2^1
      expect(calculateBackoffDelay(2, baseDelay)).toBe(400); // 100 * 2^2
      expect(calculateBackoffDelay(3, baseDelay)).toBe(800); // 100 * 2^3
    });
  });

  describe('2. HttpClient 集成重试管道 (HttpClient Retry Integration)', () => {
    it('GET 请求在遭遇 500 故障时，若配置 retry: 2 应在重试后成功恢复', async () => {
      const client = createHttpClient();
      let attempts = 0;

      mockAdapter(client, async config => {
        attempts++;
        if (attempts === 1) {
          // 第一次调用：模拟 500 临时故障
          const error = new axios.AxiosError(
            'Request failed with status code 500',
            'ERR_BAD_RESPONSE',
          );
          error.response = {
            status: 500,
            statusText: 'Internal Server Error',
            data: { code: 500, msg: 'Temporary DB Glitch' },
            headers: {},
            config,
          };
          throw error;
        }

        // 第二次调用（第 1 次重试）：服务恢复正常
        const mockResult: Result<{ status: string }> = {
          code: 200,
          msg: 'ok',
          data: { status: 'healthy' },
        };
        return {
          data: mockResult,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      });

      // 配置 retry: 2, 极速 retryDelay: 10ms
      const data = await client.get<{ status: string }>('/api/v1/health', {
        retry: 2,
        retryDelay: 10,
      });

      expect(attempts).toBe(2);
      expect(data).toEqual({ status: 'healthy' });
    });

    it('GET 请求若持续 500 故障超过最大重试次数，最终应抛出 BusinessException', async () => {
      const client = createHttpClient();
      let attempts = 0;

      mockAdapter(client, async config => {
        attempts++;
        const error = new axios.AxiosError(
          'Request failed with status code 500',
          'ERR_BAD_RESPONSE',
        );
        error.response = {
          status: 500,
          statusText: 'Internal Server Error',
          data: { code: 500, msg: 'Persistent Failure' },
          headers: {},
          config,
        };
        throw error;
      });

      // 配置 retry: 2 (初次尝试 + 2 次重试 = 总计 3 次尝试)
      await expect(
        client.get('/api/v1/status', {
          retry: 2,
          retryDelay: 10,
        }),
      ).rejects.toThrow(BusinessException);

      expect(attempts).toBe(3);
    });

    it('安全重试不变量：POST 写操作即便配置了 retry: 3，遭遇 500 故障也绝对严禁重试', async () => {
      const client = createHttpClient();
      let attempts = 0;

      mockAdapter(client, async config => {
        attempts++;
        const error = new axios.AxiosError(
          'Request failed with status code 500',
          'ERR_BAD_RESPONSE',
        );
        error.response = {
          status: 500,
          statusText: 'Internal Server Error',
          data: { code: 500, msg: 'Payment Service Timeout' },
          headers: {},
          config,
        };
        throw error;
      });

      // POST 写请求配置了 retry: 3
      await expect(
        client.post('/api/v1/orders', { amount: 100 }, { retry: 3, retryDelay: 10 }),
      ).rejects.toThrow(BusinessException);

      // 铁律：只执行了初次调用，杜绝任何重复写操作
      expect(attempts).toBe(1);
    });

    it('安全重试不变量：PUT 与 DELETE 写操作默认同样不触发重试', async () => {
      const client = createHttpClient();
      let putAttempts = 0;
      let deleteAttempts = 0;

      mockAdapter(client, async config => {
        if (config.method?.toUpperCase() === 'PUT') {
          putAttempts++;
        } else if (config.method?.toUpperCase() === 'DELETE') {
          deleteAttempts++;
        }
        const error = new axios.AxiosError(
          'Request failed with status code 500',
          'ERR_BAD_RESPONSE',
        );
        error.response = {
          status: 500,
          statusText: 'Internal Server Error',
          data: { code: 500, msg: 'Error' },
          headers: {},
          config,
        };
        throw error;
      });

      await expect(
        client.put('/api/v1/user/1', { name: 'New' }, { retry: 2, retryDelay: 10 }),
      ).rejects.toThrow(BusinessException);
      expect(putAttempts).toBe(1);

      await expect(client.delete('/api/v1/user/1', { retry: 2, retryDelay: 10 })).rejects.toThrow(
        BusinessException,
      );
      expect(deleteAttempts).toBe(1);
    });

    it('客户端错误（如 404 Not Found）在 GET 请求下也不予重试', async () => {
      const client = createHttpClient();
      let attempts = 0;

      mockAdapter(client, async config => {
        attempts++;
        const error = new axios.AxiosError(
          'Request failed with status code 404',
          'ERR_BAD_REQUEST',
        );
        error.response = {
          status: 404,
          statusText: 'Not Found',
          data: { code: 404, msg: 'Resource Not Found' },
          headers: {},
          config,
        };
        throw error;
      });

      await expect(client.get('/api/v1/missing', { retry: 3, retryDelay: 10 })).rejects.toThrow(
        BusinessException,
      );

      expect(attempts).toBe(1);
    });

    it('支持通过自定义 shouldRetry 钩子精细控制重试决策', async () => {
      const client = createHttpClient();
      let attempts = 0;

      mockAdapter(client, async config => {
        attempts++;
        const error = new axios.AxiosError(
          'Request failed with status code 500',
          'ERR_BAD_RESPONSE',
        );
        error.response = {
          status: 500,
          statusText: 'Internal Server Error',
          data: { code: 500, msg: 'Do Not Retry This Specific Error' },
          headers: {},
          config,
        };
        throw error;
      });

      // 自定义 shouldRetry 返回 false
      await expect(
        client.get('/api/v1/custom-check', {
          retry: 3,
          retryDelay: 10,
          shouldRetry: err => err.msg !== 'Do Not Retry This Specific Error',
        }),
      ).rejects.toThrow(BusinessException);

      expect(attempts).toBe(1);
    });

    it('若在重试退避等待期间外部 AbortSignal 中断，应立即中止并不再发起后续重试', async () => {
      const client = createHttpClient();
      let attempts = 0;

      mockAdapter(client, async config => {
        attempts++;
        const error = new axios.AxiosError(
          'Request failed with status code 500',
          'ERR_BAD_RESPONSE',
        );
        error.response = {
          status: 500,
          statusText: 'Internal Server Error',
          data: { code: 500, msg: 'Error' },
          headers: {},
          config,
        };
        throw error;
      });

      const controller = new AbortController();

      // 发起请求并在 20ms 后中止，而 retryDelay 为 100ms
      const promise = client.get('/api/v1/aborted', {
        retry: 3,
        retryDelay: 100,
        signal: controller.signal,
      });

      setTimeout(() => {
        controller.abort();
      }, 20);

      await expect(promise).rejects.toThrow();
      expect(attempts).toBe(1);
    });
  });
});
