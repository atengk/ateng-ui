/**
 * 动态防篡改水印指令类型契约。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { Directive } from 'vue';

/**
 * 水印指令配置选项。
 */
export interface WatermarkOptions {
  /**
   * 水印文本内容。若传多行字符串数组，按行依次绘制。
   * 默认：'Ateng UI'。
   */
  text?: string | string[];

  /**
   * 水印字体样式（如 '14px sans-serif'）。
   * 默认：'14px sans-serif'。
   */
  font?: string;

  /**
   * 水印字体颜色（支持 rgba、hex 等）。
   * 默认：'rgba(0, 0, 0, 0.12)'。
   */
  color?: string;

  /**
   * 水印旋转角度（度数，逆时针为负，顺时针为正）。
   * 默认：-22。
   */
  rotate?: number;

  /**
   * 水印单元格宽度（px）。
   * 默认：240。
   */
  width?: number;

  /**
   * 水印单元格高度（px）。
   * 默认：140。
   */
  height?: number;

  /**
   * 水印层级 z-index。
   * 默认：9999。
   */
  zIndex?: number;

  /**
   * 是否采用全屏 fixed 视口水印。
   * 当使用 .full 修饰符或配置 full: true 时生效。
   */
  full?: boolean;
}

/**
 * 水印指令入参值类型：支持单行文本、多行文本数组、配置对象或空。
 */
export type WatermarkDirectiveValue = string | string[] | WatermarkOptions | undefined | null;

/**
 * v-watermark 指令类型。
 */
export type WatermarkDirective = Directive<HTMLElement, WatermarkDirectiveValue>;
