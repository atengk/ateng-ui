/**
 * 打印防截断撕裂指令 (v-print-no-split)。
 *
 * 声明式标记在打印或分页切片时不可被从中间腰斩截断的原子行或块元素（如表格行、图表卡片、签名栏）。
 * 自动注入 CSS break-inside: avoid 并附加 .at-print-no-split 类名与 data-print-no-split="true" 标记，
 * 供分页引擎进行物理尺寸切点推移计算。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import type { Directive } from 'vue';

export const vPrintNoSplit: Directive<HTMLElement> = {
  mounted(el) {
    el.classList.add('at-print-no-split');
    el.setAttribute('data-print-no-split', 'true');
    el.style.breakInside = 'avoid';
    // 兼容 WebKit 旧版规范
    (el.style as unknown as Record<string, string>)['pageBreakInside'] = 'avoid';
  },
  updated(el) {
    el.classList.add('at-print-no-split');
    el.setAttribute('data-print-no-split', 'true');
    el.style.breakInside = 'avoid';
  },
  unmounted(el) {
    el.classList.remove('at-print-no-split');
    el.removeAttribute('data-print-no-split');
  },
};
