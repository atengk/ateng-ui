/**
 * 纸张预设与物理尺寸计算单元测试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect } from 'vitest';
import {
  resolvePaperDimensions,
  PAPER_PRESET_MAP,
  mmToPx,
  pxToMm,
  parseLengthToPx,
} from '../src/types/paper';

describe('resolvePaperDimensions', () => {
  it('默认解析 A4 纸张尺寸为 210mm x 297mm', () => {
    const dim = resolvePaperDimensions('a4');
    expect(dim.width).toBe('210mm');
    expect(dim.height).toBe('297mm');
    expect(dim.widthMm).toBe(210);
    expect(dim.heightMm).toBe(297);
    expect(dim.isContinuous).toBe(false);
  });

  it('正确解析 A5 纸张尺寸为 148mm x 210mm', () => {
    const dim = resolvePaperDimensions('a5');
    expect(dim.width).toBe('148mm');
    expect(dim.height).toBe('210mm');
    expect(dim.isContinuous).toBe(false);
  });

  it('横向模式（landscape）下交换非连续纸的宽高', () => {
    const dim = resolvePaperDimensions('a4', undefined, undefined, 'landscape');
    expect(dim.width).toBe('297mm');
    expect(dim.height).toBe('210mm');
    expect(dim.widthMm).toBe(297);
    expect(dim.heightMm).toBe(210);
  });

  it('正确识别 80mm 与 58mm 热敏小票为连续卷纸 (height: auto)', () => {
    const dim80 = resolvePaperDimensions('receipt-80');
    expect(dim80.width).toBe('80mm');
    expect(dim80.height).toBe('auto');
    expect(dim80.isContinuous).toBe(true);

    const dim58 = resolvePaperDimensions('receipt-58');
    expect(dim58.width).toBe('58mm');
    expect(dim58.height).toBe('auto');
    expect(dim58.isContinuous).toBe(true);
  });

  it('正确解析针式打印连续多联单规格（241*140 二等分单）', () => {
    const dim = resolvePaperDimensions('continuous-241-140');
    expect(dim.width).toBe('241mm');
    expect(dim.height).toBe('140mm');
    expect(dim.widthMm).toBe(241);
    expect(dim.heightMm).toBe(140);
  });

  it('优先支持自定义宽高入参（支持数值与字符串）', () => {
    const dim = resolvePaperDimensions('a4', 100, '150mm');
    expect(dim.width).toBe('100mm');
    expect(dim.height).toBe('150mm');
    expect(dim.widthMm).toBe(100);
    expect(dim.heightMm).toBe(150);
  });

  it('字典映射中覆盖全部 6 大高频预设', () => {
    expect(Object.keys(PAPER_PRESET_MAP)).toEqual([
      'a4',
      'a5',
      'receipt-80',
      'receipt-58',
      'continuous-241-140',
      'continuous-241-93',
    ]);
  });

  it('准确实现毫米与像素的双向转换与单位解析', () => {
    // 25.4mm = 1 inch = 96px
    expect(mmToPx(25.4)).toBeCloseTo(96, 4);
    expect(pxToMm(96)).toBeCloseTo(25.4, 4);

    expect(parseLengthToPx(25.4)).toBeCloseTo(96, 4);
    expect(parseLengthToPx('25.4mm')).toBeCloseTo(96, 4);
    expect(parseLengthToPx('1in')).toBe(96);
    expect(parseLengthToPx('100px')).toBe(100);
    expect(parseLengthToPx('2.54cm')).toBeCloseTo(96, 4);
    expect(parseLengthToPx('auto')).toBe(0);
    expect(parseLengthToPx(undefined, 50)).toBe(50);
  });
});
