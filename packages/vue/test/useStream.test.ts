/**
 * useStream Web 原生流式响应与 SSE 打字机 Hook 单元测试。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, isReadonly, ref } from 'vue';
import { createStreamClient } from '@atengk/core';
import { useStream } from '../src';

/**
 * 辅助工具：创建可供 ReadableStream 消费的 Mock Response
 */
function createMockStreamResponse(
  chunks: string[],
  status = 200,
  headers: Record<string, string> = {},
): Response {
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

describe('useStream', () => {
  let originalFetch: typeof fetch;

  const setMockFetch = (fn: typeof fetch) => {
    globalThis.fetch = fn;
    if (typeof window !== 'undefined') {
      window.fetch = fn;
    }
  };

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    setMockFetch(originalFetch);
    vi.restoreAllMocks();
  });

  describe('Seam 1: 开箱即用与只读响应式状态机', () => {
    it('初始化时所有状态应处于默认闲置值且被 readonly 只读保护', () => {
      const stream = useStream('/api/chat');

      expect(stream.text.value).toBe('');
      expect(stream.isStreaming.value).toBe(false);
      expect(stream.event.value).toBeUndefined();
      expect(stream.error.value).toBeUndefined();

      // 只读保护验证
      expect(isReadonly(stream.text)).toBe(true);
      expect(isReadonly(stream.isStreaming)).toBe(true);
      expect(isReadonly(stream.event)).toBe(true);
      expect(isReadonly(stream.error)).toBe(true);
    });

    it('当传入空或非法 URL 且调用 start 时应抛出 TypeError 并标记 error 状态', async () => {
      const onError = vi.fn();
      const stream = useStream('', { onError });

      await expect(stream.start()).rejects.toThrow(TypeError);
      expect(stream.error.value).toBeInstanceOf(TypeError);
      expect(stream.isStreaming.value).toBe(false);
      expect(onError).toHaveBeenCalled();
    });

    it('支持 Vue 3.5 MaybeRefOrGetter 动态解析 URL', async () => {
      const dynamicUrl = ref('/api/v1/chat');
      setMockFetch(vi.fn().mockResolvedValue(createMockStreamResponse(['data: dynamic-ok\n\n'])));

      const stream = useStream(() => dynamicUrl.value);
      const result = await stream.start();

      expect(result).toBe('dynamic-ok');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/v1/chat',
        expect.objectContaining({ method: 'GET' }),
      );
    });
  });

  describe('Seam 2: 增量累积打字机文本与事件处理', () => {
    it('应按分块增量累积文本、更新事件实体，并在完成时忽略 [DONE] 标记', async () => {
      const sseChunks = [
        'data: 你好\n\n',
        'data: ，我是\n\n',
        'data:  Ateng UI 大模型助\n\n',
        'data: 手！\n\n',
        'data: [DONE]\n\n',
      ];

      setMockFetch(vi.fn().mockResolvedValue(createMockStreamResponse(sseChunks)));

      const messageHistory: string[] = [];
      const onDone = vi.fn();

      const stream = useStream('/api/sse/chat', {
        onMessage: text => {
          messageHistory.push(text);
        },
        onDone,
      });

      const startPromise = stream.start();
      expect(stream.isStreaming.value).toBe(true);

      const finalContent = await startPromise;

      expect(finalContent).toBe('你好，我是 Ateng UI 大模型助手！');
      expect(stream.text.value).toBe('你好，我是 Ateng UI 大模型助手！');
      expect(stream.isStreaming.value).toBe(false);
      expect(messageHistory).toEqual(['你好', '，我是', ' Ateng UI 大模型助', '手！']);
      expect(onDone).toHaveBeenCalledWith('你好，我是 Ateng UI 大模型助手！');
    });

    it('支持传递自定义 StreamClient 实例与 POST 请求体', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(createMockStreamResponse(['data: post-success\n\n']));
      const customClient = createStreamClient({ fetch: mockFetch });

      const stream = useStream('/api/llm/completion', {
        streamClient: customClient,
        method: 'POST',
        headers: { 'X-Custom-Header': 'CustomValue' },
        body: { prompt: 'Explain Vue 3.5' },
      });

      const res = await stream.start();
      expect(res).toBe('post-success');
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/llm/completion',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ prompt: 'Explain Vue 3.5' }),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Custom-Header': 'CustomValue',
          }),
        }),
      );
    });
  });

  describe('Seam 3: 中断 (abort / stop) 与重置 (reset)', () => {
    it('调用 abort() 应立即切断在途流传输并将 isStreaming 置为 false', async () => {
      let aborted = false;
      const encoder = new TextEncoder();

      const streamSource = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode('data: partial chunk\n\n'));
        },
        cancel() {
          aborted = true;
        },
      });

      setMockFetch(
        vi.fn().mockResolvedValue(
          new Response(streamSource, {
            headers: { 'Content-Type': 'text/event-stream' },
          }),
        ),
      );

      const stream = useStream('/api/chat/infinite');
      const startPromise = stream.start();

      await new Promise(resolve => setTimeout(resolve, 20));
      expect(stream.text.value).toBe('partial chunk');
      expect(stream.isStreaming.value).toBe(true);

      stream.abort();
      expect(stream.isStreaming.value).toBe(false);

      await startPromise;
      expect(aborted).toBe(true);
      expect(stream.text.value).toBe('partial chunk');
    });

    it('调用 reset() 应中断在途连接并清空全部响应式数据', async () => {
      setMockFetch(
        vi.fn().mockResolvedValue(createMockStreamResponse(['data: text-to-clear\n\n'])),
      );

      const stream = useStream('/api/chat');
      await stream.start();

      expect(stream.text.value).toBe('text-to-clear');

      stream.reset();
      expect(stream.text.value).toBe('');
      expect(stream.event.value).toBeUndefined();
      expect(stream.error.value).toBeUndefined();
      expect(stream.isStreaming.value).toBe(false);
    });
  });

  describe('Seam 4: 异常捕获与非功能错误边界', () => {
    it('底层网络故障时应捕获异常并标记 error 状态', async () => {
      setMockFetch(vi.fn().mockRejectedValue(new Error('DNS resolution failed')));
      const onError = vi.fn();

      const stream = useStream('/api/chat/broken', { onError });

      await expect(stream.start()).rejects.toThrow('DNS resolution failed');
      expect(stream.error.value).toBeInstanceOf(Error);
      expect(stream.isStreaming.value).toBe(false);
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('Seam 5: 自动连接 (autoConnect / autoStart)', () => {
    it('配置 autoConnect: true 时应在初始化时自动启动流传输', async () => {
      setMockFetch(
        vi.fn().mockResolvedValue(createMockStreamResponse(['data: auto-connected text\n\n'])),
      );

      const stream = useStream('/api/chat/auto', {
        autoConnect: true,
      });

      // 等待宏任务完成
      await new Promise(resolve => setTimeout(resolve, 30));

      expect(stream.text.value).toBe('auto-connected text');
      expect(stream.isStreaming.value).toBe(false);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Seam 6: 确定性生命周期清理 (tryOnScopeDispose)', () => {
    it('当 effectScope 销毁时应自动调用 abort() 中断底层流通道', async () => {
      let aborted = false;
      const encoder = new TextEncoder();

      const streamSource = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode('data: chunk-before-dispose\n\n'));
        },
        cancel() {
          aborted = true;
        },
      });

      setMockFetch(
        vi.fn().mockResolvedValue(
          new Response(streamSource, {
            headers: { 'Content-Type': 'text/event-stream' },
          }),
        ),
      );

      const scope = effectScope();
      let streamInstance: ReturnType<typeof useStream> | null = null;

      scope.run(() => {
        streamInstance = useStream('/api/chat/lifecycle');
      });

      const promise = streamInstance!.start();
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(streamInstance!.isStreaming.value).toBe(true);

      // 停止作用域
      scope.stop();

      await promise;
      expect(aborted).toBe(true);
      expect(streamInstance!.isStreaming.value).toBe(false);
    });
  });
});
