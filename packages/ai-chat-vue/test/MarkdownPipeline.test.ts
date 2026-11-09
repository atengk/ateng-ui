/**
 * MarkdownPipeline 渲染流水线单元测试。
 *
 * 验证 Markdown 基础语法、GFM 表格、KaTeX 数学公式解析、货币符号保护与分块切片。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { describe, expect, it } from 'vitest';
import { MarkdownPipeline } from '../src/pipeline/MarkdownPipeline';

describe('MarkdownPipeline', () => {
  it('正确解析基础 Markdown 语法与 GFM 表格', () => {
    const pipeline = new MarkdownPipeline();
    const markdown = `
# 标题一
这是一段 **加粗** 与 *斜体* 文本。

> 这是一个引用块

- 列表项 1
- 列表项 2

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| id | string | 唯一标识 |
| count | number | 计数器 |
    `.trim();

    const html = pipeline.render(markdown);
    expect(html).toContain('<h1>标题一</h1>');
    expect(html).toContain('<strong>加粗</strong>');
    expect(html).toContain('<em>斜体</em>');
    expect(html).toContain('<blockquote>');
    expect(html).toContain('<ul>');
    expect(html).toContain('<table>');
    expect(html).toContain('字段</th>');
    expect(html).toContain('唯一标识</td>');
  });

  it('正确解析 KaTeX 行内公式并保护货币符号', () => {
    const pipeline = new MarkdownPipeline();
    const text = '物理公式 $E=mc^2$ 很伟大，但价格是 $100 并且运费是 $20。';
    const html = pipeline.render(text);

    // 应该包含 KaTeX 生成的 html 节点
    expect(html).toContain('katex');
    // 应该保护货币符号 $100 与 $20，不被错误转译为公式
    expect(html).toContain('$100');
    expect(html).toContain('$20');
  });

  it('正确解析 KaTeX 块级数学公式', () => {
    const pipeline = new MarkdownPipeline();
    const text = `
正文前缀。

$$
\\int_{-\\infty}^{+\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

正文后缀。
    `.trim();

    const html = pipeline.render(text);
    expect(html).toContain('at-ai-chat__math-block');
    expect(html).toContain('katex-display');
  });

  it('正确将正文、代码块与 Mermaid 拆分为结构化分块 (parseChunks)', () => {
    const pipeline = new MarkdownPipeline();
    const doc = `
开始正文，带有 $x + y = z$ 公式。

\`\`\`typescript
const greeting: string = "Hello World";
\`\`\`

中间正文。

\`\`\`mermaid
flowchart TD
  A[开始] --> B[结束]
\`\`\`

结尾结论。
    `.trim();

    const chunks = pipeline.parseChunks(doc);
    expect(chunks.length).toBe(5);

    expect(chunks[0].type).toBe('html');
    expect(chunks[0].html).toContain('开始正文');
    expect(chunks[0].html).toContain('katex');

    expect(chunks[1].type).toBe('code');
    expect(chunks[1].language).toBe('typescript');
    expect(chunks[1].code?.trim()).toBe('const greeting: string = "Hello World";');

    expect(chunks[2].type).toBe('html');
    expect(chunks[2].html).toContain('中间正文');

    expect(chunks[3].type).toBe('mermaid');
    expect(chunks[3].code?.trim()).toContain('flowchart TD');

    expect(chunks[4].type).toBe('html');
    expect(chunks[4].html).toContain('结尾结论');
  });

  it('支持流式未闭合代码块的增量容错切片', () => {
    const pipeline = new MarkdownPipeline();
    const doc = '正在生成代码：\n\n```python\ndef calculate(a, b):\n    return a + b';
    const chunks = pipeline.parseChunks(doc);

    expect(chunks.length).toBe(2);
    expect(chunks[0].type).toBe('html');
    expect(chunks[1].type).toBe('code');
    expect(chunks[1].language).toBe('python');
    expect(chunks[1].code).toContain('def calculate');
  });
});
