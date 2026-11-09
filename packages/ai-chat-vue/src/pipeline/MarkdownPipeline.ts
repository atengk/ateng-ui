/**
 * MarkdownPipeline 高保真 Markdown 与 KaTeX 数学公式渲染流水线。
 *
 * 核心集成 markdown-it、katex 与结构化代码块/Mermaid 分块切片，
 * 支持流式增量容错渲染与货币符号智能防误伤。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import katex from 'katex';
import MarkdownIt, {
  type MarkdownIt as MarkdownItInstance,
  type StateBlock,
  type StateInline,
  type Token,
} from 'markdown-it';

/**
 * Markdown 结构化切片单元。
 */
export interface MarkdownChunk {
  /** 唯一切片标识 */
  id: string;
  /** 切片类型：HTML 富文本 | 代码块 | Mermaid 图表 */
  type: 'html' | 'code' | 'mermaid';
  /** 富文本渲染 HTML（仅 type === 'html' 时有效） */
  html?: string;
  /** 编程语言标识（仅 type === 'code' 时有效） */
  language?: string;
  /** 代码或图表原始内容（仅 type === 'code' | 'mermaid' 时有效） */
  code?: string;
}

/**
 * HTML 特殊字符转义安全函数。
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * KaTeX 行内数学公式规则 ($...$)。
 */
function mathInlineRule(state: StateInline, silent: boolean): boolean {
  if (state.src.charCodeAt(state.pos) !== 0x24 /* $ */) {
    return false;
  }
  // 双 $ 交由块级公式或行内块处理
  if (state.src.charCodeAt(state.pos + 1) === 0x24) {
    return false;
  }

  // 紧跟空白字符或纯数字（如 $100、$ 20）视为货币符号，予以严格保护
  const nextChar = state.src.charAt(state.pos + 1);
  if (!nextChar || /\s|\d/.test(nextChar)) {
    return false;
  }

  const start = state.pos + 1;
  let match = -1;
  let pos = start;

  while ((pos = state.src.indexOf('$', pos)) !== -1) {
    // 检查是否为转义反斜杠 \$
    let backslashes = 0;
    let i = pos - 1;
    while (i >= start && state.src.charCodeAt(i) === 0x5c /* \ */) {
      backslashes++;
      i--;
    }
    if (backslashes % 2 === 0) {
      match = pos;
      break;
    }
    pos++;
  }

  if (match === -1) {
    return false;
  }

  // 闭合 $ 前不能为纯空白
  if (/\s/.test(state.src.charAt(match - 1))) {
    return false;
  }

  const content = state.src.slice(start, match);
  if (content.includes('\n')) {
    return false;
  }

  if (!silent) {
    const token = state.push('math_inline', 'math', 0);
    token.content = content;
  }

  state.pos = match + 1;
  return true;
}

/**
 * KaTeX 块级数学公式规则 ($$...$$)。
 */
function mathBlockRule(
  state: StateBlock,
  startLine: number,
  endLine: number,
  silent: boolean,
): boolean {
  const bMark = state.bMarks[startLine] ?? 0;
  const tShift = state.tShift[startLine] ?? 0;
  const max = state.eMarks[startLine] ?? 0;
  const start = bMark + tShift;

  if (start + 2 > max) return false;
  if (state.src.charCodeAt(start) !== 0x24 || state.src.charCodeAt(start + 1) !== 0x24) {
    return false;
  }

  // 单行模式 $$ math $$
  const lineText = state.src.slice(start, max).trim();
  if (lineText.startsWith('$$') && lineText.endsWith('$$') && lineText.length > 4) {
    if (silent) return true;
    const content = lineText.slice(2, -2).trim();
    const token = state.push('math_block', 'math', 0);
    token.block = true;
    token.content = content;
    token.map = [startLine, startLine + 1];
    state.line = startLine + 1;
    return true;
  }

  // 多行模式 $$ ... $$
  let nextLine = startLine;
  let haveEndMarker = false;

  while (nextLine < endLine) {
    nextLine++;
    if (nextLine >= endLine) break;
    const nextStart = (state.bMarks[nextLine] ?? 0) + (state.tShift[nextLine] ?? 0);
    const nextMax = state.eMarks[nextLine] ?? 0;
    const text = state.src.slice(nextStart, nextMax).trim();
    if (text === '$$' || text.endsWith('$$')) {
      haveEndMarker = true;
      break;
    }
  }

  if (!haveEndMarker) return false;
  if (silent) return true;

  const contentLines: string[] = [];
  const firstLineAfter = state.src.slice(start + 2, max).trim();
  if (firstLineAfter) {
    contentLines.push(firstLineAfter);
  }

  for (let l = startLine + 1; l < nextLine; l++) {
    const s = (state.bMarks[l] ?? 0) + (state.tShift[l] ?? 0);
    const e = state.eMarks[l] ?? 0;
    contentLines.push(state.src.slice(s, e));
  }

  const lastLineText = state.src
    .slice(
      (state.bMarks[nextLine] ?? 0) + (state.tShift[nextLine] ?? 0),
      state.eMarks[nextLine] ?? 0,
    )
    .trim();
  if (lastLineText !== '$$' && lastLineText.endsWith('$$')) {
    contentLines.push(lastLineText.slice(0, -2).trim());
  }

  state.line = nextLine + 1;
  const token = state.push('math_block', 'math', 0);
  token.block = true;
  token.content = contentLines.join('\n');
  token.map = [startLine, state.line];
  return true;
}

