/**
 * 大文件分片切片与受控并发上传 Hook 类型定义。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { DeepReadonly, Ref } from 'vue';
import type { UploadChunkResult } from '@atengk/core';

/**
 * 总体上传状态机流转枚举。
 */
export type UploadStatus = 'idle' | 'uploading' | 'paused' | 'success' | 'error' | 'canceled';

/**
 * 单个切片上传状态枚举。
 */
export type UploadChunkStatus = 'pending' | 'uploading' | 'success' | 'error' | 'paused';

/**
 * 响应式管理的单个切片状态实体。
 */
export interface UploadChunkItem<T = unknown> {
  /**
   * 当前切片序号（从 0 开始）。
   */
  index: number;

  /**
   * 当前切片在原文件中的起始字节偏移量。
   */
  start: number;

  /**
   * 当前切片在原文件中的结束字节偏移量（不含）。
   */
  end: number;

  /**
   * 当前切片字节大小。
   */
  size: number;

  /**
   * 原文件的总切片数。
   */
  totalChunks: number;

  /**
   * 当前切片的二进制数据块。
   */
  chunk: Blob;

  /**
   * 当前切片上传状态。
   */
  status: UploadChunkStatus;

  /**
   * 当前切片已重试次数。
   */
  retryCount: number;

  /**
   * 当前切片完成进度百分比 (0 - 100)。
   */
  progress: number;

  /**
   * 该切片上传成功返回的业务载荷结果。
   */
  result?: T;

  /**
   * 该切片最近一次捕获的异常信息。
   */
  error?: unknown;
}

/**
 * useUpload 配置选项。
 */
export interface UseUploadOptions<T = unknown> {
  /**
   * 单个分片字节大小，默认为 5MB (5 * 1024 * 1024 字节)。
   */
  chunkSize?: number;

  /**
   * 最大并发上传连接数，默认为 3。
   */
  concurrency?: number;

  /**
   * 单个切片上传失败时的最大重试次数，默认为 3。
   */
  maxRetries?: number;

  /**
   * 单个切片重试基础延迟等待时间（毫秒），默认为 1000ms。
   */
  retryDelay?: number;

  /**
   * 单个切片上传执行器函数。
   *
   * @param chunk 当前切片元数据对象
   * @param signal 可选的中断控制信号
   * @returns 业务上传结果 Promise
   */
  uploadChunk: (chunk: UploadChunkItem<T>, signal?: AbortSignal) => Promise<T>;

  /**
   * 整体上传进度变化回调函数。
   *
   * @param progress 总体上传进度百分比 (0 - 100 整数)
   * @param loadedBytes 已成功上传的总字节数
   * @param totalBytes 文件总字节数
   */
  onProgress?: (progress: number, loadedBytes: number, totalBytes: number) => void;

  /**
   * 单个切片上传成功回调函数。
   *
   * @param chunk 当前切片实体
   * @param result 接口返回的业务载荷
   */
  onChunkSuccess?: (chunk: UploadChunkItem<T>, result: T) => void;

  /**
   * 单个切片上传失败回调函数（包含重试触发或最终失败）。
   *
   * @param chunk 当前切片实体
   * @param error 捕获到的异常对象
   */
  onChunkError?: (chunk: UploadChunkItem<T>, error: unknown) => void;

  /**
   * 全部分片上传成功完成时的回调函数。
   *
   * @param results 按切片序号升序排列的结果实体列表
   */
  onSuccess?: (results: UploadChunkResult<T>[]) => void;

  /**
   * 上传任务由于切片超限重试失败或严重错误导致终止时的回调函数。
   *
   * @param error 终止异常对象
   */
  onError?: (error: unknown) => void;

  /**
   * 状态机状态发生流转时的回调函数。
   *
   * @param status 最新状态值
   */
  onStatusChange?: (status: UploadStatus) => void;
}

/**
 * useUpload 返回的只读响应式状态与控制门面。
 */
export interface UseUploadResult<T = unknown> {
  /**
   * 当前总体上传状态，受到 readonly 只读保护。
   */
  status: DeepReadonly<Ref<UploadStatus>>;

  /**
   * 是否处于上传执行中，受到 readonly 只读保护。
   */
  uploading: DeepReadonly<Ref<boolean>>;

  /**
   * 总体上传进度百分比（0 ~ 100 整数），受到 readonly 只读保护。
   */
  progress: DeepReadonly<Ref<number>>;

  /**
   * 已上传完成的总字节数，受到 readonly 只读保护。
   */
  loadedBytes: DeepReadonly<Ref<number>>;

  /**
   * 文件总字节数，受到 readonly 只读保护。
   */
  totalBytes: DeepReadonly<Ref<number>>;

  /**
   * 响应式切片状态列表，受到 readonly 只读保护。
   */
  chunks: DeepReadonly<Ref<UploadChunkItem<T>[]>>;

  /**
   * 最近一次捕获的异常信息，受到 readonly 只读保护。
   */
  error: DeepReadonly<Ref<unknown>>;

  /**
   * 启动文件切片与受控并发上传任务。
   *
   * @param file 待上传的文件或 Blob 实体
   * @returns 排序后的切片上传结果列表
   */
  upload: (file: File | Blob) => Promise<UploadChunkResult<T>[]>;

  /**
   * 暂停当前在途上传任务。
   */
  pause: () => void;

  /**
   * 从已暂停状态断点续传恢复上传任务。
   *
   * @returns 排序后的切片上传结果列表
   */
  resume: () => Promise<UploadChunkResult<T>[]>;

  /**
   * 取消当前上传任务并重置相关状态。
   */
  cancel: () => void;

  /**
   * 取消当前上传任务（cancel 的对称别名）。
   */
  abort: () => void;

  /**
   * 重置全部上传状态至初始闲置状态 (idle)。
   */
  reset: () => void;
}
