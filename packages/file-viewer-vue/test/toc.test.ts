/**
 * 文档章节大纲与标题语义提取器 (HeadingSemanticExtractor) 单元测试。
 *
 * 验证：
 * 1. 原生 H1~H6 标签提取与级别推导；
 * 2. Word (docx-preview) 真实标题样式 (p.docx_heading_1, p#docx-heading-1) 提取；
 * 3. 严格排除复合父容器 (article, section, div) 与普通正文段落，防全文本与正文污染；
 * 4. 树状层级深度推导 (level: 1, 2, 3...)；
 * 5. 超长文本过滤与空值防御性返回 []。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { extractDocumentHeadings, resolveHeadingLevel } from '../src/utils/toc';

describe('toc 标题语义提取器与层级契约测试', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('能精准提取 HTML 原生 h1, h2, h3 标签并计算对应的 level 深度', () => {
    container.innerHTML = `
      <article>
        <h1 id="title-1">项目立项报告</h1>
        <p>这是立项报告的正文说明文字，不应进入大纲目录。</p>
        <h2 id="sub-1">1.1 需求背景</h2>
        <p>需求背景正文。</p>
        <h3 id="sub-sub-1">1.1.1 核心痛点</h3>
      </article>
    `;

    const headings = extractDocumentHeadings(container);
    expect(headings).toHaveLength(3);

    expect(headings[0]).toMatchObject({
      id: 'title-1',
      label: '项目立项报告',
      level: 1,
      type: 'heading',
    });

    expect(headings[1]).toMatchObject({
      id: 'sub-1',
      label: '1.1 需求背景',
      level: 2,
      type: 'heading',
    });

    expect(headings[2]).toMatchObject({
      id: 'sub-sub-1',
      label: '1.1.1 核心痛点',
      level: 3,
      type: 'heading',
    });
  });

  it('能够精准提取 Word (docx-preview) 的真实标题段落，并严格排除复合大容器与普通正文', () => {
    // 模拟真实 Word 渲染结构：
    // 外层复合容器 <section class="docx"> 和 <article> 包含全部文本
    // 内部有标题段落与普通正文段落
    container.innerHTML = `
      <div class="docx-wrapper">
        <section class="docx">
          <article>
            <p id="docx-heading-1" class="docx_heading_1">标题1</p>
            <p class="docx_Normal">这是内容</p>
            <p id="docx-heading-2" class="docx_heading_2">标题2</p>
            <p class="docx_p">这是内容</p>
          </article>
        </section>
      </div>
    `;

    const headings = extractDocumentHeadings(container);

    // 绝对不应提取出 5 项，更不应包含全文拼合内容与“这是内容”
    expect(headings).toHaveLength(2);
    expect(headings[0].label).toBe('标题1');
    expect(headings[0].id).toBe('docx-heading-1');
    expect(headings[0].level).toBe(1);

    expect(headings[1].label).toBe('标题2');
    expect(headings[1].id).toBe('docx-heading-2');
    expect(headings[1].level).toBe(2);
  });

  it('支持带有 data-docx-toc-entry 属性或 Markdown 样式的标题提取', () => {
    container.innerHTML = `
      <div>
        <p data-docx-toc-entry="true" class="custom-chapter-style">第二章：微服务治理架构</p>
        <div class="markdown-heading">第三章：性能调优实战</div>
      </div>
    `;

    const headings = extractDocumentHeadings(container);
    expect(headings.map(h => h.label)).toEqual(['第二章：微服务治理架构', '第三章：性能调优实战']);
  });

  it('标题缺少 id 属性时，自动赋予全局唯一确定的 anchorId 供定位', () => {
    container.innerHTML = `
      <h1>无 ID 标题</h1>
    `;

    const headings = extractDocumentHeadings(container);
    expect(headings).toHaveLength(1);
    expect(headings[0].id).toBe('at-fv-toc-0');
    expect(container.querySelector('h1')?.id).toBe('at-fv-toc-0');
  });

  it('超长文本（>150 字符）自动拦截，杜绝误将长正文识别为标题', () => {
    const longText = '这是一段极长极长的大文本正文段落，'.repeat(15);
    container.innerHTML = `
      <p class="docx_heading_1">${longText}</p>
      <h1>合法标题</h1>
    `;

    const headings = extractDocumentHeadings(container);
    expect(headings).toHaveLength(1);
    expect(headings[0].label).toBe('合法标题');
  });

  it('空值与无标题文档优雅防卫：防御性返回空数组 []', () => {
    expect(extractDocumentHeadings(null)).toEqual([]);

    container.innerHTML = `
      <p class="docx_Normal">纯正文随笔，没有任何标题样式。</p>
      <p class="docx_Normal">第二段随笔正文。</p>
    `;

    expect(extractDocumentHeadings(container)).toEqual([]);
  });

  it('resolveHeadingLevel 能够根据多种命名规范推导层级，未识别时保底为 1', () => {
    const h3 = document.createElement('h3');
    expect(resolveHeadingLevel(h3)).toBe(3);

    const docxP = document.createElement('p');
    docxP.className = 'docx_heading_2';
    expect(resolveHeadingLevel(docxP)).toBe(2);

    const idElem = document.createElement('p');
    idElem.id = 'docx-heading-4';
    expect(resolveHeadingLevel(idElem)).toBe(4);

    const unknown = document.createElement('p');
    expect(resolveHeadingLevel(unknown)).toBe(1);
  });
});
