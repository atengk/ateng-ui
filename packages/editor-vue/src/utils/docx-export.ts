/**
 * prosemirrorJsonToDocxBlob: ProseMirror JSON AST 转标准 OpenXML docx 二进制文件生成器。
 *
 * 遵循四层洋葱拓扑之 L2 专用扩展层规范，纯前端离线映射：
 * 1. 结构化段落、多级标题（H1~H6）与文本对齐（居左/居中/居右/两端）；
 * 2. 行内样式分块（粗体、斜体、删除线、下划线、代码块与高亮）；
 * 3. 无序列表、有序列表与引用块（Blockquote）；
 * 4. 多行多列表格（Table、TableRow、TableHeader、TableCell）与边框背景；
 * 5. A4 纸张物理尺寸、纵横向切换、可调页边距与动态页眉页脚页码；
 * 6. 确定性内存回收保存工具 saveDocxFile（URL.revokeObjectURL）。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
  Packer,
  type ISectionOptions,
  type ParagraphChild,
} from 'docx';
import type { PageOrientation, PageMarginPreset, PageMarginConfig } from '../types/docx';

/**
 * DOCX 导出配置选项接口。
 */
export interface DocxExportOptions {
  /** 导出文件名（默认 'document.docx'） */
  fileName?: string;
  /** 纸张排版方向，默认 'portrait' */
  orientation?: PageOrientation;
  /** 页边距预设或自定义配置，默认 'standard' */
  pageMargin?: PageMarginPreset | PageMarginConfig;
  /** 页眉文本内容 */
  header?: string;
  /** 页脚文本内容 */
  footer?: string;
  /** 是否展示动态页码，默认 true */
  showPageNumber?: boolean;
}

/**
 * 将毫米 (mm) 转换为 Word 的 Twip 单位（1 inch = 1440 twip, 1 mm = 56.6929 twip）。
 */
function mmToTwip(mm: number): number {
  return Math.round(mm * 56.6929);
}

/**
 * 解析边距配置为 twip 单位。
 */
function resolveMarginsTwip(margin?: PageMarginPreset | PageMarginConfig): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  if (margin === 'narrow') {
    const twip = mmToTwip(12.7);
    return { top: twip, bottom: twip, left: twip, right: twip };
  }
  if (margin === 'wide') {
    return {
      top: mmToTwip(25.4),
      bottom: mmToTwip(25.4),
      left: mmToTwip(50.8),
      right: mmToTwip(50.8),
    };
  }
  if (typeof margin === 'object' && margin !== null) {
    const parseVal = (v?: string, fallbackMm = 25.4): number => {
      if (!v) return mmToTwip(fallbackMm);
      const num = parseFloat(v);
      if (Number.isNaN(num)) return mmToTwip(fallbackMm);
      if (v.endsWith('mm')) return mmToTwip(num);
      if (v.endsWith('cm')) return mmToTwip(num * 10);
      if (v.endsWith('in')) return Math.round(num * 1440);
      if (v.endsWith('px')) return Math.round((num / 3.7795) * 56.6929);
      return mmToTwip(num);
    };
    return {
      top: parseVal(margin.top, 25.4),
      bottom: parseVal(margin.bottom, 25.4),
      left: parseVal(margin.left, 31.8),
      right: parseVal(margin.right, 31.8),
    };
  }
  // standard: 上下 25.4mm (1440 twip), 左右 31.8mm (1803 twip)
  return {
    top: mmToTwip(25.4),
    bottom: mmToTwip(25.4),
    left: mmToTwip(31.8),
    right: mmToTwip(31.8),
  };
}

/**
 * 转换 ProseMirror 文本对齐属性为 docx AlignmentType。
 */
function resolveAlignment(align?: string): (typeof AlignmentType)[keyof typeof AlignmentType] {
  switch (align) {
    case 'center':
      return AlignmentType.CENTER;
    case 'right':
      return AlignmentType.RIGHT;
    case 'justify':
      return AlignmentType.JUSTIFIED;
    case 'left':
    default:
      return AlignmentType.LEFT;
  }
}

/**
 * 转换行内文本节点集合为 docx TextRun 集合。
 */
