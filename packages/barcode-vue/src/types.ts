/**
 * @atengk/barcode-vue 核心强类型契约声明。
 *
 * 规范一维条码格式、渲染参数、校验结果及组件事件契约。
 *
 * @author Ateng
 * @since 2026-11-10
 */

/**
 * 支持的一维条码格式枚举联合。
 */
export type BarcodeFormat =
  | 'CODE128'
  | 'CODE128A'
  | 'CODE128B'
  | 'CODE128C'
  | 'EAN13'
  | 'EAN8'
  | 'EAN5'
  | 'EAN2'
  | 'UPC'
  | 'UPCE'
  | 'CODE39'
  | 'ITF14'
  | 'ITF'
  | 'MSI'
  | 'MSI10'
  | 'MSI11'
  | 'MSI1010'
  | 'MSI1110'
  | 'pharmacode'
  | 'codabar';

/**
 * 条码底层渲染模式：SVG 纯矢量 vs Canvas 位图。
 */
export type BarcodeRenderType = 'svg' | 'canvas';

/**
 * 条码展示文字垂直位置。
 */
export type BarcodeTextPosition = 'top' | 'bottom';

/**
 * 条码展示文字水平对齐方式。
 */
export type BarcodeTextAlign = 'left' | 'center' | 'right';

/**
 * 一维条形码渲染完整配置项。
 */
export interface BarcodeRenderOptions {
  /** 条码编码格式，默认为 'CODE128' */
  format?: BarcodeFormat;
  /** 渲染模式：'svg' (默认) 或 'canvas' */
  renderType?: BarcodeRenderType;
  /** 单个条块的基准宽度倍率 (px)，默认 2 */
  width?: number;
  /** 条码条块高度 (px，不含下方文字)，默认 100 */
  height?: number;
  /** 是否展示文本内容，默认 true */
  displayValue?: boolean;
  /** 展示文本的位置，默认 'bottom' */
  textPosition?: BarcodeTextPosition;
  /** 展示文本的水平对齐方式，默认 'center' */
  textAlign?: BarcodeTextAlign;
  /** 展示文本字号 (px)，默认 20 */
  fontSize?: number;
  /** 展示文本字体族名称，默认 'monospace' */
  font?: string;
  /** 条码条块与文字之间的垂直间距 (px)，默认 2 */
  textMargin?: number;
  /** 四周统一安全静区边距 (Quiet Zone, px)，默认 10 */
  margin?: number;
  /** 顶部静区边距 */
  marginTop?: number;
  /** 底部静区边距 */
  marginBottom?: number;
  /** 左侧静区边距 */
  marginLeft?: number;
  /** 右侧静区边距 */
  marginRight?: number;
  /** 条码条块及文本颜色，默认 '#000000' */
  lineColor?: string;
  /** 背景填充颜色，默认 '#ffffff' */
  background?: string;
  /** 自定义展示文本格式化函数（不影响条码真实机器扫描内容） */
  formatText?: (code: string) => string;
}

/**
 * 一维条码格式前置离线校验结果契约。
 */
export interface BarcodeValidationResult {
  /** 是否校验通过 */
  valid: boolean;
  /** 校验失败原因诊断说明 */
  message?: string;
  /** 规范化后的输入值 */
  normalizedValue?: string;
}