/**
 * 高保真 Markdown 与 KaTeX 解析流水线实现类。
 */
export class MarkdownPipeline {
  private readonly md: MarkdownItInstance;

  public constructor() {
    this.md = new MarkdownIt({
      html: false,
      xhtmlOut: true,
      breaks: true,
      linkify: true,
      typographer: false,
    });

    // 注册 KaTeX 数学公式解析语法
    this.md.inline.ruler.after('escape', 'math_inline', mathInlineRule);
    this.md.block.ruler.after('blockquote', 'math_block', mathBlockRule, {
      alt: ['paragraph', 'reference', 'blockquote', 'list'],
    });

    // 注册 KaTeX 数学公式渲染规则
    this.md.renderer.rules.math_inline = (tokens, idx) => {
      const token = tokens[idx];
      const math = token?.content ?? '';
      try {
        return katex.renderToString(math, {
          displayMode: false,
          throwOnError: false,
        });
      } catch {
        return escapeHtml(math);
      }
    };

    this.md.renderer.rules.math_block = (tokens, idx) => {
      const token = tokens[idx];
      const math = token?.content ?? '';
      try {
        const rendered = katex.renderToString(math, {
          displayMode: true,
          throwOnError: false,
        });
        return `<div class="at-ai-chat__math-block">${rendered}</div>`;
      } catch {
        return `<div class="at-ai-chat__math-block">${escapeHtml(math)}</div>`;
      }
    };
  }

  /**
   * 将 Markdown 文本直接渲染为 HTML 字符串。
   *
   * @param content Markdown 文本
   * @returns 渲染生成的 HTML
   */
  public render(content: string): string {
    if (!content) return '';
    return this.md.render(content);
  }

  /**
   * 将 Markdown 解析为结构化切片数组，供 Vue 组件逐级承接与插槽反转。
   *
   * @param content Markdown 文本
   * @returns 切片数组
   */
  public parseChunks(content: string): MarkdownChunk[] {
    if (!content) return [];

    const tokens = this.md.parse(content, {});
    const chunks: MarkdownChunk[] = [];
    let currentTokens: Token[] = [];
    let chunkCounter = 0;

    const flushHtml = () => {
      if (currentTokens.length === 0) return;
      const html = this.md.renderer.render(currentTokens, this.md.options, {});
      if (html.trim()) {
        chunks.push({
          id: `html-${chunkCounter++}`,
          type: 'html',
          html,
        });
      }
      currentTokens = [];
    };

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (!token) continue;
      if (token.type === 'fence') {
        flushHtml();
        const info = token.info ? token.info.trim() : '';
        const code = token.content;

        if (info.toLowerCase() === 'mermaid') {
          chunks.push({
            id: `mermaid-${chunkCounter++}`,
            type: 'mermaid',
            code,
          });
        } else {
          chunks.push({
            id: `code-${chunkCounter++}`,
            type: 'code',
            language: info || 'text',
            code,
          });
        }
      } else {
        currentTokens.push(token);
      }
    }

    flushHtml();
    return chunks;
  }
}
