/**
 * HTTP 幂等安全重试状态机与退避算法实现。
 *
 * 遵循安全重试不变量：默认仅对幂等只读方法（GET、HEAD、OPTIONS）
 * 以及服务端 5xx、超时或网络中断等瞬态故障执行指数退避重试；
 * 对 POST、PUT、DELETE 等非幂等写操作严格禁止自动重试。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { BusinessException } from '../contracts';

/**
 * 幂等 HTTP 方法集合（只读安全）。
 */
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * 判定指定的 HTTP 方法是否为幂等方法。
 *
 * @param method HTTP 请求方法
 * @returns 若为幂等方法返回 true，否则返回 false
 */
export function isIdempotentMethod(method?: string): boolean {
  if (!method) {
    return true; // 缺省默认为 GET 幂等方法
  }
  return IDEMPOTENT_METHODS.has(method.toUpperCase().trim());
}

/**
 * 判定指定异常是否属于可安全重试的瞬态故障（5xx、网络中断、超时）。
 * 4xx 客户端异常（如 400、401、403、404 等，除 408 超时外）严格不予重试。
 *
 * @param error 捕获到的异常对象（BusinessException 或底层 Error）
 * @param rawError 可选的底层原始异常
 * @returns 若可安全重试返回 true，否则返回 false
 */
export function isRetriableError(error: unknown, rawError?: unknown): boolean {
  if (!error) {
    return false;
  }

  // 1. 若为 BusinessException
  if (error instanceof BusinessException) {
    const code = error.code;
    const msg = (error.msg || '').toLowerCase();

    // 408 请求超时允许重试
    if (code === 408 || msg.includes('timeout') || msg.includes('network error')) {
      return true;
    }

    // 4xx 客户端错误（参数错误、未授权、禁止访问、404 未找到等）严禁重试
    if (code >= 400 && code < 500) {
      return false;
    }

    // 5xx 服务端故障（500、502、503、504）允许重试
    if (code >= 500 && code < 600) {
      return true;
    }
  }

  // 2. 检查底层异常或原始错误（如 AxiosError）
  const candidate = (rawError || error) as {
    code?: string;
    message?: string;
    response?: { status?: number };
  };

  if (candidate && typeof candidate === 'object') {
    const status = candidate.response?.status;
    if (status !== undefined) {
      if (status >= 500 && status < 600) {
        return true;
      }
      if (status >= 400 && status < 500 && status !== 408) {
        return false;
      }
    }

    const errCode = candidate.code;
    if (
      errCode === 'ECONNABORTED' ||
      errCode === 'ETIMEDOUT' ||
      errCode === 'ERR_NETWORK' ||
      errCode === 'ECONNRESET'
    ) {
      return true;
    }

    const errMsg = (candidate.message || '').toLowerCase();
    if (errMsg.includes('timeout') || errMsg.includes('network error')) {
      return true;
    }
  }

  return false;
}

/**
 * 根据重试轮次计算指数退避等待延迟（毫秒）。
 *
 * 算法：delay = baseDelay * (2 ^ attempt)
 *
 * @param attempt 当前重试轮次（从 0 开始）
 * @param baseDelay 基础延迟（毫秒），默认为 1000ms
 * @returns 等待延迟毫秒数
 */
export function calculateBackoffDelay(attempt: number, baseDelay = 1000): number {
  const safeAttempt = Math.max(0, attempt);
  const safeBase = Math.max(0, baseDelay);
  return safeBase * Math.pow(2, safeAttempt);
}
