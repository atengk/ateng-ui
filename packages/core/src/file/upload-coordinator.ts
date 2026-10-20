/**
 * 大文件分片受控并发上传协调器实现。
 *
 * 封装切片调度队列、并发连接数限制、加权进度统计、单片异常局部指数退避重试与 AbortSignal 级联取消。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { createFileChunks, DEFAULT_CHUNK_SIZE } from './chunks';
import type {
  FileChunk,
  IUploadCoordinator,
  UploadChunkResult,
  UploadCoordinatorOptions,
} from './types';

/**
 * 异步睡眠等待（支持 AbortSignal 即时中断唤醒）。
 *
 * @param ms 等待毫秒数
 * @param signal 可选的中断信号
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise(resolve => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * 大文件分片并发上传协调器实现类。
 */
export class UploadCoordinator<T = unknown> implements IUploadCoordinator<T> {
  private readonly concurrency: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly uploadChunkFn: (chunk: FileChunk, signal?: AbortSignal) => Promise<T>;
  private readonly onProgress?: (percent: number, loaded: number, total: number) => void;
  private readonly onChunkSuccess?: (chunk: FileChunk, result: T) => void;
  private readonly onChunkRetry?: (chunk: FileChunk, retryCount: number, error: Error) => void;

  /**
   * 构造上传协调器实例。
   *
   * @param options 协调器配置选项
   */
  constructor(options: UploadCoordinatorOptions<T>) {
    const {
      concurrency = 3,
      maxRetries = 3,
      retryDelay = 1000,
      uploadChunk,
      onProgress,
      onChunkSuccess,
      onChunkRetry,
    } = options;

    if (typeof uploadChunk !== 'function') {
      throw new TypeError('uploadChunk must be a function');
    }

    this.concurrency = Math.max(1, concurrency);
    this.maxRetries = Math.max(0, maxRetries);
    this.retryDelay = Math.max(0, retryDelay);
    this.uploadChunkFn = uploadChunk;
    this.onProgress = onProgress;
    this.onChunkSuccess = onChunkSuccess;
    this.onChunkRetry = onChunkRetry;
  }

  /**
   * 对指定的切片列表执行受控并发上传调度。
   *
   * @param chunks 切片数组
   * @param signal 可选的中断控制信号
   * @returns 排序后的切片上传结果列表
   */
  async upload(chunks: FileChunk[], signal?: AbortSignal): Promise<UploadChunkResult<T>[]> {
    if (chunks.length === 0) {
      this.onProgress?.(100, 0, 0);
      return [];
    }

    if (signal?.aborted) {
      throw signal.reason ?? new Error('Upload aborted');
    }

    const totalBytes = chunks.reduce((acc, c) => acc + c.size, 0);
    let loadedBytes = 0;

    // 初始进度通知
    this.onProgress?.(0, 0, totalBytes);

    const queue = [...chunks];
    const results: UploadChunkResult<T>[] = new Array(chunks.length);
    let fatalError: Error | null = null;
    let isAborted = false;

    const worker = async () => {
      while (queue.length > 0 && !fatalError && !isAborted) {
        if (signal?.aborted) {
          isAborted = true;
          break;
        }

        const chunk = queue.shift();
        if (!chunk) {
          break;
        }

        let retryCount = 0;
        let success = false;

        while (!success && !fatalError && !isAborted) {
          if (signal?.aborted) {
            isAborted = true;
            break;
          }

          try {
            const result = await this.uploadChunkFn(chunk, signal);
            results[chunk.index] = { index: chunk.index, result };
            this.onChunkSuccess?.(chunk, result);

            loadedBytes += chunk.size;
            const percent =
              totalBytes === 0 ? 100 : Math.min(100, Math.floor((loadedBytes / totalBytes) * 100));
            this.onProgress?.(percent, loadedBytes, totalBytes);

            success = true;
          } catch (err) {
            if (signal?.aborted) {
              isAborted = true;
              break;
            }

            const error = err instanceof Error ? err : new Error(String(err));
            if (retryCount < this.maxRetries) {
              retryCount++;
              this.onChunkRetry?.(chunk, retryCount, error);
              const delay = this.retryDelay * Math.pow(2, retryCount - 1);
              await sleep(delay, signal);
            } else {
              fatalError = error;
              throw error;
            }
          }
        }
      }
    };

    const workerCount = Math.min(this.concurrency, chunks.length);
    const workers = Array.from({ length: workerCount }, () => worker());

    try {
      await Promise.all(workers);
    } catch (err) {
      if (signal?.aborted) {
        throw signal.reason ?? new Error('Upload aborted');
      }
      throw err;
    }

    if (signal?.aborted || isAborted) {
      throw signal?.reason ?? new Error('Upload aborted');
    }

    if (fatalError) {
      throw fatalError;
    }

    // 最终保底进度 100%
    this.onProgress?.(100, totalBytes, totalBytes);

    return results;
  }

  /**
   * 一站式大文件切片并执行受控并发上传。
   *
   * @param file 待上传的文件或 Blob
   * @param chunkSize 单个切片大小（字节）
   * @param signal 可选的中断控制信号
   * @returns 排序后的切片上传结果列表
   */
  async uploadFile(
    file: File | Blob,
    chunkSize: number = DEFAULT_CHUNK_SIZE,
    signal?: AbortSignal,
  ): Promise<UploadChunkResult<T>[]> {
    const chunks = createFileChunks(file, chunkSize);
    return this.upload(chunks, signal);
  }
}

/**
 * 便捷工厂函数：创建大文件切片并发上传协调器实例。
 *
 * @param options 协调器配置选项
 * @returns 上传协调器门面实例
 */
export function createUploadCoordinator<T = unknown>(
  options: UploadCoordinatorOptions<T>,
): UploadCoordinator<T> {
  return new UploadCoordinator<T>(options);
}
