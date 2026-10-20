/**
 * Fesod 流式 Excel 导出与批注回写 Hook 实现。
 *
 * 结合 Apache Fesod 协议，提供前端流式导出与错误批注回写下载。
 * 具备 Blob-JSON 双态异常自动识别（彻底杜绝下载损坏伪文件）与 URL.revokeObjectURL 确定性内存回收。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { readonly, ref, type DeepReadonly, type Ref } from 'vue';
import {
  checkBlobForJsonError,
  getBlobDisposition,
  http,
  parseContentDispositionFilename,
  saveBlobAsFile,
  type HttpClient,
  type HttpRequestConfig,
} from '@atengk/core';
import { useAtengConfig } from '../context';
import { tryOnScopeDispose } from '../utils/lifecycle';
import type {
  UseExcelActionOptions,
  UseExcelOptions,
  UseExcelRequestConfig,
  UseExcelRequestTarget,
  UseExcelResult,
} from './types';

/**
 * Fesod 流式 Excel 导出与批注回写 Hook。
 *
 * @param options 可选全局配置
 * @returns 包含只读 exporting 状态机与导出操作门面的结果对象
 */
export function useExcel(options: UseExcelOptions = {}): UseExcelResult {
  const globalConfig = useAtengConfig();

  // 1. 响应式只读状态机
  const exporting = ref<boolean>(false);
  const error = ref<unknown>(undefined);

  // 2. 请求取消控制器
  let activeAbortController: AbortController | null = null;

  /**
   * 中断在途请求并重置状态。
   */
  const abort = (): void => {
    if (activeAbortController) {
      activeAbortController.abort('Aborted by useExcel');
      activeAbortController = null;
    }
    exporting.value = false;
  };

  /**
   * 活跃作用域销毁时确定性中断在途任务。
   */
  tryOnScopeDispose(abort);

  /**
   * 统一解析动作参数选项。
   */
  const normalizeActionOptions = (
    filenameOrOptions?: string | UseExcelActionOptions,
  ): UseExcelActionOptions => {
    if (typeof filenameOrOptions === 'string') {
      return { filename: filenameOrOptions };
    }
    return filenameOrOptions || {};
  };

  /**
   * 从各种返回结构中统一提取 Blob 实体与 Content-Disposition 标头。
   */
  const extractBlobAndDisposition = (
    source: unknown,
  ): { blob: Blob; disposition: string | null } => {
    if (typeof Blob !== 'undefined' && source instanceof Blob) {
      return {
        blob: source,
        disposition: getBlobDisposition(source) || null,
      };
    }
    if (source && typeof source === 'object' && 'data' in source) {
      const resObj = source as {
        data: unknown;
        headers?: Record<string, string>;
      };
      const b = resObj.data as Blob;
      return {
        blob: b,
        disposition: getBlobDisposition(b) || resObj.headers?.['content-disposition'] || null,
      };
    }
    const b = source as Blob;
    return {
      blob: b,
      disposition: getBlobDisposition(b) || null,
    };
  };

  /**
   * 核心流式执行与双态防御管道。
   */
  const executeProcess = async (
    target: UseExcelRequestTarget | Blob,
    filenameOrOptions?: string | UseExcelActionOptions,
    isFeedback: boolean = false,
  ): Promise<string> => {
    // 0. 前置防卫与快速失败
    if (!target) {
      throw new Error('useExcel: 请求目标 target 不能为空');
    }

    const actionOpts = normalizeActionOptions(filenameOrOptions);

    // 1. 取消前序未决请求并启动全新 AbortController
    abort();
    const abortController = new AbortController();
    activeAbortController = abortController;

    exporting.value = true;
    error.value = undefined;

    const client: HttpClient = options.httpClient || globalConfig.httpClient || http;

    try {
      let blob: Blob;
      let rawDisposition: string | null = null;
      let targetSpecifiedFilename: string | undefined;

      // 2. 目标类型自适应分流提取
      if (typeof Blob !== 'undefined' && target instanceof Blob) {
        const extracted = extractBlobAndDisposition(target);
        blob = extracted.blob;
        rawDisposition = extracted.disposition;
      } else if (typeof target === 'function') {
        const result = await (target as () => Promise<unknown>)();
        const extracted = extractBlobAndDisposition(result);
        blob = extracted.blob;
        rawDisposition = extracted.disposition;
      } else {
        // 请求对象或 URL 字符串
        let requestConfig: HttpRequestConfig;
        if (typeof target === 'string') {
          requestConfig = {
            url: target,
            method: 'GET',
            responseType: 'blob',
            params: actionOpts.params,
            data: actionOpts.data,
            signal: abortController.signal,
          };
        } else {
          const cfg = target as UseExcelRequestConfig;
          targetSpecifiedFilename = cfg.filename;
          requestConfig = {
            method: 'GET',
            ...cfg,
            responseType: 'blob',
            params: {
              ...(cfg.params || {}),
              ...(actionOpts.params || {}),
            },
            data: actionOpts.data ?? cfg.data,
            headers: {
              ...(cfg.headers || {}),
            },
            signal: abortController.signal,
          };
        }

        const response = await client.request(requestConfig);
        const extracted = extractBlobAndDisposition(response);
        blob = extracted.blob;
        rawDisposition = extracted.disposition;
      }

      // 3. Blob-JSON 双态异常校验防御（防御未经过拦截器解包的裸错误流）
      const blobContentType = blob && 'type' in blob ? (blob as Blob).type : undefined;
      await checkBlobForJsonError(blob, blobContentType, 200);

      // 4. 三级文件名决策树 (Explicit Param > RFC 5987 Header > Fallback)
      const explicitFilename = actionOpts.filename || targetSpecifiedFilename || undefined;
      let finalFilename: string;

      if (explicitFilename && explicitFilename.trim()) {
        finalFilename = explicitFilename.trim();
      } else {
        const fallback = isFeedback
          ? options.defaultFeedbackFilename || 'error_feedback.xlsx'
          : options.defaultFilename || 'export.xlsx';
        finalFilename = parseContentDispositionFilename(rawDisposition, fallback);
      }

      // 5. 触发平台安全下载并在底层确定性释放 URL.revokeObjectURL
      const revokeDelay = actionOpts.revokeDelay ?? options.revokeDelay ?? 1000;
      saveBlobAsFile(blob, finalFilename, { revokeDelay });

      // 6. 成功回调派发
      actionOpts.onSuccess?.(blob, finalFilename);
      options.onSuccess?.(blob, finalFilename);

      return finalFilename;
    } catch (err: unknown) {
      // 仅当当前请求仍为活跃任务时才同步更新全局状态与派发回调，杜绝被抢占过时请求污染
      if (activeAbortController === abortController) {
        error.value = err;
        actionOpts.onError?.(err);
        options.onError?.(err);
        globalConfig.onError?.(err);
      }
      throw err;
    } finally {
      // 仅当当前请求仍是最新活跃任务时才熄灭 exporting 状态，杜绝并发踩踏
      if (activeAbortController === abortController) {
        exporting.value = false;
        activeAbortController = null;
      }
      actionOpts.onFinally?.();
      options.onFinally?.();
    }
  };

  /**
   * 流式 Excel 导出下载。
   */
  const exportExcel = async (
    target: UseExcelRequestTarget,
    filenameOrOptions?: string | UseExcelActionOptions,
  ): Promise<string> => {
    return await executeProcess(target, filenameOrOptions, false);
  };

  /**
   * 错误标红批注回写文件下载（Fesod 协议）。
   */
  const downloadFeedback = async (
    target: UseExcelRequestTarget | Blob,
    filenameOrOptions?: string | UseExcelActionOptions,
  ): Promise<string> => {
    return await executeProcess(target, filenameOrOptions, true);
  };

  return {
    exporting: readonly(exporting) as DeepReadonly<Ref<boolean>>,
    error: readonly(error) as DeepReadonly<Ref<unknown>>,
    exportExcel,
    downloadFeedback,
    abort,
  };
}
