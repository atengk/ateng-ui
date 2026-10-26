/**
 * BlobJsonGuard: 流媒体双态异常识别与防白屏熔断守卫。
 *
 * 遵循系统级 ADR-0004 规范：针对接口鉴权失效或资源异常时后端返回的 application/json 报错文本，
 * 实施前置拦截与双态探测，将其安全解析转译为类型安全的 BusinessException 并透传 traceId，
 * 坚决杜绝将损坏的 JSON 文本投喂给底层二进制解复用器引发白屏死锁。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { BusinessException } from '@atengk/core';
import { defaultTokenInjector, TokenInjector } from './TokenInjector';

export interface MediaProbeOptions {
  /**
   * 取消信号。
   */
  signal?: AbortSignal;
  /**
   * 是否自动注入当前 Token 鉴权凭据 (默认 true)。
   */
  auth?: boolean;
  /**
   * 自定义请求头。
   */
  headers?: Record<string, string>;
  /**
   * 自定义 Token 注入器。
   */
  tokenInjector?: TokenInjector;
  /**
   * 是否采用 Range 范围请求探测媒体头（默认 true，仅获取前 2KB 探测，节省流量）。
   */
  rangeProbe?: boolean;
}

export interface MediaProbeResult {
  /**
   * 探测是否成功。
   */
  ok: boolean;
  /**
   * HTTP 响应状态码。
   */
  status: number;
  /**
   * 探测到的 Content-Type 响应头。
   */
  contentType: string;
  /**
   * Content-Length 响应头大小。
   */
  contentLength?: number;
}

export class BlobJsonGuard {
  /**
   * 从报错响应文本中解析业务异常 JSON 实体并构造 BusinessException。
   *
   * @param text 响应文本内容
   * @param status HTTP 状态码
   * @returns 转译后的 BusinessException 实例
   */
  static parseJsonError(text: string, status = 500): BusinessException | null {
    if (!text || typeof text !== 'string') {
      return null;
    }

    const trimmed = text.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return null;
    }

    try {
      const payload = JSON.parse(trimmed) as {
        code?: number | string;
        msg?: string;
        message?: string;
        traceId?: string;
      };

      if (payload && typeof payload === 'object') {
        const code = Number(payload.code) || status;
        const msg = payload.msg || payload.message || `媒体流请求失败 (HTTP ${status})`;
        const traceId = payload.traceId;
        return new BusinessException(code, msg, traceId);
      }
    } catch {
      // 忽略非法 JSON 解析异常
    }

    return null;
  }

  /**
   * 对目标流媒体 URL 进行前置安全嗅探，主动识别 401/403/500 JSON 异常。
   *
   * @param url 媒体流地址
   * @param options 探测配置
   * @returns 探测成功时的元信息
   * @throws BusinessException 当检测到后端返回 JSON 报错或权限拒绝时直接抛出
   */
  static async probeMediaStream(
    url: string,
    options: MediaProbeOptions = {},
  ): Promise<MediaProbeResult> {
    const {
      signal,
      auth = true,
      headers = {},
      tokenInjector = defaultTokenInjector,
      rangeProbe = true,
    } = options;

    // 1. 组装鉴权请求头
    let requestHeaders: Record<string, string> = { ...headers };
    if (auth) {
      requestHeaders = tokenInjector.injectHeaders(requestHeaders);
    }

    // 2. 针对普通直链进行 Range 分片嗅探（HLS/FLV 可直接做轻量探测）
    if (rangeProbe && !url.includes('.m3u8')) {
      requestHeaders['Range'] = 'bytes=0-2047';
    }

    // 3. 发起探测请求
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: requestHeaders,
        signal,
      });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err;
      }
      throw new BusinessException(
        0,
        err instanceof Error ? err.message : '网络连接失败或跨域被拦截',
        undefined,
        err,
      );
    }

    const contentType = response.headers.get('content-type') || '';
    const contentLength = Number(response.headers.get('content-length')) || undefined;

    // 4. ADR-0004 双态异常防崩溃拦截：非 2xx/206 状态，或 Content-Type 显式为 JSON 时
    if (!response.ok || contentType.includes('application/json')) {
      const text = await response.text();
      const businessError = BlobJsonGuard.parseJsonError(text, response.status);

      if (businessError) {
        throw businessError;
      }

      // 非 JSON 的标准 HTTP 报错
      const reason = response.statusText ? ` (${response.statusText})` : '';
      throw new BusinessException(
        response.status,
        `流媒体响应异常: HTTP ${response.status}${reason}`,
      );
    }

    return {
      ok: true,
      status: response.status,
      contentType,
      contentLength,
    };
  }

  /**
   * 将任意未知异常统一定向转译为强类型 BusinessException。
   *
   * @param error 捕获到的异常对象
   * @returns 标准化 BusinessException
   */
  static toBusinessException(error: unknown): BusinessException {
    if (error instanceof BusinessException) {
      return error;
    }
    if (error instanceof Error) {
      return new BusinessException(500, error.message, undefined, error);
    }
    return new BusinessException(500, String(error || '播放器发生未知异常'));
  }
}
