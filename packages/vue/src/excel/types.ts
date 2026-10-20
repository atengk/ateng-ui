/**
 * Fesod 流式 Excel 导出与批注回写 Hook 类型定义。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import type { DeepReadonly, Ref } from 'vue';
import type { HttpClient } from '@atengk/core';

/**
 * 待导出的请求配置对象。
 */
export interface UseExcelRequestConfig {
  /**
   * 请求路径或绝对 URL。
   */
  url: string;

  /**
   * HTTP 请求方法，默认为 'GET'。
   */
  method?: 'get' | 'post' | 'put' | 'delete' | 'GET' | 'POST' | 'PUT' | 'DELETE' | string;

  /**
   * 查询字符串参数。
   */
  params?: Record<string, unknown>;

  /**
   * 请求体数据（POST/PUT 场景）。
   */
  data?: unknown;

  /**
   * 自定义请求头。
   */
  headers?: Record<string, string>;

  /**
   * 显式指定保存的文件名（优先级高于响应头）。
   */
  filename?: string;

  /**
   * 微服务网关路由服务标识。
   */
  service?: string;
}

/**
 * 待导出的请求目标，支持直接指定 URL 字符串、包含请求参数与方法的配置对象、或自定义异步请求函数。
 */
export type UseExcelRequestTarget =
  string | UseExcelRequestConfig | (() => Promise<Blob | unknown>);

/**
 * 单次导出或回写下载动作的可选配置参数。
 */
export interface UseExcelActionOptions {
  /**
   * 覆盖本次下载保存的文件名。
   */
  filename?: string;

  /**
   * 附加查询参数（当 target 为字符串或配置时合并）。
   */
  params?: Record<string, unknown>;

  /**
   * 附加请求体载荷。
   */
  data?: unknown;

  /**
   * 下载完成后延迟回收 Object URL 的时间（毫秒），默认为 1000ms。
   */
  revokeDelay?: number;

  /**
   * 本次动作成功回调。
   */
  onSuccess?: (blob: Blob, filename: string) => void;

  /**
   * 本次动作异常回调。
   */
  onError?: (error: unknown) => void;

  /**
   * 本次动作完成回调（无论成功失败均触发）。
   */
  onFinally?: () => void;
}

/**
 * useExcel 可选配置项。
 */
export interface UseExcelOptions {
  /**
   * 自定义默认 HttpClient 实例，未指定时 Fallback 至全局上下文注入的 httpClient。
   */
  httpClient?: HttpClient;

  /**
   * 默认导出文件名（当响应头 Content-Disposition 未包含文件名且未显式指定时保底）。
   *
   * @default 'export.xlsx'
   */
  defaultFilename?: string;

  /**
   * 默认批注回写文件名（当响应头 Content-Disposition 未包含文件名且未显式指定时保底）。
   *
   * @default 'error_feedback.xlsx'
   */
  defaultFeedbackFilename?: string;

  /**
   * 下载后 revokeObjectURL 的延迟毫秒数，默认为 1000ms。
   */
  revokeDelay?: number;

  /**
   * 导出或回写成功全局回调。
   */
  onSuccess?: (blob: Blob, filename: string) => void;

  /**
   * 异常失败全局回调（包括业务异常与网络错误）。
   */
  onError?: (error: unknown) => void;

  /**
   * 导出完成全局回调（无论成功失败均触发）。
   */
  onFinally?: () => void;
}

/**
 * useExcel 返回的只读状态机与操作门面。
 */
export interface UseExcelResult {
  /**
   * 当前是否处于导出或下载执行中，受到 readonly 只读保护。
   */
  exporting: DeepReadonly<Ref<boolean>>;

  /**
   * 最近一次导出捕获的异常对象，受到 readonly 只读保护。
   */
  error: DeepReadonly<Ref<unknown>>;

  /**
   * 流式导出并自动触发文件下载。
   *
   * @param target 请求目标，支持 URL、配置对象或异步返回 Blob 的函数
   * @param filenameOrOptions 可选的文件名覆盖或专属配置项
   * @returns 解析并下载成功后的文件名
   */
  exportExcel: (
    target: UseExcelRequestTarget,
    filenameOrOptions?: string | UseExcelActionOptions,
  ) => Promise<string>;

  /**
   * 下载错误标红批注回写文件（Fesod 协议）。
   *
   * @param target 请求目标或二进制数据流 Blob
   * @param filenameOrOptions 可选的文件名覆盖或专属配置项
   * @returns 解析并下载成功后的文件名
   */
  downloadFeedback: (
    target: UseExcelRequestTarget | Blob,
    filenameOrOptions?: string | UseExcelActionOptions,
  ) => Promise<string>;

  /**
   * 中断当前在途的导出请求并重置 exporting 状态。
   */
  abort: () => void;
}
