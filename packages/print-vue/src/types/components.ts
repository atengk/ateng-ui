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
