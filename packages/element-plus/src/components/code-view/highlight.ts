/**
 * 纯原生语法高亮与安全分词渲染器（零外部依赖）。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { CodeViewLanguage } from './types';
import type { HighlightSegment } from '../shared/TokenSegments';

/**
 * 语法高亮单个词法单元。
 */
export type HighlightToken = HighlightSegment;

/**
 * 严格 HTML 字符安全转义（彻底杜绝 XSS）。
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const SQL_KEYWORDS = new Set([
  'select',
  'from',
  'where',
  'insert',
  'into',
  'values',
  'update',
  'set',
  'delete',
  'join',
  'left',
  'right',
  'inner',
  'outer',
  'full',
  'on',
  'group',
  'by',
  'order',
  'asc',
  'desc',
  'having',
  'limit',
  'offset',
  'and',
  'or',
  'not',
  'in',
  'is',
  'null',
  'like',
  'as',
  'distinct',
  'case',
  'when',
  'then',
  'else',
  'end',
  'between',
  'exists',
  'union',
  'all',
  'create',
  'table',
  'alter',
  'drop',
  'index',
  'view',
  'primary',
  'key',
  'count',
  'sum',
  'avg',
  'min',
  'max',
  'truncate',
  'grant',
  'revoke',
]);

const JS_KEYWORDS = new Set([
  'const',
  'let',
  'var',
  'function',
  'return',
  'if',
  'else',
  'for',
  'while',
  'do',
  'switch',
  'case',
  'break',
  'continue',
  'default',
  'new',
  'this',
  'class',
  'extends',
  'super',
  'import',
  'export',
  'from',
  'as',
  'async',
  'await',
  'try',
  'catch',
  'finally',
  'throw',
  'typeof',
  'instanceof',
  'interface',
  'type',
  'enum',
  'public',
  'private',
  'protected',
  'readonly',
  'static',
  'true',
  'false',
  'null',
  'undefined',
  'void',
]);

function tokenizeWithRegex(
  source: string,
  regex: RegExp,
  mapMatch: (match: RegExpExecArray) => HighlightToken[],
): HighlightToken[] {
  const tokens: HighlightToken[] = [];
  let lastIndex = 0;

  for (let match = regex.exec(source); match !== null; match = regex.exec(source)) {
    if (match.index > lastIndex) {
      tokens.push({ text: source.slice(lastIndex, match.index) });
    }
    tokens.push(...mapMatch(match));
    lastIndex = regex.lastIndex;
    if (match[0].length === 0) {
      regex.lastIndex += 1;
    }
  }

  if (lastIndex < source.length) {
    tokens.push({ text: source.slice(lastIndex) });
  }

  return tokens;
}

/**
 * 将结构化高亮分词序列渲染为已安全转义的 HTML 字符串。
 */
export function tokensToHtml(tokens: HighlightToken[]): string {
  return tokens
    .map(token =>
      token.className
        ? `<span class="${token.className}">${escapeHtml(token.text)}</span>`
        : escapeHtml(token.text),
    )
    .join('');
}

/**
 * 单行分词并输出结构化高亮 Token 序列（免 v-html 注入）。
 */
export function tokenizeLine(line: string, language: CodeViewLanguage): HighlightToken[] {
  if (!line) {
    return [{ text: '\u00A0' }];
  }

  switch (language) {
    case 'json':
      return tokenizeJsonLine(line);
    case 'sql':
      return tokenizeSqlLine(line);
    case 'javascript':
    case 'typescript':
      return tokenizeJsLine(line);
    case 'xml':
    case 'html':
      return tokenizeXmlLine(line);
    case 'text':
    default:
      return [{ text: line }];
  }
}

/**
 * 单行分词并输出着色 HTML。
 */
export function highlightLine(line: string, language: CodeViewLanguage): string {
  if (!line) {
    return '&nbsp;';
  }
  return tokensToHtml(tokenizeLine(line, language));
}

/**
 * JSON 语法着色：区分属性名 key、字符串、数字、布尔/null
 */
