/**
 * 金融级高精度金额运算与千分位格式化纯原生工具实现。
 *
 * 采用整型位移与字符串确定性补齐算法，彻底规避原生 JavaScript 浮点数丢失与精度截断。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import type { CurrencyFormatOptions } from './types';

/**
 * 将以“元”为单位的金额精准转换为以“分”为单位的整型数值。
 *
 * 严格基于字符串切分与整数运算，彻底消除浮点数精度误差（如 0.07 * 100 变成 7.000000000000001）。
 * 超出 2 位小数时执行四舍五入。
 *
 * @param yuan 元单位数值或字符串（如 '12.34', 12.34, '100'）
 * @returns 分单位整型数值，非法或空值保底返回 0
 */
export function toCents(yuan: number | string | null | undefined): number {
  if (yuan === null || yuan === undefined) {
    return 0;
  }

  const str = String(yuan).trim();
  if (!str || !/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(str)) {
    return 0;
  }

  const isNegative = str.startsWith('-');
  const cleanStr = isNegative ? str.slice(1) : str.startsWith('+') ? str.slice(1) : str;

  const [intStr = '0', decStr = ''] = cleanStr.split('.');
  const intPart = Number(intStr);
  if (Number.isNaN(intPart)) {
    return 0;
  }

  // 补齐至少 2 位小数
  const paddedDec = (decStr + '00').slice(0, 2);
  const thirdDigit = decStr.length > 2 ? Number(decStr[2]) : 0;

  let cents = intPart * 100 + Number(paddedDec);
  if (thirdDigit >= 5) {
    cents += 1;
  }

  return isNegative ? -cents : cents;
}

/**
 * 将以“分”为单位的整型金额精准转换为以“元”为单位的带两位小数的字符串。
 *
 * 采用字符串确定性格式化，保证不会产生浮点数误差。
 *
 * @param cents 分单位数值或字符串（如 1234, '1234', 5）
 * @returns 元单位字符串（如 '12.34', '0.05'），非法或空值保底返回 '0.00'
 */
export function toYuan(cents: number | string | null | undefined): string {
  if (cents === null || cents === undefined) {
    return '0.00';
  }

  const str = String(cents).trim();
  if (!str || !/^[+-]?\d+$/.test(str)) {
    return '0.00';
  }

  const isNegative = str.startsWith('-');
  const cleanStr = isNegative ? str.slice(1) : str.startsWith('+') ? str.slice(1) : str;

  if (cleanStr === '' || cleanStr === '0') {
    return '0.00';
  }

  // 补齐至少 3 位以便安全分割整数与小数位（如 5 -> 005 -> 0.05）
  const padded = cleanStr.padStart(3, '0');
  const intPart = padded.slice(0, -2);
  const decPart = padded.slice(-2);
  const result = `${intPart}.${decPart}`;

  return isNegative ? `-${result}` : result;
}

/**
 * 标准金融货币千分位与符号格式化。
 *
 * 支持千分位逗号分隔、币种符号前缀、自定义小数位数与会计负数括号模式。
 *
 * @param amount 金额数值或字符串
 * @param options 格式化配置项
 * @returns 格式化后的金额展示文本
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  options: CurrencyFormatOptions = {},
): string {
  const {
    symbol = '',
    precision = 2,
    thousandSeparator = ',',
    decimalSeparator = '.',
    negativePattern = 'minus',
    fromCents = false,
  } = options;

  if (amount === null || amount === undefined) {
    return formatZero(symbol, precision, decimalSeparator);
  }

  let sourceStr = String(amount).trim();
  if (!sourceStr) {
    return formatZero(symbol, precision, decimalSeparator);
  }

  // 若来源于分单位，先转换为元单位
  if (fromCents) {
    sourceStr = toYuan(sourceStr);
  }

  const num = Number(sourceStr);
  if (Number.isNaN(num)) {
    return formatZero(symbol, precision, decimalSeparator);
  }

  const absNum = Math.abs(num);

  // 四舍五入到指定精度
  const fixedStr = absNum.toFixed(precision);
  const isZero = Number(fixedStr) === 0;
  const isNegative = num < 0 && !isZero;
  const [rawInt = '0', rawDec = ''] = fixedStr.split('.');

  // 整数部分添加千分位
  const formattedInt = rawInt.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator);

  // 拼接整数与小数部分
  let formattedNumber = formattedInt;
  if (precision > 0 && rawDec) {
    formattedNumber += `${decimalSeparator}${rawDec}`;
  }

  // 处理负数符号与会计括号
  if (isNegative) {
    if (negativePattern === 'parentheses') {
      return `(${symbol}${formattedNumber})`;
    }
    return `-${symbol}${formattedNumber}`;
  }

  return `${symbol}${formattedNumber}`;
}

/**
 * 格式化零金额防御性辅助函数。
 */
function formatZero(symbol: string, precision: number, decimalSeparator: string): string {
  const dec = precision > 0 ? `${decimalSeparator}${'0'.repeat(precision)}` : '';
  return `${symbol}0${dec}`;
}
