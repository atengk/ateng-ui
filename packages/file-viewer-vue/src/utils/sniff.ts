/**
 * 三阶智能文件类型嗅探算法与判定管道。
 *
 * 按照“显式属性 ➔ 响应头 Content-Disposition/Content-Type ➔ 二进制魔数 (Magic Number)”
 * 三阶级联推导，彻底消灭无后缀 RESTful 接口流无法识别的痛点。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { parseContentDispositionFilename } from '@atengk/core';

export interface SniffOptions {
  /**
   * 显式传入的文件类型/扩展名。
   */
  explicitType?: string;

  /**
   * 显式传入的文件名。
   */
  fileName?: string;

  /**
   * 资源访问 URL。
   */
  url?: string;

  /**
   * HTTP 响应头 Content-Type。
   */
  contentType?: string | null;

  /**
   * HTTP 响应头 Content-Disposition。
   */
  contentDisposition?: string | null;

  /**
   * 完整响应头字典映射。
   */
  headers?: Record<string, string | string[] | undefined>;

  /**
   * 二进制数据块缓冲 (用于三阶魔数匹配)。
   */
  buffer?: ArrayBuffer | Uint8Array;
}

/**
 * 常见 MIME 映射字典。
 */
const MIME_MAP: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/ofd': 'ofd',
  'application/vnd.ofd': 'ofd',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
  'application/x-tar': 'tar',
  'text/plain': 'txt',
  'text/markdown': 'md',
  'text/x-markdown': 'md',
  'text/html': 'html',
  'application/json': 'json',
};

/**
 * 从文件名中提取合法扩展名。
 */
function extractExt(name: string): string {
  if (!name) return '';
  const part0 = name.split('?')[0];
  const clean = part0 ? part0.split('#')[0] : '';
  if (!clean) return '';
  const lastSlash = clean.lastIndexOf('/');
  const baseName = lastSlash >= 0 ? clean.slice(lastSlash + 1) : clean;
  const dotIndex = baseName.lastIndexOf('.');
  if (dotIndex > 0 && dotIndex < baseName.length - 1) {
    const rawExt = baseName.slice(dotIndex + 1).toLowerCase();
    return rawExt === 'markdown' ? 'md' : rawExt;
  }
  return '';
}

/**
 * 通过二进制魔数 (Magic Number) 嗅探文件类型。
 */
export function sniffMagicNumber(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.length < 4) return '';

  // 1. PDF: %PDF (0x25, 0x50, 0x44, 0x46)
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return 'pdf';
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'png';
  }

  // 3. JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpg';
  }

  // 4. GIF: GIF87a / GIF89a (47 49 46 38)
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return 'gif';
  }

  // 5. WEBP: RIFF....WEBP (52 49 46 46 .... 57 45 42 50)
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'webp';
  }

  // 6. OLE2 Compound Document (早期 Office 97-2003: D0 CF 11 E0 A1 B1 1A E1)
  if (
    bytes.length >= 8 &&
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0 &&
    bytes[4] === 0xa1 &&
    bytes[5] === 0xb1 &&
    bytes[6] === 0x1a &&
    bytes[7] === 0xe1
  ) {
    return 'doc';
  }

  // 7. PK Zip Container (Office OpenXML / OFD / ZIP: 50 4B 03 04)
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    // 扫描前 2048 字节内容特征区分 docx / xlsx / pptx / ofd / zip
    const scanLimit = Math.min(bytes.length, 2048);
    let sampleText = '';
    for (let i = 0; i < scanLimit; i++) {
      const code = bytes[i];
      if (code !== undefined) {
        sampleText += String.fromCharCode(code);
      }
    }

    if (sampleText.includes('word/') || sampleText.includes('word\\')) {
      return 'docx';
    }
    if (sampleText.includes('xl/') || sampleText.includes('xl\\')) {
      return 'xlsx';
    }
    if (sampleText.includes('ppt/') || sampleText.includes('ppt\\')) {
      return 'pptx';
    }
    if (sampleText.includes('OFD.xml') || sampleText.includes('DocVersion')) {
      return 'ofd';
    }
    return 'zip';
  }

  // 8. 文本/XML 标记检测 (SVG / XML)
  const prefix = String.fromCharCode(...bytes.slice(0, Math.min(bytes.length, 64)))
    .trim()
    .toLowerCase();
  if (prefix.startsWith('<svg') || prefix.includes('<svg')) {
    return 'svg';
  }

  return '';
}

/**
 * 完整三阶级联智能类型推导算法。
 *
 * @param options 推导参数集合
 * @returns 最终推导出的文件类型（如 'docx', 'xlsx', 'pdf' 等，未能识别则返回空字符串）
 */
export function detectFileType(options: SniffOptions): string {
  // 一阶判定：显式参数优先
  if (options.explicitType) {
    const clean = options.explicitType.trim().toLowerCase().replace(/^\./, '');
    if (clean) return clean === 'markdown' ? 'md' : clean;
  }
  if (options.fileName) {
    const ext = extractExt(options.fileName);
    if (ext) return ext;
  }
  if (options.url) {
    const ext = extractExt(options.url);
    if (ext) return ext;
  }

  // 二阶判定：HTTP 响应头推导
  const disposition =
    options.contentDisposition ||
    (options.headers && typeof options.headers['content-disposition'] === 'string'
      ? options.headers['content-disposition']
      : undefined);

  if (disposition) {
    const filenameFromHeader = parseContentDispositionFilename(disposition, '');
    if (filenameFromHeader) {
      const ext = extractExt(filenameFromHeader);
      if (ext) return ext;
    }
  }

  const rawContentType =
    options.contentType ||
    (options.headers && typeof options.headers['content-type'] === 'string'
      ? options.headers['content-type']
      : undefined);

  if (rawContentType) {
    const mimePart = rawContentType.split(';')[0];
    const cleanMime = mimePart ? mimePart.trim().toLowerCase() : '';
    const mapped = MIME_MAP[cleanMime];
    if (mapped) {
      return mapped;
    }
  }

  // 三阶判定：二进制数据魔数 (Magic Number) 深度嗅探
  if (options.buffer) {
    const magicExt = sniffMagicNumber(options.buffer);
    if (magicExt) return magicExt;
  }

  return '';
}
