/**
 * 统一缺省态与异常占位组件类型契约。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { VNode } from 'vue';

/**
 * 缺省态语义状态枚举类型。
 */
export type AtengEmptyStatus = 'empty' | 'search' | '403' | 'network-error' | '500';

/**
 * AtengEmpty 组件属性契约。
 */
export interface AtengEmptyProps {
  /**
   * 语义状态类型。
   * @default 'empty'
   */
  status?: AtengEmptyStatus;

  /**
   * 描述文案。未传时根据 status 自动呈现标准文案。
   */
  description?: string;

  /**
   * 插画图片尺寸（像素宽/高）。
   * @default 160
   */
  imageSize?: number;

  /**
   * 自定义图片外链地址（若传入则优先使用覆盖内置 SVG 插画）。
   */
  image?: string;
}

/**
 * AtengEmpty 插槽契约。
 */
export interface AtengEmptySlots {
  /**
   * 底部操作区插槽（用于嵌入重试按钮、返回上一页等操作按钮）。
   */
  default?: () => VNode[];

  /**
   * 自定义插画替换插槽。
   */
  image?: () => VNode[];

  /**
   * 自定义描述文案插槽。
   */
  description?: () => VNode[];
}
