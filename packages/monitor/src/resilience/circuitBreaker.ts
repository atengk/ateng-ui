/**
 * 客户端会话级错误熔断断路器 (Circuit Breaker)。
 *
 * @author Ateng
 * @since 2026-10-31
 */

/**
 * 断路器配置选项。
 */
export interface CircuitBreakerOptions {
  /** 单会话允许累计的最大错误数，超过后自动进入休眠态，默认 50 */
  maxErrors?: number;
}

/**
 * 断路器决策结果。
 */
export interface CircuitBreakerResult {
  /** 当前异常是否允许派发 */
  allowed: boolean;
  /** 是否恰在此次错误中首次触发熔断开关 */
  trippedJustNow: boolean;
  /** 当前累计错误数 */
  currentCount: number;
}

/**
 * 客户端单会话错误熔断断路器实现。
 */
export class CircuitBreaker {
  private readonly _maxErrors: number;
  private _errorCount = 0;
  private _isTripped = false;

  constructor(options?: CircuitBreakerOptions) {
    this._maxErrors = options?.maxErrors ?? 50;
  }

  /**
   * 是否已处于熔断休眠状态。
   */
  get isTripped(): boolean {
    return this._isTripped;
  }

  /**
   * 当前单会话累计错误数。
   */
  get errorCount(): number {
    return this._errorCount;
  }

  /**
   * 配置的熔断阈值。
   */
  get maxErrors(): number {
    return this._maxErrors;
  }

  /**
   * 记录一次异常事件，判定是否允许派发及是否触发熔断。
   *
   * @returns 熔断决策状态
   */
  recordError(): CircuitBreakerResult {
    // 若已处于熔断休眠态，坚决阻断任何新错误采集
    if (this._isTripped) {
      return {
        allowed: false,
        trippedJustNow: false,
        currentCount: this._errorCount,
      };
    }

    this._errorCount += 1;

    // 检查是否达到或超过阈值
    if (this._errorCount >= this._maxErrors) {
      this._isTripped = true;
      return {
        allowed: true,
        trippedJustNow: true,
        currentCount: this._errorCount,
      };
    }

    return {
      allowed: true,
      trippedJustNow: false,
      currentCount: this._errorCount,
    };
  }

  /**
   * 重置断路器状态（多在用户主动重置或单测清理时调用）。
   */
  reset(): void {
    this._errorCount = 0;
    this._isTripped = false;
  }
}
