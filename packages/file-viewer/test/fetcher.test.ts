/**
 * 网络文件流获取与双态异常拦截单元测试。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, authManager, BusinessException } from '@atengk/core';
import { fetchRemoteFileStream } from '../src';

describe('fetchRemoteFileStream 网络文件流与契约防御测试', () => {
  beforeEach(() => {
    authManager.setToken('test-bearer-token-12345');
  });

  afterEach(() => {
    authManager.clearToken();
    vi.restoreAllMocks();
  });

  it('成功获取文件流并基于 Content-Disposition 包装为具名 File', async () => {
    const fakeBlob = new Blob(['%PDF-1.7 dummy pdf content'], { type: 'application/pdf' });

    vi.spyOn(http, 'request').mockResolvedValueOnce({
      data: fakeBlob,
      headers: {
        'content-disposition': "attachment; filename*=UTF-8''%e5%90%88%e5%90%8c.pdf",
        'content-type': 'application/pdf',
      },
    } as unknown as Awaited<ReturnType<typeof http.request>>);

    const result = await fetchRemoteFileStream('https://example.com/api/files/download?id=101');

    expect(result.file).toBeInstanceOf(File);
    expect(result.fileName).toBe('合同.pdf');
    expect(result.fileType).toBe('pdf');
    expect(result.objectUrl).toBeTruthy();
  });

  it('遵守 ADR-0004 规则：遇到后端返回的 application/json 错误流时阻断并转译抛出 BusinessException', async () => {
    const errorJson = JSON.stringify({
      code: 403,
      msg: '您无权查看该涉密附件',
      traceId: 'tr-test-403-uuid',
    });
    const errorBlob = new Blob([errorJson], { type: 'application/json' });

    vi.spyOn(http, 'request').mockResolvedValueOnce({
      data: errorBlob,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
    } as unknown as Awaited<ReturnType<typeof http.request>>);

    let capturedError: unknown;
    try {
      await fetchRemoteFileStream('https://example.com/api/files/secret?id=999');
    } catch (err) {
      capturedError = err;
    }

    expect(capturedError).toBeInstanceOf(BusinessException);
    const be = capturedError as BusinessException;
    expect(be.code).toBe(403);
    expect(be.msg).toBe('您无权查看该涉密附件');
    expect(be.traceId).toBe('tr-test-403-uuid');
  });

  it('支持传递 AbortSignal 实现请求即时中断', async () => {
    const abortCtrl = new AbortController();

    vi.spyOn(http, 'request').mockImplementationOnce(async config => {
      if (config?.signal?.aborted) {
        const error = new Error('Aborted');
        error.name = 'AbortError';
        throw error;
      }
      return new Promise((_, reject) => {
        config?.signal?.addEventListener('abort', () => {
          const error = new Error('Aborted');
          error.name = 'AbortError';
          reject(error);
        });
      });
    });

    const promise = fetchRemoteFileStream('https://example.com/api/files/slow-file', {
      signal: abortCtrl.signal,
    });

    abortCtrl.abort();

    await expect(promise).rejects.toThrow('Aborted');
  });
});
