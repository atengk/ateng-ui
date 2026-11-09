/**
 * @atengk/ai-chat-vue useAiChat 工具调用与人机协同审批 (HITL) 专项单测。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { describe, it, expect, vi } from 'vitest';
import { useAiChat } from '../src/composables/useAiChat';
import type { ToolDefinition } from '../src/types';

describe('useAiChat - 工具调用与人机协同审批 (HITL)', () => {
  it('应当在 mode: auto 下自动执行工具并将结果以 role: tool 消息回喂流式引擎', async () => {
    const weatherHandler = vi.fn().mockResolvedValue({
      city: '北京',
      temp: '22°C',
      condition: '晴',
    });

    const tools: ToolDefinition[] = [
      {
        name: 'get_weather',
        description: '查询实时天气',
        mode: 'auto',
        execute: weatherHandler,
      },
    ];

    const streamHandler = vi.fn(async (prompt, onChunk) => {
      if (prompt.includes('北京天气')) {
        // 第一轮：模型返回工具调用指令
        onChunk('<tool_call>{"name":"get_weather","arguments":{"city":"北京"}}</tool_call>');
      } else {
        // 第二轮（收到工具结果后继续生成）
        onChunk('根据查询结果，北京今天晴天，气温 22°C。');
      }
    });

    const { messages, sendMessage } = useAiChat({
      tools,
      streamHandler,
    });

    await sendMessage('查询北京天气');

    // 验证工具函数被自动调用且参数正确
    expect(weatherHandler).toHaveBeenCalledTimes(1);
    expect(weatherHandler).toHaveBeenCalledWith({ city: '北京' });

    // 验证消息流转顺序：
    // 1. user
    // 2. assistant (含 toolCalls)
    // 3. tool (含工具结果)
    // 4. assistant (最终综合答复)
    expect(messages.value.length).toBeGreaterThanOrEqual(4);
    expect(messages.value[0].role).toBe('user');
    expect(messages.value[1].role).toBe('assistant');
    expect(messages.value[1].toolCalls).toHaveLength(1);
    expect(messages.value[1].toolCalls![0].state).toBe('success');
    expect(messages.value[1].toolCalls![0].result).toEqual({
      city: '北京',
      temp: '22°C',
      condition: '晴',
    });

    expect(messages.value[2].role).toBe('tool');
    expect(messages.value[2].content).toContain('22°C');

    expect(messages.value[3].role).toBe('assistant');
    expect(messages.value[3].content).toContain('气温 22°C');
  });

  it('应当在 mode: confirm 下挂起流式等待人工审批，并在 approveToolCall 后触发执行与回喂', async () => {
    const dropTableHandler = vi.fn().mockResolvedValue({ status: 'dropped', table: 'logs' });

    const tools: ToolDefinition[] = [
      {
        name: 'drop_database_table',
        description: '删库跑路敏感高危操作',
        mode: 'confirm',
        execute: dropTableHandler,
      },
    ];

    const streamHandler = vi.fn(async (prompt, onChunk) => {
      if (prompt.includes('删除日志表')) {
        onChunk(
          '准备执行高危操作：\n<tool_call>{"callId":"danger_1","name":"drop_database_table","arguments":{"table":"logs"}}</tool_call>',
        );
      } else {
        onChunk('数据表 logs 已经确认删除完毕。');
      }
    });

    const { messages, isStreaming, sendMessage, approveToolCall } = useAiChat({
      tools,
      streamHandler,
    });

    await sendMessage('请帮我删除日志表');

    // 此时第一轮结束，工具应处于 awaiting_approval 态，流式挂起就绪
    expect(isStreaming.value).toBe(false);
    expect(dropTableHandler).not.toHaveBeenCalled();

    const assistantMsg = messages.value[1];
    expect(assistantMsg.toolCalls).toHaveLength(1);
    const toolCall = assistantMsg.toolCalls![0];
    expect(toolCall.state).toBe('awaiting_approval');
    expect(toolCall.requireConfirm).toBe(true);

    // 用户在 UI 点击“允许执行”
    await approveToolCall('danger_1');

    // 验证此时工具已被执行
    expect(dropTableHandler).toHaveBeenCalledTimes(1);
    expect(dropTableHandler).toHaveBeenCalledWith({ table: 'logs' });
    expect(toolCall.state).toBe('success');

    // 验证产生了 tool 消息以及下一轮 assistant 回复
    expect(messages.value.some(m => m.role === 'tool')).toBe(true);
    expect(messages.value[messages.value.length - 1].content).toContain('已经确认删除完毕');
  });

  it('应当在 mode: confirm 下支持 rejectToolCall 驳回审批，并记录理由回传模型', async () => {
    const rebootHandler = vi.fn().mockResolvedValue({ status: 'rebooted' });

    const tools: ToolDefinition[] = [
      {
        name: 'reboot_server',
        description: '重启生产服务器',
        mode: 'confirm',
        execute: rebootHandler,
      },
    ];

    const streamHandler = vi.fn(async (prompt, onChunk) => {
      if (prompt === '重启服务器') {
        onChunk(
          '<tool_call>{"callId":"call_rb","name":"reboot_server","arguments":{}}</tool_call>',
        );
      } else {
        onChunk('收到您的拒批要求，重启已被取消。');
      }
    });

    const { messages, sendMessage, rejectToolCall } = useAiChat({
      tools,
      streamHandler,
    });

    await sendMessage('重启服务器');

    const assistantMsg = messages.value[1];
    const toolCall = assistantMsg.toolCalls![0];
    expect(toolCall.state).toBe('awaiting_approval');

    // 用户驳回
    await rejectToolCall('call_rb', '高峰期禁止重启');

    // 验证未调用 handler
    expect(rebootHandler).not.toHaveBeenCalled();
    expect(toolCall.state).toBe('rejected');
    expect(toolCall.rejectionReason).toBe('高峰期禁止重启');

    // 验证回传了 tool 消息与下一轮响应
    const toolMsg = messages.value.find(m => m.role === 'tool');
    expect(toolMsg?.content).toContain('高峰期禁止重启');
    expect(messages.value[messages.value.length - 1].content).toContain('重启已被取消');
  });

  it('应当对未注册的工具调用安全报错并标记 state: error', async () => {
    const streamHandler = vi.fn(async (_prompt, onChunk) => {
      onChunk('<tool_call>{"name":"unknown_tool","arguments":{}}</tool_call>');
    });

    const { messages, sendMessage } = useAiChat({
      tools: [],
      streamHandler,
    });

    await sendMessage('执行未注册的工具');

    const assistantMsg = messages.value[1];
    expect(assistantMsg.toolCalls).toHaveLength(1);
    expect(assistantMsg.toolCalls![0].state).toBe('error');
    expect(assistantMsg.toolCalls![0].error).toContain('未找到注册的工具');
  });
});
