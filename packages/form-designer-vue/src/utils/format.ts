/**
 * @atengk/form-designer-vue 表单字段只读态脱壳格式化与数据脱敏工具。
 *
 * 遵循 ADR-0017（前端内存真明文与渲染态脱敏）与 ADR-0044 规约：
 * 状态层与表单数据保持原始数据契约，只读展示态支持金额货币格式化、日期时间格式化与敏感隐私脱敏。
 *
 * @author Ateng
 * @since 2026-11-09
 */

export type ReadonlyFormatType =
  'currency' | 'date' | 'datetime' | 'phone' | 'idCard' | 'email' | 'custom';

export interface ReadonlyFormatOptions {
  /** 格式化类型 */
  formatType?: ReadonlyFormatType;
  /** 格式化类型别名 */
  format?: ReadonlyFormatType;
  /** 货币符号，默认 '¥' */
  currencySymbol?: string;
  /** 小数位数，默认 2 */
  precision?: number;
  /** 日期显示格式，默认 'YYYY-MM-DD' */
  dateFormat?: string;
  /** 自定义格式化函数 */
  formatter?: (val: unknown) => string;
}

/**
 * 格式化金额货币（千分位加逗号与货币符号）。
 */
export function formatCurrency(val: unknown, symbol = '¥', precision = 2): string {
  if (val == null || val === '') {
    return '-';
  }
  const num = Number(val);
  if (isNaN(num)) {
    return String(val);
  }

  const formattedNum = new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(num);

  return symbol ? `${symbol} ${formattedNum}` : formattedNum;
}

/**
 * 手机号脱敏（前 3 后 4 中间 4 颗星）。
 */
export function formatPhone(val: unknown): string {
  if (val == null || val === '') {
    return '-';
  }
  const str = String(val).trim();
  if (/^1\d{10}$/.test(str)) {
    return str.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  }
  return str;
}

/**
 * 身份证号脱敏（前 6 后 4 中间 8 颗星）。
 */
export function formatIdCard(val: unknown): string {
  if (val == null || val === '') {
    return '-';
  }
  const str = String(val).trim();
  if (/^\d{17}[\dXx]$/.test(str)) {
    return str.replace(/(\d{6})\d{8}(\w{4})/, '$1********$2');
  }
  return str;
}

/**
 * 电子邮箱脱敏（首字母保留，中间星号，保留域名）。
 */
export function formatEmail(val: unknown): string {
  if (val == null || val === '') {
    return '-';
  }
  const str = String(val).trim();
  const atIndex = str.indexOf('@');
  if (atIndex > 1) {
    const name = str.substring(0, atIndex);
    const domain = str.substring(atIndex);
    const maskedName = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : `${name[0]}***`;
    return `${maskedName}${domain}`;
  }
  return str;
}

/**
 * 日期时间格式化。
 */
export function formatDate(val: unknown, isDateTime = false): string {
  if (val == null || val === '') {
    return '-';
  }

  const date = val instanceof Date ? val : new Date(String(val));
  if (isNaN(date.getTime())) {
    return String(val);
  }

  const YYYY = date.getFullYear();
  const MM = String(date.getMonth() + 1).padStart(2, '0');
  const DD = String(date.getDate()).padStart(2, '0');

  if (!isDateTime) {
    return `${YYYY}-${MM}-${DD}`;
  }

  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');

  return `${YYYY}-${MM}-${DD} ${hh}:${mm}:${ss}`;
}

/**
 * 统一只读值转换门面。
 */
export function formatReadonlyValue(value: unknown, options?: ReadonlyFormatOptions): string {
  if (value == null || value === '') {
    return '-';
  }

  if (!options) {
    return String(value);
  }

  // 1. 自定义格式化函数最高优先
  if (typeof options.formatter === 'function') {
    try {
      return options.formatter(value);
    } catch {
      return String(value);
    }
  }

  // 2. 内置语义化类型转换
  const type = options.formatType || options.format;
  switch (type) {
    case 'currency':
      return formatCurrency(value, options.currencySymbol ?? '¥', options.precision ?? 2);
    case 'phone':
      return formatPhone(value);
    case 'idCard':
      return formatIdCard(value);
    case 'email':
      return formatEmail(value);
    case 'date':
      return formatDate(value, false);
    case 'datetime':
      return formatDate(value, true);
    default:
      return String(value);
  }
}
