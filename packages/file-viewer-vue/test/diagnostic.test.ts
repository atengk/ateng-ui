/**
 * 结构化异常诊断与分类识别单元测试。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { describe, it, expect } from 'vitest';
import { BusinessException } from '@atengk/core';
import { diagnoseFileViewerError } from '../src/utils/diagnostic';

describe('diagnoseFileViewerError 结构化异常诊断测试 (#137)', () => {
  it('能够准确识别 ENCRYPTED 加密文档异常', () => {
    // 1. 标准 PDF.js 密码异常
    const pdfPasswordError = new Error('Password required or incorrect password');
    pdfPasswordError.name = 'PasswordException';

    const diag1 = diagnoseFileViewerError(pdfPasswordError, {
      fileName: 'confidential_contract.pdf',
      fileType: 'pdf',
    });

    expect(diag1.category).toBe('ENCRYPTED');
    expect(diag1.needsPassword).toBe(true);
    expect(diag1.title).toContain('密码');
    expect(diag1.suggestion).toContain('密码');

    // 2. 错误信息中包含 encrypted 关键字
    const officeEncryptedError = new Error(
      'The file is encrypted with a password and cannot be opened.',
    );
    const diag2 = diagnoseFileViewerError(officeEncryptedError, {
      fileName: 'financials.xlsx',
    });

    expect(diag2.category).toBe('ENCRYPTED');
    expect(diag2.needsPassword).toBe(true);
  });

  it('能够准确识别 LEGACY_BINARY 早期二进制 Office 格式', () => {
    // 老旧 .doc 文件导致现代解析器格式不兼容
    const unsupportedFormatError = new Error('Format error: Not a valid OpenXML document');
    const diag = diagnoseFileViewerError(unsupportedFormatError, {
      fileName: 'legacy_doc_1997.doc',
      fileType: 'doc',
    });

    expect(diag.category).toBe('LEGACY_BINARY');
    expect(diag.title).toContain('早期二进制');
    expect(diag.suggestion).toContain('.docx');
    expect(diag.needsPassword).toBe(false);
  });

  it('能够准确识别 NETWORK_CORS 网络与跨域异常', () => {
    const corsError = new Error('Network Error: Failed to fetch (CORS header missing)');
    const diag = diagnoseFileViewerError(corsError, {
      url: 'https://cdn.other-domain.com/doc.pdf',
    });

    expect(diag.category).toBe('NETWORK_CORS');
    expect(diag.title).toContain('网络');
    expect(diag.suggestion).toContain('CORS');
  });

  it('能够准确识别 BUSINESS_ERROR 业务系统异常并提取 traceId', () => {
    const bizException = new BusinessException(
      403,
      '您无权查看该财务机密审计文件',
      'tr-biz-998877',
    );
    const diag = diagnoseFileViewerError(bizException);

    expect(diag.category).toBe('BUSINESS_ERROR');
    expect(diag.title).toBe('业务接口异常');
    expect(diag.message).toBe('您无权查看该财务机密审计文件');
    expect(diag.traceId).toBe('tr-biz-998877');
  });

  it('对未知损坏文件保底识别为 CORRUPTED 格式损坏异常', () => {
    const corruptError = new Error('Zip: end of central directory not found');
    const diag = diagnoseFileViewerError(corruptError, {
      fileName: 'broken.pptx',
    });

    expect(diag.category).toBe('CORRUPTED');
    expect(diag.title).toContain('损坏');
    expect(diag.canRetry).toBe(true);
  });
});
