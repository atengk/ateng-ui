/**
 * 金融级高精度金额运算与格式化单元测试。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { describe, expect, it } from 'vitest';
import { formatCurrency, toCents, toYuan } from '../src/currency';

describe('Currency (金融级金额精度与格式化)', () => {
  describe('1. toCents (元转分)', () => {
    it('标准金额字符串与数字应精准转换为整型分', () => {
      expect(toCents('12.34')).toBe(1234);
      expect(toCents(12.34)).toBe(1234);
      expect(toCents('100')).toBe(10000);
      expect(toCents(100)).toBe(10000);
      expect(toCents('0.05')).toBe(5);
      expect(toCents(0.05)).toBe(5);
    });

    it('经典 JavaScript 浮点数失真边界应精确保真', () => {
      // 0.07 * 100 在原生 JS 中等于 7.000000000000001
      expect(toCents('0.07')).toBe(7);
      expect(toCents(0.07)).toBe(7);

      // 0.28 * 100 在原生 JS 中等于 28.000000000000004
      expect(toCents('0.28')).toBe(28);
      expect(toCents(0.28)).toBe(28);

      // 0.14 * 100 在原生 JS 中等于 14.000000000000002
      expect(toCents('0.14')).toBe(14);
      expect(toCents(0.14)).toBe(14);

      // 1.005 四舍五入到分
      expect(toCents('1.005')).toBe(101);
      expect(toCents('1.004')).toBe(100);
    });

    it('负数与零应准确处理', () => {
      expect(toCents(0)).toBe(0);
      expect(toCents('0')).toBe(0);
      expect(toCents('0.00')).toBe(0);
      expect(toCents(-12.34)).toBe(-1234);
      expect(toCents('-12.34')).toBe(-1234);
      expect(toCents('-0.05')).toBe(-5);
    });

    it('非法或空值应防御性安全返回 0', () => {
      expect(toCents('')).toBe(0);
      expect(toCents('   ')).toBe(0);
      expect(toCents(null as unknown as string)).toBe(0);
      expect(toCents(undefined as unknown as string)).toBe(0);
      expect(toCents('abc')).toBe(0);
      expect(toCents(NaN)).toBe(0);
    });
  });

  describe('2. toYuan (分转元)', () => {
    it('整型分应精准转换为带两位小数的元字符串', () => {
      expect(toYuan(1234)).toBe('12.34');
      expect(toYuan('1234')).toBe('12.34');
      expect(toYuan(10000)).toBe('100.00');
      expect(toYuan(5)).toBe('0.05');
      expect(toYuan('5')).toBe('0.05');
      expect(toYuan(0)).toBe('0.00');
      expect(toYuan('0')).toBe('0.00');
    });

    it('负数分值应精确转换为带符号的元字符串', () => {
      expect(toYuan(-1234)).toBe('-12.34');
      expect(toYuan('-1234')).toBe('-12.34');
      expect(toYuan(-5)).toBe('-0.05');
      expect(toYuan('-5')).toBe('-0.05');
    });

    it('非法或空分值应防御性保底返回 "0.00"', () => {
      expect(toYuan('')).toBe('0.00');
      expect(toYuan(null as unknown as number)).toBe('0.00');
      expect(toYuan(undefined as unknown as number)).toBe('0.00');
      expect(toYuan(NaN)).toBe('0.00');
      expect(toYuan('invalid')).toBe('0.00');
    });
  });

  describe('3. formatCurrency (千分位与货币格式化)', () => {
    it('默认千分位逗号与两位小数格式化', () => {
      expect(formatCurrency(1234.56)).toBe('1,234.56');
      expect(formatCurrency('1234567.89')).toBe('1,234,567.89');
      expect(formatCurrency(0)).toBe('0.00');
      expect(formatCurrency('100')).toBe('100.00');
    });

    it('支持添加货币符号', () => {
      expect(formatCurrency(1234.56, { symbol: '¥' })).toBe('¥1,234.56');
      expect(formatCurrency(1234.56, { symbol: '$ ' })).toBe('$ 1,234.56');
    });

    it('支持从分 (cents) 直接格式化', () => {
      expect(formatCurrency(123456, { fromCents: true, symbol: '¥' })).toBe('¥1,234.56');
      expect(formatCurrency('5', { fromCents: true, symbol: '¥' })).toBe('¥0.05');
    });

    it('负数格式化支持标准负号与会计括号模式', () => {
      expect(formatCurrency(-1234.56, { symbol: '¥' })).toBe('-¥1,234.56');
      expect(formatCurrency(-1234.56, { symbol: '¥', negativePattern: 'minus' })).toBe(
        '-¥1,234.56',
      );
      expect(formatCurrency(-1234.56, { symbol: '¥', negativePattern: 'parentheses' })).toBe(
        '(¥1,234.56)',
      );
      expect(formatCurrency(-1234.56, { negativePattern: 'parentheses' })).toBe('(1,234.56)');
    });

    it('支持自定义小数位数与分隔符', () => {
      expect(formatCurrency(1234.5678, { precision: 3 })).toBe('1,234.568');
      expect(formatCurrency(1234.5, { precision: 0 })).toBe('1,235');
      expect(formatCurrency(1234.56, { thousandSeparator: '_', decimalSeparator: ',' })).toBe(
        '1_234,56',
      );
    });

    it('非法或空值保底返回防御格式', () => {
      expect(formatCurrency(null as unknown as number)).toBe('0.00');
      expect(formatCurrency(undefined as unknown as number, { symbol: '¥' })).toBe('¥0.00');
      expect(formatCurrency('invalid', { symbol: '¥' })).toBe('¥0.00');
    });
  });
});
