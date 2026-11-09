/**
 * @atengk/ai-chat-vue ReasoningDemuxer 思考链解复用状态机测试。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReasoningDemuxer } from '../src/demux/ReasoningDemuxer';

describe('ReasoningDemuxer', () => {
  let demuxer: ReasoningDemuxer;

  beforeEach(() => {
    demuxer = new ReasoningDemuxer();
  });

  it('普通文本（无 <think> 标签）应当直接作为 content 输出', () => {
    const res1 = demuxer.feed('你好，');
    const res2 = demuxer.feed('今天天气真好。');

    expect(res1.contentChunk).toBe('你好，');
    expect(res1.reasoningChunk).toBe('');
    expect(res2.contentChunk).toBe('今天天气真好。');
    expect(demuxer.getContent()).toBe('你好，今天天气真好。');
    expect(demuxer.getReasoning()).toBe('');
    expect(demuxer.isThinkingActive()).toBe(false);
  });

  it('单块包含完整 <think> 标签应当正确分离思考内容与正文', () => {
    const res = demuxer.feed('<think>正在推理计算...</think>最终答案是 42。');

    expect(res.reasoningChunk).toBe('正在推理计算...');
    expect(res.contentChunk).toBe('最终答案是 42。');
    expect(demuxer.getReasoning()).toBe('正在推理计算...');
    expect(demuxer.getContent()).toBe('最终答案是 42。');
    expect(demuxer.isThinkingActive()).toBe(false);
  });

  it('标签被拆分在多个分块边界时应当准确识别', () => {
    // 开启标签分块: '<th' + 'ink>'
    const r1 = demuxer.feed('<th');
    expect(r1.reasoningChunk).toBe('');
    expect(r1.contentChunk).toBe('');

    const r2 = demuxer.feed('ink>第一阶段思考；');
    expect(r2.reasoningChunk).toBe('第一阶段思考；');
    expect(r2.contentChunk).toBe('');
    expect(demuxer.isThinkingActive()).toBe(true);

    // 闭合标签分块: '第二阶段思考</th' + 'ink>正式回答开始'
    const r3 = demuxer.feed('第二阶段思考</th');
    expect(r3.reasoningChunk).toBe('第二阶段思考');
    expect(r3.contentChunk).toBe('');

    const r4 = demuxer.feed('ink>正式回答开始');
    expect(r4.reasoningChunk).toBe('');
    expect(r4.contentChunk).toBe('正式回答开始');
    expect(demuxer.isThinkingActive()).toBe(false);

    expect(demuxer.getReasoning()).toBe('第一阶段思考；第二阶段思考');
    expect(demuxer.getContent()).toBe('正式回答开始');
  });

  it('分块中包含普通小于号不是 think 标签时应当安全回吐至 content', () => {
    const r1 = demuxer.feed('当 a <');
    expect(r1.contentChunk).toBe('当 a ');

    const r2 = demuxer.feed(' b 时，成立。');
    expect(r2.contentChunk).toBe('< b 时，成立。');
    expect(demuxer.getContent()).toBe('当 a < b 时，成立。');
    expect(demuxer.getReasoning()).toBe('');
  });

  it('未闭合的 <think> 标签在调用 finish() 时应当自动收敛并冻结思考耗时', async () => {
    demuxer.feed('<think>正在持续思考中，尚未闭合');
    expect(demuxer.isThinkingActive()).toBe(true);

    // 稍作微小延迟
    await new Promise(resolve => setTimeout(resolve, 20));

    demuxer.finish();
    expect(demuxer.isThinkingActive()).toBe(false);
    expect(demuxer.getReasoning()).toBe('正在持续思考中，尚未闭合');
    expect(demuxer.getElapsedMs()).toBeGreaterThanOrEqual(15);
  });

  it('支持直接传入独立的 reasoning 与 content 分片（OpenAI 兼容模式）', () => {
    demuxer.feedReasoning('OpenAI 原生思考过程分块 1；');
    demuxer.feedReasoning('思考过程分块 2。');
    demuxer.feedContent('OpenAI 原生正式回答内容。');

    expect(demuxer.getReasoning()).toBe('OpenAI 原生思考过程分块 1；思考过程分块 2。');
    expect(demuxer.getContent()).toBe('OpenAI 原生正式回答内容。');
    expect(demuxer.isThinkingActive()).toBe(false);
  });
});
