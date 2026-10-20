/**
 * 增量式 Server-Sent Events (SSE) 文本流解析器。
 *
 * 遵循 W3C SSE 协议规范，具备抗网络分包撕裂、多行 data 换行拼接、
 * 注释与心跳过滤以及事件元数据提取能力。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import type { SseEvent } from './types';

/**
 * 状态化 SSE 文本分块解析器。
 */
export class SseParser {
  private buffer = '';
  private currentEvent: Partial<SseEvent> = {};
  private dataBuffer: string[] = [];

  /**
   * 推入新接收到的文本分块并解析已闭环的 SSE 事件列表。
   *
   * @param chunk 解码后的文本片段
   * @returns 本批次解析出的就绪事件集合
   */
  feed(chunk: string): SseEvent[] {
    this.buffer += chunk;
    const events: SseEvent[] = [];
    const lines = this.buffer.split(/\r\n|\r|\n/);

    // 最后一行若未以换行符结尾，说明尚未完整，保留在 buffer 中继续等待
    this.buffer = lines.pop() ?? '';

    for (const line of lines) {
      // 1. 空行标志当前事件分发边界
      if (line === '') {
        if (this.dataBuffer.length > 0 || this.currentEvent.event || this.currentEvent.id) {
          events.push({
            event: this.currentEvent.event ?? 'message',
            data: this.dataBuffer.join('\n'),
            id: this.currentEvent.id,
            retry: this.currentEvent.retry,
          });
          this.currentEvent = {};
          this.dataBuffer = [];
        }
        continue;
      }

      // 2. 忽略以冒号开头的注释行与心跳行
      if (line.startsWith(':')) {
        continue;
      }

      // 3. 字段与值提取
      const colonIndex = line.indexOf(':');
      let field: string;
      let value: string;

      if (colonIndex === -1) {
        field = line;
        value = '';
      } else {
        field = line.slice(0, colonIndex);
        value = line.slice(colonIndex + 1);
        if (value.startsWith(' ')) {
          value = value.slice(1);
        }
      }

      // 4. 标准字段归集
      if (field === 'data') {
        this.dataBuffer.push(value);
      } else if (field === 'event') {
        this.currentEvent.event = value;
      } else if (field === 'id') {
        this.currentEvent.id = value;
      } else if (field === 'retry') {
        const retryVal = parseInt(value, 10);
        if (!isNaN(retryVal)) {
          this.currentEvent.retry = retryVal;
        }
      }
    }

    return events;
  }

  /**
   * 刷新并清空解析器内部残余缓冲区。
   *
   * @returns 残存数据所构成的事件集合
   */
  flush(): SseEvent[] {
    if (!this.buffer.trim()) {
      this.reset();
      return [];
    }
    const events = this.feed('\n\n');
    this.reset();
    return events;
  }

  /**
   * 重置解析器内部状态。
   */
  reset(): void {
    this.buffer = '';
    this.currentEvent = {};
    this.dataBuffer = [];
  }
}
