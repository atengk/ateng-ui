/**
 * 大文件分片切片与受控并发上传协调器单元测试。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { describe, expect, it } from 'vitest';
import { createFileChunks, createUploadCoordinator, UploadCoordinator } from '../src/file';

/**
 * 辅助工具：创建指定大小的虚拟 Blob 数据块
 */
function createDummyBlob(sizeBytes: number): Blob {
  const buffer = new Uint8Array(sizeBytes);
  return new Blob([buffer]);
}

describe('UploadCoordinator & createFileChunks (大文件切片与并发上传协调器)', () => {
  describe('1. createFileChunks 纯函数切分能力', () => {
    it('应将 12MB 的 Blob 按 5MB 切分为 3 个分片，字节区间与序号完全准确', () => {
      const totalSize = 12 * 1024 * 1024;
      const chunkSize = 5 * 1024 * 1024;
      const blob = createDummyBlob(totalSize);

      const chunks = createFileChunks(blob, chunkSize);

      expect(chunks).toHaveLength(3);

      // 第 0 片：0 ~ 5MB
      expect(chunks[0].index).toBe(0);
      expect(chunks[0].start).toBe(0);
      expect(chunks[0].end).toBe(chunkSize);
      expect(chunks[0].size).toBe(chunkSize);
      expect(chunks[0].totalChunks).toBe(3);

      // 第 1 片：5MB ~ 10MB
      expect(chunks[1].index).toBe(1);
      expect(chunks[1].start).toBe(chunkSize);
      expect(chunks[1].end).toBe(10 * 1024 * 1024);
      expect(chunks[1].size).toBe(chunkSize);
      expect(chunks[1].totalChunks).toBe(3);

      // 第 2 片：10MB ~ 12MB (剩余 2MB)
      expect(chunks[2].index).toBe(2);
      expect(chunks[2].start).toBe(10 * 1024 * 1024);
      expect(chunks[2].end).toBe(totalSize);
      expect(chunks[2].size).toBe(2 * 1024 * 1024);
      expect(chunks[2].totalChunks).toBe(3);
    });

    it('当文件大小能被整除时应切出恰好数量的分片', () => {
      const blob = createDummyBlob(10 * 1024 * 1024);
      const chunks = createFileChunks(blob, 5 * 1024 * 1024);

      expect(chunks).toHaveLength(2);
      expect(chunks[0].size).toBe(5 * 1024 * 1024);
      expect(chunks[1].size).toBe(5 * 1024 * 1024);
    });

    it('文件小于分片大小时应切出单个完整分片', () => {
      const blob = createDummyBlob(1024 * 1024); // 1MB
      const chunks = createFileChunks(blob, 5 * 1024 * 1024);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].index).toBe(0);
      expect(chunks[0].size).toBe(1024 * 1024);
      expect(chunks[0].totalChunks).toBe(1);
    });

    it('文件大小为 0 时应防御性返回空数组', () => {
      const blob = createDummyBlob(0);
      const chunks = createFileChunks(blob);

      expect(chunks).toEqual([]);
    });

    it('chunkSize 非法（0 或负数）时应自动回退到默认 5MB', () => {
      const blob = createDummyBlob(10 * 1024 * 1024);
      const chunks = createFileChunks(blob, 0);

      expect(chunks).toHaveLength(2);
      expect(chunks[0].size).toBe(5 * 1024 * 1024);
    });
  });

  describe('2. UploadCoordinator 受控并发调度', () => {
    it('并发数应严格不超过设定阈值（concurrency = 3）且结果按序号排序', async () => {
      const chunks = createFileChunks(createDummyBlob(10 * 1024 * 1024), 1024 * 1024); // 10 个 1MB 切片
      expect(chunks).toHaveLength(10);

      let activeCount = 0;
      let maxObservedConcurrency = 0;

      const coordinator = createUploadCoordinator({
        concurrency: 3,
        uploadChunk: async chunk => {
          activeCount++;
          if (activeCount > maxObservedConcurrency) {
            maxObservedConcurrency = activeCount;
          }
          // 模拟网络延迟（乱序完成）
          const delay = (10 - chunk.index) * 5;
          await new Promise(resolve => setTimeout(resolve, delay));
          activeCount--;
          return { chunkId: chunk.index };
        },
      });

      const results = await coordinator.upload(chunks);

      expect(maxObservedConcurrency).toBeLessThanOrEqual(3);
      expect(results).toHaveLength(10);
      // 确认结果严格按 index 升序排列
      for (let i = 0; i < 10; i++) {
        expect(results[i].index).toBe(i);
        expect(results[i].result).toEqual({ chunkId: i });
      }
    });

    it('uploadFile 应能一站式完成切片与并发上传', async () => {
      const blob = createDummyBlob(3 * 1024 * 1024);
      const coordinator = new UploadCoordinator({
        concurrency: 2,
        uploadChunk: async chunk => `uploaded-${chunk.index}`,
      });

      const results = await coordinator.uploadFile(blob, 1024 * 1024);
      expect(results).toHaveLength(3);
      expect(results.map(r => r.result)).toEqual(['uploaded-0', 'uploaded-1', 'uploaded-2']);
    });
  });

  describe('3. 进度单调递增统计 (onProgress)', () => {
    it('上传过程中进度百分比应单调递增，并在结束时达到 100%', async () => {
      const chunks = createFileChunks(createDummyBlob(4 * 1024 * 1024), 1024 * 1024);
      const progressHistory: number[] = [];

      const coordinator = createUploadCoordinator({
        concurrency: 2,
        onProgress: percent => {
          progressHistory.push(percent);
        },
        uploadChunk: async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return true;
        },
      });

      await coordinator.upload(chunks);

      expect(progressHistory.length).toBeGreaterThanOrEqual(4);
      expect(progressHistory[0]).toBe(0);
      expect(progressHistory[progressHistory.length - 1]).toBe(100);

      // 验证单调非递减
      for (let i = 1; i < progressHistory.length; i++) {
        expect(progressHistory[i]).toBeGreaterThanOrEqual(progressHistory[i - 1]);
      }
    });
  });

  describe('4. 切片局部重试机制 (Chunk-level Retry)', () => {
    it('单个切片首次失败时应局部重试成功，不影响整体成功上传', async () => {
      const chunks = createFileChunks(createDummyBlob(3 * 1024 * 1024), 1024 * 1024);
      const failedMap = new Map<number, number>();
      const retryEvents: number[] = [];

      const coordinator = createUploadCoordinator({
        concurrency: 2,
        maxRetries: 2,
        retryDelay: 10,
        onChunkRetry: chunk => {
          retryEvents.push(chunk.index);
        },
        uploadChunk: async chunk => {
          // 切片 1 第一次尝试时故意抛错
          const count = failedMap.get(chunk.index) ?? 0;
          if (chunk.index === 1 && count === 0) {
            failedMap.set(chunk.index, 1);
            throw new Error('Transient socket timeout');
          }
          return { ok: true };
        },
      });

      const results = await coordinator.upload(chunks);

      expect(results).toHaveLength(3);
      expect(retryEvents).toEqual([1]);
    });

    it('单个切片重试超限时应抛出异常并终止整体任务', async () => {
      const chunks = createFileChunks(createDummyBlob(3 * 1024 * 1024), 1024 * 1024);

      const coordinator = createUploadCoordinator({
        concurrency: 2,
        maxRetries: 2,
        retryDelay: 10,
        uploadChunk: async chunk => {
          if (chunk.index === 2) {
            throw new Error('Fatal disk read error');
          }
          return { ok: true };
        },
      });

      await expect(coordinator.upload(chunks)).rejects.toThrow('Fatal disk read error');
    });
  });

  describe('5. AbortSignal 中断与任务清理', () => {
    it('上传途中触发 AbortSignal 应立即终止且中断未决切片', async () => {
      const controller = new AbortController();
      const chunks = createFileChunks(createDummyBlob(6 * 1024 * 1024), 1024 * 1024);
      const startedChunks: number[] = [];

      const coordinator = createUploadCoordinator({
        concurrency: 2,
        uploadChunk: async (chunk, signal) => {
          startedChunks.push(chunk.index);
          if (chunk.index === 1) {
            controller.abort();
          }
          if (signal?.aborted) {
            throw new Error('Upload aborted');
          }
          await new Promise(resolve => setTimeout(resolve, 50));
          return true;
        },
      });

      await expect(coordinator.upload(chunks, controller.signal)).rejects.toThrow();
      // 并发为 2，只有第 0 和 1 片被触发开始，后续切片绝不应该被调度启动
      expect(startedChunks.length).toBeLessThanOrEqual(2);
    });
  });
});
