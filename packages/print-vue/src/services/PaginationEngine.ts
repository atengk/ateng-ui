/**
 * 动态长单据分页防截断引擎。
 *
 * 负责扫描 DOM 内容物理尺寸与有效内容高度，识别 v-print-no-split 防撕裂标记与强制换页符，
 * 精准切分子页 <div class="at-print-page">，并在续页自动复制表格表头（thead）与列宽（colgroup）。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { parseLengthToPx } from '../types/paper';

/**
 * 分页引擎运行入参配置。
 */
export interface PaginationOptions {
  /** 单页物理可用高度（px） */
  pageHeight: number;
  /** 单页物理宽度（px，可选） */
  pageWidth?: number;
  /** 上内边距（px，默认 0） */
  paddingTop?: number;
  /** 下内边距（px，默认 0） */
  paddingBottom?: number;
  /** 页眉插槽高度（px，默认 0） */
  headerHeight?: number;
  /** 页脚插槽高度（px，默认 0） */
  footerHeight?: number;
  /** 容差像素（默认 1px） */
  tolerancePx?: number;
}

/**
 * 单张子页切片产物。
 */
export interface PageSlice {
  /** 当前页码（从 1 开始） */
  pageIndex: number;
  /** 计算出的总页数 */
  totalPages: number;
  /** 当前页挂载的深克隆 DOM 节点 */
  elements: HTMLElement[];
}

/**
 * 分页计算结果集合。
 */
export interface PaginationResult {
  /** 总页数（空内容保底返回 1） */
  totalPages: number;
  /** 各子页切片详情 */
  pages: PageSlice[];
}

/**
 * 测量指定 DOM 元素的高度。
 *
 * 优先读取 offsetHeight / getBoundingClientRect()，在无头或单测环境回退至 data-height 或 style.height。
 */
export function getElementHeight(el: HTMLElement): number {
  if (el.offsetHeight > 0) return el.offsetHeight;
  if (typeof el.getBoundingClientRect === 'function') {
    const rect = el.getBoundingClientRect();
    if (rect.height > 0) return rect.height;
  }
  const dataHeight = el.getAttribute('data-height');
  if (dataHeight) {
    const num = parseFloat(dataHeight);
    if (!isNaN(num) && num > 0) return num;
  }
  if (el.style.height) {
    const parsed = parseLengthToPx(el.style.height);
    if (parsed > 0) return parsed;
  }
  return 0;
}

/**
 * 检测当前元素是否具有防切断保护标记。
 */
export function isNoSplitElement(el: HTMLElement): boolean {
  if (el.classList?.contains('at-print-no-split')) return true;
  if (el.getAttribute('data-print-no-split') === 'true') return true;
  if (el.tagName === 'TR') return true;
  if (typeof window !== 'undefined' && window.getComputedStyle) {
    try {
      const style = window.getComputedStyle(el);
      if (
        style.breakInside === 'avoid' ||
        style.pageBreakInside === 'avoid' ||
        (style as unknown as Record<string, string>)['webkitPageBreakInside'] === 'avoid'
      ) {
        return true;
      }
    } catch {
      // 容错兜底
    }
  }
  return false;
}

/**
 * 检测当前元素是否为强制换页符。
 */
export function isBreakElement(el: HTMLElement): boolean {
  if (el.classList?.contains('at-print-break')) return true;
  if (el.getAttribute('data-print-break') === 'true') return true;
  if (typeof window !== 'undefined' && window.getComputedStyle) {
    try {
      const style = window.getComputedStyle(el);
      if (
        style.breakAfter === 'page' ||
        style.breakAfter === 'always' ||
        style.pageBreakAfter === 'always'
      ) {
        return true;
      }
    } catch {
      // 容错兜底
    }
  }
  return false;
}

type FlowItem =
  | {
      type: 'element';
      el: HTMLElement;
      height: number;
      noSplit: boolean;
      isBreak: boolean;
    }
  | {
      type: 'table-row';
      rowEl: HTMLTableRowElement;
      height: number;
      tableEl: HTMLTableElement;
      theadEl: HTMLTableSectionElement | null;
      colgroupEl: HTMLElement | null;
      theadHeight: number;
    };

/**
 * 递归抽取容器内部的可排版原子流动项。
 */
function extractFlowItems(container: HTMLElement): FlowItem[] {
  const items: FlowItem[] = [];

  // 如果容器仅有单个包装容器且非表格非 no-split，向下展开一层
  let root = container;
  if (
    root.children.length === 1 &&
    root.firstElementChild &&
    root.firstElementChild.tagName !== 'TABLE' &&
    !isNoSplitElement(root.firstElementChild as HTMLElement)
  ) {
    root = root.firstElementChild as HTMLElement;
  }

  const children = Array.from(root.children) as HTMLElement[];

  for (const child of children) {
    if (isBreakElement(child)) {
      items.push({
        type: 'element',
        el: child,
        height: 0,
        noSplit: true,
        isBreak: true,
      });
      continue;
    }

    if (child.tagName === 'TABLE') {
      const table = child as HTMLTableElement;
      const thead = table.querySelector('thead');
      const theadHeight = thead ? getElementHeight(thead as HTMLElement) : 0;
      const colgroup = table.querySelector('colgroup') as HTMLElement | null;
      const rows = Array.from(table.querySelectorAll('tbody > tr')) as HTMLTableRowElement[];

      if (rows.length === 0) {
        items.push({
          type: 'element',
          el: table,
          height: getElementHeight(table),
          noSplit: isNoSplitElement(table),
          isBreak: false,
        });
      } else {
        for (const row of rows) {
          const rowHeight = getElementHeight(row);
          items.push({
            type: 'table-row',
            rowEl: row,
            height: rowHeight,
            tableEl: table,
            theadEl: thead,
            colgroupEl: colgroup,
            theadHeight,
          });
        }
      }
      continue;
    }

    // 若为普通块，检查是否内含表格或换页符
    if (
      child.children.length > 0 &&
      !isNoSplitElement(child) &&
      child.querySelector('table, .at-print-no-split, .at-print-break')
    ) {
      items.push(...extractFlowItems(child));
    } else {
      items.push({
        type: 'element',
        el: child,
        height: getElementHeight(child),
        noSplit: isNoSplitElement(child),
        isBreak: false,
      });
    }
  }

  return items;
}

