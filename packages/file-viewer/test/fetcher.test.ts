/**
 * 网络文件流获取与双态异常拦截单元测试。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authManager, BusinessException } from '@atengk/core';
import { fetchRemoteFileStream } from '../src';

describe('fetchRemoteFileStream 网络文件流与契约防御测试', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    authManager.setToken('test-bearer-token-12345');
  });

  afterEach(() => {
    authManager.clearToken();
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('成功获取文件流并基于 Content-Disposition 包装为具名 File', async () => {
    const fakeContent = new TextEncoder().encode('%PDF-1.7 dummy pdf content');
    const headers = new Headers({
      'content-disposition': "attachment; filename*=UTF-8''%e5%90%88%e5%90%8c.pdf",
      'content-type': 'application/pdf',
      'content-length': String(fakeContent.byteLength),
    });

    const mockResponse = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(fakeContent);
          controller.close();
        },
      }),
      {
        status: 200,
        headers,
      },
    );

    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    const progressLogs: number[] = [];
    const result = await fetchRemoteFileStream('https://example.com/api/files/download?id=101', {
      onProgress: p => {
        progressLogs.push(p.percent);
      },
    });

    expect(result.file).toBeInstanceOf(File);
    expect(result.fileName).toBe('合同.pdf');
    expect(result.fileType).toBe('pdf');
    expect(result.objectUrl).toBeTruthy();
    expect(progressLogs.length).toBeGreaterThan(0);
  });

  it('遵守 ADR-0004 规则：遇到后端返回的 application/json 错误体时拦截解析并抛出 BusinessException', async () => {
    const errorJson = JSON.stringify({
      code: 403,
      msg: '您无权查看该涉密附件',
      traceId: 'tr-test-403-uuid',
    });

    const headers = new Headers({
      'content-type': 'application/json;charset=utf-8',
    });

    const mockResponse = new Response(errorJson, {
      status: 200,
      headers,
    });

    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

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

  it('HTTP 状态码 500 或 404 时抛出 BusinessException 并包含状态码', async () => {
    const mockResponse = new Response('Server Error', {
      status: 500,
      statusText: 'Internal Server Error',
    });

    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    await expect(fetchRemoteFileStream('https://example.com/api/files/error')).rejects.toThrow(
      BusinessException,
    );
  });

  it('支持传递 AbortSignal 实现请求即时中断', async () => {
    const abortCtrl = new AbortController();

    globalThis.fetch = vi.fn().mockImplementation((_url, init) => {
      const signal: AbortSignal | undefined = init?.signal;
      if (signal?.aborted) {
        const error = new Error('The user aborted a request.');
        error.name = 'AbortError';
        return Promise.reject(error);
      }
      return new Promise((_, reject) => {
        signal?.addEventListener('abort', () => {
          const error = new Error('The user aborted a request.');
          error.name = 'AbortError';
          reject(error);
        });
      });
    });

    const promise = fetchRemoteFileStream('https://example.com/api/files/slow-file', {
      signal: abortCtrl.signal,
    });

    abortCtrl.abort();

    await expect(promise).rejects.toThrow('The user aborted a request.');
  });
});
