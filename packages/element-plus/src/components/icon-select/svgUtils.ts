/**
 * AtengIconSelect SVG 路径白名单安全解析工具。
 *
 * 采用引号感知的线性标签扫描器校验内建及自定义 svgPath 中的矢量基本图形元素与安全展示属性，
 * 彻底剥离脚本标签、事件处理器（on*）、控制字符伪协议及危险 URL 引用，消除 v-html XSS 攻击面。
 *
 * @author Ateng
 * @since 2026-11-27
 */

/**
 * 允许渲染的安全矢量基本图形标签联合类型。
 */
export type SafeSvgTag = 'path' | 'circle' | 'rect' | 'line' | 'polygon' | 'polyline' | 'ellipse';

/**
 * 经过白名单过滤后的安全 SVG 子图形节点描述。
 */
export interface SafeSvgElement {
  /** 合法矢量基本图形标签名 */
  tag: SafeSvgTag;
  /** 经白名单与值域校验后的安全属性字典 */
  attrs: Record<string, string>;
}

const ALLOWED_SVG_TAGS = new Set<SafeSvgTag>([
  'path',
  'circle',
  'rect',
  'line',
  'polygon',
  'polyline',
  'ellipse',
]);

const ALLOWED_SVG_ATTRS = new Set<string>([
  'd',
  'fill',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-miterlimit',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'width',
  'height',
  'points',
  'transform',
  'opacity',
  'fill-opacity',
  'stroke-opacity',
  'fill-rule',
  'clip-rule',
  'pathlength',
]);

const DANGEROUS_BLOCK_RE = /<(script|foreignobject|style)\b[\s\S]*?<\/\1>|<!--[\s\S]*?-->/gi;
const ATTR_PAIR_RE = /([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
const UNSAFE_VALUE_RE = /javascript\s*:|vbscript\s*:|data\s*:|expression\s*\(|url\s*\(/i;

function stripControlChars(input: string): string {
  let out = '';
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code > 0x1f && code !== 0x7f) {
      out += input[i] ?? '';
    }
  }
  return out;
}

function isSafeSvgTag(tag: string): tag is SafeSvgTag {
  return ALLOWED_SVG_TAGS.has(tag as SafeSvgTag);
}

/**
 * 引号感知的线性标签扫描器，避免属性引号内包含 '>' 时提前截断标签边界。
 */
function extractTagMatches(input: string): Array<{ tagName: string; attrSource: string }> {
  const tags: Array<{ tagName: string; attrSource: string }> = [];
  let i = 0;

  while (i < input.length) {
    const start = input.indexOf('<', i);
    if (start < 0) break;

    let quote: '"' | "'" | null = null;
    let end = start + 1;
    while (end < input.length) {
      const ch = input[end];
      if (quote) {
        if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'") {
        quote = ch;
      } else if (ch === '>') {
        break;
      }
      end++;
    }

    if (end >= input.length) break;

    const rawInside = input.slice(start + 1, end).trim();
    i = end + 1;

    if (
      !rawInside ||
      rawInside.startsWith('/') ||
      rawInside.startsWith('!') ||
      rawInside.startsWith('?')
    ) {
      continue;
    }

    const cleaned = rawInside.endsWith('/') ? rawInside.slice(0, -1).trimEnd() : rawInside;
    const match = /^([a-zA-Z][a-zA-Z0-9]*)(?:\s+([\s\S]*))?$/.exec(cleaned);
    if (match?.[1]) {
      tags.push({
        tagName: match[1],
        attrSource: match[2] ?? '',
      });
    }
  }

  return tags;
}

/**
 * 解析并过滤 svgPath 标记文本，仅返回合法安全的矢量基本图形元素集合。
 *
 * @param svgMarkup 原始 SVG 内部图形字符串
 * @returns 白名单过滤后的安全 SVG 元素数组
 */
export function parseSafeSvgElements(svgMarkup: string | undefined): SafeSvgElement[] {
  if (!svgMarkup || typeof svgMarkup !== 'string') {
    return [];
  }

  const sanitized = svgMarkup.replace(DANGEROUS_BLOCK_RE, '');
  const elements: SafeSvgElement[] = [];

  for (const { tagName, attrSource } of extractTagMatches(sanitized)) {
    const lowerTag = tagName.toLowerCase();
    if (!isSafeSvgTag(lowerTag)) {
      continue;
    }

    const attrs: Record<string, string> = {};

    for (const attrMatch of attrSource.matchAll(ATTR_PAIR_RE)) {
      const rawAttr = attrMatch[1];
      if (!rawAttr) continue;

      const lowerAttr = rawAttr.toLowerCase();
      if (!ALLOWED_SVG_ATTRS.has(lowerAttr)) {
        continue;
      }

      const rawValue = attrMatch[2] ?? attrMatch[3] ?? '';
      const normalizedValueCheck = stripControlChars(rawValue);
      if (UNSAFE_VALUE_RE.test(normalizedValueCheck)) {
        continue;
      }

      const normalizedAttr = lowerAttr === 'pathlength' ? 'pathLength' : lowerAttr;
      attrs[normalizedAttr] = rawValue;
    }

    if (Object.keys(attrs).length > 0) {
      elements.push({ tag: lowerTag, attrs });
    }
  }

  return elements;
}
