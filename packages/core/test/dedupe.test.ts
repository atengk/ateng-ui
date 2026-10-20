/**
 * 飞行中请求合并去重调度器 (RequestDeduplicator) 单元与集成测试。
 *
 * 验证：
 * 1. 独立 RequestDeduplicator 实例的指纹生成与确定性哈希
 * 2. 飞行中状态追踪与生命周期自动释放（成功与失败均 100% 清理）
 * 3. 5 个并发请求复用单个 Promise，后续请求发起全新调用的闭环
 * 4. HttpClient 管道集成：dedupeInFlight 开关与 Method+URL+Params 指纹合并
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import {
  RequestDeduplicator,
  createRequestDeduplicator,
  generateDedupeKey,
  createHttpClient,
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

describe('RequestDeduplicator Suite (Issue #14)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. 独立调度器与指纹生成 (Key Generation & In-Flight)', () => {
    it('generateDedupeKey 应针对相同 Method、URL 与 Params（无论对象属性顺序）生成完全一致的指纹', () => {
      const key1 = generateDedupeKey({
        method: 'get',
        url: '/api/v1/users',
        params: { role: 'admin', page: 1, filter: { active: true, tag: 'vip' } },
      });

      const key2 = generateDedupeKey({
        method: 'GET',
        url: '/api/v1/users',
        params: { filter: { tag: 'vip', active: true }, page: 1, role: 'admin' },
      });

      expect(key1).toBe(key2);
      expect(key1).toContain('GET:/api/v1/users?');
    });

    it('不同 Method、不同 URL 或不同 Params 应生成不同的指纹', () => {
      const keyGet = generateDedupeKey({ method: 'GET', url: '/api/test' });
      const keyPost = generateDedupeKey({ method: 'POST', url: '/api/test' });
      const keyDiffUrl = generateDedupeKey({ method: 'GET', url: '/api/test2' });
      const keyDiffParams = generateDedupeKey({
        method: 'GET',
        url: '/api/test',
        params: { a: 1 },
      });

      expect(keyGet).not.toBe(keyPost);
      expect(keyGet).not.toBe(keyDiffUrl);
      expect(keyGet).not.toBe(keyDiffParams);
    });

    it('显式指定 dedupeKey 时应优先使用该自定义指纹', () => {
      const key = generateDedupeKey({
        method: 'GET',
        url: '/api/users/123',
        dedupeKey: 'custom-unique-key',
      });
      expect(key).toBe('custom-unique-key');
    });

    it('多个并发异步调用应复用同一 Promise，并在结算后确定性释放', async () => {
      const deduplicator = createRequestDeduplicator();
      let callCount = 0;

      const slowTask = () =>
        new Promise<string>(resolve => {
          callCount++;
          setTimeout(() => resolve('resolved-data'), 50);
        });

      // 并发触发 5 个相同指纹的任务
      const promise1 = deduplicator.execute('task-1', slowTask);
      const promise2 = deduplicator.execute('task-1', slowTask);
      const promise3 = deduplicator.execute('task-1', slowTask);
      const promise4 = deduplicator.execute('task-1', slowTask);
      const promise5 = deduplicator.execute('task-1', slowTask);

      // 飞行中状态验证
      expect(deduplicator.isInFlight('task-1')).toBe(true);
      expect(deduplicator.getInFlightCount()).toBe(1);

      const results = await Promise.all([promise1, promise2, promise3, promise4, promise5]);

      // 结果一致且实际只调用了一次
      expect(results).toEqual([
        'resolved-data',
        'resolved-data',
        'resolved-data',
        'resolved-data',
        'resolved-data',
      ]);
      expect(callCount).toBe(1);

      // 任务结算后内存自动释放
      expect(deduplicator.isInFlight('task-1')).toBe(false);
      expect(deduplicator.getInFlightCount()).toBe(0);

      // 后续再发起的调用应启动新任务
      const subsequentResult = await deduplicator.execute('task-1', slowTask);
      expect(subsequentResult).toBe('resolved-data');
      expect(callCount).toBe(2);
      expect(deduplicator.getInFlightCount()).toBe(0);
    });

    it('并发任务发生异常时应同样释放飞行中记录，并将异常透传给所有等待者', async () => {
      const deduplicator = new RequestDeduplicator();
      let callCount = 0;

      const failingTask = () =>
        new Promise<never>((_, reject) => {
          callCount++;
          setTimeout(() => reject(new Error('Network Crash')), 30);
        });

      const p1 = deduplicator.execute('fail-task', failingTask);
      const p2 = deduplicator.execute('fail-task', failingTask);
      const p3 = deduplicator.execute('fail-task', failingTask);

      expect(deduplicator.isInFlight('fail-task')).toBe(true);

      const results = await Promise.allSettled([p1, p2, p3]);

      expect(callCount).toBe(1);
      expect(deduplicator.isInFlight('fail-task')).toBe(false);
      expect(deduplicator.getInFlightCount()).toBe(0);

      for (const res of results) {
        expect(res.status).toBe('rejected');
        if (res.status === 'rejected') {
          expect(res.reason.message).toBe('Network Crash');
        }
      }
    });

    it('clear 应能强制清空当前所有飞行中记录', () => {
      const deduplicator = new RequestDeduplicator();
      deduplicator.execute('task-a', () => new Promise(() => {}));
      deduplicator.execute('task-b', () => new Promise(() => {}));

      expect(deduplicator.getInFlightCount()).toBe(2);
      deduplicator.clear();
      expect(deduplicator.getInFlightCount()).toBe(0);
      expect(deduplicator.isInFlight('task-a')).toBe(false);
    });
  });

  describe('2. HttpClient 集成去重合并 (HttpClient Deduplication)', () => {
    it('开启 dedupeInFlight 时，5 个并发 GET 请求应合并为 1 次底层网络调用', async () => {
      const client = createHttpClient();
      let networkCalls = 0;

      mockAdapter(client, async config => {
        networkCalls++;
        await new Promise(r => setTimeout(r, 40));
        const mockResult: Result<{ name: string }> = {
          code: 200,
          msg: 'ok',
          data: { name: 'Ateng' },
        };
        return {
          data: mockResult,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      });

      // 5 个并发请求，开启 dedupeInFlight: true
      const [r1, r2, r3, r4, r5] = await Promise.all([
        client.get<{ name: string }>('/api/v1/profile', { dedupeInFlight: true }),
        client.get<{ name: string }>('/api/v1/profile', { dedupeInFlight: true }),
        client.get<{ name: string }>('/api/v1/profile', { dedupeInFlight: true }),
        client.get<{ name: string }>('/api/v1/profile', { dedupeInFlight: true }),
        client.get<{ name: string }>('/api/v1/profile', { dedupeInFlight: true }),
      ]);

      expect(networkCalls).toBe(1);
      expect(r1).toEqual({ name: 'Ateng' });
      expect(r2).toEqual({ name: 'Ateng' });
      expect(r3).toEqual({ name: 'Ateng' });
      expect(r4).toEqual({ name: 'Ateng' });
      expect(r5).toEqual({ name: 'Ateng' });

      // 请求完成后，调度器释放，下一次请求发起新的网络调用
      expect(client.deduplicator.getInFlightCount()).toBe(0);
      const r6 = await client.get<{ name: string }>('/api/v1/profile', { dedupeInFlight: true });
      expect(r6).toEqual({ name: 'Ateng' });
      expect(networkCalls).toBe(2);
    });

    it('默认未开启 dedupeInFlight 时，5 个并发 GET 请求应各自发出 5 次网络调用', async () => {
      const client = createHttpClient();
      let networkCalls = 0;

      mockAdapter(client, async config => {
        networkCalls++;
        await new Promise(r => setTimeout(r, 20));
        return {
          data: { code: 200, msg: 'ok', data: 'data' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      });

      await Promise.all([
        client.get('/api/test'),
        client.get('/api/test'),
        client.get('/api/test'),
        client.get('/api/test'),
        client.get('/api/test'),
      ]);

      expect(networkCalls).toBe(5);
    });

    it('客户端选项配置 dedupeInFlight: true 时，所有只读请求默认开启去重合并', async () => {
      const client = createHttpClient({ dedupeInFlight: true });
      let networkCalls = 0;

      mockAdapter(client, async config => {
        networkCalls++;
        await new Promise(r => setTimeout(r, 30));
        return {
          data: { code: 200, msg: 'ok', data: 'success' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      });

      const [res1, res2] = await Promise.all([
        client.get('/api/default-dedupe'),
        client.get('/api/default-dedupe'),
      ]);

      expect(networkCalls).toBe(1);
      expect(res1).toBe('success');
      expect(res2).toBe('success');
    });

    it('不同参数的并发请求不会相互合并', async () => {
      const client = createHttpClient({ dedupeInFlight: true });
      let networkCalls = 0;

      mockAdapter(client, async config => {
        networkCalls++;
        await new Promise(r => setTimeout(r, 30));
        return {
          data: { code: 200, msg: 'ok', data: config.params },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      });

      const [resA, resB] = await Promise.all([
        client.get('/api/users', { params: { id: 1 } }),
        client.get('/api/users', { params: { id: 2 } }),
      ]);

      expect(networkCalls).toBe(2);
      expect(resA).toEqual({ id: 1 });
      expect(resB).toEqual({ id: 2 });
    });
  });
});