/**
 * 分页计算引擎单例。
 */
export class PaginationEngine {
  /**
   * 对指定的 DOM 容器执行内容扫描与物理分页切片。
   *
   * @param container 包含全部待打印内容的 DOM 容器
   * @param options 页面规格与尺寸参数
   * @returns 分页结果
   */
  public static paginate(container: HTMLElement, options: PaginationOptions): PaginationResult {
    const tolerance = options.tolerancePx ?? 0.5;
    const headerHeight = options.headerHeight ?? 0;
    const footerHeight = options.footerHeight ?? 0;
    const paddingTop = options.paddingTop ?? 0;
    const paddingBottom = options.paddingBottom ?? 0;

    // 计算单页最大可用内容高度
    let maxContentHeight =
      options.pageHeight - paddingTop - paddingBottom - headerHeight - footerHeight;
    if (maxContentHeight <= 0) {
      maxContentHeight = options.pageHeight;
    }

    const flowItems = extractFlowItems(container);

    // 空容器保底返回 1 页
    if (flowItems.length === 0) {
      return {
        totalPages: 1,
        pages: [
          {
            pageIndex: 1,
            totalPages: 1,
            elements: [],
          },
        ],
      };
    }

    const pageBuckets: Array<{ elements: HTMLElement[] }> = [];
    let currentElements: HTMLElement[] = [];
    let currentHeight = 0;

    let tableAccumulator: {
      tableEl: HTMLTableElement;
      theadEl: HTMLTableSectionElement | null;
      colgroupEl: HTMLElement | null;
      rows: HTMLTableRowElement[];
    } | null = null;

    const flushTable = () => {
      if (!tableAccumulator || tableAccumulator.rows.length === 0) return;
      const newTable = tableAccumulator.tableEl.cloneNode(false) as HTMLTableElement;
      if (tableAccumulator.colgroupEl) {
        newTable.appendChild(tableAccumulator.colgroupEl.cloneNode(true));
      }
      if (tableAccumulator.theadEl) {
        newTable.appendChild(tableAccumulator.theadEl.cloneNode(true));
      }
      const tbody = document.createElement('tbody');
      for (const row of tableAccumulator.rows) {
        tbody.appendChild(row.cloneNode(true));
      }
      newTable.appendChild(tbody);
      currentElements.push(newTable);
      tableAccumulator = null;
    };

    const finishPage = () => {
      flushTable();
      pageBuckets.push({ elements: currentElements });
      currentElements = [];
      currentHeight = 0;
    };

    for (const item of flowItems) {
      // 遇到强制分页断点
      if (item.type === 'element' && item.isBreak) {
        if (currentElements.length > 0 || (tableAccumulator && tableAccumulator.rows.length > 0)) {
          finishPage();
        }
        continue;
      }

      if (item.type === 'table-row') {
        // 判断当前页是否已载入表头高度
        const isNewTableOnPage = !tableAccumulator || tableAccumulator.tableEl !== item.tableEl;
        const requiredHeight =
          (isNewTableOnPage && item.theadEl ? item.theadHeight : 0) + item.height;

        // 如果超出当前页最大可用高度且当前页已有内容，触发物理换页
        const hasExistingContent =
          currentHeight > 0 || (tableAccumulator && tableAccumulator.rows.length > 0);
        if (hasExistingContent && currentHeight + requiredHeight > maxContentHeight + tolerance) {
          finishPage();
        }

        if (!tableAccumulator || tableAccumulator.tableEl !== item.tableEl) {
          flushTable();
          tableAccumulator = {
            tableEl: item.tableEl,
            theadEl: item.theadEl,
            colgroupEl: item.colgroupEl,
            rows: [item.rowEl],
          };
          currentHeight += (item.theadEl ? item.theadHeight : 0) + item.height;
        } else {
          tableAccumulator.rows.push(item.rowEl);
          currentHeight += item.height;
        }
        continue;
      }

      // 普通块元素
      flushTable();
      const hasExistingContent = currentElements.length > 0;
      if (hasExistingContent && currentHeight + item.height > maxContentHeight + tolerance) {
        finishPage();
      }

      currentElements.push(item.el.cloneNode(true) as HTMLElement);
      currentHeight += item.height;
    }

    // 收口最后一页
    flushTable();
    if (currentElements.length > 0) {
      pageBuckets.push({ elements: currentElements });
    }

    // 极端兜底
    if (pageBuckets.length === 0) {
      pageBuckets.push({ elements: [] });
    }

    const totalPages = pageBuckets.length;
    const pages: PageSlice[] = pageBuckets.map((bucket, idx) => ({
      pageIndex: idx + 1,
      totalPages,
      elements: bucket.elements,
    }));

    return {
      totalPages,
      pages,
    };
  }
}
