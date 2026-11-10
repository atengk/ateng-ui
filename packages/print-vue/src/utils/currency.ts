/**
 * 财务人民币大写金额转换工具函数。
 *
 * 遵循中国人民银行结算凭证标准，将数字金额转译为符合国家规范的人民币大写汉字。
 *
 * @author Ateng
 * @since 2026-11-10
 */

const FRACTION = ['角', '分'] as const;
const DIGITS = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'] as const;
const MAJOR_UNITS = ['元', '万', '亿', '兆'] as const;
const MINOR_UNITS = ['', '拾', '佰', '仟'] as const;

/**
 * 将阿拉伯数字金额格式化为标准财务人民币大写。
 *
 * @param n 金额数值（支持正数、负数与小数）
 * @returns 中文大写金额字符串（例如 "壹万贰仟叁佰肆拾伍元陆角柒分"）
 */
export function digitUppercase(n: number | string): string {
  const numVal = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(numVal)) {
    return '零元整';
  }

  const head = numVal < 0 ? '负' : '';
  let num = Math.abs(numVal);

  let fractionStr = '';
  const decimalPart = Math.round((num % 1) * 100);
  if (decimalPart > 0) {
    const jiao = Math.floor(decimalPart / 10);
    const fen = decimalPart % 10;
    if (jiao > 0) {
      fractionStr += (DIGITS[jiao] ?? '') + (FRACTION[0] ?? '');
    } else {
      fractionStr += '零';
    }
    if (fen > 0) {
      fractionStr += (DIGITS[fen] ?? '') + (FRACTION[1] ?? '');
    }
  }

  num = Math.floor(num);
  let integerStr = '';

  for (let i = 0; i < MAJOR_UNITS.length && num > 0; i++) {
    let p = '';
    for (let j = 0; j < MINOR_UNITS.length && num > 0; j++) {
      const digitChar = DIGITS[num % 10] ?? '';
      const unitChar = MINOR_UNITS[j] ?? '';
      p = digitChar + unitChar + p;
      num = Math.floor(num / 10);
    }
    const majorUnit = MAJOR_UNITS[i] ?? '';
    integerStr = p.replace(/(零.)*零$/, '').replace(/^$/, '零') + majorUnit + integerStr;
  }

  const result =
    head +
    (integerStr
      .replace(/(零.)*零元/, '元')
      .replace(/(零.)+/g, '零')
      .replace(/^整$/, '零元整') || '零元') +
    (fractionStr || '整');

  return result.replace(/^元整$/, '零元整');
}
