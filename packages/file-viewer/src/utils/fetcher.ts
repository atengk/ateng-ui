/**
 * 企业级网络文件流获取与双态异常防御。
 *
 * 原生对接 @atengk/core 的 AuthManager（自动注入双轨 Token Header）、
 * AbortController 请求取消，并严格遵循 ADR-0004 防御 Blob 中的 JSON 错误体。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import {
  http,
  checkBlobForJsonError,
  getBlobDisposition,
  parseContentDispositionFilename,
  type Result,
} from '@atengk/core';
import { detectFileType } from './sniff';

export interface RemoteFileFetchOptions {
  /**
   * 取消信号。
   */
  signal?: AbortSignal;

  /**
   * 显式指定文件名。
   */
  fileName?: string;

  /**
   * 显式指定文件类型。
   */
  fileType?: string;

  /**
   * 自定义请求头。
   */
  headers?: Record<string, string>;

  /**
   * 是否自动注入当前登录态凭据 (默认 true)。
   */
  auth?: boolean;
}

export interface RemoteFileFetchResult {
  /**
   * 下载并包装后的本地 File 对象。
   */
  file: File;

  /**
   * 解析出的最终有效文件名。
   */
  fileName: string;

  /**
   * 解析出的最终有效扩展名。
   */
  fileType: string;

  /**
   * 原始二进制 Blob 对象。
   */
  blob: Blob;

  /**
   * 为该二进制创建的 ObjectURL (如已创建)。
   */
  objectUrl: string;
}

/**
 * 获取远程文件流，并进行三阶智能嗅探与双态异常拦截。
 *
 * @param url 远程文件地址
 * @param options 获取配置项
 * @returns 解析并包装后的文件结果实体
 */
export async function fetchRemoteFileStream(
  url: string,
  options: RemoteFileFetchOptions = {},
): Promise<RemoteFileFetchResult> {
  const { signal, fileName, fileType, headers = {} } = options;

  // 1. 发起网络请求获取二进制 Blob 流
  const rawResponse = await http.request<Blob>({
    url,
    method: 'GET',
    responseType: 'blob',
    signal,
    headers,
    unwrap: false,
  });

  const blob = (
    rawResponse && typeof rawResponse === 'object' && 'data' in rawResponse
      ? (rawResponse as Result<Blob>).data
      : rawResponse
  ) as Blob;

  // 2. 提取响应头与检查是否为服务端 JSON 错误体 (遵循 ADR-0004)
  const responseHeaders =
    rawResponse && typeof rawResponse === 'object' && 'headers' in rawResponse
      ? (rawResponse as { headers?: Record<string, string> }).headers
      : undefined;

  const disposition = getBlobDisposition(blob) || responseHeaders?.['content-disposition'];
  const contentType = responseHeaders?.['content-type'] || blob.type;

  await checkBlobForJsonError(blob, contentType);

  // 3. 读取前 2048 字节用于三阶魔数匹配
  let buffer: ArrayBuffer | undefined;
  try {
    const slice = blob.slice(0, 2048);
    buffer = await slice.arrayBuffer();
  } catch {
    // 忽略读取失败
  }

  // 4. 解析文件名与扩展名
  const headerFileName = disposition ? parseContentDispositionFilename(disposition, '') : '';
  const resolvedFileName =
    fileName ||
    headerFileName ||
    (() => {
      const part0 = url.split('?')[0];
      const clean = part0 ? part0.split('#')[0] : '';
      if (clean) {
        const slashIdx = clean.lastIndexOf('/');
        if (slashIdx >= 0) {
          const seg = clean.slice(slashIdx + 1);
          if (seg) return decodeURIComponent(seg);
        }
      }
      return 'document';
    })();

  const detectedExt = detectFileType({
    explicitType: fileType,
    fileName: resolvedFileName,
    url,
    contentDisposition: disposition,
    contentType: blob.type,
    buffer,
  });

  const finalFileName = resolvedFileName.includes('.')
    ? resolvedFileName
    : `${resolvedFileName}.${detectedExt || 'bin'}`;

  // 5. 包装为具名 File 对象与 ObjectURL
  const file = new File([blob], finalFileName, { type: blob.type });
  const objectUrl = typeof URL !== 'undefined' ? URL.createObjectURL(blob) : '';

  return {
    file,
    fileName: finalFileName,
    fileType: detectedExt,
    blob,
    objectUrl,
  };
}
