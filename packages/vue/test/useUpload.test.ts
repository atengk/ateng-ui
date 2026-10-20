/**
 * useUpload 大文件分片切片与受控并发上传 Hook 单元测试。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, isReadonly } from 'vue';
import { useUpload, type UploadChunkItem } from '../src';

/**
 * 辅助工具：创建指定大小的虚拟 Blob 数据块
 */
function createDummyBlob(sizeBytes: number): Blob {
  const buffer = new Uint8Array(sizeBytes);
  return new Blob([buffer]);
}

describe('useUpload', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.restoreAllMocks();
  });

  describe('Seam 1: 开箱即用与只读响应式状态机', () => {
    it('初始化时所有状态应处于闲置状态且被 readonly 只读保护', () => {
      const upload = useUpload({
        uploadChunk: async () => ({ ok: true }),
      });

      expect(upload.status.value).toBe('idle');
      expect(upload.uploading.value).toBe(false);
      expect(upload.progress.value).toBe(0);
      expect(upload.loadedBytes.value).toBe(0);
      expect(upload.totalBytes.value).toBe(0);
      expect(upload.chunks.value).toEqual([]);
      expect(upload.error.value).toBeUndefined();

      // 验证只读保护
      expect(isReadonly(upload.status)).toBe(true);
      expect(isReadonly(upload.uploading)).toBe(true);
      expect(isReadonly(upload.progress)).toBe(true);
      expect(isReadonly(upload.loadedBytes)).toBe(true);
      expect(isReadonly(upload.totalBytes)).toBe(true);
      expect(isReadonly(upload.chunks)).toBe(true);
      expect(isReadonly(upload.error)).toBe(true);
    });

    it('未传入合法 uploadChunk 函数时应快速失败抛出 TypeError', () => {
      expect(() => {
        // @ts-expect-error 故意传入非法参数测试防御
        useUpload({});
      }).toThrow(TypeError);
    });

    it('上传 0 字节文件时应防御性保底完成并置为 100% 进度', async () => {
      const onSuccess = vi.fn();
      const upload = useUpload({
        uploadChunk: async () => ({ ok: true }),
        onSuccess,
      });

      const emptyBlob = createDummyBlob(0);
      const results = await upload.upload(emptyBlob);

      expect(results).toEqual([]);
      expect(upload.status.value).toBe('success');
      expect(upload.progress.value).toBe(100);
      expect(upload.loadedBytes.value).toBe(0);
      expect(upload.chunks.value).toEqual([]);
      expect(onSuccess).toHaveBeenCalledWith([]);
    });

    it('传入非法非文件对象时应快速失败并标记 error 状态', async () => {
      const onError = vi.fn();
      const upload = useUpload({
        uploadChunk: async () => ({ ok: true }),
        onError,
      });

      await expect(
        // @ts-expect-error 故意传入非法入参
        upload.upload(null),
      ).rejects.toThrow(TypeError);

      expect(upload.status.value).toBe('error');
      expect(upload.error.value).toBeInstanceOf(TypeError);
      expect(onError).toHaveBeenCalled();
    });

    it('完整上传流程应准确完成切片、更新进度百分比并按序返回结果', async () => {
      const totalSize = 12 * 1024 * 1024; // 12MB
      const chunkSize = 5 * 1024 * 1024; // 5MB，将切分成 3 片
      const dummyFile = createDummyBlob(totalSize);

      const progressHistory: number[] = [];
      const onChunkSuccess = vi.fn();
      const onSuccess = vi.fn();

      const upload = useUpload({
        chunkSize,
        concurrency: 2,
        uploadChunk: async (chunk: UploadChunkItem<{ chunkId: number }>) => {
          await new Promise(resolve => setTimeout(resolve, 20));
          return { chunkId: chunk.index };
        },
        onProgress: p => {
          progressHistory.push(p);
        },
        onChunkSuccess,
        onSuccess,
      });

      const uploadPromise = upload.upload(dummyFile);
      expect(upload.status.value).toBe('uploading');
      expect(upload.uploading.value).toBe(true);
      expect(upload.chunks.value).toHaveLength(3);

      await vi.advanceTimersByTimeAsync(100);
      const results = await uploadPromise;

      expect(upload.status.value).toBe('success');
      expect(upload.uploading.value).toBe(false);
      expect(upload.progress.value).toBe(100);
      expect(upload.loadedBytes.value).toBe(totalSize);
      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ index: 0, result: { chunkId: 0 } });
      expect(results[1]).toEqual({ index: 1, result: { chunkId: 1 } });
      expect(results[2]).toEqual({ index: 2, result: { chunkId: 2 } });
      expect(onChunkSuccess).toHaveBeenCalledTimes(3);
      expect(onSuccess).toHaveBeenCalledWith(results);
    });
  });

  describe('Seam 2: 受控并发调度与切片限制', () => {
    it('在途活跃上传连接数严禁超过并发上限阈值 (concurrency: 2)', async () => {
      const dummyFile = createDummyBlob(6 * 1024 * 1024); // 6MB
      let activeConnections = 0;
      let maxObservedConnections = 0;

      const upload = useUpload({
        chunkSize: 1024 * 1024, // 1MB 每片，共 6 片
        concurrency: 2,
        uploadChunk: async chunk => {
          activeConnections++;
          if (activeConnections > maxObservedConnections) {
            maxObservedConnections = activeConnections;
          }
          await new Promise(resolve => setTimeout(resolve, 30));
          activeConnections--;
          return { part: chunk.index };
        },
      });

      const promise = upload.upload(dummyFile);
      await vi.advanceTimersByTimeAsync(200);
      await promise;

      expect(maxObservedConnections).toBeLessThanOrEqual(2);
      expect(upload.status.value).toBe('success');
      expect(upload.progress.value).toBe(100);
    });
  });

  describe('Seam 3: 切片局部重试与异常容错', () => {
    it('单切片首次失败时应局部指数退避重试，重试成功后不影响整体流程', async () => {
      const dummyFile = createDummyBlob(3 * 1024 * 1024);
      const failedMap = new Map<number, number>();
      const onChunkError = vi.fn();

      const upload = useUpload({
        chunkSize: 1024 * 1024,
        concurrency: 2,
        maxRetries: 2,
        retryDelay: 50,
        uploadChunk: async chunk => {
          const count = failedMap.get(chunk.index) ?? 0;
          if (chunk.index === 1 && count === 0) {
            failedMap.set(chunk.index, 1);
            throw new Error('Network socket disconnected');
          }
          return { index: chunk.index };
        },
        onChunkError,
      });

      const promise = upload.upload(dummyFile);
      await vi.advanceTimersByTimeAsync(300);
      const results = await promise;

      expect(results).toHaveLength(3);
      expect(upload.status.value).toBe('success');
      expect(onChunkError).toHaveBeenCalled();
      expect(upload.chunks.value[1].retryCount).toBe(1);
    });

    it('切片重试次数超限时应终止上传并将 status 标记为 error', async () => {
      const dummyFile = createDummyBlob(3 * 1024 * 1024);
      const onError = vi.fn();

      const upload = useUpload({
        chunkSize: 1024 * 1024,
        concurrency: 1,
        maxRetries: 1,
        retryDelay: 10,
        uploadChunk: async chunk => {
          if (chunk.index === 1) {
            throw new Error('Fatal storage cluster down');
          }
          return { ok: true };
        },
        onError,
      });

      const promise = upload.upload(dummyFile);
      // 让定时器推进以完成重试
      const testPromise = expect(promise).rejects.toThrow('Fatal storage cluster down');
      await vi.advanceTimersByTimeAsync(100);
      await testPromise;

      expect(upload.status.value).toBe('error');
      expect(upload.uploading.value).toBe(false);
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('Seam 4: 暂停与恢复 (断点续传)', () => {
    it('调用 pause() 应平稳中断在途上传，调用 resume() 应从断点继续上传未完切片', async () => {
      const dummyFile = createDummyBlob(4 * 1024 * 1024); // 4片，每片 1MB
      const uploadedIndices: number[] = [];

      const upload = useUpload({
        chunkSize: 1024 * 1024,
        concurrency: 1,
        uploadChunk: async (chunk, signal) => {
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => {
              uploadedIndices.push(chunk.index);
              resolve();
            }, 50);

            signal?.addEventListener('abort', () => {
              clearTimeout(timer);
              reject(new Error('Chunk aborted'));
            });
          });
          return { chunkIndex: chunk.index };
        },
      });

      // 1. 开始上传
      const uploadPromise = upload.upload(dummyFile);

      // 前进 60ms，让第 0 片完成，第 1 片正在进行中
      await vi.advanceTimersByTimeAsync(60);
      expect(uploadedIndices).toContain(0);

      // 2. 触发暂停
      upload.pause();
      expect(upload.status.value).toBe('paused');
      expect(upload.uploading.value).toBe(false);

      // 等待初始 promise 完成暂停流程
      await uploadPromise;

      // 验证第 0 片为 success，第 1 片为 paused 或 pending
      expect(upload.chunks.value[0].status).toBe('success');
      expect(['paused', 'pending']).toContain(upload.chunks.value[1].status);

      // 3. 恢复上传
      const resumePromise = upload.resume();
      expect(upload.status.value).toBe('uploading');

      // 推进时间让剩余切片全部完成
      await vi.advanceTimersByTimeAsync(200);
      const results = await resumePromise;

      expect(upload.status.value).toBe('success');
      expect(upload.progress.value).toBe(100);
      expect(results).toHaveLength(4);
      expect(upload.chunks.value.every(c => c.status === 'success')).toBe(true);
    });
  });

  describe('Seam 5: 取消 (cancel / abort) 与重置 (reset)', () => {
    it('调用 cancel() 应将状态置为 canceled 并中断在途连接', async () => {
      const dummyFile = createDummyBlob(2 * 1024 * 1024);
      const upload = useUpload({
        chunkSize: 1024 * 1024,
        concurrency: 1,
        uploadChunk: async (_chunk, signal) => {
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(resolve, 100);
            signal?.addEventListener('abort', () => {
              clearTimeout(timer);
              reject(new Error('Aborted'));
            });
          });
          return true;
        },
      });

      const uploadPromise = upload.upload(dummyFile);
      await vi.advanceTimersByTimeAsync(30);

      upload.cancel();
      expect(upload.status.value).toBe('canceled');
      expect(upload.uploading.value).toBe(false);

      await uploadPromise;
      expect(upload.status.value).toBe('canceled');
    });

    it('调用 reset() 应清空切片与进度并重置至 idle 闲置状态', async () => {
      const dummyFile = createDummyBlob(2 * 1024 * 1024);
      const upload = useUpload({
        chunkSize: 1024 * 1024,
        uploadChunk: async () => true,
      });

      const promise = upload.upload(dummyFile);
      await vi.advanceTimersByTimeAsync(50);
      await promise;

      expect(upload.status.value).toBe('success');
      expect(upload.progress.value).toBe(100);

      upload.reset();
      expect(upload.status.value).toBe('idle');
      expect(upload.progress.value).toBe(0);
      expect(upload.loadedBytes.value).toBe(0);
      expect(upload.totalBytes.value).toBe(0);
      expect(upload.chunks.value).toEqual([]);
      expect(upload.error.value).toBeUndefined();
    });
  });

  describe('Seam 6: 确定性生命周期清理 (tryOnScopeDispose)', () => {
    it('当 effectScope 销毁时应自动调用 cancel() 中断在途切片网络连接', async () => {
      let aborted = false;
      const scope = effectScope();

      let uploadInstance: ReturnType<typeof useUpload> | null = null;

      scope.run(() => {
        uploadInstance = useUpload({
          chunkSize: 1024 * 1024,
          uploadChunk: async (_chunk, signal) => {
            await new Promise<void>((resolve, reject) => {
              const timer = setTimeout(resolve, 100);
              signal?.addEventListener('abort', () => {
                aborted = true;
                clearTimeout(timer);
                reject(new Error('Aborted by scope'));
              });
            });
            return true;
          },
        });
      });

      const dummyFile = createDummyBlob(2 * 1024 * 1024);
      const uploadPromise = uploadInstance!.upload(dummyFile);

      await vi.advanceTimersByTimeAsync(30);

      // 销毁作用域
      scope.stop();

      await vi.advanceTimersByTimeAsync(10);
      await uploadPromise;

      expect(aborted).toBe(true);
      expect(uploadInstance!.status.value).toBe('canceled');
    });
  });
});
