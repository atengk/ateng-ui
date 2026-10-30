/**
 * @atengk/editor-vue A4 物理纸张规格、页边距换算与几何度量工具。
 *
 * 遵循四层洋葱拓扑之 L2 专用扩展层规范与单一职责，统一为 AtengPageCanvas
 * 与 docx-export 提供标准化的单位换算（mm/cm/in/px/twip）与边距解析。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import type { PageOrientation, PageMarginPreset, PageMarginConfig } from '../types/docx';

/**
 * 屏幕 96 DPI 下，1mm ≈ 3.7795px。
 */
export const MM_TO_PX = 3.7795;

/**
 * 1 毫米 (mm) 等于 56.6929 Twip（Word 内部排版度量单位，1 inch = 1440 twip = 25.4 mm）。
 */
export const MM_TO_TWIP = 56.6929;

/**
 * 解析后的完整页面边距指标集合。
 */
export interface ResolvedPageMargins {
  /** 顶部边距（毫米） */
  topMm: number;
  /** 底部边距（毫米） */
  bottomMm: number;
  /** 左侧边距（毫米） */
  leftMm: number;
  /** 右侧边距（毫米） */
  rightMm: number;
  /** 顶部 CSS 字符串（如 "25.4mm"） */
  topCss: string;
  /** 底部 CSS 字符串 */
  bottomCss: string;
  /** 左侧 CSS 字符串 */
  leftCss: string;
  /** 右侧 CSS 字符串 */
  rightCss: string;
  /** 顶部 Twip 单位数值（供 OpenXML Word 使用） */
  topTwip: number;
  /** 底部 Twip 单位数值 */
  bottomTwip: number;
  /** 左侧 Twip 单位数值 */
  leftTwip: number;
  /** 右侧 Twip 单位数值 */
  rightTwip: number;
}

/**
 * 将毫米 (mm) 转换为 Word 的 Twip 单位。
 */
export function mmToTwip(mm: number): number {
  return Math.round(mm * MM_TO_TWIP);
}

/**
 * 解析任意 CSS 长度字符串为毫米数值。
 *
 * @param val CSS 长度字符串（支持 mm, cm, in, px）
 * @param fallbackMm 无法解析时的保底毫米数
 * @returns 毫米数值
 */
export function parseLengthToMm(val?: string, fallbackMm = 25.4): number {
  if (!val) return fallbackMm;
  const num = parseFloat(val);
  if (Number.isNaN(num)) return fallbackMm;
  if (val.endsWith('mm')) return num;
  if (val.endsWith('cm')) return num * 10;
  if (val.endsWith('in')) return num * 25.4;
  if (val.endsWith('px')) return num / MM_TO_PX;
  return num;
}

/**
 * 计算 A4 物理纸张的毫米规格与方向指标。
 *
 * @param orientation 纸张排版方向（portrait 纵向 / landscape 横向）
 */
export function resolvePageSpecs(orientation: PageOrientation = 'portrait'): {
  widthMm: number;
  heightMm: number;
  isLandscape: boolean;
} {
  const isLandscape = orientation === 'landscape';
  return {
    widthMm: isLandscape ? 297 : 210,
    heightMm: isLandscape ? 210 : 297,
    isLandscape,
  };
}

/**
 * 统一解析页边距预设或自定义配置为毫米、CSS 字符串与 Word Twip。
 *
 * @param margin 边距预设名称或自定义对象
 * @returns 完整解析后的边距指标
 */
export function resolvePageMargins(
  margin?: PageMarginPreset | PageMarginConfig,
): ResolvedPageMargins {
  // 1. 预设名称：窄边距
  if (margin === 'narrow') {
    const mm = 12.7;
    const twip = mmToTwip(mm);
    const css = `${mm}mm`;
    return {
      topMm: mm,
      bottomMm: mm,
      leftMm: mm,
      rightMm: mm,
      topCss: css,
      bottomCss: css,
      leftCss: css,
      rightCss: css,
      topTwip: twip,
      bottomTwip: twip,
      leftTwip: twip,
      rightTwip: twip,
    };
  }

  // 2. 预设名称：宽边距
  if (margin === 'wide') {
    const topBottomMm = 25.4;
    const leftRightMm = 50.8;
    return {
      topMm: topBottomMm,
      bottomMm: topBottomMm,
      leftMm: leftRightMm,
      rightMm: leftRightMm,
      topCss: `${topBottomMm}mm`,
      bottomCss: `${topBottomMm}mm`,
      leftCss: `${leftRightMm}mm`,
      rightCss: `${leftRightMm}mm`,
      topTwip: mmToTwip(topBottomMm),
      bottomTwip: mmToTwip(topBottomMm),
      leftTwip: mmToTwip(leftRightMm),
      rightTwip: mmToTwip(leftRightMm),
    };
  }

  // 3. 自定义对象配置
  if (typeof margin === 'object' && margin !== null) {
    const topMm = parseLengthToMm(margin.top, 25.4);
    const bottomMm = parseLengthToMm(margin.bottom, 25.4);
    const leftMm = parseLengthToMm(margin.left, 31.8);
    const rightMm = parseLengthToMm(margin.right, 31.8);

    return {
      topMm,
      bottomMm,
      leftMm,
      rightMm,
      topCss: margin.top ?? `${topMm}mm`,
      bottomCss: margin.bottom ?? `${bottomMm}mm`,
      leftCss: margin.left ?? `${leftMm}mm`,
      rightCss: margin.right ?? `${rightMm}mm`,
      topTwip: mmToTwip(topMm),
      bottomTwip: mmToTwip(bottomMm),
      leftTwip: mmToTwip(leftMm),
      rightTwip: mmToTwip(rightMm),
    };
  }

  // 4. 标准预设 (standard)：上下 25.4mm，左右 31.8mm
  const topBottomMm = 25.4;
  const leftRightMm = 31.8;
  return {
    topMm: topBottomMm,
    bottomMm: topBottomMm,
    leftMm: leftRightMm,
    rightMm: leftRightMm,
    topCss: `${topBottomMm}mm`,
    bottomCss: `${topBottomMm}mm`,
    leftCss: `${leftRightMm}mm`,
    rightCss: `${leftRightMm}mm`,
    topTwip: mmToTwip(topBottomMm),
    bottomTwip: mmToTwip(topBottomMm),
    leftTwip: mmToTwip(leftRightMm),
    rightTwip: mmToTwip(leftRightMm),
  };
}
