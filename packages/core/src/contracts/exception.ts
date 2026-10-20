/**
 * 统一因果业务与网络异常类定义。
 *
 * @author Ateng
 * @since 2026-10-19
 */

/**
 * 统一业务与网络异常。
 *
 * 完整封装业务状态码、错误信息、链路追踪标识以及原始错误因果链，
 * 保障全链路异常不丢失原始调用堆栈与排查线索。
 */
export class BusinessException extends Error {
  /**
   * 业务或 HTTP 状态码。
   */
  readonly code: number;

  /**
   * 业务错误信息描述。
   */
  readonly msg: string;

  /**
   * 全链路诊断唯一追踪标识符。
   */
  readonly traceId?: string;

  /**
   * 原始底层异常因果链。
   */
  override readonly cause?: unknown;

  /**
   * 构造统一业务异常实例。
   *
   * @param code 状态码（业务状态码或 HTTP 状态码）
   * @param msg 错误描述信息
   * @param traceId 全链路链路标识（可选）
   * @param cause 原始抛出异常因果对象（可选）
   */
  constructor(code: number, msg: string, traceId?: string, cause?: unknown) {
    super(msg, cause !== undefined ? { cause } : undefined);
    this.name = 'BusinessException';
    this.code = code;
    this.msg = msg;
    this.traceId = traceId;
    this.cause = cause;

    // 修复原型链以支持 instanceof 准确推断
    Object.setPrototypeOf(this, BusinessException.prototype);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BusinessException);
    }
  }
}
