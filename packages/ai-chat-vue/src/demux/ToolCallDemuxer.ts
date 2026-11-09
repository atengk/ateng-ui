/**
 * @atengk/ai-chat-vue ToolCallDemuxer 流式工具调用解复用器。
 *
 * 基于有限状态自动机（FSM）从大模型文本流中抽离 <tool_call>...</tool_call> 标签，
 * 结构化解析工具调用名称与参数入参，从文本正文中剔除协议标签以保证排版纯净度。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import type { ToolCallPayload } from '../types';

/**
 * 流式解复用分块输出。
 */
export interface ToolDemuxResult {
  /**
   * 剥离工具调用标签后的正文增量分块。
   */
  textChunk: string;

  /**
   * 本次分块中刚刚完成闭合并提取出的工具调用载荷列表。
   */
  toolCalls: ToolCallPayload[];
}

/**
 * 生成带前缀的唯一工具调用标识。
 */
function createCallId(): string {
  return `call_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export class ToolCallDemuxer {
  private static readonly OPEN_TAG = '<tool_call>';
  private static readonly CLOSE_TAG = '</tool_call>';

  private insideToolCall: boolean = false;
  private toolCallBuffer: string = '';
  private buffer: string = '';
  private toolCalls: ToolCallPayload[] = [];
  private content: string = '';

  /**
   * 输入流式文本分块并执行多路解复用。
   *
   * @param chunk 文本流分块
   * @returns 正文增量分块与解析就绪的工具调用列表
   */
  feed(chunk: string): ToolDemuxResult {
    if (!chunk) {
      return {
        textChunk: '',
        toolCalls: [],
      };
    }

    let textOut = '';
    const newToolCalls: ToolCallPayload[] = [];

    const streamText = this.buffer + chunk;
    this.buffer = '';

    let cursor = 0;
    const len = streamText.length;

    while (cursor < len) {
      if (!this.insideToolCall) {
        // --- 正文处理态 ---
        const lowerText = streamText.slice(cursor).toLowerCase();
        const openIdx = lowerText.indexOf(ToolCallDemuxer.OPEN_TAG);

        if (openIdx !== -1) {
          // 命中完整的 <tool_call> 开启标签
          const textBefore = streamText.slice(cursor, cursor + openIdx);
          textOut += textBefore;
          this.content += textBefore;

          this.insideToolCall = true;
          this.toolCallBuffer = '';
          cursor += openIdx + ToolCallDemuxer.OPEN_TAG.length;
        } else {
          // 未命中完整标签，检查尾部是否存在疑似前缀
          const remaining = streamText.slice(cursor);
          let matchPrefixLen = 0;

          for (
            let p = Math.min(ToolCallDemuxer.OPEN_TAG.length - 1, remaining.length);
            p > 0;
            p--
          ) {
            const tail = remaining.slice(-p).toLowerCase();
            if (ToolCallDemuxer.OPEN_TAG.startsWith(tail)) {
              matchPrefixLen = p;
              break;
            }
          }

          if (matchPrefixLen > 0) {
            const textBefore = remaining.slice(0, remaining.length - matchPrefixLen);
            textOut += textBefore;
            this.content += textBefore;
            this.buffer = remaining.slice(remaining.length - matchPrefixLen);
            cursor = len;
          } else {
            textOut += remaining;
            this.content += remaining;
            cursor = len;
          }
        }
      } else {
        // --- 工具调用标签内部态 ---
        const lowerText = streamText.slice(cursor).toLowerCase();
        const closeIdx = lowerText.indexOf(ToolCallDemuxer.CLOSE_TAG);

        if (closeIdx !== -1) {
          // 命中闭合标签 </tool_call>
          const chunkBefore = streamText.slice(cursor, cursor + closeIdx);
          this.toolCallBuffer += chunkBefore;
          this.insideToolCall = false;

          const parsed = this.parseToolCall(this.toolCallBuffer);
          if (parsed) {
            this.toolCalls.push(parsed);
            newToolCalls.push(parsed);
          }
          this.toolCallBuffer = '';
          cursor += closeIdx + ToolCallDemuxer.CLOSE_TAG.length;
        } else {
          // 仍在标签内部，检查尾部是否存在闭合标签的前缀
          const remaining = streamText.slice(cursor);
          let matchPrefixLen = 0;

          for (
            let p = Math.min(ToolCallDemuxer.CLOSE_TAG.length - 1, remaining.length);
            p > 0;
            p--
          ) {
            const tail = remaining.slice(-p).toLowerCase();
            if (ToolCallDemuxer.CLOSE_TAG.startsWith(tail)) {
              matchPrefixLen = p;
              break;
            }
          }

          if (matchPrefixLen > 0) {
            const textBefore = remaining.slice(0, remaining.length - matchPrefixLen);
            this.toolCallBuffer += textBefore;
            this.buffer = remaining.slice(remaining.length - matchPrefixLen);
            cursor = len;
          } else {
            this.toolCallBuffer += remaining;
            cursor = len;
          }
        }
      }
    }

    return {
      textChunk: textOut,
      toolCalls: newToolCalls,
    };
  }

  /**
   * 尝试将字符串解析为 ToolCallPayload。
   */
  private parseToolCall(raw: string): ToolCallPayload | null {
    const trimmed = raw.trim();
    if (!trimmed) {
      return null;
    }

    try {
      const json = JSON.parse(trimmed) as Record<string, unknown>;
      if (!json || typeof json !== 'object' || !json.name) {
        return null;
      }

      const args = json.arguments ?? json.args ?? {};
      const callId =
        typeof json.callId === 'string' && json.callId
          ? json.callId
          : typeof json.id === 'string' && json.id
            ? json.id
            : createCallId();

      return {
        callId,
        name: String(json.name),
        arguments:
          typeof args === 'object' && args !== null ? (args as Record<string, unknown>) : {},
        state: 'calling',
        startedAt: Date.now(),
      };
    } catch {
      return null;
    }
  }

  /**
   * 结束流式状态机并清空残余缓冲区。
   */
  finish(): ToolDemuxResult {
    let textOut = '';
    const newToolCalls: ToolCallPayload[] = [];

    if (this.buffer) {
      if (this.insideToolCall) {
        this.toolCallBuffer += this.buffer;
      } else {
        textOut += this.buffer;
        this.content += this.buffer;
      }
      this.buffer = '';
    }

    // 若流式已结束但未闭合标签，尝试解析可能完整的 toolCallBuffer
    if (this.insideToolCall && this.toolCallBuffer) {
      const parsed = this.parseToolCall(this.toolCallBuffer);
      if (parsed) {
        this.toolCalls.push(parsed);
        newToolCalls.push(parsed);
      } else {
        // 无法解析为工具调用则退回为正文
        textOut += `<tool_call>${this.toolCallBuffer}`;
        this.content += textOut;
      }
      this.toolCallBuffer = '';
      this.insideToolCall = false;
    }

    return {
      textChunk: textOut,
      toolCalls: newToolCalls,
    };
  }

  /**
   * 获取累计已成功解析出的所有工具调用。
   */
  getToolCalls(): ToolCallPayload[] {
    return this.toolCalls;
  }

  /**
   * 获取累计正文纯文本。
   */
  getContent(): string {
    return this.content;
  }
}
