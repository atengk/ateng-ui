/**
 * 文档章节大纲与标题语义提取器 (HeadingSemanticExtractor)。
 *
 * 专职从渲染完成的真实 DOM 树（Word / Markdown / HTML）中提取真正的标题层级大纲，
 * 严格过滤父级复合容器与普通正文段落，杜绝全文合并内容与普通正文污染 TOC。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import type { FileViewerDocumentAnchor } from '../types';

/**
 * 依据标签名、class 与 id 确定性推导标题层级 (1 ~ 6)。
 *
 * @param el 待判断的标题 DOM 元素
 * @returns 标题级别 (1 表示最高级主章节，保底为 1)
 */
export function resolveHeadingLevel(el: HTMLElement): number {
  const tagName = el.tagName.toLowerCase();
  const tagMatch = /^h([1-6])$/.exec(tagName);
  if (tagMatch && tagMatch[1]) {
    return parseInt(tagMatch[1], 10);
  }

  const cls = (el.className || '').toLowerCase();
  const id = (el.id || '').toLowerCase();
  const raw = `${cls} ${id}`;

  const levelMatch = /(?:heading|h)[-_ ]?([1-6])/.exec(raw);
  if (levelMatch && levelMatch[1]) {
    return parseInt(levelMatch[1], 10);
  }

  return 1;
}

/**
 * 从渲染宿主容器中精准提取有效章节标题并生成层级大纲。
 *
 * @param container 挂载了渲染器文档树的父容器节点
 * @returns 规范化的目录大纲列表，若无任何有效标题则保底返回空数组 []
 */
export function extractDocumentHeadings(container: HTMLElement | null): FileViewerDocumentAnchor[] {
  if (!container) return [];

  // 标题专属候选选择器：涵盖原生 H 标签、Word (docx-preview) 真实标题、Markdown 标题
  const selector = [
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'p[id*="heading-"]',
    'p[class*="heading"]',
    'p[class*="Heading"]',
    'p[data-docx-toc-entry="true"]',
    '.markdown-heading',
  ].join(', ');

  const rawElements = Array.from(container.querySelectorAll<HTMLElement>(selector));
  const anchors: FileViewerDocumentAnchor[] = [];

  let counter = 0;
  for (const el of rawElements) {
    // 1. 严格防御：排除父级大容器（凡包含嵌套标题或子段落的复合容器绝对排除）
    const tag = el.tagName.toLowerCase();
    if (tag === 'article' || tag === 'section') {
      continue;
    }
    if (tag === 'div' && el.querySelector('p, h1, h2, h3, h4, h5, h6, article, section')) {
      continue;
    }

    // 2. 提取并清理纯文本内容
    const text = el.textContent?.trim().replace(/\s+/g, ' ') || '';
    if (!text) continue;

    // 3. 标题长度阈值防线：超过 150 个字符的文字块绝非标题，防正文误入
    if (text.length > 150) continue;

    // 4. 确保元素具备唯一锚点 ID 供滚动导航
    let anchorId = el.id;
    if (!anchorId) {
      anchorId = `at-fv-toc-${counter}`;
      el.id = anchorId;
    }

    const level = resolveHeadingLevel(el);

    anchors.push({
      id: anchorId,
      index: counter++,
      label: text,
      text,
      level,
      type: 'heading',
      page: 1,
    });
  }

  return anchors;
}
