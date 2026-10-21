/**
 * 纯原生语法高亮与安全分词渲染器（零外部依赖）。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { CodeViewLanguage } from './types';

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

/**
 * 单行分词并输出着色 HTML。
 */
export function highlightLine(line: string, language: CodeViewLanguage): string {
  if (!line) {
    return '&nbsp;';
  }

  if (language === 'text') {
    return escapeHtml(line);
  }

  if (language === 'json') {
    return highlightJsonLine(line);
  }

  if (language === 'sql') {
    return highlightSqlLine(line);
  }

  if (language === 'javascript' || language === 'typescript') {
    return highlightJsLine(line);
  }

  if (language === 'xml' || language === 'html') {
    return highlightXmlLine(line);
  }

  return escapeHtml(line);
}

/**
 * JSON 语法着色：区分属性名 key、字符串、数字、布尔/null
 */
function highlightJsonLine(line: string): string {
  // 正则匹配: 键名 (带引号后跟冒号)、字符串值、数字、布尔/null、标点
  const regex =
    /("(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*")(\s*:)?|(-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b|\bnull\b)|([{}[\],])/g;

  return line.replace(regex, (match, str, colon, num, bool, punct) => {
    if (str) {
      if (colon) {
        // 对象键名 key
        return `<span class="tok-key">${escapeHtml(str)}</span>${colon}`;
      }
      // 字符串值
      return `<span class="tok-string">${escapeHtml(str)}</span>`;
    }
    if (num) {
      return `<span class="tok-number">${escapeHtml(num)}</span>`;
    }
    if (bool) {
      return `<span class="tok-boolean">${escapeHtml(bool)}</span>`;
    }
    if (punct) {
      return `<span class="tok-punct">${escapeHtml(punct)}</span>`;
    }
    return escapeHtml(match);
  });
}

/**
 * SQL 语法着色：注释、字符串、关键字、数字
 */
function highlightSqlLine(line: string): string {
  // 单行注释 --
  const commentIdx = line.indexOf('--');
  if (commentIdx >= 0) {
    const before = highlightSqlTokens(line.slice(0, commentIdx));
    const comment = `<span class="tok-comment">${escapeHtml(line.slice(commentIdx))}</span>`;
    return before + comment;
  }
  return highlightSqlTokens(line);
}

function highlightSqlTokens(code: string): string {
  const regex =
    /('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")|(\b[a-zA-Z_]\w*\b)|(-?\d+(?:\.\d*)?)|([,;()=><!+\-*/])/g;

  return code.replace(regex, (match, str, word, num, punct) => {
    if (str) {
      return `<span class="tok-string">${escapeHtml(str)}</span>`;
    }
    if (word) {
      if (SQL_KEYWORDS.has(word.toLowerCase())) {
        return `<span class="tok-keyword">${escapeHtml(word)}</span>`;
      }
      return `<span class="tok-word">${escapeHtml(word)}</span>`;
    }
    if (num) {
      return `<span class="tok-number">${escapeHtml(num)}</span>`;
    }
    if (punct) {
      return `<span class="tok-punct">${escapeHtml(punct)}</span>`;
    }
    return escapeHtml(match);
  });
}

/**
 * JS/TS 语法着色：注释、字符串、关键字、数字
 */
function highlightJsLine(line: string): string {
  // 单行注释 //
  const commentIdx = line.indexOf('//');
  if (commentIdx >= 0) {
    const before = highlightJsTokens(line.slice(0, commentIdx));
    const comment = `<span class="tok-comment">${escapeHtml(line.slice(commentIdx))}</span>`;
    return before + comment;
  }
  return highlightJsTokens(line);
}

function highlightJsTokens(code: string): string {
  const regex =
    /('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)|(\b[a-zA-Z_$]\w*\b)|(-?\d+(?:\.\d*)?)|([{}[\],;()=><!+\-*/.:&|])/g;

  return code.replace(regex, (match, str, word, num, punct) => {
    if (str) {
      return `<span class="tok-string">${escapeHtml(str)}</span>`;
    }
    if (word) {
      if (JS_KEYWORDS.has(word)) {
        return `<span class="tok-keyword">${escapeHtml(word)}</span>`;
      }
      return `<span class="tok-word">${escapeHtml(word)}</span>`;
    }
    if (num) {
      return `<span class="tok-number">${escapeHtml(num)}</span>`;
    }
    if (punct) {
      return `<span class="tok-punct">${escapeHtml(punct)}</span>`;
    }
    return escapeHtml(match);
  });
}

/**
 * XML/HTML 语法着色：注释、标签、属性
 */
function highlightXmlLine(line: string): string {
  // 注释 <!-- ... -->
  const regex =
    /(<!--[\s\S]*?-->)|(<\/?)([a-zA-Z0-9\-:]+)|(\s+[a-zA-Z0-9\-:]+)(?==)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\/?>)/g;

  return line.replace(regex, (match, comment, tagOpen, tagName, attrName, str, tagClose) => {
    if (comment) {
      return `<span class="tok-comment">${escapeHtml(comment)}</span>`;
    }
    if (tagOpen && tagName) {
      return `${escapeHtml(tagOpen)}<span class="tok-tag">${escapeHtml(tagName)}</span>`;
    }
    if (attrName) {
      return `<span class="tok-attr">${escapeHtml(attrName)}</span>`;
    }
    if (str) {
      return `<span class="tok-string">${escapeHtml(str)}</span>`;
    }
    if (tagClose) {
      return escapeHtml(tagClose);
    }
    return escapeHtml(match);
  });
}