function convertInlineNodes(nodes?: Array<Record<string, unknown>>): ParagraphChild[] {
  if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
    return [new TextRun('')];
  }

  const runs: ParagraphChild[] = [];

  for (const node of nodes) {
    if (node.type === 'text') {
      const text = typeof node.text === 'string' ? node.text : '';
      const marks = Array.isArray(node.marks) ? node.marks : [];

      let isBold = false;
      let isItalic = false;
      let isStrike = false;
      let isUnderline = false;
      let isCode = false;
      let highlightColor: 'yellow' | undefined = undefined;

      for (const mark of marks) {
        const markType = mark.type;
        if (markType === 'bold') isBold = true;
        if (markType === 'italic') isItalic = true;
        if (markType === 'strike') isStrike = true;
        if (markType === 'underline') isUnderline = true;
        if (markType === 'code') isCode = true;
        if (markType === 'highlight') highlightColor = 'yellow';
      }

      runs.push(
        new TextRun({
          text,
          bold: isBold,
          italics: isItalic,
          strike: isStrike,
          underline: isUnderline ? {} : undefined,
          font: isCode ? 'Courier New' : undefined,
          highlight: highlightColor,
        }),
      );
    } else if (node.type === 'hardBreak') {
      runs.push(new TextRun({ break: 1 }));
    }
  }

  return runs.length > 0 ? runs : [new TextRun('')];
}

/**
 * 递归转换块级节点为 docx 段落或表格。
 */
function convertBlockNode(
  node: Record<string, unknown>,
  listType?: 'bullet' | 'ordered',
  listIndex = 0,
): Array<Paragraph | Table> {
  const type = node.type;
  const attrs = (node.attrs as Record<string, unknown>) ?? {};
  const content = (node.content as Array<Record<string, unknown>>) ?? [];

  switch (type) {
    case 'heading': {
      const level = typeof attrs.level === 'number' ? attrs.level : 1;
      let headingLevel: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1;
      if (level === 2) headingLevel = HeadingLevel.HEADING_2;
      else if (level === 3) headingLevel = HeadingLevel.HEADING_3;
      else if (level === 4) headingLevel = HeadingLevel.HEADING_4;
      else if (level === 5) headingLevel = HeadingLevel.HEADING_5;
      else if (level >= 6) headingLevel = HeadingLevel.HEADING_6;

      return [
        new Paragraph({
          heading: headingLevel,
          alignment: resolveAlignment(attrs.textAlign as string | undefined),
          children: convertInlineNodes(content),
          spacing: {
            before: 240,
            after: 120,
          },
        }),
      ];
    }

    case 'paragraph': {
      const children = convertInlineNodes(content);
      const alignment = resolveAlignment(attrs.textAlign as string | undefined);

      if (listType === 'bullet') {
        return [
          new Paragraph({
            bullet: { level: 0 },
            alignment,
            children,
            spacing: { before: 60, after: 60 },
          }),
        ];
      }

      if (listType === 'ordered') {
        return [
          new Paragraph({
            alignment,
            children: [
              new TextRun({
                text: `${listIndex + 1}. `,
                bold: true,
              }),
              ...children,
            ],
            spacing: { before: 60, after: 60 },
          }),
        ];
      }

      return [
        new Paragraph({
          alignment,
          children,
          spacing: { before: 80, after: 80 },
        }),
      ];
    }

    case 'bulletList': {
      const result: Array<Paragraph | Table> = [];
      for (const item of content) {
        if (item.type === 'listItem') {
          const itemContent = (item.content as Array<Record<string, unknown>>) ?? [];
          for (const sub of itemContent) {
            result.push(...convertBlockNode(sub, 'bullet'));
          }
        }
      }
      return result;
    }

    case 'orderedList': {
      const result: Array<Paragraph | Table> = [];
      let idx = 0;
      for (const item of content) {
        if (item.type === 'listItem') {
          const itemContent = (item.content as Array<Record<string, unknown>>) ?? [];
          for (const sub of itemContent) {
            result.push(...convertBlockNode(sub, 'ordered', idx));
          }
          idx++;
        }
      }
      return result;
    }

    case 'blockquote': {
      const result: Array<Paragraph | Table> = [];
      for (const sub of content) {
        const blocks = convertBlockNode(sub);
        for (const b of blocks) {
          if (b instanceof Paragraph) {
            result.push(b);
          }
        }
      }
      return result;
    }

    case 'table': {
      const rows: TableRow[] = [];
      for (const rowNode of content) {
        if (rowNode.type === 'tableRow') {
          const cells: TableCell[] = [];
          const cellNodes = (rowNode.content as Array<Record<string, unknown>>) ?? [];

          for (const cellNode of cellNodes) {
            const isHeader = cellNode.type === 'tableHeader';
            const cellContent = (cellNode.content as Array<Record<string, unknown>>) ?? [];

            const cellParagraphs: Paragraph[] = [];
            for (const sub of cellContent) {
              const blocks = convertBlockNode(sub);
              for (const b of blocks) {
                if (b instanceof Paragraph) {
                  cellParagraphs.push(b);
                }
              }
            }

            if (cellParagraphs.length === 0) {
              cellParagraphs.push(new Paragraph({ children: [new TextRun('')] }));
            }

            cells.push(
              new TableCell({
                children: cellParagraphs,
                shading: isHeader
                  ? {
                      fill: 'F1F5F9',
                    }
                  : undefined,
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
                  bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
                  left: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
                  right: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
                },
              }),
            );
          }

          rows.push(new TableRow({ children: cells }));
        }
      }

      if (rows.length === 0) return [];

      return [
        new Table({
          rows,
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
        }),
      ];
    }

    default:
      return [];
  }
}