function tokenizeJsonLine(line: string): HighlightToken[] {
  const regex =
    /("(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*")(\s*:)?|(-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b|\bnull\b)|([{}[\],])/g;

  return tokenizeWithRegex(line, regex, match => {
    const [, str, colon, num, bool, punct] = match;
    if (str) {
      const tokens: HighlightToken[] = [{ text: str, className: colon ? 'tok-key' : 'tok-string' }];
      if (colon) {
        tokens.push({ text: colon });
      }
      return tokens;
    }
    if (num) return [{ text: num, className: 'tok-number' }];
    if (bool) return [{ text: bool, className: 'tok-boolean' }];
    if (punct) return [{ text: punct, className: 'tok-punct' }];
    return [{ text: match[0] }];
  });
}

/**
 * SQL 语法着色：注释、字符串、关键字、数字
 */
function tokenizeSqlLine(line: string): HighlightToken[] {
  const commentIdx = line.indexOf('--');
  if (commentIdx >= 0) {
    return [
      ...tokenizeSqlTokens(line.slice(0, commentIdx)),
      { text: line.slice(commentIdx), className: 'tok-comment' },
    ];
  }
  return tokenizeSqlTokens(line);
}

function tokenizeSqlTokens(code: string): HighlightToken[] {
  const regex =
    /('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")|(\b[a-zA-Z_]\w*\b)|(-?\d+(?:\.\d*)?)|([,;()=><!+\-*/])/g;

  return tokenizeWithRegex(code, regex, match => {
    const [, str, word, num, punct] = match;
    if (str) return [{ text: str, className: 'tok-string' }];
    if (word) {
      return [
        {
          text: word,
          className: SQL_KEYWORDS.has(word.toLowerCase()) ? 'tok-keyword' : 'tok-word',
        },
      ];
    }
    if (num) return [{ text: num, className: 'tok-number' }];
    if (punct) return [{ text: punct, className: 'tok-punct' }];
    return [{ text: match[0] }];
  });
}

/**
 * JS/TS 语法着色：注释、字符串、关键字、数字
 */
function tokenizeJsLine(line: string): HighlightToken[] {
  const commentIdx = line.indexOf('//');
  if (commentIdx >= 0) {
    return [
      ...tokenizeJsTokens(line.slice(0, commentIdx)),
      { text: line.slice(commentIdx), className: 'tok-comment' },
    ];
  }
  return tokenizeJsTokens(line);
}

function tokenizeJsTokens(code: string): HighlightToken[] {
  const regex =
    /('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)|(\b[a-zA-Z_$]\w*\b)|(-?\d+(?:\.\d*)?)|([{}[\],;()=><!+\-*/.:&|])/g;

  return tokenizeWithRegex(code, regex, match => {
    const [, str, word, num, punct] = match;
    if (str) return [{ text: str, className: 'tok-string' }];
    if (word) {
      return [{ text: word, className: JS_KEYWORDS.has(word) ? 'tok-keyword' : 'tok-word' }];
    }
    if (num) return [{ text: num, className: 'tok-number' }];
    if (punct) return [{ text: punct, className: 'tok-punct' }];
    return [{ text: match[0] }];
  });
}

/**
 * XML/HTML 语法着色：注释、标签、属性
 */
function tokenizeXmlLine(line: string): HighlightToken[] {
  const regex =
    /(<!--[\s\S]*?-->)|(<\/?)([a-zA-Z0-9\-:]+)|(\s+[a-zA-Z0-9\-:]+)(?==)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\/?>)/g;

  return tokenizeWithRegex(line, regex, match => {
    const [, comment, tagOpen, tagName, attrName, str, tagClose] = match;
    if (comment) return [{ text: comment, className: 'tok-comment' }];
    if (tagOpen && tagName) {
      return [{ text: tagOpen }, { text: tagName, className: 'tok-tag' }];
    }
    if (attrName) return [{ text: attrName, className: 'tok-attr' }];
    if (str) return [{ text: str, className: 'tok-string' }];
    if (tagClose) return [{ text: tagClose }];
    return [{ text: match[0] }];
  });
}
