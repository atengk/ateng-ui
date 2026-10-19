/**
 * 内存真明文展示脱敏工具集。
 *
 * 恪守“内存真明文不变量”，所有脱敏均为展示渲染层纯函数计算，
 * 严禁就地污染或篡改内存中的真实业务数据模型。
 * 具备严格的空安全保底防御，遇到非法输入或空值均安全容错返回，绝不抛出异常。
 *
 * @author Ateng
 * @since 2026-10-19
 */

/**
 * 提取有效的掩码字符，保底为 '*'。
 */
function resolveMaskChar(maskChar?: string): string {
  return maskChar || '*';
}

/**
 * 通用文本脱敏函数。
 *
 * @param value 待脱敏的原文字符串
 * @param startKeep 前部保留明文位数，默认为 0
 * @param endKeep 后部保留明文位数，默认为 0
 * @param maskChar 掩码字符，默认为 '*'
 * @returns 脱敏后的字符串
 */
export function formatMask(
  value: string | null | undefined,
  startKeep: number = 0,
  endKeep: number = 0,
  maskChar: string = '*',
): string {
  if (value == null) {
    return '';
  }
  const str = String(value);
  if (!str) {
    return '';
  }

  const start = Math.max(0, Math.floor(startKeep || 0));
  const end = Math.max(0, Math.floor(endKeep || 0));

  if (start + end >= str.length) {
    return str;
  }

  const maskLen = str.length - start - end;
  const prefix = str.slice(0, start);
  const suffix = end > 0 ? str.slice(-end) : '';
  const char = resolveMaskChar(maskChar);

  return `${prefix}${char.repeat(maskLen)}${suffix}`;
}

/**
 * 手机号脱敏（标准 3-4-4 格式，如 '13812345678' -> '138****5678'）。
 *
 * @param phone 手机号字符串
 * @param maskChar 掩码字符，默认为 '*'
 * @returns 脱敏后的手机号
 */
export function formatMaskPhone(phone: string | null | undefined, maskChar: string = '*'): string {
  if (phone == null) {
    return '';
  }
  const str = String(phone).trim();
  if (!str) {
    return '';
  }

  // 匹配常规 11 位手机号（支持包含空格、短横线分隔符以及 +86 国际区号）
  const match = str.match(/^(\+?86[- ]?)?(\d{3})[- ]?(\d{4})[- ]?(\d{4})$/);
  if (match) {
    const country = match[1] ?? '';
    const prefix = match[2];
    const suffix = match[4];
    const char = resolveMaskChar(maskChar);
    return `${country}${prefix}${char.repeat(4)}${suffix}`;
  }

  // 非规范格式或异常长度，安全回退到通用 3-4 脱敏
  return formatMask(str, 3, 4, maskChar);
}

/**
 * 身份证号脱敏。
 * 18 位身份证默认保留前 6 位与后 4 位，中间 8 位出生年月日脱敏；
 * 15 位身份证默认保留前 6 位与后 3 位，中间 6 位出生年月日脱敏。
 *
 * @param idCard 身份证号字符串
 * @param startKeep 前部保留位数，默认为 6
 * @param endKeep 后部保留位数，默认为 4
 * @param maskChar 掩码字符，默认为 '*'
 * @returns 脱敏后的身份证号
 */
export function formatMaskIdCard(
  idCard: string | null | undefined,
  startKeep: number = 6,
  endKeep: number = 4,
  maskChar: string = '*',
): string {
  if (idCard == null) {
    return '';
  }
  const str = String(idCard).trim();
  if (!str) {
    return '';
  }

  const char = resolveMaskChar(maskChar);

  // 15 位一代身份证：保留前 6 位与后 3 位，中间 6 位出生年月日脱敏
  if (str.length === 15 && startKeep === 6 && endKeep === 4) {
    return `${str.slice(0, 6)}${char.repeat(6)}${str.slice(12)}`;
  }

  // 18 位身份证或自定义保留位数统一交由底层 formatMask 高效处理
  return formatMask(str, startKeep, endKeep, maskChar);
}

/**
 * 电子邮箱地址脱敏。
 * 脱敏用户名部分，完整保留域名后缀（如 'service@atengk.com' -> 's*****e@atengk.com'）。
 *
 * @param email 邮箱地址字符串
 * @param maskChar 掩码字符，默认为 '*'
 * @returns 脱敏后的邮箱地址
 */
export function formatMaskEmail(email: string | null | undefined, maskChar: string = '*'): string {
  if (email == null) {
    return '';
  }
  const str = String(email).trim();
  if (!str) {
    return '';
  }

  const atIndex = str.indexOf('@');
  if (atIndex === -1) {
    return formatMask(str, 1, 1, maskChar);
  }

  const username = str.slice(0, atIndex);
  const domain = str.slice(atIndex);
  const char = resolveMaskChar(maskChar);

  if (username.length <= 1) {
    return `${char}${domain}`;
  }
  if (username.length === 2) {
    return `${username[0]}${char}${domain}`;
  }

  // 用户名长度 >= 3：保留首尾字符，中间字符以 maskChar 替换
  const maskLen = username.length - 2;
  return `${username[0]}${char.repeat(maskLen)}${username.slice(-1)}${domain}`;
}

/**
 * 中文姓名脱敏。
 * 2 字姓名脱敏末尾字符（如 '张三' -> '张*'）；
 * 3 字姓名脱敏中间字符（如 '李小龙' -> '李*龙'）；
 * 4 字及以上姓名脱敏中间所有字符（如 '诸葛孔明' -> '诸**明'）。
 *
 * @param name 姓名字符串
 * @param maskChar 掩码字符，默认为 '*'
 * @returns 脱敏后的姓名
 */
export function formatMaskName(name: string | null | undefined, maskChar: string = '*'): string {
  if (name == null) {
    return '';
  }
  const str = String(name).trim();
  if (!str) {
    return '';
  }

  if (str.length <= 1) {
    return str;
  }

  const char = resolveMaskChar(maskChar);

  if (str.length === 2) {
    return `${str[0]}${char}`;
  }

  const maskLen = str.length - 2;
  return `${str[0]}${char.repeat(maskLen)}${str.slice(-1)}`;
}