/**
 * 将 ProseMirror 结构化 JSON 树映射生成为标准 OpenXML docx 二进制 Blob。
 *
 * @param json ProseMirror 结构化文档树对象（如 `{ type: 'doc', content: [...] }`）
 * @param options 排版与元数据配置选项
 * @returns 标准 docx 文件 Blob 对象
 */
export async function prosemirrorJsonToDocxBlob(
  json: Record<string, unknown>,
  options: DocxExportOptions = {},
): Promise<Blob> {
  const isLandscape = options.orientation === 'landscape';

  // A4 规格标准（Twip）：纵向 11906 × 16838 (210mm × 297mm)
  const pageWidthTwip = isLandscape ? 16838 : 11906;
  const pageHeightTwip = isLandscape ? 11906 : 16838;

  const margins = resolveMarginsTwip(options.pageMargin);

  // 转换正文块级元素
  const bodyContent = (json.content as Array<Record<string, unknown>>) ?? [];
  const sectionChildren: Array<Paragraph | Table> = [];

  for (const block of bodyContent) {
    const converted = convertBlockNode(block);
    sectionChildren.push(...converted);
  }

  // 保底：若文档为空，生成一个空段落
  if (sectionChildren.length === 0) {
    sectionChildren.push(new Paragraph({ children: [new TextRun('')] }));
  }

  // 装配页眉 (Header)
  let headersConfig: ISectionOptions['headers'] = undefined;
  if (options.header) {
    headersConfig = {
      default: new Header({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: options.header,
                size: 18, // 9pt
                color: '64748B',
              }),
            ],
          }),
        ],
      }),
    };
  }

  // 装配页脚 (Footer) 与动态页码
  let footersConfig: ISectionOptions['footers'] = undefined;
  const footerChildren: ParagraphChild[] = [];

  if (options.footer) {
    footerChildren.push(
      new TextRun({
        text: options.footer,
        size: 18,
        color: '64748B',
      }),
    );
  }

  if (options.showPageNumber !== false) {
    if (footerChildren.length > 0) {
      footerChildren.push(new TextRun({ text: '  ·  ' }));
    }
    footerChildren.push(
      new TextRun({ text: '第 ' }),
      new TextRun({ children: [PageNumber.CURRENT] }),
      new TextRun({ text: ' 页 / 共 ' }),
      new TextRun({ children: [PageNumber.TOTAL_PAGES] }),
      new TextRun({ text: ' 页' }),
    );
  }

  if (footerChildren.length > 0) {
    footersConfig = {
      default: new Footer({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: footerChildren,
          }),
        ],
      }),
    };
  }

  // 创建 docx 文档树
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: pageWidthTwip,
              height: pageHeightTwip,
              orientation: isLandscape ? 'landscape' : 'portrait',
            },
            margin: margins,
          },
        },
        headers: headersConfig,
        footers: footersConfig,
        children: sectionChildren,
      },
    ],
  });

  // 使用 Packer 在客户端生成真实二进制 Blob
  return await Packer.toBlob(doc);
}

/**
 * 遵循确定性生命周期与内存回收机制（URL.revokeObjectURL）触发客户端下载 docx 文件。
 *
 * @param blob 二进制 Blob 数据
 * @param fileName 下载保存的文件名（缺省为 'document.docx'）
 */
export function saveDocxFile(blob: Blob, fileName = 'document.docx'): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const normalizedName = fileName.endsWith('.docx') ? fileName : `${fileName}.docx`;
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = normalizedName;
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // 确定性内存回收：延迟 150ms 销毁临时 ObjectURL 句柄
  setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 150);
}
