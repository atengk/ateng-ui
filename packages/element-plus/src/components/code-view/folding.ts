/**
 * 代码查看器代码块折叠算法与行状态计算（零外部依赖）。
 *
 * 采用原生成对括号匹配算法，支持 JSON 对象/数组以及多行代码块层级折叠。
 *
 * @author Ateng
 * @since 2026-10-22
 */

export interface FoldRange {
  /**
   * 0-based 起始行索引（包含折叠触发展开点）。
   */
  startLine: number;
  /**
   * 0-based 结束行索引（折叠时隐藏的末尾行）。
   */
  endLine: number;
  /**
   * 括号类型。
   */
  type: 'object' | 'array';
  /**
   * 折叠时显示的简略占位文案（如 '... }'、'... ],'）。
   */
  placeholder: string;
}

export interface VisibleLineItem {
  /**
   * 0-based 原始行索引。
   */
  lineIndex: number;
  /**
   * 1-based 物理行号。
   */
  lineNo: number;
  /**
   * 高亮后的 HTML 片段。
   */
  html: string;
  /**
   * 当前行是否属于可折叠的块首行。
   */
  isFoldable: boolean;
  /**
   * 当前行是否处于折叠状态。
   */
  isFolded: boolean;
  /**
   * 折叠时的占位文案。
   */
  placeholder?: string;
}

/**
 * 扫描代码行，提取所有跨多行的成对括号折叠区间。
 *
 * @param lines 代码切分行文本数组
 * @returns 折叠区间列表
 */
export function computeFoldRanges(lines: string[]): FoldRange[] {
  const stack: { type: '{' | '['; line: number }[] = [];
  const ranges: FoldRange[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) {
      continue;
    }

    let inString: string | null = null;
    let isEscaped = false;

    for (let col = 0; col < line.length; col++) {
      const char = line[col];
      if (char === undefined) {
        continue;
      }

      if (isEscaped) {
        isEscaped = false;
        continue;
      }
      if (char === '\\' && inString) {
        isEscaped = true;
        continue;
      }

      if (char === '"' || char === "'" || char === '`') {
        if (!inString) {
          inString = char;
        } else if (inString === char) {
          inString = null;
        }
        continue;
      }

      if (inString) {
        continue;
      }

      // 遇到单行注释（// 或 --）直接截断后续分词
      if (char === '/' && line[col + 1] === '/') {
        break;
      }
      if (char === '-' && line[col + 1] === '-') {
        break;
      }

      if (char === '{' || char === '[') {
        stack.push({ type: char, line: i });
      } else if (char === '}' || char === ']') {
        const expected = char === '}' ? '{' : '[';
        const top = stack[stack.length - 1];
        if (top && top.type === expected) {
          const open = stack.pop();
          if (open && i > open.line) {
            const endText = lines[i]?.trim() ?? '';
            const suffix = endText.startsWith(char) ? endText.slice(1) : '';
            const placeholder = open.type === '{' ? `... }${suffix}` : `... ]${suffix}`;
            ranges.push({
              startLine: open.line,
              endLine: i,
              type: open.type === '{' ? 'object' : 'array',
              placeholder,
            });
          }
        }
      }
    }
  }

  // 排序：先按 startLine 升序，若 startLine 相同则按 endLine 降序（最外层优先）
  return ranges.sort((a, b) => a.startLine - b.startLine || b.endLine - a.endLine);
}

/**
 * 将区间数组构建为以 startLine 为键的快速检索映射表。
 * 若同一行存在多个嵌套开括号，保留最外层折叠区间。
 *
 * @param ranges 折叠区间数组
 * @returns 映射表 Map<startLine, FoldRange>
 */
export function buildFoldRangeMap(ranges: FoldRange[]): Map<number, FoldRange> {
  const map = new Map<number, FoldRange>();
  for (const range of ranges) {
    if (!map.has(range.startLine)) {
      map.set(range.startLine, range);
    }
  }
  return map;
}

/**
 * 根据原始行、高亮 HTML 与折叠集合计算当前视口中可见的行列表。
 *
 * @param lines 原始行字符串数组
 * @param highlightedLines 高亮后的 HTML 行数组
 * @param rangeMap 折叠映射表
 * @param collapsedLines 当前已折叠的起始行集合
 * @returns 可视行数据数组
 */
export function computeVisibleLines(
  lines: string[],
  highlightedLines: string[],
  rangeMap: Map<number, FoldRange>,
  collapsedLines: Set<number>,
): VisibleLineItem[] {
  const result: VisibleLineItem[] = [];
  let skipUntil = -1;

  for (let i = 0; i < lines.length; i++) {
    if (i <= skipUntil) {
      continue;
    }

    const range = rangeMap.get(i);
    const isFoldable = range !== undefined;
    const isFolded = isFoldable && collapsedLines.has(i);

    result.push({
      lineIndex: i,
      lineNo: i + 1,
      html: highlightedLines[i] ?? '&nbsp;',
      isFoldable,
      isFolded,
      placeholder: isFolded && range ? range.placeholder : undefined,
    });

    if (isFolded && range) {
      skipUntil = range.endLine;
    }
  }

  return result;
}
