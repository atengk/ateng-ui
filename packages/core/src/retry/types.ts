/**
 * HTTP 幂等安全重试状态机类型定义。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import type { BusinessException } from '../contracts';

/**
 * HTTP 请求幂等安全重试策略契约。
 */
export interface RetryPolicy {
  /**
   * 最大自动重试次数。0 或负数表示不执行重试。
   */
  retry?: number;

  /**
   * 基础重试等待延迟（毫秒），配合指数退避计算。默认为 1000ms。
   */
  retryDelay?: number;

  /**
   * 自定义错误重试判定函数。
   * 返回 true 允许重试，返回 false 阻止重试。
   */
  shouldRetry?: (error: BusinessException) => boolean;
}
