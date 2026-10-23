/**
 * 企业级安全防篡改水印容器类型契约。
 *
 * @author Ateng
 * @since 2026-10-23
 */

/**
 * 水印字体配置契约。
 */
export interface AtengWatermarkFont {
  /**
   * 字体颜色。
   * 默认 'rgba(0, 0, 0, 0.12)'。
   */
  color?: string;

  /**
   * 字体大小（单位 px）。
   * 默认 14。
   */
  fontSize?: number;

  /**
   * 字体字重。
   * 默认 'normal'。
   */
  fontWeight?: 'normal' | 'light' | 'weight' | 'bold' | number;

  /**
   * 字体族。
   * 默认 'sans-serif'。
   */
  fontFamily?: string;

  /**
   * 字体风格。
   * 默认 'normal'。
   */
  fontStyle?: 'none' | 'normal' | 'italic' | 'oblique';
}

/**
 * AtengWatermark 属性契约。
 */
export interface AtengWatermarkProps {
  /**
   * 水印文本内容。支持传入单行字符串或多行字符串数组。
   * 默认 'Ateng UI'。
   */
  content?: string | string[];

  /**
   * 图片水印源地址。若传入，优先或叠加绘制图片。
   */
  image?: string;

  /**
   * 单个水印单元宽度（单位 px）。
   * 默认 240。
   */
  width?: number;

  /**
   * 单个水印单元高度（单位 px）。
   * 默认 140。
   */
  height?: number;

  /**
   * 水印旋转角度（单位度，负数为逆时针）。
   * 默认 -22。
   */
  rotate?: number;

  /**
   * 水印层级 z-index。
   * 默认 9。
   */
  zIndex?: number;

  /**
   * 水印之间的间距 [水平间距, 垂直间距]（单位 px）。
   * 默认 [100, 100]。
   */
  gap?: [number, number];

  /**
   * 水印在单元格内的偏移量 [水平偏移, 垂直偏移]（单位 px）。
   * 默认 [gap[0]/2, gap[1]/2]。
   */
  offset?: [number, number];

  /**
   * 文本样式配置。
   */
  font?: AtengWatermarkFont;

  /**
   * 是否开启主动防篡改守卫（MutationObserver 监听属性篡改与节点删除并原地自愈重绘）。
   * 默认 true。
   */
  antiTamper?: boolean;

  /**
   * 是否全屏固定覆盖（position: fixed 视口全屏）。
   * 默认 false（局部包裹 relative 定位）。
   */
  full?: boolean;
}
