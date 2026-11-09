/**
 * @atengk/ai-chat-vue ToolCallDemuxer 流式工具调用解复用器单测。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { describe, it, expect } from 'vitest';
import { ToolCallDemuxer } from '../src/demux/ToolCallDemuxer';

describe('ToolCallDemuxer', () => {
  it('应当对纯普通文本保持透明直通，不截留', () => {
    const demuxer = new ToolCallDemuxer();
    const r1 = demuxer.feed('你好，');
    const r2 = demuxer.feed('世界！');
    demuxer.finish();

    expect(r1.textChunk).toBe('你好，');
    expect(r2.textChunk).toBe('世界！');
    expect(r1.toolCalls).toHaveLength(0);
    expect(r2.toolCalls).toHaveLength(0);
    expect(demuxer.getToolCalls()).toHaveLength(0);
  });

  it('应当流式分离完整的 <tool_call> 标签并将调用载荷结构化提取', () => {
    const demuxer = new ToolCallDemuxer();
    const payloadJson = JSON.stringify({
      callId: 'call_1',
      name: 'get_weather',
      arguments: { city: '北京' },
    });

    const res = demuxer.feed(`前置文本。\n<tool_call>${payloadJson}</tool_call>\n后置文本。`);
    demuxer.finish();

    expect(res.textChunk).toBe('前置文本。\n\n后置文本。');
    expect(res.toolCalls).toHaveLength(1);
    expect(res.toolCalls[0].callId).toBe('call_1');
    expect(res.toolCalls[0].name).toBe('get_weather');
    expect(res.toolCalls[0].arguments).toEqual({ city: '北京' });
    expect(res.toolCalls[0].state).toBe('calling');
  });

  it('应当对抗极端跨分块边界（标签切碎、JSON 拆包）并精确解析', () => {
    const demuxer = new ToolCallDemuxer();
    const chunks = [
      '正在为您查询：',
      '<to',
      'ol_call',
      '>\n{"name": "get_weather",',
      ' "arguments": {"city":',
      ' "上海"}}',
      '\n</tool_',
      'call>',
      '\n已触发查询。',
    ];

    const emittedToolCalls: unknown[] = [];
    let fullText = '';

    for (const chunk of chunks) {
      const { textChunk, toolCalls } = demuxer.feed(chunk);
      fullText += textChunk;
      if (toolCalls.length > 0) {
        emittedToolCalls.push(...toolCalls);
      }
    }
    const endRes = demuxer.finish();
    fullText += endRes.textChunk;

    expect(fullText.trim()).toBe('正在为您查询：\n已触发查询。');
    expect(emittedToolCalls).toHaveLength(1);
    const call = emittedToolCalls[0] as { name: string; arguments: { city: string } };
    expect(call.name).toBe('get_weather');
    expect(call.arguments).toEqual({ city: '上海' });
  });

  it('应当支持同一个流中多次工具调用解析', () => {
    const demuxer = new ToolCallDemuxer();
    const c1 = `<tool_call>{"name":"tool_a","arguments":{"x":1}}</tool_call>`;
    const c2 = `中间正文`;
    const c3 = `<tool_call>{"name":"tool_b","arguments":{"y":2}}</tool_call>`;

    const r1 = demuxer.feed(c1);
    const r2 = demuxer.feed(c2);
    const r3 = demuxer.feed(c3);
    demuxer.finish();

    expect(r1.toolCalls).toHaveLength(1);
    expect(r1.toolCalls[0].name).toBe('tool_a');
    expect(r2.textChunk).toBe('中间正文');
    expect(r3.toolCalls).toHaveLength(1);
    expect(r3.toolCalls[0].name).toBe('tool_b');
    expect(demuxer.getToolCalls()).toHaveLength(2);
  });

  it('应当对损坏的非法 JSON 具备容错防崩，并在无法闭合时安全兜底', () => {
    const demuxer = new ToolCallDemuxer();
    demuxer.feed('<tool_call>{invalid_json</tool_call>');
    demuxer.finish();

    // 格式损坏不应崩溃，解析失败时不应产生无效 toolCall
    expect(demuxer.getToolCalls()).toHaveLength(0);
  });
});
