/**
 * Web 原生流式响应与 SSE 打字机客户端单元测试。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { describe, expect, it, vi } from 'vitest';
import { SseParser, DefaultStreamClient, createStreamClient, type SseEvent } from '../src/stream';
import { createAuthManager, MemoryAuthStorage } from '../src/auth';
import { createTenantManager, MemoryTenantStorage } from '../src/tenant';

/**
 * 辅助工具：创建可供 ReadableStream 消费的 Mock Response
 */
function createMockStreamResponse(
  chunks: string[],
  status = 200,
  headers: Record<string, string> = {},
) {
  const encoder = new TextEncoder();
  let index = 0;

  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index]));
        index++;
      } else {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status,
    headers: {
      'Content-Type': 'text/event-stream',
      ...headers,
    },
  });
}

describe('StreamClient & SseParser (Web 原生流式响应与 SSE 客户端)', () => {
  describe('1. SseParser 增量事件解析器', () => {
    it('应正确解析标准单个 SSE 数据事件', () => {
      const parser = new SseParser();
      const events = parser.feed('data: hello world\n\n');

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({
        event: 'message',
        data: 'hello world',
        id: undefined,
        retry: undefined,
      });
    });

    it('应正确合并多行 data 字段并保留换行符', () => {
      const parser = new SseParser();
      const events = parser.feed('data: first line\ndata: second line\n\n');

      expect(events).toHaveLength(1);
      expect(events[0].data).toBe('first line\nsecond line');
    });

    it('应正确解析自定义 event 类型、id 与 retry 重试参数', () => {
      const parser = new SseParser();
      const events = parser.feed(
        'event: delta\nid: evt-101\nretry: 3000\ndata: {"token":"ateng"}\n\n',
      );

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({
        event: 'delta',
        id: 'evt-101',
        retry: 3000,
        data: '{"token":"ateng"}',
      });
    });

    it('应安全忽略心跳与注释行（以冒号开头）', () => {
      const parser = new SseParser();
      const events = parser.feed(': ping keep-alive\n\ndata: actual data\n\n');

      expect(events).toHaveLength(1);
      expect(events[0].data).toBe('actual data');
    });

    it('应具备跨 chunk 缓冲区拼接解析能力（抗网络分包撕裂）', () => {
      const parser = new SseParser();
      // 第 1 块：数据撕裂在中间
      const events1 = parser.feed('data: hel');
      expect(events1).toHaveLength(0);

      // 第 2 块：补全并结束
      const events2 = parser.feed('lo from sse\n\n');
      expect(events2).toHaveLength(1);
      expect(events2[0].data).toBe('hello from sse');
    });
  });

  describe('2. StreamClient 请求头注入与生命周期事件', () => {
    it('应自动注入 AuthManager 鉴权头与 TenantManager 租户头', async () => {
      const authStorage = new MemoryAuthStorage();
      const auth = createAuthManager({ storage: authStorage });
      auth.setToken('stream-token-xyz');

      const tenantStorage = new MemoryTenantStorage();
      const tenant = createTenantManager({ storage: tenantStorage });
      tenant.setTenantId('tenant-core-888');

      let capturedUrl = '';
      let capturedInit: RequestInit | undefined;

      const mockFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedUrl = String(input);
        capturedInit = init;
        return createMockStreamResponse(['data: ok\n\n']);
      });

      const client = createStreamClient({
        baseURL: 'https://api.example.com',
        authManager: auth,
        tenantManager: tenant,
        fetch: mockFetch as unknown as typeof fetch,
      });

      const messages: string[] = [];
      let doneCalled = false;

      await client.subscribe('/v1/chat/completions', {
        method: 'POST',
        body: { prompt: 'hi' },
        onMessage: data => messages.push(data),
        onDone: () => {
          doneCalled = true;
        },
      });

      expect(capturedUrl).toBe('https://api.example.com/v1/chat/completions');
      expect(capturedInit?.method).toBe('POST');
      expect(capturedInit?.body).toBe(JSON.stringify({ prompt: 'hi' }));

      const headers = capturedInit?.headers as Record<string, string>;
      expect(headers['token']).toBe('stream-token-xyz');
      expect(headers['Authorization']).toBe('Bearer stream-token-xyz');
      expect(headers['X-Tenant-Id']).toBe('tenant-core-888');
      expect(headers['Accept']).toContain('text/event-stream');

      expect(messages).toEqual(['ok']);
      expect(doneCalled).toBe(true);
    });

    it('逐块打字机输出应能被准确接收并通知 onMessage 与 onDone', async () => {
      const chunks = ['data: 你\n\n', 'data: 好\n\n', 'data: ，世\n\n', 'data: 界！\n\n'];

      const mockFetch = vi.fn(async () => createMockStreamResponse(chunks));
      const client = new DefaultStreamClient({
        fetch: mockFetch as unknown as typeof fetch,
      });

      const tokens: string[] = [];
      let done = false;

      await client.subscribe('/api/stream', {
        onMessage: chunk => tokens.push(chunk),
        onDone: () => {
          done = true;
        },
      });

      expect(tokens).toEqual(['你', '好', '，世', '界！']);
      expect(done).toBe(true);
    });
  });

  describe('3. AbortSignal 中断与资源回收', () => {
    it('流传输中途触发 AbortSignal 应立即终止且不抛出未决异常', async () => {
      const controller = new AbortController();
      const chunks = ['data: 1\n\n', 'data: 2\n\n', 'data: 3\n\n'];

      let pullCount = 0;
      const stream = new ReadableStream<Uint8Array>({
        pull(ctrl) {
          if (pullCount < chunks.length) {
            ctrl.enqueue(new TextEncoder().encode(chunks[pullCount]));
            pullCount++;
          }
        },
      });

      const mockFetch = vi.fn(async () => new Response(stream));
      const client = createStreamClient({
        fetch: mockFetch as unknown as typeof fetch,
      });

      const received: string[] = [];
      const subscribePromise = client.subscribe('/api/stream', {
        signal: controller.signal,
        onMessage: data => {
          received.push(data);
          if (data === '1') {
            controller.abort();
          }
        },
      });

      await expect(subscribePromise).resolves.toBeUndefined();
      expect(received).toEqual(['1']);
    });
  });

  describe('4. 自动重连与 Last-Event-ID 机制', () => {
    it('遇到网络瞬态断连时应自动携带 Last-Event-ID 进行重连', async () => {
      let callCount = 0;
      const capturedHeadersList: Record<string, string>[] = [];

      const mockFetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
        callCount++;
        capturedHeadersList.push((init?.headers ?? {}) as Record<string, string>);

        if (callCount === 1) {
          // 第 1 次响应：返回一条带 ID 的事件后非正常断连
          let enqueued = false;
          const stream = new ReadableStream<Uint8Array>({
            pull(controller) {
              if (!enqueued) {
                controller.enqueue(new TextEncoder().encode('id: evt-42\ndata: first piece\n\n'));
                enqueued = true;
              } else {
                controller.error(new Error('Network connection reset'));
              }
            },
          });
          return new Response(stream);
        }

        // 第 2 次重连：正常返回剩余数据
        return createMockStreamResponse(['data: second piece\n\n']);
      });

      const client = createStreamClient({
        fetch: mockFetch as unknown as typeof fetch,
      });

      const messages: string[] = [];
      let doneCalled = false;

      await client.subscribe('/api/stream', {
        reconnect: true,
        maxRetries: 2,
        retryDelay: 10,
        onMessage: data => messages.push(data),
        onDone: () => {
          doneCalled = true;
        },
      });

      expect(callCount).toBe(2);
      expect(messages).toEqual(['first piece', 'second piece']);
      expect(doneCalled).toBe(true);

      // 验证第 2 次请求是否注入了 Last-Event-ID
      expect(capturedHeadersList[0]['Last-Event-ID']).toBeUndefined();
      expect(capturedHeadersList[1]['Last-Event-ID']).toBe('evt-42');
    });

    it('重连次数达到上限后应触发 onError 回调并终止', async () => {
      const mockFetch = vi.fn(async () => {
        throw new Error('Persistent network failure');
      });

      const client = createStreamClient({
        fetch: mockFetch as unknown as typeof fetch,
      });

      let capturedError: Error | undefined;

      await client.subscribe('/api/stream', {
        reconnect: true,
        maxRetries: 2,
        retryDelay: 10,
        onError: err => {
          capturedError = err;
        },
      });

      expect(capturedError).toBeDefined();
      expect(capturedError?.message).toContain('Persistent network failure');
    });
  });

  describe('5. stream 异步迭代器 (AsyncIterable)', () => {
    it('应支持通过 for await 逐个消费 SseEvent', async () => {
      const chunks = ['id: 1\nevent: token\ndata: A\n\n', 'id: 2\nevent: token\ndata: B\n\n'];

      const mockFetch = vi.fn(async () => createMockStreamResponse(chunks));
      const client = createStreamClient({
        fetch: mockFetch as unknown as typeof fetch,
      });

      const events: SseEvent[] = [];
      for await (const event of client.stream('/api/chat')) {
        events.push(event);
      }

      expect(events).toHaveLength(2);
      expect(events[0]).toEqual({
        id: '1',
        event: 'token',
        data: 'A',
        retry: undefined,
      });
      expect(events[1]).toEqual({
        id: '2',
        event: 'token',
        data: 'B',
        retry: undefined,
      });
    });
  });
});
