/**
 * 大文件分片切片与受控并发上传 Hook 实现。
 *
 * 响应式桥接 @atengk/core 的 UploadCoordinator，提供切片进度统计、受控并发调度、
 * 局部自动重试、在途暂停/恢复/取消状态机流转与作用域生命周期确定性清理。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { computed, readonly, ref, shallowRef, triggerRef, type DeepReadonly, type Ref } from 'vue';
import {
  createFileChunks,
  createUploadCoordinator,
  DEFAULT_CHUNK_SIZE,
  type FileChunk,
  type UploadChunkResult,
} from '@atengk/core';
import { tryOnScopeDispose } from '../utils/lifecycle';
import type { UploadChunkItem, UploadStatus, UseUploadOptions, UseUploadResult } from './types';

/**
 * 大文件分片切片与受控并发上传 Hook。
 *
 * @param options 上传配置选项
 * @returns 包含只读上传状态机与控制门面的结果对象
 */
export function useUpload<T = unknown>(options: UseUploadOptions<T>): UseUploadResult<T> {
  // 0. 前置防卫与快速失败
  if (!options || typeof options.uploadChunk !== 'function') {
    throw new TypeError('useUpload: options.uploadChunk must be a valid function');
  }

  // 1. 响应式只读状态机
  const status = ref<UploadStatus>('idle');
  const progress = ref<number>(0);
  const loadedBytes = ref<number>(0);
  const totalBytes = ref<number>(0);
  const chunks = shallowRef<UploadChunkItem<T>[]>([]);
  const error = ref<unknown>(undefined);

  const uploading = computed<boolean>(() => status.value === 'uploading');

  // 2. 内部控制状态
  let activeAbortController: AbortController | null = null;
  let storedFile: File | Blob | null = null;
  let isPausedByAction = false;
  let isCanceledByAction = false;
  let inFlightUploadPromise: Promise<UploadChunkResult<T>[]> | null = null;

  /**
   * 变更并派发状态流转事件。
   */
  const setStatus = (nextStatus: UploadStatus): void => {
    if (status.value !== nextStatus) {
      status.value = nextStatus;
      options.onStatusChange?.(nextStatus);
    }
  };

  /**
   * 重新计算整体上传进度百分比与已加载字节数。
   */
  const recalculateProgress = (): void => {
    if (totalBytes.value <= 0) {
      progress.value = 100;
      loadedBytes.value = 0;
      return;
    }

    const currentLoaded = chunks.value
      .filter(c => c.status === 'success')
      .reduce((sum, c) => sum + c.size, 0);

    loadedBytes.value = currentLoaded;
    const currentPercent = Math.min(100, Math.floor((currentLoaded / totalBytes.value) * 100));
    progress.value = currentPercent;
    options.onProgress?.(currentPercent, currentLoaded, totalBytes.value);
  };

  /**
   * 执行切片并发上传管道。
   */
  const executeUpload = async (): Promise<UploadChunkResult<T>[]> => {
    // 若当前已有在途执行 Promise，直接复用防重
    if (inFlightUploadPromise) {
      return inFlightUploadPromise;
    }

    // 1. 筛选尚未成功的待上传分片
    const remainingChunks = chunks.value.filter(c => c.status !== 'success');

    // 若全部已完成，直接完成准出
    if (remainingChunks.length === 0) {
      progress.value = 100;
      loadedBytes.value = totalBytes.value;
      setStatus('success');
      const allResults: UploadChunkResult<T>[] = chunks.value.map(c => ({
        index: c.index,
        result: c.result,
      }));
      options.onSuccess?.(allResults);
      return allResults;
    }

    // 2. 初始化本次执行的中断控制器
    isPausedByAction = false;
    isCanceledByAction = false;
    const controller = new AbortController();
    activeAbortController = controller;

    setStatus('uploading');
    error.value = undefined;

    // 将待上传切片状态重置为 pending
    for (const c of remainingChunks) {
      c.status = 'pending';
    }

    // 3. 构建底层上传协调器
    const coordinator = createUploadCoordinator<T>({
      concurrency: options.concurrency ?? 3,
      maxRetries: options.maxRetries ?? 3,
      retryDelay: options.retryDelay ?? 1000,
      uploadChunk: async (fileChunk: FileChunk, signal?: AbortSignal): Promise<T> => {
        const item = chunks.value[fileChunk.index];
        if (item) {
          item.status = 'uploading';
          triggerRef(chunks);
          return await options.uploadChunk(item, signal);
        }
        const fallbackItem: UploadChunkItem<T> = {
          ...fileChunk,
          status: 'uploading',
          retryCount: 0,
          progress: 0,
        };
        return await options.uploadChunk(fallbackItem, signal);
      },
      onChunkSuccess: (fileChunk: FileChunk, res: T): void => {
        const item = chunks.value[fileChunk.index];
        if (item) {
          item.status = 'success';
          item.progress = 100;
          item.result = res;
          triggerRef(chunks);
          recalculateProgress();
          options.onChunkSuccess?.(item, res);
        }
      },
      onChunkRetry: (fileChunk: FileChunk, retryCount: number, err: Error): void => {
        const item = chunks.value[fileChunk.index];
        if (item) {
          item.retryCount = retryCount;
          triggerRef(chunks);
          options.onChunkError?.(item, err);
        }
      },
    });

    // 4. 将待上传切片转换为底层所需结构
    const fileChunksToUpload: FileChunk[] = remainingChunks.map(c => ({
      chunk: c.chunk,
      index: c.index,
      start: c.start,
      end: c.end,
      size: c.size,
      totalChunks: c.totalChunks,
    }));

    // 5. 启动并发调度并管理结果流转
    const runPromise = (async (): Promise<UploadChunkResult<T>[]> => {
      try {
        await coordinator.upload(fileChunksToUpload, controller.signal);

        recalculateProgress();
        progress.value = 100;
        loadedBytes.value = totalBytes.value;
        setStatus('success');

        const finalResults: UploadChunkResult<T>[] = chunks.value.map(c => ({
          index: c.index,
          result: c.result,
        }));
        options.onSuccess?.(finalResults);
        return finalResults;
      } catch (err: unknown) {
        if (controller.signal.aborted) {
          if (isPausedByAction) {
            for (const c of chunks.value) {
              if (c.status === 'uploading') {
                c.status = 'paused';
              }
            }
            triggerRef(chunks);
            setStatus('paused');
            return [];
          }

          if (isCanceledByAction) {
            for (const c of chunks.value) {
              if (c.status === 'uploading') {
                c.status = 'pending';
              }
            }
            triggerRef(chunks);
            setStatus('canceled');
            return [];
          }
        }

        // 真实异常或超限重试失败
        for (const c of chunks.value) {
          if (c.status === 'uploading') {
            c.status = 'error';
            c.error = err;
          }
        }
        triggerRef(chunks);
        setStatus('error');
        error.value = err;
        options.onError?.(err);
        throw err;
      } finally {
        if (activeAbortController === controller) {
          activeAbortController = null;
        }
        inFlightUploadPromise = null;
      }
    })();

    inFlightUploadPromise = runPromise;
    return runPromise;
  };

  /**
   * 启动文件切片与受控并发上传任务。
   */
  const upload = async (file: File | Blob): Promise<UploadChunkResult<T>[]> => {
    // 前置输入校验
    if (!file || typeof file !== 'object' || typeof file.size !== 'number') {
      const invalidErr = new TypeError('useUpload: Invalid file object');
      setStatus('error');
      error.value = invalidErr;
      options.onError?.(invalidErr);
      throw invalidErr;
    }

    // 空文件边界处理
    if (file.size === 0) {
      storedFile = file;
      totalBytes.value = 0;
      loadedBytes.value = 0;
      progress.value = 100;
      chunks.value = [];
      setStatus('success');
      options.onSuccess?.([]);
      return [];
    }

    // 中断可能在途的前序请求
    if (activeAbortController) {
      cancel();
    }

    // 初始化文件与分片状态
    storedFile = file;
    totalBytes.value = file.size;
    loadedBytes.value = 0;
    progress.value = 0;
    error.value = undefined;

    const rawChunks = createFileChunks(file, options.chunkSize ?? DEFAULT_CHUNK_SIZE);
    chunks.value = rawChunks.map(c => ({
      ...c,
      status: 'pending',
      retryCount: 0,
      progress: 0,
    }));

    return await executeUpload();
  };

  /**
   * 暂停当前上传任务。
   */
  const pause = (): void => {
    if (status.value !== 'uploading') {
      return;
    }
    isPausedByAction = true;
    if (activeAbortController) {
      activeAbortController.abort('paused');
    }
    setStatus('paused');
    for (const c of chunks.value) {
      if (c.status === 'uploading') {
        c.status = 'paused';
      }
    }
    triggerRef(chunks);
  };

  /**
   * 从断点恢复上传任务。
   */
  const resume = async (): Promise<UploadChunkResult<T>[]> => {
    if (status.value === 'uploading') {
      return inFlightUploadPromise ?? Promise.resolve([]);
    }

    if (chunks.value.length === 0 && !storedFile) {
      return [];
    }

    if (chunks.value.every(c => c.status === 'success')) {
      setStatus('success');
      return chunks.value.map(c => ({ index: c.index, result: c.result }));
    }

    return await executeUpload();
  };

  /**
   * 取消当前上传任务。
   */
  const cancel = (): void => {
    isCanceledByAction = true;
    if (activeAbortController) {
      activeAbortController.abort('canceled');
      activeAbortController = null;
    }
    setStatus('canceled');
    for (const c of chunks.value) {
      if (c.status === 'uploading') {
        c.status = 'pending';
      }
    }
    triggerRef(chunks);
  };

  /**
   * 取消当前上传任务（cancel 对称别名）。
   */
  const abort = (): void => {
    cancel();
  };

  /**
   * 重置全部上传状态至初始闲置状态。
   */
  const reset = (): void => {
    cancel();
    status.value = 'idle';
    progress.value = 0;
    loadedBytes.value = 0;
    totalBytes.value = 0;
    chunks.value = [];
    error.value = undefined;
    storedFile = null;
  };

  // 3. 活跃作用域销毁时确定性中断未决连接
  tryOnScopeDispose(cancel);

  return {
    status: readonly(status) as DeepReadonly<Ref<UploadStatus>>,
    uploading: readonly(uploading) as DeepReadonly<Ref<boolean>>,
    progress: readonly(progress) as DeepReadonly<Ref<number>>,
    loadedBytes: readonly(loadedBytes) as DeepReadonly<Ref<number>>,
    totalBytes: readonly(totalBytes) as DeepReadonly<Ref<number>>,
    chunks: readonly(chunks) as DeepReadonly<Ref<UploadChunkItem<T>[]>>,
    error: readonly(error) as DeepReadonly<Ref<unknown>>,
    upload,
    pause,
    resume,
    cancel,
    abort,
    reset,
  };
}
