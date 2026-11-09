/**
 * @atengk/ai-chat-vue 无头状态机 useAiChat 单元测试。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { describe, it, expect, vi } from 'vitest';
import { effectScope } from 'vue';
import { useAiChat } from '../src/composables/useAiChat';
import type { ChatMessage } from '../src/types';

describe('useAiChat', () => {
  it('应当正确初始化默认空消息状态', () => {
    const { messages, isStreaming, error } = useAiChat();

    expect(messages.value).toEqual([]);
    expect(isStreaming.value).toBe(false);
    expect(error.value).toBeNull();
  });

  it('应当支持载入 initialMessages 预置消息', () => {
    const initial: ChatMessage[] = [
      {
        id: 'msg_1',
        role: 'user',
        status: 'completed',
        content: '你好',
        createdAt: 1000,
      },
    ];
    const { messages } = useAiChat({ initialMessages: initial });

    expect(messages.value.length).toBe(1);
    expect(messages.value[0].content).toBe('你好');
  });

  it('空文本且无附件时不应触发发送', async () => {
    const { messages, sendMessage, isStreaming } = useAiChat();

    await sendMessage('   ');
    expect(messages.value.length).toBe(0);
    expect(isStreaming.value).toBe(false);
  });

  it('应当通过 streamHandler 正确流式追加文本并标记完成', async () => {
    const onFinish = vi.fn();
    const { messages, sendMessage, isStreaming } = useAiChat({
      streamHandler: async (_prompt, onChunk) => {
        onChunk('你好');
        onChunk('，我是 AI');
      },
      onFinish,
    });

    await sendMessage('测试发送');

    expect(messages.value.length).toBe(2);
    expect(messages.value[0].role).toBe('user');
    expect(messages.value[0].content).toBe('测试发送');

    const assistantMsg = messages.value[1];
    expect(assistantMsg.role).toBe('assistant');
    expect(assistantMsg.content).toBe('你好，我是 AI');
    expect(assistantMsg.status).toBe('completed');
    expect(isStreaming.value).toBe(false);
    expect(onFinish).toHaveBeenCalledWith(assistantMsg);
  });

  it('遇到流式异常时应当正确转译为 error 状态并触发 onError 回调', async () => {
    const onError = vi.fn();
    const { messages, sendMessage, error, isStreaming } = useAiChat({
      streamHandler: async () => {
        throw new Error('网络连接超时');
      },
      onError,
    });

    await sendMessage('引发错误');

    expect(messages.value.length).toBe(2);
    expect(messages.value[1].status).toBe('error');
    expect(messages.value[1].error).toBe('网络连接超时');
    expect(isStreaming.value).toBe(false);
    expect(error.value?.message).toBe('网络连接超时');
    expect(onError).toHaveBeenCalled();
  });

  it('调用 abort() 时应当正确中止正在进行的流式连接', async () => {
    let capturedSignal: AbortSignal | null = null;
    const { sendMessage, abort, isStreaming } = useAiChat({
      streamHandler: async (_prompt, _onChunk, signal) => {
        capturedSignal = signal;
        await new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => reject(new Error('aborted')));
        });
      },
    });

    const sendPromise = sendMessage('长耗时提问');
    expect(isStreaming.value).toBe(true);

    abort();
    await sendPromise;

    expect(capturedSignal?.aborted).toBe(true);
    expect(isStreaming.value).toBe(false);
  });

  it('调用 clearMessages() 时应当清空消息列表并重置状态', async () => {
    const { messages, sendMessage, clearMessages } = useAiChat({
      streamHandler: async (_prompt, onChunk) => {
        onChunk('回答内容');
      },
    });

    await sendMessage('问题 1');
    expect(messages.value.length).toBe(2);

    clearMessages();
    expect(messages.value.length).toBe(0);
  });

  it('作用域注销 (onScopeDispose) 时应当触发确定性销毁 abort', async () => {
    let capturedSignal: AbortSignal | null = null;
    const scope = effectScope();

    let hookResult: ReturnType<typeof useAiChat> | null = null;
    scope.run(() => {
      hookResult = useAiChat({
        streamHandler: async (_prompt, _onChunk, signal) => {
          capturedSignal = signal;
          await new Promise(resolve => setTimeout(resolve, 500));
        },
      });
    });

    const sendPromise = hookResult!.sendMessage('开始测试');
    expect(hookResult!.isStreaming.value).toBe(true);

    // 销毁作用域
    scope.stop();
    await sendPromise;

    expect(capturedSignal?.aborted).toBe(true);
    expect(hookResult!.isStreaming.value).toBe(false);
  });

  it('应当通过 ReasoningDemuxer 自动流式分离 <think> 思考内容与正文并在正文开始时自动折叠', async () => {
    const { messages, sendMessage } = useAiChat({
      streamHandler: async (_prompt, onChunk) => {
        onChunk('<think>分析中：第一步...');
        onChunk('第二步完成。</think>');
        onChunk('这是正式答复文本。');
      },
    });

    await sendMessage('深度推理测试');

    expect(messages.value.length).toBe(2);
    const assistantMsg = messages.value[1];
    expect(assistantMsg.role).toBe('assistant');
    expect(assistantMsg.reasoning?.text).toBe('分析中：第一步...第二步完成。');
    expect(assistantMsg.reasoning?.collapsed).toBe(true);
    expect(assistantMsg.content).toBe('这是正式答复文本。');
  });

  it('regenerate 应当移除原回复并重新发送对应 prompt', async () => {
    let callCount = 0;
    const { messages, sendMessage, regenerate } = useAiChat({
      streamHandler: async (prompt, onChunk) => {
        callCount++;
        onChunk(`回复${callCount}: ${prompt}`);
      },
    });

    await sendMessage('第一轮提问');
    expect(messages.value.length).toBe(2);
    expect(messages.value[1].content).toBe('回复1: 第一轮提问');

    // 重新生成
    await regenerate();
    expect(messages.value.length).toBe(2);
    expect(messages.value[1].content).toBe('回复2: 第一轮提问');
  });

  it('editMessage 应当更新 user 消息内容并开启新分支重新生成', async () => {
    const { messages, sendMessage, editMessage } = useAiChat({
      streamHandler: async (prompt, onChunk) => {
        onChunk(`答复: ${prompt}`);
      },
    });

    await sendMessage('原始问题');
    expect(messages.value.length).toBe(2);
    expect(messages.value[0].content).toBe('原始问题');
    expect(messages.value[1].content).toBe('答复: 原始问题');

    const userMsgId = messages.value[0].id;
    await editMessage(userMsgId, '已修改的问题');

    expect(messages.value.length).toBe(2);
    expect(messages.value[0].content).toBe('已修改的问题');
    expect(messages.value[1].content).toBe('答复: 已修改的问题');
  });

  it('beforeSend 钩子返回 false 或 allow: false 时阻止发送并触发错误回调', async () => {
    const onError = vi.fn();
    const { messages, sendMessage, error } = useAiChat({
      streamHandler: async (_p, onChunk) => {
        onChunk('不应到达这里');
      },
      beforeSend: content => {
        if (content.includes('机密')) {
          return { allow: false, reason: '包含涉密信息，已触发 DLP 合规阻断' };
        }
        return true;
      },
      onError,
    });

    await sendMessage('这是机密数据');
    expect(messages.value.length).toBe(0);
    expect(error.value?.message).toContain('包含涉密信息');
    expect(onError).toHaveBeenCalled();
  });

  it('beforeSend 钩子支持敏感数据脱敏 sanitizedContent 替换', async () => {
    const { messages, sendMessage } = useAiChat({
      streamHandler: async (prompt, onChunk) => {
        onChunk(`收到脱敏后的输入: ${prompt}`);
      },
      beforeSend: content => {
        return {
          allow: true,
          sanitizedContent: content.replace(/138\d{8}/g, '138****0000'),
        };
      },
    });

    await sendMessage('我的手机号是 13812345678');
    expect(messages.value.length).toBe(2);
    expect(messages.value[0].content).toBe('我的手机号是 138****0000');
    expect(messages.value[1].content).toContain('138****0000');
  });
});
