/**
 * Canvas 跨域污染安全防护守卫。
 *
 * 遵循 ADR-0048 规范，拦截远程跨域图片在 Canvas 像素读取时触发的 SecurityError 异常，
 * 并将其因果转译为标准的 BusinessException，杜绝未捕获白屏崩溃并输出明确的排查指引。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { BusinessException } from '@atengk/core';

export class CanvasTaintGuard {
  /** Canvas 跨域污染错误码 (40301) */
  public static readonly ERROR_CODE = 40301;

  /**
   * 判断目标异常是否属于跨域 Canvas 污染导致的 SecurityError。
   *
   * @param error 捕获到的未知异常
   */
  public static isTaintError(error: unknown): boolean {
    if (!error) {
      return false;
    }
    if (error instanceof DOMException && error.name === 'SecurityError') {
      return true;
    }
    const message = error instanceof Error ? error.message : String(error);
    return (
      message.includes('Tainted canvases may not be exported') ||
      message.includes('SecurityError') ||
      message.includes('tainted')
    );
  }

  /**
   * 将原生 SecurityError 转译为强类型因果业务异常 BusinessException。
   *
   * @param cause 原始底层异常
   */
  public static createTaintException(cause: unknown): BusinessException {
    return new BusinessException(
      CanvasTaintGuard.ERROR_CODE,
      '远程图片跨域导致 Canvas 污染，无法安全导出。请确保图片服务器已配置 Access-Control-Allow-Origin: *，且组件已配置 crossOrigin="anonymous"。',
      undefined,
      cause,
    );
  }

  /**
   * 同步包装执行 Canvas 导出操作，自动拦截跨域污染异常。
   *
   * @param action 同步导出执行逻辑
   */
  public static guard<T>(action: () => T): T {
    try {
      return action();
    } catch (error) {
      if (CanvasTaintGuard.isTaintError(error)) {
        throw CanvasTaintGuard.createTaintException(error);
      }
      throw error;
    }
  }

  /**
   * 异步包装执行 Canvas 导出操作，自动拦截跨域污染异常。
   *
   * @param action 异步导出执行逻辑
   */
  public static async guardAsync<T>(action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (error) {
      if (CanvasTaintGuard.isTaintError(error)) {
        throw CanvasTaintGuard.createTaintException(error);
      }
      throw error;
    }
  }
}
