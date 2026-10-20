/**
 * useExcel Fesod 流式 Excel 导出与批注回写 Hook 单元测试。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, effectScope, h, isReadonly } from 'vue';
import { BusinessException, HttpClient } from '@atengk/core';
import { createAtengVue, useExcel } from '../src';

describe('useExcel', () => {
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;
  let createdObjectUrls: string[] = [];
  let revokedObjectUrls: string[] = [];

  beforeEach(() => {
    vi.useFakeTimers();
    createdObjectUrls = [];
    revokedObjectUrls = [];

    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;

    URL.createObjectURL = vi.fn((_blob: Blob) => {
      const url = `blob:http://localhost/mock-uuid-${createdObjectUrls.length + 1}`;
      createdObjectUrls.push(url);
      return url;
    });

    URL.revokeObjectURL = vi.fn((url: string) => {
      revokedObjectUrls.push(url);
    });
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  describe('Seam 1: Out-of-the-box Excel Export & Filename Resolution', () => {
    it('should export Excel via service function and resolve RFC 5987 UTF-8 filename', async () => {
      const onSuccess = vi.fn();
      const mockBlob = new Blob(['excel-binary-content'], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      // 模拟带有 RFC 5987 编码的响应
      const service = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
          data: mockBlob,
          headers: {
            // RFC 5987: "用户清单_2026.xlsx"
            'content-disposition':
              "attachment; filename*=UTF-8''%E7%94%A8%E6%88%B7%E6%B8%85%E5%8D%95_2026.xlsx",
          },
        };
      });

      const scope = effectScope();
      let result!: ReturnType<typeof useExcel>;

      scope.run(() => {
        result = useExcel({ onSuccess });
      });

      expect(result.exporting.value).toBe(false);

      const promise = result.exportExcel(service);
      expect(result.exporting.value).toBe(true);

      await vi.advanceTimersByTimeAsync(100);
      const filename = await promise;

      expect(filename).toBe('用户清单_2026.xlsx');
      expect(result.exporting.value).toBe(false);
      expect(createdObjectUrls.length).toBe(1);
      expect(onSuccess).toHaveBeenCalledWith(mockBlob, '用户清单_2026.xlsx');

      // 验证延迟回收内存
      expect(revokedObjectUrls.length).toBe(0);
      await vi.advanceTimersByTimeAsync(1000);
      expect(revokedObjectUrls).toContain(createdObjectUrls[0]);

      scope.stop();
    });

    it('should prioritize explicit filename parameter over Content-Disposition header', async () => {
      const mockBlob = new Blob(['binary-data']);
      const service = vi.fn(async () => ({
        data: mockBlob,
        headers: {
          'content-disposition': "attachment; filename*=UTF-8''server_name.xlsx",
        },
      }));

      const scope = effectScope();
      let result!: ReturnType<typeof useExcel>;

      scope.run(() => {
        result = useExcel();
      });

      const promise = result.exportExcel(service, '自定义报表.xlsx');
      const filename = await promise;

      expect(filename).toBe('自定义报表.xlsx');
      expect(result.exporting.value).toBe(false);

      scope.stop();
    });

    it('should fallback to defaultFilename when Content-Disposition is absent', async () => {
      const mockBlob = new Blob(['binary-data']);
      const service = vi.fn(async () => mockBlob);

      const scope = effectScope();
      let result!: ReturnType<typeof useExcel>;

      scope.run(() => {
        result = useExcel({ defaultFilename: '兜底导出.xlsx' });
      });

      const filename = await result.exportExcel(service);
      expect(filename).toBe('兜底导出.xlsx');

      scope.stop();
    });

    it('should support URL string and request config target with custom HttpClient', async () => {
      const mockBlob = new Blob(['custom-binary']);
      const mockHttpClient = {
        request: vi.fn(async (config: unknown) => {
          return {
            data: mockBlob,
            headers: {
              'content-disposition': 'attachment; filename="orders.xlsx"',
            },
            config,
          };
        }),
      } as unknown as HttpClient;

      const scope = effectScope();
      let result!: ReturnType<typeof useExcel>;

      scope.run(() => {
        result = useExcel({ httpClient: mockHttpClient });
      });

      // 1. 测试 URL 字符串目标
      const res1 = await result.exportExcel('/api/orders/export', {
        params: { status: 'PAID' },
      });
      expect(res1).toBe('orders.xlsx');
      expect(mockHttpClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/api/orders/export',
          method: 'GET',
          params: { status: 'PAID' },
          responseType: 'blob',
        }),
      );

      // 2. 测试配置对象目标
      const res2 = await result.exportExcel({
        url: '/api/orders/batch-export',
        method: 'POST',
        data: { ids: [1, 2, 3] },
      });
      expect(res2).toBe('orders.xlsx');
      expect(mockHttpClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/api/orders/batch-export',
          method: 'POST',
          data: { ids: [1, 2, 3] },
          responseType: 'blob',
        }),
      );

      scope.stop();
    });
  });

  describe('Seam 2: Blob-JSON Dual-State Error Detection (Fesod Protocol)', () => {
    it('should intercept JSON error in Blob response and throw BusinessException without downloading', async () => {
      // 模拟后端返回业务报错 JSON 载荷并被包装为 Blob
      const errorJson = JSON.stringify({
        code: 40003,
        msg: '当前筛选条件导出数据量超出限制 (50000条)',
        traceId: 'trace-excel-999',
      });
      const errorBlob = new Blob([errorJson], {
        type: 'application/json',
      });

      const onError = vi.fn();
      const onFinally = vi.fn();
      const service = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return {
          data: errorBlob,
          headers: {
            'content-type': 'application/json',
          },
        };
      });

      const scope = effectScope();
      let result!: ReturnType<typeof useExcel>;

      scope.run(() => {
        result = useExcel({ onError, onFinally });
      });

      const promise = result.exportExcel(service);
      promise.catch(() => {});
      expect(result.exporting.value).toBe(true);

      await vi.advanceTimersByTimeAsync(50);

      // 必须抛出强类型的 BusinessException
      await expect(promise).rejects.toThrow(BusinessException);
      await expect(promise).rejects.toMatchObject({
        code: 40003,
        message: '当前筛选条件导出数据量超出限制 (50000条)',
        traceId: 'trace-excel-999',
      });

      expect(result.exporting.value).toBe(false);
      expect(result.error.value).toBeInstanceOf(BusinessException);
      expect(onError).toHaveBeenCalledWith(expect.any(BusinessException));
      expect(onFinally).toHaveBeenCalledTimes(1);

      // 坚决阻断损坏文件的下载
      expect(createdObjectUrls.length).toBe(0);

      scope.stop();
    });

    it('should propagate error to globalConfig.onError when configured via Vue plugin', async () => {
      const globalOnError = vi.fn();
      const app = createApp({ render: () => h('div') });
      app.use(createAtengVue({ onError: globalOnError }));

      const errorJson = JSON.stringify({
        code: 50001,
        msg: '服务器存储空间不足',
      });
      const errorBlob = new Blob([errorJson], { type: 'application/json' });
      const service = vi.fn(async () => errorBlob);

      let result!: ReturnType<typeof useExcel>;
      app.runWithContext(() => {
        result = useExcel();
      });

      const promise = result.exportExcel(service);
      promise.catch(() => {});
      await expect(promise).rejects.toThrow(BusinessException);
      expect(globalOnError).toHaveBeenCalledWith(expect.any(BusinessException));
    });
  });

  describe('Seam 3: Fesod Error Feedback File Download (downloadFeedback)', () => {
    it('should download annotated error feedback Excel file from direct Blob', async () => {
      const feedbackBlob = new Blob(['annotated-excel-with-comments'], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const scope = effectScope();
      let result!: ReturnType<typeof useExcel>;

      scope.run(() => {
        result = useExcel({ defaultFeedbackFilename: '导入失败批注.xlsx' });
      });

      const filename = await result.downloadFeedback(feedbackBlob);
      expect(filename).toBe('导入失败批注.xlsx');
      expect(createdObjectUrls.length).toBe(1);

      // 验证内存释放
      await vi.advanceTimersByTimeAsync(1000);
      expect(revokedObjectUrls).toContain(createdObjectUrls[0]);

      scope.stop();
    });

    it('should download feedback from service target with custom filename override', async () => {
      const feedbackBlob = new Blob(['feedback-data']);
      const service = vi.fn(async () => ({
        data: feedbackBlob,
        headers: {
          'content-disposition': "attachment; filename*=UTF-8''feedback_batch_001.xlsx",
        },
      }));

      const scope = effectScope();
      let result!: ReturnType<typeof useExcel>;

      scope.run(() => {
        result = useExcel();
      });

      const filename = await result.downloadFeedback(service, '专属批注回写.xlsx');
      expect(filename).toBe('专属批注回写.xlsx');
      expect(createdObjectUrls.length).toBe(1);

      scope.stop();
    });
  });

  describe('Seam 4: Lifecycle Cleanup & Readonly Safety', () => {
    it('exporting and error refs should be strictly readonly', () => {
      const scope = effectScope();
      let result!: ReturnType<typeof useExcel>;

      scope.run(() => {
        result = useExcel();
      });

      expect(isReadonly(result.exporting)).toBe(true);
      expect(isReadonly(result.error)).toBe(true);

      scope.stop();
    });

    it('should abort active request when effectScope is stopped or abort() is called', async () => {
      let capturedSignal: AbortSignal | undefined;
      const service = vi.fn(async () => {
        return await new Promise((_resolve, reject) => {
          if (capturedSignal) {
            capturedSignal.addEventListener('abort', () => {
              reject(new Error('Aborted'));
            });
          }
        });
      });

      const mockHttpClient = {
        request: vi.fn(async (config: { signal?: AbortSignal }) => {
          capturedSignal = config.signal;
          return await service();
        }),
      } as unknown as HttpClient;

      const scope = effectScope();
      let result!: ReturnType<typeof useExcel>;

      scope.run(() => {
        result = useExcel({ httpClient: mockHttpClient });
      });

      const p1 = result.exportExcel('/api/export/hang');
      p1.catch(() => {});
      expect(result.exporting.value).toBe(true);

      // 手动调用 abort
      result.abort();
      expect(result.exporting.value).toBe(false);

      await expect(p1).rejects.toThrow();

      // 再次发起并在 scope.stop() 时自动物理中断
      const p2 = result.exportExcel('/api/export/hang-2');
      p2.catch(() => {});
      expect(result.exporting.value).toBe(true);
      expect(capturedSignal?.aborted).toBe(false);

      scope.stop();
      expect(capturedSignal?.aborted).toBe(true);
      expect(result.exporting.value).toBe(false);
      await expect(p2).rejects.toThrow();
    });

    it('should not extinguish exporting status when previous request finishes during rapid succession', async () => {
      let resolveFirst!: (value: Blob) => void;
      const p1Promise = new Promise<Blob>(resolve => {
        resolveFirst = resolve;
      });

      const scope = effectScope();
      let result!: ReturnType<typeof useExcel>;

      scope.run(() => {
        result = useExcel();
      });

      // 发起慢请求 1
      const p1 = result.exportExcel(async () => p1Promise);
      p1.catch(() => {});
      expect(result.exporting.value).toBe(true);

      // 快速发起新请求 2 (触发 abort 中断请求 1)
      const p2 = result.exportExcel(async () => {
        await new Promise(r => setTimeout(r, 200));
        return new Blob(['data-2']);
      });
      p2.catch(() => {});
      expect(result.exporting.value).toBe(true);

      // 慢请求 1 resolve
      resolveFirst(new Blob(['data-1']));
      await vi.advanceTimersByTimeAsync(10);

      // 验证请求 2 仍在进行中，exporting 未被请求 1 踩灭
      expect(result.exporting.value).toBe(true);

      await vi.advanceTimersByTimeAsync(200);
      await p2;
      expect(result.exporting.value).toBe(false);

      scope.stop();
    });

    it('should fail fast when target is null or undefined', async () => {
      const scope = effectScope();
      let result!: ReturnType<typeof useExcel>;

      scope.run(() => {
        result = useExcel();
      });

      await expect(result.exportExcel(null as unknown as string)).rejects.toThrow(
        'useExcel: 请求目标 target 不能为空',
      );

      scope.stop();
    });
  });
});
