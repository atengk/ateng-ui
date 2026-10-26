/**
 * 企业级网络文件流获取与双态异常防御。
 *
 * 采用原生标准 Fetch API + ReadableStream 流式管道，
 * 彻底杜绝三方脚本 (如 inspector.js) 侵入 XMLHttpRequest 读取 responseText 抛出的 InvalidStateError。
 * 原生对接 @atengk/core 的 AuthManager（自动注入双轨 Token Header）、
 * AbortController 优雅取消，并严格遵循 ADR-0004 防御 application/json 错误体。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { authManager, BusinessException, parseContentDispositionFilename } from '@atengk/core';
import { detectFileType } from './sniff';
import { calculateProgress, type FileViewerDownloadProgress } from './sizeGuard';

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

  /**
   * 流式下载进度监听回调。
   */
  onProgress?: (progress: FileViewerDownloadProgress) => void;
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
  const { signal, fileName, fileType, headers = {}, auth = true } = options;

  // 1. 构建标准化请求头（注入鉴权凭据）
  const requestHeaders: Record<string, string> = { ...headers };
  if (auth) {
    const authHeaders = authManager.getHeaders();
    for (const [key, val] of Object.entries(authHeaders)) {
      if (val !== undefined && val !== null && !requestHeaders[key]) {
        requestHeaders[key] = String(val);
      }
    }
  }

  // 2. 发起标准 Fetch 请求
  const response = await fetch(url, {
    method: 'GET',
    headers: requestHeaders,
    signal,
  });

  const contentType = response.headers.get('content-type') || '';
  const disposition = response.headers.get('content-disposition') || '';

  // 3. ADR-0004 双态异常识别：若状态码非 2xx 或响应头指示为 JSON，拦截解析并抛出业务异常
  if (!response.ok || contentType.includes('application/json')) {
    const text = await response.text();
    let errorPayload: { code?: number; msg?: string; traceId?: string } | undefined;
    try {
      errorPayload = JSON.parse(text);
    } catch {
      // 非法 JSON 字符串，保留原样
    }

    if (
      errorPayload &&
      typeof errorPayload === 'object' &&
      ('code' in errorPayload || 'msg' in errorPayload)
    ) {
      throw new BusinessException(
        Number(errorPayload.code) || response.status,
        errorPayload.msg || `文件流获取失败: HTTP ${response.status}`,
        errorPayload.traceId,
      );
    }

    throw new BusinessException(
      response.status,
      `文件流获取失败 (HTTP ${response.status})${text ? `: ${text.slice(0, 120)}` : ''}`,
    );
  }

  // 4. 流式读取二进制数据并计算传输速率与进度
  const contentLengthHeader = response.headers.get('content-length');
  const total = contentLengthHeader ? parseInt(contentLengthHeader, 10) : undefined;
  let loaded = 0;
  const chunks: BlobPart[] = [];

  if (response.body) {
    const reader = response.body.getReader();
    let lastTime = Date.now();
    let lastLoaded = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        loaded += value.byteLength;

        if (options.onProgress) {
          const now = Date.now();
          const elapsedSec = (now - lastTime) / 1000;
          let bytesPerSec = 0;
          if (elapsedSec >= 0.1) {
            bytesPerSec = Math.round((loaded - lastLoaded) / elapsedSec);
            lastTime = now;
            lastLoaded = loaded;
          }
          options.onProgress(
            calculateProgress({
              loaded,
              total,
              bytesPerSec,
            }),
          );
        }
      }
    }
  } else {
    const arrayBuffer = await response.arrayBuffer();
    chunks.push(new Uint8Array(arrayBuffer));
    loaded = arrayBuffer.byteLength;
    if (options.onProgress) {
      options.onProgress(
        calculateProgress({
          loaded,
          total: loaded,
          bytesPerSec: 0,
        }),
      );
    }
  }

  const blob = new Blob(chunks, { type: contentType || 'application/octet-stream' });

  // 5. 读取前 2048 字节用于三阶魔数匹配
  let buffer: ArrayBuffer | undefined;
  try {
    const slice = blob.slice(0, 2048);
    buffer = await slice.arrayBuffer();
  } catch {
    // 忽略切片读取失败
  }

  // 6. 解析文件名与扩展名
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

  // 7. 包装为具名 File 对象与 ObjectURL
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
