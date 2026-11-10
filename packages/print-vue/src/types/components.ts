/**
 * 组件 Props 与实例契约定义。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import type { PaperPreset, PaperOrientation } from './paper';

/**
 * AtengPrintSheet 组件 Props 接口。
 */
export interface AtengPrintSheetProps {
  /** 纸张规格预设（默认 'a4'） */
  preset?: PaperPreset;
  /** 自定义宽度（支持纯数值毫米或带单位字符串如 '210mm'） */
  width?: number | string;
  /** 自定义高度（支持纯数值毫米、'auto' 或带单位字符串如 '297mm'） */
  height?: number | string;
  /** 纸张方向（'portrait' 纵向，'landscape' 横向） */
  orientation?: PaperOrientation;
  /** 单据物理页边距（支持纯数值毫米或带单位字符串，默认 '10mm'） */
  padding?: number | string;
  /** 屏幕视口预览缩放倍率（默认 1，范围建议 0.2 ~ 3.0） */
  scale?: number;
  /** 预览态是否显示纸张边缘立体拟真阴影（默认 true） */
  showShadow?: boolean;
  /** 是否开启长单据自动分页防截断引擎（默认 false） */
  autoPaginate?: boolean;
  /** 套打 X 轴毫米级物理水平校准偏移（默认 0mm） */
  offsetX?: number;
  /** 套打 Y 轴毫米级物理垂直校准偏移（默认 0mm） */
  offsetY?: number;
}

/**
 * AtengPrintRuler 组件 Props 接口。
 */
export interface AtengPrintRulerProps {
  /** 测量目标宽度（纯数值毫米或带单位字符串，默认 210） */
  width?: number | string;
  /** 测量目标高度（纯数值毫米或带单位字符串，默认 297） */
  height?: number | string;
  /** 缩放倍率（默认 1） */
  scale?: number;
  /** 标尺厚度（像素 px，默认 24） */
  rulerThickness?: number;
  /** 是否开启鼠标十字交叉参考线（默认 true） */
  showCrosshair?: boolean;
  /** 是否显示背景网格辅助线（默认 false） */
  gridLines?: boolean;
}

/**
 * AtengPrintSeal 电子印章组件 Props 契约。
 */
export interface AtengPrintSealProps {
  /** 印章渲染类型（'svg' 纯矢量动态印章，'image' 图片贴图，默认 'svg'） */
  type?: 'svg' | 'image';
  /** 印章图片 URL（仅在 type='image' 时生效） */
  src?: string;
  /** 单位/公司全称（圆形上方沿弧度环形排列） */
  company?: string;
  /** 印章中央或下方法定职能名称（如 '发货专用章'、'财务专用章'） */
  title?: string;
  /** 底部防伪编码或税号代码 */
  code?: string;
  /** 中心图标（'star' 五角星，'none' 无，默认 'star'） */
  centerIcon?: 'star' | 'none';
  /** 印章直径尺寸（纯数值或带单位如 '40mm' / 120，默认 120） */
  size?: number | string;
  /** 印章颜色（印泥朱红色，默认 '#dc2626'） */
  color?: string;
  /** 拟真自然倾斜旋转角度（度 deg，默认 -12） */
  rotate?: number;
  /** 印泥透明度（默认 0.85） */
  opacity?: number;
  /** CSS 定位模式（默认 'absolute'） */
  position?: 'absolute' | 'relative' | 'static';
  /** 距顶部偏移 */
  top?: string | number;
  /** 距右侧偏移 */
  right?: string | number;
  /** 距底部偏移 */
  bottom?: string | number;
  /** 距左侧偏移 */
  left?: string | number;
  /** 层级 z-index（默认 10） */
  zIndex?: number;
}

/**
 * AtengPrintCalibrator 预印套打毫米校准器组件 Props 契约。
 */
export interface AtengPrintCalibratorProps {
  /** 绑定的目标打印机名称，用于持久化隔离 */
  printerName?: string;
  /** 水平校准偏移（毫米，默认 0） */
  offsetX?: number;
  /** 垂直校准偏移（毫米，默认 0） */
  offsetY?: number;
  /** 调节步长（毫米，默认 0.5） */
  step?: number;
  /** 最小允许偏移（毫米，默认 -20） */
  min?: number;
  /** 最大允许偏移（毫米，默认 20） */
  max?: number;
  /** 是否自动将调节结果持久化到 localStorage（默认 true） */
  autoSave?: boolean;
  /** localStorage 持久化前缀（默认 'ateng_print_calibration_'） */
  storageKeyPrefix?: string;
  /** 是否在界面展示十字标尺测试单据卡片（默认 true） */
  showTestCard?: boolean;
}
