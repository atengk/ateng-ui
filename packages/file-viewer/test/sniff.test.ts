/**
 * 三阶智能文件类型嗅探算法单元测试。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { describe, it, expect } from 'vitest';
import { detectFileType, sniffMagicNumber } from '../src';

describe('三阶智能文件类型嗅探 (ThreeStageSniffing) 契约测试', () => {
  describe('一阶判定: 显式参数与文件名优先', () => {
    it('显式传入 explicitType 时绝对优先', () => {
      const type = detectFileType({
        explicitType: '.DOCX',
        fileName: 'report.pdf',
        url: 'https://example.com/file.xlsx',
      });
      expect(type).toBe('docx');
    });

    it('从带有查询参数与 Hash 的 URL 中准确提取扩展名', () => {
      const type = detectFileType({
        url: 'https://example.com/oss/contract_2026.pdf?token=abc#section-1',
      });
      expect(type).toBe('pdf');
    });

    it('从文件名中提取扩展名', () => {
      const type = detectFileType({
        fileName: '财务明细.xlsx',
        url: 'https://example.com/api/files/download',
      });
      expect(type).toBe('xlsx');
    });
  });

  describe('二阶判定: HTTP 响应头推导', () => {
    it('从 Content-Disposition 响应头提取标准 filename 扩展名', () => {
      const type = detectFileType({
        url: 'https://example.com/api/files/stream?id=123',
        contentDisposition: 'attachment; filename="annual_statement.pptx"',
      });
      expect(type).toBe('pptx');
    });

    it('从 Content-Disposition 响应头提取 RFC 5987 UTF-8 编码文件名', () => {
      const type = detectFileType({
        url: 'https://example.com/api/files/stream?id=999',
        contentDisposition: "attachment; filename*=UTF-8''%e6%bc%94%e7%a4%ba.pptx",
      });
      expect(type).toBe('pptx');
    });

    it('从 Content-Type MIME 准确映射常见文档格式', () => {
      expect(
        detectFileType({
          url: 'https://example.com/stream/no-ext',
          contentType: 'application/pdf',
        }),
      ).toBe('pdf');

      expect(
        detectFileType({
          url: 'https://example.com/stream/no-ext',
          contentType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document; charset=utf-8',
        }),
      ).toBe('docx');

      expect(
        detectFileType({
          url: 'https://example.com/stream/no-ext',
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      ).toBe('xlsx');

      expect(
        detectFileType({
          url: 'https://example.com/stream/no-ext',
          contentType: 'application/ofd',
        }),
      ).toBe('ofd');
    });
  });

  describe('三阶判定: 二进制文件魔数 (Magic Number) 深度嗅探', () => {
    it('精准嗅探 PDF 文件魔数 (%PDF)', () => {
      const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
      expect(sniffMagicNumber(pdfBytes)).toBe('pdf');
      expect(
        detectFileType({
          url: 'https://example.com/api/stream?id=unknown',
          buffer: pdfBytes,
        }),
      ).toBe('pdf');
    });

    it('精准嗅探 PNG、JPEG、GIF、WEBP 图片魔数', () => {
      const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      expect(sniffMagicNumber(pngBytes)).toBe('png');

      const jpgBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      expect(sniffMagicNumber(jpgBytes)).toBe('jpg');

      const gifBytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
      expect(sniffMagicNumber(gifBytes)).toBe('gif');

      // RIFF....WEBP
      const webpBytes = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
      ]);
      expect(sniffMagicNumber(webpBytes)).toBe('webp');
    });

    it('精准嗅探 OLE2 复合文档魔数 (doc)', () => {
      const oleBytes = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
      expect(sniffMagicNumber(oleBytes)).toBe('doc');
    });

    it('精准通过 ZIP 包内容特征探测 Office OpenXML (docx / xlsx / pptx / ofd)', () => {
      // 构造模拟 docx (含 PK 标识与 word/ 目录)
      const docxHeader = 'PK\x03\x04' + '...[Content_Types].xml...word/document.xml...';
      const docxBytes = new Uint8Array(docxHeader.length);
      for (let i = 0; i < docxHeader.length; i++) {
        docxBytes[i] = docxHeader.charCodeAt(i);
      }
      expect(sniffMagicNumber(docxBytes)).toBe('docx');

      // 构造模拟 xlsx (含 xl/ 目录)
      const xlsxHeader = 'PK\x03\x04' + '...xl/workbook.xml...';
      const xlsxBytes = new Uint8Array(xlsxHeader.length);
      for (let i = 0; i < xlsxHeader.length; i++) {
        xlsxBytes[i] = xlsxHeader.charCodeAt(i);
      }
      expect(sniffMagicNumber(xlsxBytes)).toBe('xlsx');

      // 构造模拟 pptx (含 ppt/ 目录)
      const pptxHeader = 'PK\x03\x04' + '...ppt/presentation.xml...';
      const pptxBytes = new Uint8Array(pptxHeader.length);
      for (let i = 0; i < pptxHeader.length; i++) {
        pptxBytes[i] = pptxHeader.charCodeAt(i);
      }
      expect(sniffMagicNumber(pptxBytes)).toBe('pptx');

      // 普通 ZIP
      const zipHeader = 'PK\x03\x04' + '...other/content...';
      const zipBytes = new Uint8Array(zipHeader.length);
      for (let i = 0; i < zipHeader.length; i++) {
        zipBytes[i] = zipHeader.charCodeAt(i);
      }
      expect(sniffMagicNumber(zipBytes)).toBe('zip');
    });

    it('完全无特征或过短数据时返回空字符串保底', () => {
      expect(sniffMagicNumber(new Uint8Array([0x00, 0x01]))).toBe('');
      expect(
        detectFileType({
          url: 'https://example.com/api/unknown',
          buffer: new Uint8Array([0x00, 0x01]),
        }),
      ).toBe('');
    });
  });
});
