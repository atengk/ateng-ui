/**
 * @atengk/print-vue 领域强类型契约定义。
 *
 * 涵盖多驱动 SPI、打印参数、批量进度与指令绑定规约。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import type { PrintException } from '../errors/PrintException';

/**
 * 打印执行进度状态契约。
 */
export interface PrintProgress {
  /** 当前已完成或正在处理的单据索引（从 1 开始） */
  current: number;
  /** 待处理的总单据数量 */
  total: number;
  /** 整体执行百分比（0 ~ 100） */
  percentage: number;
  /** 成功完成的任务数 */
  successCount: number;
  /** 发生异常或失败的任务数 */
  failedCount: number;
}

/**
 * 统一打印参数配置契约。
 */
export interface PrintOptions {
  /** 目标打印驱动名称（默认 'browser'，可选 'pdf'、'lodop' 或自定义扩展驱动） */
  driver?: 'browser' | 'pdf' | 'lodop' | string;
  /** 目标物理打印机设备名称（仅静默打印驱动如 C-Lodop 有效） */
  printer?: string;
  /** 打印份数（默认为 1） */
  copies?: number;
  /** 纸张方向（'portrait' 纵向，'landscape' 横向） */
  orientation?: 'portrait' | 'landscape';
  /** 是否开启长单据动态分页防撕裂引擎（默认为 false） */
  autoPaginate?: boolean;
  /** 额外追加注入打印环境的 CSS 规则字符串或外链样式 URL 列表 */
  extraCss?: string | string[];
  /** 当硬件驱动（如 C-Lodop）离线不可用时，是否自动优雅降级为浏览器无头弹窗打印（默认 false） */
  fallbackToBrowser?: boolean;
  /** 进度感知回调函数 */
  onProgress?: (progress: PrintProgress) => void;
  /** 打印任务提交或完成成功回调 */
  onSuccess?: () => void;
  /** 打印任务执行失败回调 */
  onError?: (error: PrintException) => void;
  /** 当发生硬件向浏览器打印降级时的钩子 */
  onFallback?: (reason: string) => void;
}

/**
 * 打印驱动 SPI 抽象接口。
 *
 * 所有物理打印途径（浏览器 iframe、高保真 PDF 导出、C-Lodop 直连）必须严格对齐本契约。
 */
export interface PrintDriver {
  /** 驱动唯一名称标识 */
  readonly name: string;
  /** 探测当前环境是否支持该驱动 */
  isAvailable(): Promise<boolean>;
  /** 提交打印任务 */
  print(target: HTMLElement | string, options?: PrintOptions): Promise<void>;
  /** 中断或取消当前正在排队/执行的任务（可选） */
  cancel?(): void;
}

/**
 * v-print 指令绑定参数契约。
 */
export type PrintBindingValue =
  | string
  | HTMLElement
  | (PrintOptions & {
      /** 目标元素或选择器 */
      target?: string | HTMLElement;
    });
