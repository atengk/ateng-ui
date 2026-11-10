/**
 * 一维条码肉眼防错格式化管道单元测试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect } from 'vitest';
import { formatEan13, formatItf14, formatCode128Grouped, formatIsbn } from '../src/utils/formatter';

describe('一维条码格式化管道 (formatText)', () => {
  it('formatEan13 应当将 13 位纯数字格式化为 1-6-6 结构', () => {
    expect(formatEan13('6901234567892')).toBe('6 901234 567892');
    expect(formatEan13('690123456789')).toBe('6 901234 56789');
    // 位数不符合时原样返回
    expect(formatEan13('12345')).toBe('12345');
  });

  it('formatItf14 应当将 14 位纯数字格式化为 1-2-5-5-1 标准包装分组', () => {
    expect(formatItf14('10012345678902')).toBe('1 00 12345 67890 2');
    expect(formatItf14('123456')).toBe('123456');
  });

  it('formatCode128Grouped 应当按指定步长分块添加空格', () => {
    expect(formatCode128Grouped('ATENG-WMS-20261110', 4)).toBe('ATEN G-WM S-20 2611 10');
    expect(formatCode128Grouped('12345678', 2)).toBe('12 34 56 78');
    expect(formatCode128Grouped('TEST', 0)).toBe('TEST');
  });

  it('formatIsbn 应当将 13 位纯数字格式化为 ISBN-13 分组结构', () => {
    expect(formatIsbn('9787123456789')).toBe('978-7-123-45678-9');
    expect(formatIsbn('978-7-123-45678-9')).toBe('978-7-123-45678-9');
  });
});
