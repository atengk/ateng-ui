/**
 * 企业级统一强类型响应契约与类型守卫定义。
 *
 * @author Ateng
 * @since 2026-10-19
 */

/**
 * 业务统一响应结构载荷。
 */
export interface Result<T = unknown> {
  /**
   * 业务状态码（200 代表业务处理成功，非 200 代表具体业务异常）。
   */
  code: number;

  /**
   * 泛型业务数据载荷。
   */
  data: T;

  /**
   * 响应提示信息或错误描述。
   */
  msg: string;

  /**
   * 全链路诊断唯一追踪标识符。
   */
  traceId?: string;
}

/**
 * 校验目标未知对象是否符合 Result 统一响应信封契约。
 *
 * @param value 待检查的值
 * @returns 是否为有效的 Result 实体
 */
export function isResult<T = unknown>(value: unknown): value is Result<T> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.code === 'number' && 'data' in candidate && typeof candidate.msg === 'string'
  );
}
