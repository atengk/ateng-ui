/**
 * @atengk/ai-chat-vue ReasoningDemuxer 流式多路解复用器。
 *
 * 基于有限状态自动机（FSM）流式分离大模型文本流中的思考过程（<think>...</think>）与正文，
 * 同时兼容直接灌入的独立 reasoning_content 分片，精确计算思考耗时并保证极端分块边界不漏字。
 *
 * @author Ateng
 * @since 2026-11-09
 */

export interface DemuxResult {
  /**
   * 当前增量解析出的思考分块。
   */
  reasoningChunk: string;

  /**
   * 当前增量解析出的正文分块。
   */
  contentChunk: string;

  /**
   * 思考状态机当前是否仍处于活跃思考中。
   */
  isThinking: boolean;

  /**
   * 思考过程总耗时（毫秒）。
   */
  elapsedMs: number;
}

export class ReasoningDemuxer {
  private static readonly OPEN_TAG = '<think>';
  private static readonly CLOSE_TAG = '</think>';

  private isThinking: boolean = false;
  private reasoning: string = '';
  private content: string = '';
  private buffer: string = '';

  private startTime: number | null = null;
  private elapsedMs: number = 0;

  /**
   * 输入新的文本流分块并进行流式解复用。
   *
   * @param chunk 文本流分块
   * @returns 增量解析结果
   */
  feed(chunk: string): DemuxResult {
    if (!chunk) {
      return {
        reasoningChunk: '',
        contentChunk: '',
        isThinking: this.isThinking,
        elapsedMs: this.getElapsedMs(),
      };
    }

    let reasoningOut = '';
    let contentOut = '';

    // 将前序挂起的不完整前缀拼入本次分块
    const streamText = this.buffer + chunk;
    this.buffer = '';

    let cursor = 0;
    const len = streamText.length;

    while (cursor < len) {
      if (!this.isThinking) {
        // --- 当前处于正文态（OUTSIDE）---
        const lowerText = streamText.slice(cursor).toLowerCase();
        const openIdx = lowerText.indexOf(ReasoningDemuxer.OPEN_TAG);

        if (openIdx !== -1) {
          // 找到了完整的 <think> 开启标签
          const textBefore = streamText.slice(cursor, cursor + openIdx);
          contentOut += textBefore;
          this.content += textBefore;

          // 开启思考状态
          this.isThinking = true;
          if (this.startTime === null) {
            this.startTime = Date.now();
          }

          cursor += openIdx + ReasoningDemuxer.OPEN_TAG.length;
        } else {
          // 未找到完整开启标签，检查尾部是否存在部分匹配的前缀（如 "<", "<th" 等）
          const remaining = streamText.slice(cursor);
          let matchPrefixLen = 0;

          for (
            let p = Math.min(ReasoningDemuxer.OPEN_TAG.length - 1, remaining.length);
            p > 0;
            p--
          ) {
            const tail = remaining.slice(-p).toLowerCase();
            if (ReasoningDemuxer.OPEN_TAG.startsWith(tail)) {
              matchPrefixLen = p;
              break;
            }
          }

          if (matchPrefixLen > 0) {
            // 尾部有疑似标签前缀，先将前缀之前的正文输出，前缀保留至 buffer
            const textBefore = remaining.slice(0, remaining.length - matchPrefixLen);
            contentOut += textBefore;
            this.content += textBefore;
            this.buffer = remaining.slice(remaining.length - matchPrefixLen);
            cursor = len; // 本分块处理完毕
          } else {
            // 无任何前缀匹配，全量输出为正文
            contentOut += remaining;
            this.content += remaining;
            cursor = len;
          }
        }
      } else {
        // --- 当前处于思考态（INSIDE_THINK）---
        const lowerText = streamText.slice(cursor).toLowerCase();
        const closeIdx = lowerText.indexOf(ReasoningDemuxer.CLOSE_TAG);

        if (closeIdx !== -1) {
          // 找到了完整的 </think> 闭合标签
          const textBefore = streamText.slice(cursor, cursor + closeIdx);
          reasoningOut += textBefore;
          this.reasoning += textBefore;

          // 结束思考状态
          this.isThinking = false;
          if (this.startTime !== null) {
            this.elapsedMs = Math.max(0, Date.now() - this.startTime);
          }

          cursor += closeIdx + ReasoningDemuxer.CLOSE_TAG.length;
        } else {
          // 未找到完整闭合标签，检查尾部是否存在部分匹配的前缀（如 "</", "</th" 等）
          const remaining = streamText.slice(cursor);
          let matchPrefixLen = 0;

          for (
            let p = Math.min(ReasoningDemuxer.CLOSE_TAG.length - 1, remaining.length);
            p > 0;
            p--
          ) {
            const tail = remaining.slice(-p).toLowerCase();
            if (ReasoningDemuxer.CLOSE_TAG.startsWith(tail)) {
              matchPrefixLen = p;
              break;
            }
          }

          if (matchPrefixLen > 0) {
            // 尾部有疑似闭合标签前缀，前缀前的内容作为思考内容输出，前缀保留至 buffer
            const textBefore = remaining.slice(0, remaining.length - matchPrefixLen);
            reasoningOut += textBefore;
            this.reasoning += textBefore;
            this.buffer = remaining.slice(remaining.length - matchPrefixLen);
            cursor = len;
          } else {
            // 无前缀匹配，全量输出为思考内容
            reasoningOut += remaining;
            this.reasoning += remaining;
            cursor = len;
          }
        }
      }
    }

    return {
      reasoningChunk: reasoningOut,
      contentChunk: contentOut,
      isThinking: this.isThinking,
      elapsedMs: this.getElapsedMs(),
    };
  }

  /**
   * 直接灌入独立的思考分块（OpenAI reasoning_content 兼容通道）。
   *
   * @param chunk 思考分块文本
   */
  feedReasoning(chunk: string): void {
    if (!chunk) return;
    if (this.startTime === null) {
      this.startTime = Date.now();
    }
    this.isThinking = true;
    this.reasoning += chunk;
  }

  /**
   * 直接灌入独立的正文分块（OpenAI content 兼容通道）。
   *
   * @param chunk 正文分块文本
   */
  feedContent(chunk: string): void {
    if (!chunk) return;
    if (this.isThinking) {
      this.isThinking = false;
      if (this.startTime !== null && this.elapsedMs === 0) {
        this.elapsedMs = Math.max(0, Date.now() - this.startTime);
      }
    }
    this.content += chunk;
  }

  /**
   * 强制结束流式状态机并清空残余 buffer。
   */
  finish(): void {
    if (this.buffer) {
      if (this.isThinking) {
        this.reasoning += this.buffer;
      } else {
        this.content += this.buffer;
      }
      this.buffer = '';
    }

    if (this.isThinking) {
      this.isThinking = false;
      if (this.startTime !== null && this.elapsedMs === 0) {
        this.elapsedMs = Math.max(0, Date.now() - this.startTime);
      }
    }
  }

  /**
   * 获取累计思考纯文本。
   */
  getReasoning(): string {
    return this.reasoning;
  }

  /**
   * 获取累计正文纯文本。
   */
  getContent(): string {
    return this.content;
  }

  /**
   * 思考状态机当前是否正在活跃思考中。
   */
  isThinkingActive(): boolean {
    return this.isThinking;
  }

  /**
   * 获取思考总耗时（毫秒）。
   */
  getElapsedMs(): number {
    if (this.elapsedMs > 0) {
      return this.elapsedMs;
    }
    if (this.startTime !== null) {
      return Math.max(0, Date.now() - this.startTime);
    }
    return 0;
  }
}
