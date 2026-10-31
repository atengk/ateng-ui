/**
 * 通用数据序列化与格式化工具。
 *
 * @author Ateng
 * @since 2026-11-01
 */

/**
 * 安全序列化未知错误或入参对象，防止循环引用或复杂实体导致 JSON.stringify 崩溃。
 *
 * @param value 任意待格式化的未知实体
 * @param fallback 降级默认返回值，默认为空字符串
 * @returns 规范化的安全文本表示
 */
export function safeStringify(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Error) {
    return value.message || fallback;
  }

  if (value === null || typeof value === 'undefined') {
    return fallback;
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}
