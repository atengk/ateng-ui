/**
 * AtengLogViewer 实时日志终端组件类型定义。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { ComputedRef } from 'vue';
import type { UseWebSocketResult } from '@atengk/vue';

export type LogViewerTheme = 'dark' | 'light';

/**
 * AtengLogViewer 属性接口。
 */
export interface AtengLogViewerProps {
  /**
   * 静态或受控传入的日志文本行列表。
   */
  logs?: string[];

  /**
   * 绑定的 @atengk/vue useWebSocket 状态机实例（实时推送模式）。
   */
  webSocket?: UseWebSocketResult<unknown>;

  /**
   * 内存中最大保留的日志行数（防止长时间运行导致 DOM 膨胀与内存泄漏）。
   * @default 2000
   */
  maxLines?: number;

  /**
   * 终端视觉主题风格。
   * @default 'dark'
   */
  theme?: LogViewerTheme;

  /**
   * 是否默认开启贴底自动滚屏。
   * @default true
   */
  autoScroll?: boolean;

  /**
   * 终端视口固定高度。
   * @default '420px'
   */
  height?: string | number;

  /**
   * 终端标题栏文案。
   * @default '实时运行终端'
   */
  title?: string;

  /**
   * 是否展示顶部工具栏（检索、滚屏开关、清屏、下载与主题切换）。
   * @default true
   */
  showControls?: boolean;

  /**
   * 根容器自定义样式类名。
   */
  customClass?: string;
}

/**
 * AtengLogViewer 事件接口。
 */
export interface AtengLogViewerEmits {
  /**
   * 点击清空日志时触发。
   */
  (e: 'clear'): void;

  /**
   * 自动贴底滚屏状态切换时触发。
   */
  (e: 'scroll-change', autoScroll: boolean): void;

  /**
   * 点击下载日志文本文件时触发。
   */
  (e: 'download', lines: string[]): void;
}

/**
 * AtengLogViewer 插槽接口。
 */
export interface AtengLogViewerSlots {
  /**
   * 自定义标题栏区域。
   */
  header?: (scope: { total: number; autoScroll: boolean }) => unknown;

  /**
   * 自定义单行日志渲染。
   */
  line?: (scope: { text: string; index: number; highlighted: string }) => unknown;

  /**
   * 空日志时的占位提示。
   */
  empty?: () => unknown;
}

/**
 * AtengLogViewer 对外暴露实例能力。
 */
export interface AtengLogViewerExpose {
  /**
   * 清空当前所有日志。
   */
  clear: () => void;

  /**
   * 触发下载全部日志。
   */
  download: (filename?: string) => void;

  /**
   * 立即平滑滚动到底部。
   */
  scrollToBottom: () => void;

  /**
   * 手动向终端追加一条日志。
   */
  appendLog: (log: string) => void;

  /**
   * 当前总日志行数。
   */
  totalLines: ComputedRef<number>;

  /**
   * 检索过滤后当前匹配的日志列表。
   */
  filteredLines: ComputedRef<string[]>;
}

/**
 * 组件 Ref 专有实例类型。
 */
export type AtengLogViewerInstance = AtengLogViewerExpose;
