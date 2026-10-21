/**
 * AtengStreamText 流式打字机组件类型定义。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { ComputedRef } from 'vue';
import type { UseStreamResult } from '@atengk/vue';

/**
 * AtengStreamText 属性接口。
 */
export interface AtengStreamTextProps {
  /**
   * 绑定的 @atengk/vue useStream 状态机实例（流式响应模式）。
   */
  stream?: UseStreamResult;

  /**
   * 待打字输出的文本内容（受控/静态纯文本模式）。
   */
  text?: string;

  /**
   * 逐字打字速率间隔（单位：毫秒）。
   * 设为 0 时表示关闭打字动画直接呈现。
   * @default 30
   */
  speed?: number;

  /**
   * 是否展示闪烁光标。
   * @default true
   */
  cursor?: boolean;

  /**
   * 闪烁光标字符。
   * @default '|'
   */
  cursorChar?: string;

  /**
   * 是否在右上角展示一键复制按钮。
   * @default false
   */
  showCopy?: boolean;

  /**
   * 根容器自定义样式类名。
   */
  customClass?: string;
}

/**
 * AtengStreamText 事件接口。
 */
export interface AtengStreamTextEmits {
  /**
   * 打字动画完成或流式响应完毕时触发。
   */
  (e: 'finished', text: string): void;

  /**
   * 点击复制按钮并成功复制内容后触发。
   */
  (e: 'copy', text: string): void;
}

/**
 * AtengStreamText 插槽接口。
 */
export interface AtengStreamTextSlots {
  /**
   * 默认插槽：自定义渲染文本内容。
   */
  default?: (scope: { text: string; isFinished: boolean }) => unknown;

  /**
   * 自定义光标插槽。
   */
  cursor?: (scope: { isFinished: boolean }) => unknown;

  /**
   * 操作栏插槽。
   */
  actions?: (scope: { text: string; isFinished: boolean; copy: () => void }) => unknown;
}

/**
 * AtengStreamText 实例能力暴露接口。
 */
export interface AtengStreamTextExpose {
  /**
   * 当前已渲染呈现的打字文本。
   */
  currentText: ComputedRef<string>;

  /**
   * 当前打字是否已全部结束。
   */
  isFinished: ComputedRef<boolean>;

  /**
   * 立即跳过剩余打字动画，全量吐出目标文本。
   */
  flush: () => void;

  /**
   * 重新触发打字机动画。
   */
  restart: () => void;

  /**
   * 触发展示文本复制到剪贴板。
   */
  copy: () => Promise<boolean>;
}

/**
 * 组件 Ref 专有实例类型。
 */
export type AtengStreamTextInstance = AtengStreamTextExpose;
