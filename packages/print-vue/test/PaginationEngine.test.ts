/**
 * PaginationEngine 动态长单据分页防截断引擎单元测试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect } from 'vitest';
import { PaginationEngine } from '../src/services/PaginationEngine';

describe('PaginationEngine 动态长单据分页防截断引擎', () => {
  it('空容器极端边界：返回保底第 1 页且总页数为 1', () => {
    const container = document.createElement('div');
    const result = PaginationEngine.paginate(container, {
      pageHeight: 1000,
      paddingTop: 20,
      paddingBottom: 20,
    });

    expect(result.totalPages).toBe(1);
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].pageIndex).toBe(1);
    expect(result.pages[0].totalPages).toBe(1);
    expect(result.pages[0].elements).toHaveLength(0);
  });

  it('单页内容不超限：全部元素保留在第 1 页', () => {
    const container = document.createElement('div');
    const child1 = document.createElement('div');
    child1.setAttribute('data-height', '200');
    child1.textContent = '板块 1';

    const child2 = document.createElement('div');
    child2.setAttribute('data-height', '300');
    child2.textContent = '板块 2';

    container.appendChild(child1);
    container.appendChild(child2);

    const result = PaginationEngine.paginate(container, {
      pageHeight: 1000,
    });

    expect(result.totalPages).toBe(1);
    expect(result.pages[0].elements).toHaveLength(2);
  });

  it('超长表格切片：带 thead 的多行表格在跨页时自动推移且在续页复制表头', () => {
    const container = document.createElement('div');
    const table = document.createElement('table');
    table.className = 'test-table';

    const thead = document.createElement('thead');
    thead.setAttribute('data-height', '50');
    const headRow = document.createElement('tr');
    const th = document.createElement('th');
    th.textContent = '标题';
    headRow.appendChild(th);
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    // 假设单页可用高度 250px，thead 50px，每行 50px
    // 第 1 页：thead (50) + row 1 (50) + row 2 (50) + row 3 (50) + row 4 (50) = 250px (4行)
    // 第 2 页：thead (50) + row 5 (50) + row 6 (50) = 150px (2行)
    for (let i = 1; i <= 6; i++) {
      const tr = document.createElement('tr');
      tr.setAttribute('data-height', '50');
      tr.classList.add('at-print-no-split');
      const td = document.createElement('td');
      td.textContent = `行 ${i}`;
      tr.appendChild(td);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    container.appendChild(table);

    const result = PaginationEngine.paginate(container, {
      pageHeight: 250,
      paddingTop: 0,
      paddingBottom: 0,
    });

    expect(result.totalPages).toBe(2);
    expect(result.pages).toHaveLength(2);

    // 第 1 页应有 table，且包含 thead 和 4 行
    const page1Table = result.pages[0].elements[0] as HTMLTableElement;
    expect(page1Table.tagName).toBe('TABLE');
    expect(page1Table.querySelector('thead')).not.toBeNull();
    expect(page1Table.querySelectorAll('tbody > tr')).toHaveLength(4);

    // 第 2 页也应有 table，且包含复制的 thead 和 2 行
    const page2Table = result.pages[1].elements[0] as HTMLTableElement;
    expect(page2Table.tagName).toBe('TABLE');
    expect(page2Table.querySelector('thead')).not.toBeNull();
    expect(page2Table.querySelectorAll('tbody > tr')).toHaveLength(2);
  });

  it('no-split 块跨越底边切点时整体完整前移至下一页', () => {
    const container = document.createElement('div');
    // 页高 500px
    const block1 = document.createElement('div');
    block1.setAttribute('data-height', '400');
    block1.textContent = '第一块 (400px)';

    // 第二块带有 no-split，高度 150px。400 + 150 = 550 > 500
    // 若不防截断会被拦腰切断，防截断则整体推至下一页
    const block2 = document.createElement('div');
    block2.setAttribute('data-height', '150');
    block2.classList.add('at-print-no-split');
    block2.textContent = '防撕裂第二块 (150px)';

    container.appendChild(block1);
    container.appendChild(block2);

    const result = PaginationEngine.paginate(container, {
      pageHeight: 500,
    });

    expect(result.totalPages).toBe(2);
    expect(result.pages[0].elements).toHaveLength(1);
    expect(result.pages[0].elements[0].textContent).toBe('第一块 (400px)');

    expect(result.pages[1].elements).toHaveLength(1);
    expect(result.pages[1].elements[0].textContent).toBe('防撕裂第二块 (150px)');
  });

  it('遇到 at-print-break 时强制换页', () => {
    const container = document.createElement('div');
    const block1 = document.createElement('div');
    block1.setAttribute('data-height', '100');
    block1.textContent = '页 1 内容';

    const breakEl = document.createElement('div');
    breakEl.classList.add('at-print-break');

    const block2 = document.createElement('div');
    block2.setAttribute('data-height', '100');
    block2.textContent = '页 2 内容';

    container.appendChild(block1);
    container.appendChild(breakEl);
    container.appendChild(block2);

    const result = PaginationEngine.paginate(container, {
      pageHeight: 1000,
    });

    expect(result.totalPages).toBe(2);
    expect(result.pages[0].elements[0].textContent).toBe('页 1 内容');
    expect(result.pages[1].elements[0].textContent).toBe('页 2 内容');
  });

  it('精确扣减页眉 headerHeight 与页脚 footerHeight', () => {
    const container = document.createElement('div');
    // pageHeight: 500, header: 50, footer: 50 => maxContentHeight = 400
    const block1 = document.createElement('div');
    block1.setAttribute('data-height', '350');

    const block2 = document.createElement('div');
    block2.setAttribute('data-height', '100');
    block2.classList.add('at-print-no-split');

    container.appendChild(block1);
    container.appendChild(block2);

    const result = PaginationEngine.paginate(container, {
      pageHeight: 500,
      headerHeight: 50,
      footerHeight: 50,
    });

    // 350 + 100 = 450 > 400，block2 必须换到第 2 页
    expect(result.totalPages).toBe(2);
    expect(result.pages[0].elements).toHaveLength(1);
    expect(result.pages[1].elements).toHaveLength(1);
  });
});
