/**
 * 预设图表数值格式化通用辅助函数。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { formatCurrency } from '@atengk/core';

export interface FormatChartValueOptions {
  /**
   * 是否启用千分位展示。
   * @default true
   */
  formatThousands?: boolean;

  /**
   * 小数位数精度。
   */
  precision?: number;

  /**
   * 度量单位后缀。
   */
  unit?: string;
}

/**
 * 格式化业务图表数值（支持千分位与精度控制）。
 *
 * @param val 待格式化数值
 * @param opts 格式化选项
 * @returns 格式化后的字符串
 */
export function formatChartValue(val: number, opts?: FormatChartValueOptions): string {
  const precision = opts?.precision ?? (Number.isInteger(val) ? 0 : 2);
  const valStr =
    opts?.formatThousands !== false ? formatCurrency(val, { symbol: '', precision }) : String(val);
  const unitStr = opts?.unit ? ` ${opts.unit}` : '';
  return `${valStr}${unitStr}`;
}
