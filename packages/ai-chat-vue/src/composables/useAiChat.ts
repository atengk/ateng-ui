/**
 * @atengk/ai-chat-vue 无头会话状态机 useAiChat 实现。
 *
 * 桥接 @atengk/core 的 StreamClient 与 @atengk/vue 的流式状态机制，
 * 管理多轮消息链、流式增量追加与在途中断，并支持全双工 Function Calling /
 * 工具调用自动调度与人机协同审批 (HITL)，以及全局 Artifact 产物工作台总线。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref, getCurrentScope, onScopeDispose, toValue, type Ref } from 'vue';
import { streamClient } from '@atengk/core';
import { ReasoningDemuxer } from '../demux/ReasoningDemuxer';
import { ToolCallDemuxer } from '../demux/ToolCallDemuxer';
import { ArtifactDemuxer } from '../demux/ArtifactDemuxer';
import { RenderThrottler } from '../throttler/RenderThrottler';
import type {
  ArtifactPayload,
  ChatMessage,
  SendMessageOptions,
  ToolCallPayload,
  ToolDefinition,
  UseAiChatOptions,
  UseAiChatReturn,
} from '../types';

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

  // 全局 Artifact 产物总线状态
  const artifacts: Ref<ArtifactPayload[]> = ref([]);
  const activeArtifact: Ref<ArtifactPayload | null> = ref(null);
  const activeArtifactVersion: Ref<number> = ref(1);
  const isArtifactSidebarOpen: Ref<boolean> = ref(false);
  const globalArtifactMap = new Map<string, ArtifactPayload>();

  // 工具注册表缓存
  const toolRegistry = new Map<string, ToolDefinition>();
  if (options.tools && options.tools.length > 0) {
    for (const tool of options.tools) {
      toolRegistry.set(tool.name, tool);
    }
  }

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
   * 清空所有消息历史与产物状态并重置。
   */
  const clearMessages = (): void => {
    abort();
    messages.value = [];
    artifacts.value = [];
    globalArtifactMap.clear();
    activeArtifact.value = null;
    activeArtifactVersion.value = 1;
    isArtifactSidebarOpen.value = false;
    error.value = null;
  };

  /**
   * 打开指定 identifier 的产物并唤起侧边栏工作台。
   */
  const openArtifact = (identifier: string, version?: number): void => {
    const found = artifacts.value.find(art => art.identifier === identifier);
    if (!found) return;

    activeArtifact.value = found;
    if (version !== undefined) {
      activeArtifactVersion.value = version;
    } else {
      const lastVersion = found.versions[found.versions.length - 1];
      activeArtifactVersion.value = lastVersion ? lastVersion.version : 1;
    }
    isArtifactSidebarOpen.value = true;
  };

  /**
   * 关闭当前打开的 Artifact 侧边栏工作台。
   */
  const closeArtifact = (): void => {
    isArtifactSidebarOpen.value = false;
  };

  /**
   * 切换当前激活产物的版本切片。
   */
  const selectArtifactVersion = (version: number): void => {
    activeArtifactVersion.value = version;
  };

  /**
   * 同步更新全局产物总线列表。
   */
  const syncGlobalArtifacts = (incomingArtifacts: ArtifactPayload[]): void => {
    for (const incoming of incomingArtifacts) {
      const idx = artifacts.value.findIndex(a => a.identifier === incoming.identifier);
      if (idx !== -1) {
        artifacts.value[idx] = incoming;
      } else {
        artifacts.value.push(incoming);
      }

      // 若当前正在查看该产物，自动同步至最新引用
      if (activeArtifact.value && activeArtifact.value.identifier === incoming.identifier) {
        activeArtifact.value = incoming;
        const incomingLast = incoming.versions[incoming.versions.length - 1];
        if (incomingLast) {
          activeArtifactVersion.value = incomingLast.version;
        }
      }
    }
  };

  /**
   * 执行单个工具并在完成后回喂角色消息与调度下一轮对话。
   */
  const executeAndDispatchTool = async (
    toolCall: ToolCallPayload,
    toolDef: ToolDefinition,
    sendOptions: SendMessageOptions = {},
  ): Promise<void> => {
    toolCall.state = 'executing';
    await options.onToolCall?.(toolCall);

    try {
      const result = await toolDef.execute(toolCall.arguments);
      toolCall.state = 'success';
      toolCall.result = result;
      toolCall.finishedAt = Date.now();

      const toolMessage: ChatMessage = {
        id: createMessageId(),
        role: 'tool',
        status: 'completed',
        content:
          typeof result === 'object' && result !== null
            ? JSON.stringify(result)
            : String(result ?? ''),
        toolCalls: [toolCall],
        createdAt: Date.now(),
      };
      messages.value.push(toolMessage);

      // 回喂大模型开启下一轮生成
      await runStreamTurn(toolMessage.content, sendOptions);
    } catch (err) {
      const errStr = err instanceof Error ? err.message : String(err);
      toolCall.state = 'error';
      toolCall.error = errStr;
      toolCall.finishedAt = Date.now();

      const toolMessage: ChatMessage = {
        id: createMessageId(),
        role: 'tool',
        status: 'error',
        content: `[工具 ${toolCall.name} 执行失败]: ${errStr}`,
        toolCalls: [toolCall],
        createdAt: Date.now(),
      };
      messages.value.push(toolMessage);

      await runStreamTurn(toolMessage.content, sendOptions);
    }
  };

  /**
   * 核心流式驱动执行单元。
   */
  const runStreamTurn = async (
    inputPrompt: string,
    sendOptions: SendMessageOptions = {},
  ): Promise<void> => {
    // 助手占位消息
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
    const toolDemuxer = new ToolCallDemuxer();
    const artifactDemuxer = new ArtifactDemuxer(globalArtifactMap);

    const throttler = new RenderThrottler({
      typewriterSpeed: toValue(options.typewriterSpeed) ?? 0,
      onUpdate: fullText => {
        assistantMessage.content = fullText;
      },
    });
    activeThrottler = throttler;

    const handleChunk = (chunk: string): void => {
      // 1. 思考链流式多路解复用
      const demuxRes = demuxer.feed(chunk);

      if (demuxRes.reasoningChunk || demuxer.isThinkingActive()) {
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

      // 2. 正文流与工具调用标签流式解复用
      if (demuxRes.contentChunk) {
        const toolRes = toolDemuxer.feed(demuxRes.contentChunk);

        if (toolRes.toolCalls.length > 0) {
          if (!assistantMessage.toolCalls) {
            assistantMessage.toolCalls = [];
          }
          assistantMessage.toolCalls.push(...toolRes.toolCalls);
        }

        // 3. Artifact 产物标签流式解复用
        if (toolRes.textChunk) {
          const artRes = artifactDemuxer.feed(toolRes.textChunk);

          if (artRes.artifacts.length > 0) {
            if (!assistantMessage.artifacts) {
              assistantMessage.artifacts = [];
            }
            for (const incomingArt of artRes.artifacts) {
              const idx = assistantMessage.artifacts.findIndex(
                a => a.identifier === incomingArt.identifier,
              );
              if (idx !== -1) {
                assistantMessage.artifacts[idx] = incomingArt;
              } else {
                assistantMessage.artifacts.push(incomingArt);
              }
            }
            syncGlobalArtifacts(artRes.artifacts);
          }

          if (artRes.textChunk) {
            throttler.feed(artRes.textChunk);
            if (assistantMessage.reasoning && !assistantMessage.reasoning.collapsed) {
              assistantMessage.reasoning.collapsed = true;
              assistantMessage.reasoning.isStreaming = false;
            }
          }
        }
      }
    };

    const pendingAutoTools: { toolCall: ToolCallPayload; toolDef: ToolDefinition }[] = [];

    try {
      if (options.streamHandler) {
        await options.streamHandler(inputPrompt, handleChunk, controller.signal);
      } else if (options.streamUrl) {
        await streamClient.subscribe(options.streamUrl, {
          method: 'POST',
          headers: sendOptions.headers,
          body: {
            prompt: inputPrompt,
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
        assistantMessage.content = '服务端未配置 streamUrl 或 streamHandler。';
      }

      throttler.finish();
      demuxer.finish();
      const toolFinishRes = toolDemuxer.finish();

      if (toolFinishRes.toolCalls.length > 0) {
        if (!assistantMessage.toolCalls) {
          assistantMessage.toolCalls = [];
        }
        assistantMessage.toolCalls.push(...toolFinishRes.toolCalls);
      }

      const artFinishRes = artifactDemuxer.finish();
      if (artFinishRes.artifacts.length > 0) {
        if (!assistantMessage.artifacts) {
          assistantMessage.artifacts = [];
        }
        for (const incomingArt of artFinishRes.artifacts) {
          const idx = assistantMessage.artifacts.findIndex(
            a => a.identifier === incomingArt.identifier,
          );
          if (idx !== -1) {
            assistantMessage.artifacts[idx] = incomingArt;
          } else {
            assistantMessage.artifacts.push(incomingArt);
          }
        }
        syncGlobalArtifacts(artFinishRes.artifacts);
      }

      const residualText = (toolFinishRes.textChunk || '') + (artFinishRes.textChunk || '');
      if (residualText) {
        throttler.feed(residualText);
        throttler.finish();
      }

      if (assistantMessage.reasoning) {
        assistantMessage.reasoning.text = demuxer.getReasoning();
        assistantMessage.reasoning.elapsedMs = demuxer.getElapsedMs();
        assistantMessage.reasoning.isStreaming = false;
      }
      assistantMessage.content =
        throttler.getRenderedText() || artifactDemuxer.getContent() || toolDemuxer.getContent();
      assistantMessage.status = 'completed';

      // 4. 校验并调度解析出的工具调用
      if (assistantMessage.toolCalls && assistantMessage.toolCalls.length > 0) {
        for (const tc of assistantMessage.toolCalls) {
          if (tc.state === 'calling') {
            const toolDef = toolRegistry.get(tc.name);
            if (!toolDef) {
              tc.state = 'error';
              tc.error = `未找到注册的工具: ${tc.name}`;
              tc.finishedAt = Date.now();
            } else {
              const mode = toolDef.mode ?? 'auto';
              if (mode === 'confirm') {
                tc.state = 'awaiting_approval';
                tc.requireConfirm = true;
              } else {
                pendingAutoTools.push({ toolCall: tc, toolDef });
              }
            }
          }
        }
      }

      options.onFinish?.(assistantMessage);
    } catch (err) {
      throttler.finish();
      demuxer.finish();
      const toolFinishRes = toolDemuxer.finish();
      if (toolFinishRes.toolCalls.length > 0) {
        if (!assistantMessage.toolCalls) {
          assistantMessage.toolCalls = [];
        }
        assistantMessage.toolCalls.push(...toolFinishRes.toolCalls);
      }

      const artFinishRes = artifactDemuxer.finish();
      if (artFinishRes.artifacts.length > 0) {
        if (!assistantMessage.artifacts) {
          assistantMessage.artifacts = [];
        }
        for (const incomingArt of artFinishRes.artifacts) {
          const idx = assistantMessage.artifacts.findIndex(
            a => a.identifier === incomingArt.identifier,
          );
          if (idx !== -1) {
            assistantMessage.artifacts[idx] = incomingArt;
          } else {
            assistantMessage.artifacts.push(incomingArt);
          }
        }
        syncGlobalArtifacts(artFinishRes.artifacts);
      }

      if (assistantMessage.reasoning) {
        assistantMessage.reasoning.text = demuxer.getReasoning();
        assistantMessage.reasoning.elapsedMs = demuxer.getElapsedMs();
        assistantMessage.reasoning.isStreaming = false;
      }
      assistantMessage.content =
        throttler.getRenderedText() || artifactDemuxer.getContent() || toolDemuxer.getContent();

      if (isAbortError(err)) {
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

    // 5. 若有等待自动执行的工具，顺次触发执行
    for (const item of pendingAutoTools) {
      await executeAndDispatchTool(item.toolCall, item.toolDef, sendOptions);
    }
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

    // 2. 触发流式交互回合
    await runStreamTurn(trimmed, sendOptions);
  };

  /**
   * 批准并执行处于 awaiting_approval 挂起态的工具调用 (HITL)。
   */
  const approveToolCall = async (callId: string): Promise<void> => {
    let targetToolCall: ToolCallPayload | null = null;

    for (const msg of messages.value) {
      if (msg.toolCalls) {
        const found = msg.toolCalls.find(tc => tc.callId === callId);
        if (found) {
          targetToolCall = found;
          break;
        }
      }
    }

    if (!targetToolCall || targetToolCall.state !== 'awaiting_approval') {
      return;
    }

    const toolDef = toolRegistry.get(targetToolCall.name);
    if (!toolDef) {
      targetToolCall.state = 'error';
      targetToolCall.error = `未找到注册的工具: ${targetToolCall.name}`;
      return;
    }

    await executeAndDispatchTool(targetToolCall, toolDef);
  };

  /**
   * 拒绝处于 awaiting_approval 挂起态的工具调用，并提供拒批原因 (HITL)。
   */
  const rejectToolCall = async (callId: string, reason?: string): Promise<void> => {
    let targetToolCall: ToolCallPayload | null = null;

    for (const msg of messages.value) {
      if (msg.toolCalls) {
        const found = msg.toolCalls.find(tc => tc.callId === callId);
        if (found) {
          targetToolCall = found;
          break;
        }
      }
    }

    if (!targetToolCall || targetToolCall.state !== 'awaiting_approval') {
      return;
    }

    targetToolCall.state = 'rejected';
    targetToolCall.rejectionReason = reason || '用户拒绝执行该操作';
    targetToolCall.finishedAt = Date.now();

    const toolMessage: ChatMessage = {
      id: createMessageId(),
      role: 'tool',
      status: 'completed',
      content: `[用户已拒绝执行工具 ${targetToolCall.name}]: ${targetToolCall.rejectionReason}`,
      toolCalls: [targetToolCall],
      createdAt: Date.now(),
    };
    messages.value.push(toolMessage);

    await runStreamTurn(toolMessage.content);
  };

  /**
   * 重新生成指定消息或上一轮对话。
   *
   * @param messageId 目标消息标识符。若省略则针对最新一条回复重新生成
   */
  const regenerate = async (messageId?: string): Promise<void> => {
    if (isStreaming.value) {
      abort();
    }
    if (messages.value.length === 0) {
      return;
    }

    let targetIndex = -1;
    if (messageId) {
      targetIndex = messages.value.findIndex(m => m.id === messageId);
    } else {
      targetIndex = messages.value.length - 1;
    }

    if (targetIndex === -1) {
      return;
    }

    const targetMsg = messages.value[targetIndex];
    if (!targetMsg) {
      return;
    }

    let promptToRun = '';
    let sendOpts: SendMessageOptions = {};

    if (targetMsg.role === 'assistant') {
      let userIndex = -1;
      for (let i = targetIndex - 1; i >= 0; i--) {
        const prev = messages.value[i];
        if (prev && prev.role === 'user') {
          userIndex = i;
          break;
        }
      }
      if (userIndex === -1) {
        return;
      }
      const userMsg = messages.value[userIndex];
      if (!userMsg) {
        return;
      }
      promptToRun = userMsg.content;
      sendOpts = { attachments: userMsg.attachments };
      // 截断目标 assistant 消息及其后续的所有消息
      messages.value.splice(targetIndex);
    } else if (targetMsg.role === 'user') {
      promptToRun = targetMsg.content;
      sendOpts = { attachments: targetMsg.attachments };
      // 截断该 user 消息之后的所有消息
      messages.value.splice(targetIndex + 1);
    } else {
      return;
    }

    await runStreamTurn(promptToRun, sendOpts);
  };

  /**
   * 原位编辑指定用户消息并重新触发流式分支。
   *
   * @param messageId 目标用户消息标识符
   * @param newContent 修改后的新提问文本
   */
  const editMessage = async (messageId: string, newContent: string): Promise<void> => {
    const trimmed = newContent.trim();
    if (!trimmed) {
      return;
    }
    if (isStreaming.value) {
      abort();
    }

    const targetIndex = messages.value.findIndex(m => m.id === messageId);
    if (targetIndex === -1) {
      return;
    }

    const targetMsg = messages.value[targetIndex];
    if (!targetMsg || targetMsg.role !== 'user') {
      return;
    }

    targetMsg.content = trimmed;
    // 截断该消息之后的所有历史分支
    messages.value.splice(targetIndex + 1);

    await runStreamTurn(trimmed, { attachments: targetMsg.attachments });
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
    approveToolCall,
    rejectToolCall,
    regenerate,
    editMessage,
    artifacts,
    activeArtifact,
    activeArtifactVersion,
    isArtifactSidebarOpen,
    openArtifact,
    closeArtifact,
    selectArtifactVersion,
  };
}
