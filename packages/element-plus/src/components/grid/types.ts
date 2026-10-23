/**
 * 企业级容器查询自适应流式网格类型契约。
 *
 * @author Ateng
 * @since 2026-10-23
 */

/**
 * 垂直对齐方式。
 */
export type AtengGridAlign = 'start' | 'end' | 'center' | 'stretch' | 'baseline';

/**
 * 水平对齐方式。
 */
export type AtengGridJustify =
  'start' | 'end' | 'center' | 'stretch' | 'space-between' | 'space-around' | 'space-evenly';

/**
 * 间距尺寸类型（纯数字像素或带单位字符串）。
 */
export type AtengGridGapValue = number | string;

/**
 * AtengGrid 属性契约。
 */
export interface AtengGridProps {
  /**
   * 网格单元项最小宽度。
   * 支持纯数字（默认补齐 px，如 260 -> '260px'）或带单位字符串（如 '20rem'、'30%'）。
   * 默认 '260px'。
   */
  minItemWidth?: AtengGridGapValue;

  /**
   * 网格间距。支持单值（同时应用于行列间距）或双值数组 [行间距, 列间距]。
   * 默认 '16px'。
   */
  gap?: AtengGridGapValue | [AtengGridGapValue, AtengGridGapValue];

  /**
   * 单独指定行间距（优先级高于 gap）。
   */
  rowGap?: AtengGridGapValue;

  /**
   * 单独指定列间距（优先级高于 gap）。
   */
  colGap?: AtengGridGapValue;

  /**
   * 显式指定固定列数（1~12）。
   * 若提供，将覆盖 minItemWidth 自适应，强制采用固定列数排版。
   */
  cols?: number;

  /**
   * 垂直对齐方式（align-items）。
   * 默认 'stretch'。
   */
  align?: AtengGridAlign;

  /**
   * 水平对齐方式（justify-items）。
   * 默认 'stretch'。
   */
  justify?: AtengGridJustify;

  /**
   * 渲染的根 HTML 标签名称。
   * 默认 'div'。
   */
  tag?: string;
}
