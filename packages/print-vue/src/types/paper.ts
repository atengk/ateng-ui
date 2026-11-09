/**
 * 纸张预设与物理尺寸计算规约。
 *
 * 规范国际标准规格（A4/A5）、商业连续热敏卷纸（58mm/80mm）与工业连续打孔复写纸（241mm）。
 *
 * @author Ateng
 * @since 2026-11-10
 */

/**
 * 支持的标准物理纸张预设类型。
 */
export type PaperPreset =
  'a4' | 'a5' | 'receipt-80' | 'receipt-58' | 'continuous-241-140' | 'continuous-241-93';

/**
 * 纸张方向：portrait 纵向（默认），landscape 横向。
 */
export type PaperOrientation = 'portrait' | 'landscape';

/**
 * 解析后的物理纸张几何尺寸实体。
 */
export interface ResolvedPaperDimensions {
  /** 宽度 CSS 字符串（例如 '210mm'） */
  width: string;
  /** 高度 CSS 字符串（例如 '297mm' 或 'auto'） */
  height: string;
  /** 宽度数值（毫米 mm） */
  widthMm: number;
  /** 高度数值（毫米 mm，连续卷纸时为 0） */
  heightMm: number;
  /** 是否为连续卷纸（高度不限） */
  isContinuous: boolean;
}

/** 标准预设尺寸字典映射（单位 mm） */
export const PAPER_PRESET_MAP: Record<
  PaperPreset,
  { widthMm: number; heightMm: number; isContinuous: boolean }
> = {
  a4: { widthMm: 210, heightMm: 297, isContinuous: false },
  a5: { widthMm: 148, heightMm: 210, isContinuous: false },
  'receipt-80': { widthMm: 80, heightMm: 0, isContinuous: true },
  'receipt-58': { widthMm: 58, heightMm: 0, isContinuous: true },
  'continuous-241-140': { widthMm: 241, heightMm: 140, isContinuous: false },
  'continuous-241-93': { widthMm: 241, heightMm: 93, isContinuous: false },
};

/**
 * 统一解析物理尺寸入参。
 */
export function resolvePaperDimensions(
  preset: PaperPreset = 'a4',
  customWidth?: number | string,
  customHeight?: number | string,
  orientation: PaperOrientation = 'portrait',
): ResolvedPaperDimensions {
  let widthMm: number;
  let heightMm: number;
  let isContinuous = false;

  const presetConfig = PAPER_PRESET_MAP[preset] || PAPER_PRESET_MAP.a4;
  widthMm = presetConfig.widthMm;
  heightMm = presetConfig.heightMm;
  isContinuous = presetConfig.isContinuous;

  // 优先处理自定义宽度
  if (customWidth !== undefined) {
    if (typeof customWidth === 'number') {
      widthMm = customWidth;
    } else {
      const parsed = parseFloat(customWidth);
      if (!isNaN(parsed)) widthMm = parsed;
    }
  }

  // 优先处理自定义高度
  if (customHeight !== undefined) {
    if (customHeight === 'auto') {
      isContinuous = true;
      heightMm = 0;
    } else if (typeof customHeight === 'number') {
      heightMm = customHeight;
      isContinuous = false;
    } else {
      const parsed = parseFloat(customHeight);
      if (!isNaN(parsed)) {
        heightMm = parsed;
        isContinuous = false;
      }
    }
  }

  // 处理横向旋转（非连续纸时交换宽高）
  if (orientation === 'landscape' && !isContinuous) {
    const temp = widthMm;
    widthMm = heightMm;
    heightMm = temp;
  }

  return {
    width: `${widthMm}mm`,
    height: isContinuous ? 'auto' : `${heightMm}mm`,
    widthMm,
    heightMm,
    isContinuous,
  };
}
