/**
 * 一维条码格式前置离线防崩溃校验引擎。
 *
 * 在调用底层渲染引擎前对入参进行合法性断言，杜绝抛出未捕获运行时异常导致页面白屏。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import type { BarcodeFormat, BarcodeValidationResult } from '../types';

/**
 * 校验 EAN-13 奇偶校验码。
 */
function validateEan13Checksum(digits: string): boolean {
  if (digits.length === 12) {
    return true;
  }
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const n = Number.parseInt(digits.charAt(i), 10);
    sum += i % 2 === 0 ? n : n * 3;
  }
  const expectedCheckDigit = (10 - (sum % 10)) % 10;
  return expectedCheckDigit === Number.parseInt(digits.charAt(12), 10);
}

/**
 * 校验 EAN-8 奇偶校验码。
 */
function validateEan8Checksum(digits: string): boolean {
  if (digits.length === 7) {
    return true;
  }
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    const n = Number.parseInt(digits.charAt(i), 10);
    sum += i % 2 === 0 ? n * 3 : n;
  }
  const expectedCheckDigit = (10 - (sum % 10)) % 10;
  return expectedCheckDigit === Number.parseInt(digits.charAt(7), 10);
}

/**
 * 校验 UPC-A 奇偶校验码。
 */
function validateUpcChecksum(digits: string): boolean {
  if (digits.length === 11) {
    return true;
  }
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    const n = Number.parseInt(digits.charAt(i), 10);
    sum += i % 2 === 0 ? n * 3 : n;
  }
  const expectedCheckDigit = (10 - (sum % 10)) % 10;
  return expectedCheckDigit === Number.parseInt(digits.charAt(11), 10);
}

/**
 * 校验 ITF-14 奇偶校验码。
 */
function validateItf14Checksum(digits: string): boolean {
  if (digits.length === 13) {
    return true;
  }
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    const n = Number.parseInt(digits.charAt(i), 10);
    sum += i % 2 === 0 ? n * 3 : n;
  }
  const expectedCheckDigit = (10 - (sum % 10)) % 10;
  return expectedCheckDigit === Number.parseInt(digits.charAt(13), 10);
}

/**
 * 前置校验条码字符串是否符合指定的一维码格式规则。
 *
 * @param value 条码原始字符
 * @param format 目标编码格式，默认为 CODE128
 * @returns 校验结果实体
 */
export function validateBarcode(
  value: string | undefined | null,
  format: BarcodeFormat = 'CODE128',
): BarcodeValidationResult {
  // 1. 空安全保底拦截
  if (value === undefined || value === null || value.trim() === '') {
    return {
      valid: false,
      message: '条码内容不能为空',
    };
  }

  const raw = value.trim();

  // 2. 分格式规则校验
  switch (format) {
    case 'EAN13': {
      if (!/^\d{12,13}$/.test(raw)) {
        return {
          valid: false,
          message: 'EAN-13 格式必须为 12 或 13 位纯数字',
        };
      }
      if (!validateEan13Checksum(raw)) {
        return {
          valid: false,
          message: 'EAN-13 奇偶校验位不匹配，第 13 位数字校验失败',
        };
      }
      return { valid: true, normalizedValue: raw };
    }

    case 'EAN8': {
      if (!/^\d{7,8}$/.test(raw)) {
        return {
          valid: false,
          message: 'EAN-8 格式必须为 7 或 8 位纯数字',
        };
      }
      if (!validateEan8Checksum(raw)) {
        return {
          valid: false,
          message: 'EAN-8 奇偶校验位不匹配，第 8 位数字校验失败',
        };
      }
      return { valid: true, normalizedValue: raw };
    }

    case 'EAN5': {
      if (!/^\d{5}$/.test(raw)) {
        return { valid: false, message: 'EAN-5 格式必须为恰好 5 位纯数字' };
      }
      return { valid: true, normalizedValue: raw };
    }

    case 'EAN2': {
      if (!/^\d{2}$/.test(raw)) {
        return { valid: false, message: 'EAN-2 格式必须为恰好 2 位纯数字' };
      }
      return { valid: true, normalizedValue: raw };
    }

    case 'UPC': {
      if (!/^\d{11,12}$/.test(raw)) {
        return { valid: false, message: 'UPC-A 格式必须为 11 或 12 位纯数字' };
      }
      if (!validateUpcChecksum(raw)) {
        return { valid: false, message: 'UPC-A 校验位不合法' };
      }
      return { valid: true, normalizedValue: raw };
    }

    case 'UPCE': {
      if (!/^\d{6,8}$/.test(raw)) {
        return { valid: false, message: 'UPC-E 格式必须为 6 到 8 位纯数字' };
      }
      return { valid: true, normalizedValue: raw };
    }

    case 'CODE39': {
      // CODE39 支持 0-9, A-Z, 常见符号空格, -$%./+
      if (!/^[0-9A-Z\s\-.$/+%*]+$/.test(raw)) {
        return {
          valid: false,
          message: 'CODE39 格式仅支持大写英文字母、数字及 -$%./+* 字符',
        };
      }
      return { valid: true, normalizedValue: raw };
    }

    case 'ITF14': {
      if (!/^\d{13,14}$/.test(raw)) {
        return { valid: false, message: 'ITF-14 格式必须为 13 或 14 位纯数字' };
      }
      if (!validateItf14Checksum(raw)) {
        return { valid: false, message: 'ITF-14 校验位不合法' };
      }
      return { valid: true, normalizedValue: raw };
    }

    case 'ITF': {
      if (!/^\d+$/.test(raw)) {
        return { valid: false, message: 'ITF 条码必须为纯数字' };
      }
      if (raw.length % 2 !== 0) {
        return { valid: false, message: 'ITF (Interleaved 2 of 5) 必须为偶数位纯数字' };
      }
      return { valid: true, normalizedValue: raw };
    }

    case 'CODE128C': {
      if (!/^\d+$/.test(raw) || raw.length % 2 !== 0) {
        return { valid: false, message: 'CODE128C 必须为偶数位纯数字' };
      }
      return { valid: true, normalizedValue: raw };
    }

    case 'pharmacode': {
      const num = Number.parseInt(raw, 10);
      if (Number.isNaN(num) || !/^\d+$/.test(raw) || num < 3 || num > 131070) {
        return {
          valid: false,
          message: 'Pharmacode 必须为介于 3 到 131070 之间的正整数',
        };
      }
      return { valid: true, normalizedValue: raw };
    }

    case 'codabar': {
      if (!/^[A-Da-d*entENT][0-9\-$:/.+]+[A-Da-d*entENT]$/.test(raw)) {
        return {
          valid: false,
          message: 'Codabar 必须以 A/B/C/D 字符启闭且中间为合法数字/符号',
        };
      }
      return { valid: true, normalizedValue: raw };
    }

    case 'CODE128':
    case 'CODE128A':
    case 'CODE128B':
    default: {
      // 检验是否为基本 ASCII 范围
      for (let i = 0; i < raw.length; i++) {
        if (raw.charCodeAt(i) > 127) {
          return {
            valid: false,
            message: `${format} 条码包含超出标准 ASCII 的字符（不支持中文字符）`,
          };
        }
      }
      return { valid: true, normalizedValue: raw };
    }
  }
}
