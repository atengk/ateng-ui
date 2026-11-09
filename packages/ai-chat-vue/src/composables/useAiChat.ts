/**
 * @atengk/ai-chat-vue 无头会话状态机 useAiChat 实现。
 *
 * 桥接 @atengk/core 的 StreamClient 与 @atengk/vue 的流式状态机制，
 * 管理多轮消息链、流式增量追加与在途中断，并在组件卸载时确定性销毁回收。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref, getCurrentScope, onScopeDispose, toValue, type Ref } from 'vue';
import { streamClient } from '@atengk/core';
import { ReasoningDemuxer } from '../demux/ReasoningDemuxer';
import { RenderThrottler } from '../throttler/RenderThrottler';
import type { ChatMessage, SendMessageOptions, UseAiChatOptions, UseAiChatReturn } from '../types';

/**
 * 生成带前缀的唯一消息标识符。
 */
function createMessageId(): string {
  return `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 判断指定异常是否属于主动取消。
 */
function isAbortError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const err = error as { name?: string; message?: string };
    return (
      err.name === 'AbortError' ||
      err.message?.toLowerCase().includes('aborted') === true ||
      err.message?.toLowerCase().includes('canceled') === true
    );
  }
  return false;
}

/**
 * 企业级 AI 会话无头响应式状态机 Hook。
 *
 * @param options 可选配置项
 * @returns 响应式会话状态机与控制门面
 */
export function useAiChat(options: UseAiChatOptions = {}): UseAiChatReturn {
  // 1. 响应式状态定义
  const messages: Ref<ChatMessage[]> = ref(
    options.initialMessages && options.initialMessages.length > 0
      ? [...options.initialMessages]
      : [],
  );
  const isStreaming: Ref<boolean> = ref(false);
  const error: Ref<Error | null> = ref(null);

  // 2. 内部控制器
  let activeAbortController: AbortController | null = null;
  let activeThrottler: RenderThrottler | null = null;

  /**
   * 瞬间跳过打字机呼吸感队列，立即刷出所有在途缓冲文本。
   */
  const flushTypewriter = (): void => {
    activeThrottler?.flushTypewriter();
  };

  /**
   * 中断当前正在在途生成的流式连接。
   */
  const abort = (): void => {
    if (activeThrottler) {
      activeThrottler.dispose();
      activeThrottler = null;
    }
    if (activeAbortController) {
      activeAbortController.abort('Aborted by user');
      activeAbortController = null;
    }
    isStreaming.value = false;
  };

  /**
   * 清空所有消息历史并重置状态。
   */
  const clearMessages = (): void => {
    abort();
    messages.value = [];
    error.value = null;
  };

  /**
   * 发送用户消息并触发大模型流式响应。
   */
  const sendMessage = async (
    content: string,
    sendOptions: SendMessageOptions = {},
  ): Promise<void> => {
    const trimmed = content.trim();
    const hasAttachments = Boolean(sendOptions.attachments) && sendOptions.attachments!.length > 0;

    // 前置空安全卫语句校验
    if (!trimmed && !hasAttachments) {
      return;
    }

    // 中断可能未决的前序请求
    abort();
    error.value = null;

    // 1. 注入用户消息
    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: 'user',
      status: 'completed',
      content: trimmed,
      attachments: sendOptions.attachments,
      createdAt: Date.now(),
    };
    messages.value.push(userMessage);

    // 2. 初始化助手占位消息
    const assistantMessage: ChatMessage = {
      id: createMessageId(),
      role: 'assistant',
      status: 'streaming',
      content: '',
      createdAt: Date.now(),
    };
    messages.value.push(assistantMessage);

    isStreaming.value = true;
    const controller = new AbortController();
    activeAbortController = controller;

    const demuxer = new ReasoningDemuxer();
    const throttler = new RenderThrottler({
      typewriterSpeed: toValue(options.typewriterSpeed) ?? 0,
      onUpdate: fullText => {
        assistantMessage.content = fullText;
      },
    });
    activeThrottler = throttler;

    const handleChunk = (chunk: string): void => {
      const res = demuxer.feed(chunk);

      if (res.reasoningChunk || demuxer.isThinkingActive()) {
        if (!assistantMessage.reasoning) {
          assistantMessage.reasoning = {
            text: '',
            isStreaming: true,
            collapsed: false,
            elapsedMs: 0,
          };
        }
        assistantMessage.reasoning.text = demuxer.getReasoning();
        assistantMessage.reasoning.isStreaming = demuxer.isThinkingActive();
        assistantMessage.reasoning.elapsedMs = demuxer.getElapsedMs();
      }

      if (res.contentChunk) {
        throttler.feed(res.contentChunk);
        if (assistantMessage.reasoning && !assistantMessage.reasoning.collapsed) {
          assistantMessage.reasoning.collapsed = true;
          assistantMessage.reasoning.isStreaming = false;
        }
      }
    };

    // 3. 执行流式通信管道
    try {
      if (options.streamHandler) {
        // 自定义处理函数优先（用于离线 Mock 或特殊协议引擎）
        await options.streamHandler(trimmed, handleChunk, controller.signal);
      } else if (options.streamUrl) {
        // 依托 @atengk/core StreamClient 发起 SSE / 分块流式请求
        await streamClient.subscribe(options.streamUrl, {
          method: 'POST',
          headers: sendOptions.headers,
          body: {
            prompt: trimmed,
            messages: messages.value.slice(0, -1),
            ...sendOptions.extraBody,
          },
          signal: controller.signal,
          onMessage: handleChunk,
          onError: (err: Error) => {
            throw err;
          },
        });
      } else {
        // 无后端地址且无 Handler 时，提供安全兜底返回
        assistantMessage.content = '服务端未配置 streamUrl 或 streamHandler。';
      }

      throttler.finish();
      demuxer.finish();
      if (assistantMessage.reasoning) {
        assistantMessage.reasoning.text = demuxer.getReasoning();
        assistantMessage.reasoning.elapsedMs = demuxer.getElapsedMs();
        assistantMessage.reasoning.isStreaming = false;
      }
      assistantMessage.content = throttler.getRenderedText() || demuxer.getContent();

      // 4. 流式安全结束
      assistantMessage.status = 'completed';
      options.onFinish?.(assistantMessage);
    } catch (err) {
      throttler.finish();
      demuxer.finish();
      if (assistantMessage.reasoning) {
        assistantMessage.reasoning.text = demuxer.getReasoning();
        assistantMessage.reasoning.elapsedMs = demuxer.getElapsedMs();
        assistantMessage.reasoning.isStreaming = false;
      }
      assistantMessage.content = throttler.getRenderedText() || demuxer.getContent();
      if (isAbortError(err)) {
        // 主动中断：若已收到部分内容则标记 completed，否则标记 error
        assistantMessage.status = assistantMessage.content.length > 0 ? 'completed' : 'error';
      } else {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        error.value = errorObj;
        assistantMessage.status = 'error';
        assistantMessage.error = errorObj.message;
        options.onError?.(errorObj);
      }
    } finally {
      if (activeAbortController === controller) {
        activeAbortController = null;
      }
      if (activeThrottler === throttler) {
        activeThrottler = null;
      }
      isStreaming.value = false;
    }
  };

  // 3. 确定性生命周期回收：组件卸载或作用域销毁时中断网络
  if (getCurrentScope()) {
    onScopeDispose(() => {
      abort();
    });
  }

  return {
    messages,
    isStreaming,
    error,
    sendMessage,
    abort,
    clearMessages,
    flushTypewriter,
  };
}
