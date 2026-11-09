/**
 * @atengk/ai-chat-vue ArtifactDemuxer 流式产物解复用器单测。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { describe, it, expect } from 'vitest';
import { ArtifactDemuxer } from '../src/demux/ArtifactDemuxer';

describe('ArtifactDemuxer', () => {
  it('应当对纯普通文本保持透明直通，不截留', () => {
    const demuxer = new ArtifactDemuxer();
    const r1 = demuxer.feed('这里是普通文本。');
    const r2 = demuxer.feed('请查收。');
    demuxer.finish();

    expect(r1.textChunk).toBe('这里是普通文本。');
    expect(r2.textChunk).toBe('请查收。');
    expect(r1.artifacts).toHaveLength(0);
    expect(r2.artifacts).toHaveLength(0);
  });

  it('应当流式分离 <artifact> 标签，剥离正文并结构化提取产物实体', () => {
    const demuxer = new ArtifactDemuxer();
    const raw = `这是一份代码文件：\n<artifact identifier="card-comp" title="用户信息卡片" language="vue">\n<template><div>{{ user }}</div></template>\n</artifact>\n请审查以上代码。`;

    const res = demuxer.feed(raw);
    demuxer.finish();

    expect(res.textChunk).toBe('这是一份代码文件：\n\n请审查以上代码。');
    expect(res.artifacts).toHaveLength(1);

    const artifact = res.artifacts[0];
    expect(artifact.identifier).toBe('card-comp');
    expect(artifact.title).toBe('用户信息卡片');
    expect(artifact.language).toBe('vue');
    expect(artifact.versions).toHaveLength(1);
    expect(artifact.versions[0].version).toBe(1);
    expect(artifact.versions[0].code.trim()).toBe('<template><div>{{ user }}</div></template>');
  });

  it('应当兼容支持 <antArtifact> 标签别名', () => {
    const demuxer = new ArtifactDemuxer();
    const raw = `<antArtifact identifier="script-ts" title="工具函数" language="typescript">export const a = 1;</antArtifact>`;

    const res = demuxer.feed(raw);
    demuxer.finish();

    expect(res.textChunk).toBe('');
    expect(res.artifacts).toHaveLength(1);
    expect(res.artifacts[0].identifier).toBe('script-ts');
    expect(res.artifacts[0].language).toBe('typescript');
    expect(res.artifacts[0].versions[0].code.trim()).toBe('export const a = 1;');
  });

  it('应当对抗极端跨分块边界并准确重组代码产物', () => {
    const demuxer = new ArtifactDemuxer();
    const chunks = [
      '前置文本\n',
      '<art',
      'ifact ident',
      'ifier="test-btn" title="按钮组件"',
      ' language="vue">\n',
      '<button>点',
      '击我</button>\n',
      '</art',
      'ifact>\n后置说明',
    ];

    let fullText = '';
    const collected: unknown[] = [];

    for (const chunk of chunks) {
      const res = demuxer.feed(chunk);
      fullText += res.textChunk;
      if (res.artifacts.length > 0) {
        collected.push(...res.artifacts);
      }
    }
    const endRes = demuxer.finish();
    fullText += endRes.textChunk;

    expect(fullText.trim()).toBe('前置文本\n\n后置说明');
    expect(collected).toHaveLength(1);
    const item = collected[0] as { identifier: string; versions: { code: string }[] };
    expect(item.identifier).toBe('test-btn');
    expect(item.versions[0].code.trim()).toBe('<button>点击我</button>');
  });

  it('应当对同一个 identifier 多次输出时生成递增的不可变版本链', () => {
    const demuxer = new ArtifactDemuxer();
    // 第一版本
    demuxer.feed('<artifact identifier="counter" title="计数器" language="vue">v1 code</artifact>');
    // 第二版本
    demuxer.feed(
      '<artifact identifier="counter" title="计数器 (增强版)" language="vue">v2 code</artifact>',
    );
    demuxer.finish();

    const artifacts = demuxer.getArtifacts();
    expect(artifacts).toHaveLength(1);

    const counter = artifacts[0];
    expect(counter.identifier).toBe('counter');
    expect(counter.title).toBe('计数器 (增强版)');
    expect(counter.versions).toHaveLength(2);
    expect(counter.versions[0].version).toBe(1);
    expect(counter.versions[0].code.trim()).toBe('v1 code');
    expect(counter.versions[1].version).toBe(2);
    expect(counter.versions[1].code.trim()).toBe('v2 code');
  });
});
