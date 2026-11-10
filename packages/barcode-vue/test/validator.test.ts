/**
 * BarcodeValidator 离线校验引擎单元测试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect } from 'vitest';
import { validateBarcode } from '../src/utils/validator';

describe('BarcodeValidator 离线校验引擎', () => {
  it('应当对空值、未定义与仅空白字符串执行保底拦截', () => {
    expect(validateBarcode('')).toEqual({
      valid: false,
      message: '条码内容不能为空',
    });
    expect(validateBarcode('   ')).toEqual({
      valid: false,
      message: '条码内容不能为空',
    });
    expect(validateBarcode(null)).toEqual({
      valid: false,
      message: '条码内容不能为空',
    });
    expect(validateBarcode(undefined)).toEqual({
      valid: false,
      message: '条码内容不能为空',
    });
  });

  describe('CODE128 规则校验', () => {
    it('标准 ASCII 字符串应当校验通过', () => {
      const res = validateBarcode('ATENG-123456', 'CODE128');
      expect(res.valid).toBe(true);
      expect(res.normalizedValue).toBe('ATENG-123456');
    });

    it('包含中文字符时应当被拦截并返回明确错误诊断', () => {
      const res = validateBarcode('条码123456', 'CODE128');
      expect(res.valid).toBe(false);
      expect(res.message).toContain('不支持中文字符');
    });
  });

  describe('EAN-13 规则与奇偶校验码', () => {
    it('13 位标准有效 EAN-13 码应当校验通过 (如 6901234567895)', () => {
      // 690123456789 校验位计算:
      // 奇数位(0,2,4,6,8,10): 6 + 0 + 2 + 4 + 6 + 8 = 26
      // 偶数位(1,3,5,7,9,11): (9 + 1 + 3 + 5 + 7 + 9) * 3 = 34 * 3 = 102
      // sum = 128 -> (10 - 8) % 10 = 2 -> 6901234567892
      const validCode = '6901234567892';
      const res = validateBarcode(validCode, 'EAN13');
      expect(res.valid).toBe(true);
    });

    it('12 位 EAN-13（待生成校验位）应当校验通过', () => {
      const res = validateBarcode('690123456789', 'EAN13');
      expect(res.valid).toBe(true);
    });

    it('第 13 位校验码错误的 EAN-13 应当被拦截', () => {
      const invalidCode = '6901234567899'; // 实际应为 2
      const res = validateBarcode(invalidCode, 'EAN13');
      expect(res.valid).toBe(false);
      expect(res.message).toContain('奇偶校验位不匹配');
    });

    it('包含非数字或位数不合法的 EAN-13 应当被拦截', () => {
      expect(validateBarcode('12345', 'EAN13').valid).toBe(false);
      expect(validateBarcode('690123456789A', 'EAN13').valid).toBe(false);
    });
  });

  describe('EAN-8 规则与奇偶校验码', () => {
    it('8 位有效 EAN-8 应当校验通过', () => {
      // 9638507 校验码计算:
      // (9 + 3 + 5 + 7)*3 + (6 + 8 + 0) = 24*3 + 14 = 72 + 14 = 86 -> (10 - 6) % 10 = 4 -> 96385074
      const res = validateBarcode('96385074', 'EAN8');
      expect(res.valid).toBe(true);
    });

    it('错误校验码的 EAN-8 应当被拦截', () => {
      const res = validateBarcode('96385079', 'EAN8');
      expect(res.valid).toBe(false);
      expect(res.message).toContain('奇偶校验位不匹配');
    });
  });

  describe('CODE39 字符集规则', () => {
    it('包含大写字母、数字及合法符号应当校验通过', () => {
      const res = validateBarcode('ABC-123.+$', 'CODE39');
      expect(res.valid).toBe(true);
    });

    it('包含小写字母时应当拦截并诊断提示', () => {
      const res = validateBarcode('abc-123', 'CODE39');
      expect(res.valid).toBe(false);
      expect(res.message).toContain('仅支持大写英文字母');
    });
  });

  describe('ITF-14 与 ITF 规则', () => {
    it('14 位有效 ITF-14 应当校验通过', () => {
      // 1001234567890 校验位计算:
      // (1+0+2+4+6+8+0)*3 + (0+1+3+5+7+9) = 21*3 + 25 = 63 + 25 = 88 -> 2 -> 10012345678902
      const res = validateBarcode('10012345678902', 'ITF14');
      expect(res.valid).toBe(true);
    });

    it('ITF 必须为偶数位纯数字，奇数位时应当被拦截', () => {
      expect(validateBarcode('123456', 'ITF').valid).toBe(true);
      const oddRes = validateBarcode('12345', 'ITF');
      expect(oddRes.valid).toBe(false);
      expect(oddRes.message).toContain('必须为偶数位纯数字');
    });
  });

  describe('Pharmacode 规则', () => {
    it('合法正整数（3~131070）应当校验通过', () => {
      expect(validateBarcode('12345', 'pharmacode').valid).toBe(true);
      expect(validateBarcode('3', 'pharmacode').valid).toBe(true);
      expect(validateBarcode('131070', 'pharmacode').valid).toBe(true);
    });

    it('超出范围或包含非数字应当被拦截', () => {
      expect(validateBarcode('2', 'pharmacode').valid).toBe(false);
      expect(validateBarcode('200000', 'pharmacode').valid).toBe(false);
      expect(validateBarcode('abc', 'pharmacode').valid).toBe(false);
    });
  });
});
