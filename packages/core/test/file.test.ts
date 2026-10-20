/**
 * Blob 异常双态识别与安全文件下载单元测试。
 *
 * @author Ateng
 * @since 2026-10-19
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BusinessException } from '../src/contracts';
import {
  checkBlobForJsonError,
  parseContentDispositionFilename,
  saveBlobAsFile,
} from '../src/file';

describe('Blob Dual-State & File Download (Blob 双态异常与安全下载)', () => {
  describe('1. parseContentDispositionFilename (文件名提取与 UTF-8 解码)', () => {
    it('应优先解析 RFC 5987 / RFC 6266 filename*=UTF-8 编码的中文文件名', () => {
      const header = "attachment; filename*=UTF-8''%e7%94%a8%e6%88%b7%e6%b8%85%e5%8d%95.xlsx";
      expect(parseContentDispositionFilename(header)).toBe('用户清单.xlsx');
    });

    it('应支持 RFC 5987 带有语言标签的 filename* 格式', () => {
      const header = "attachment; filename*=UTF-8'zh-CN'%e6%8a%a5%e8%a1%a8.xlsx";
      expect(parseContentDispositionFilename(header)).toBe('报表.xlsx');
    });

    it('当同时存在普通 filename 与 filename* 时，应以 filename* 为准', () => {
      const header =
        'attachment; filename="fallback.xlsx"; filename*=utf-8\'\'%e8%ae%a2%e5%8d%95%e6%98%8e%e7%bb%86.xlsx';
      expect(parseContentDispositionFilename(header)).toBe('订单明细.xlsx');
    });

    it('应正确解析带双引号的普通 filename', () => {
      const header = 'attachment; filename="export_2026_10.csv"';
      expect(parseContentDispositionFilename(header)).toBe('export_2026_10.csv');
    });

    it('应正确解析无引号的普通 filename', () => {
      const header = 'attachment; filename=annual_report.pdf';
      expect(parseContentDispositionFilename(header)).toBe('annual_report.pdf');
    });

    it('缺失或非法 Header 时应保底返回 fallbackFilename', () => {
      expect(parseContentDispositionFilename(null, 'default.xlsx')).toBe('default.xlsx');
      expect(parseContentDispositionFilename(undefined, 'backup.csv')).toBe('backup.csv');
      expect(parseContentDispositionFilename('', 'default.zip')).toBe('default.zip');
      expect(parseContentDispositionFilename('invalid-header')).toBe('download');
    });

    it('URL 解码异常时应优雅降级不抛出错误', () => {
      const malformedHeader = "attachment; filename*=UTF-8''%E0%A4%A";
      expect(() => parseContentDispositionFilename(malformedHeader)).not.toThrow();
    });

    it('应清洗目录穿越符号并去除冗余首尾引号', () => {
      expect(parseContentDispositionFilename('attachment; filename="../../evil.sh"')).toBe(
        'evil.sh',
      );
      expect(parseContentDispositionFilename('attachment; filename="..\\..\\passwords.txt"')).toBe(
        'passwords.txt',
      );
      expect(
        parseContentDispositionFilename('attachment; filename*=UTF-8\'\'"%e6%8a%a5%e8%a1%a8.xlsx"'),
      ).toBe('报表.xlsx');
    });
  });

  describe('2. checkBlobForJsonError (Blob 双态异常拦截识别)', () => {
    it('当 Blob 为 application/json 且包含 Result 错误结构时，应转译抛出 BusinessException', async () => {
      const errorJson = JSON.stringify({
        code: 40001,
        msg: 'Excel 模板数据校验失败，包含非法字段',
        traceId: 'trace-err-888',
        data: { errorRow: 5 },
      });

      const blob = new Blob([errorJson], { type: 'application/json' });

      await expect(checkBlobForJsonError(blob, 'application/json;charset=utf-8')).rejects.toThrow(
        BusinessException,
      );

      try {
        await checkBlobForJsonError(blob, 'application/json');
      } catch (err) {
        expect(err).toBeInstanceOf(BusinessException);
        const be = err as BusinessException;
        expect(be.code).toBe(40001);
        expect(be.msg).toBe('Excel 模板数据校验失败，包含非法字段');
        expect(be.traceId).toBe('trace-err-888');
        expect(be.cause).toEqual({ errorRow: 5 });
      }
    });

    it('正常二进制文件流（如 application/octet-stream 或 xlsx）不应抛出异常', async () => {
      const binaryData = new Uint8Array([0x50, 0x4b, 0x03, 0x04]); // PK zip header
      const blob = new Blob([binaryData], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      await expect(
        checkBlobForJsonError(
          blob,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ),
      ).resolves.toBeUndefined();
    });

    it('HTTP 状态码异常且内容为 JSON 时应强行转译抛出异常', async () => {
      const jsonStr = JSON.stringify({
        message: 'Internal Server Error',
      });
      const blob = new Blob([jsonStr], { type: 'text/plain' });

      await expect(checkBlobForJsonError(blob, 'text/plain', 500)).rejects.toThrow(
        BusinessException,
      );
    });

    it('空值或非 Blob 输入应安全保底不抛出异常', async () => {
      await expect(checkBlobForJsonError(null)).resolves.toBeUndefined();
      await expect(checkBlobForJsonError(undefined)).resolves.toBeUndefined();
      await expect(checkBlobForJsonError('string data')).resolves.toBeUndefined();
    });
  });

  describe('3. saveBlobAsFile (平台守卫型安全下载与确定性内存回收)', () => {
    let originalWindow: unknown;
    let originalDocument: unknown;
    let originalUrl: unknown;

    beforeEach(() => {
      originalWindow = (globalThis as Record<string, unknown>).window;
      originalDocument = (globalThis as Record<string, unknown>).document;
      originalUrl = (globalThis as Record<string, unknown>).URL;
    });

    afterEach(() => {
      if (originalWindow === undefined) {
        delete (globalThis as Record<string, unknown>).window;
      } else {
        (globalThis as Record<string, unknown>).window = originalWindow;
      }

      if (originalDocument === undefined) {
        delete (globalThis as Record<string, unknown>).document;
      } else {
        (globalThis as Record<string, unknown>).document = originalDocument;
      }

      if (originalUrl === undefined) {
        delete (globalThis as Record<string, unknown>).URL;
      } else {
        (globalThis as Record<string, unknown>).URL = originalUrl;
      }
    });

    it('在非浏览器 (Node/SSR) 环境下应安全降级返回 false，严禁抛出异常', () => {
      delete (globalThis as Record<string, unknown>).window;
      delete (globalThis as Record<string, unknown>).document;

      const blob = new Blob(['test']);
      expect(saveBlobAsFile(blob, 'test.txt')).toBe(false);
    });

    it('在浏览器环境中应正确触发模拟 a 标签点击，并调用 URL.revokeObjectURL 释放内存', () => {
      const revokeMock = vi.fn();
      const createMock = vi.fn().mockReturnValue('blob:mock-url-123');
      const clickMock = vi.fn();
      const appendChildMock = vi.fn();
      const removeChildMock = vi.fn();

      const mockLink = {
        href: '',
        download: '',
        style: {} as Record<string, string>,
        click: clickMock,
      };

      (globalThis as Record<string, unknown>).window = {};
      (globalThis as Record<string, unknown>).URL = {
        createObjectURL: createMock,
        revokeObjectURL: revokeMock,
      };
      (globalThis as Record<string, unknown>).document = {
        createElement: vi.fn().mockReturnValue(mockLink),
        body: {
          appendChild: appendChildMock,
          removeChild: removeChildMock,
        },
      };

      const blob = new Blob(['sample-data']);
      // 传入 revokeDelay: 0 同步释放
      const result = saveBlobAsFile(blob, 'export.xlsx', { revokeDelay: 0 });

      expect(result).toBe(true);
      expect(createMock).toHaveBeenCalledWith(blob);
      expect(mockLink.download).toBe('export.xlsx');
      expect(mockLink.href).toBe('blob:mock-url-123');
      expect(appendChildMock).toHaveBeenCalledWith(mockLink);
      expect(clickMock).toHaveBeenCalledTimes(1);
      expect(removeChildMock).toHaveBeenCalledWith(mockLink);
      expect(revokeMock).toHaveBeenCalledWith('blob:mock-url-123');
    });
  });
});
