/**
 * 强类型业务断言与防御性判空纯原生工具实现。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { BusinessException } from '../contracts';

/**
 * 业务前置条件断言。
 *
 * 若 condition 为假值，抛出标准 BusinessException。
 *
 * @param condition 判定条件
 * @param message 错误描述信息
 * @param code 业务错误状态码，默认为 400
 * @throws {BusinessException} 当条件为假时抛出
 */
export function assert(condition: unknown, message: string, code: number = 400): asserts condition {
  if (!condition) {
    throw new BusinessException(code, message);
  }
}

/**
 * 非空断言守卫。
 *
 * 断言目标值既非 null 也非 undefined，并在 TypeScript 编译期自动收窄为 NonNullable<T>。
 *
 * @param value 待检测的目标值
 * @param message 错误描述信息
 * @param code 业务错误状态码，默认为 400
 * @throws {BusinessException} 当目标值为 null 或 undefined 时抛出
 */
export function assertNonNull<T>(
  value: T,
  message: string,
  code: number = 400,
): asserts value is NonNullable<T> {
  if (value === null || value === undefined) {
    throw new BusinessException(code, message);
  }
}

/**
 * 纯原生多类型防御性判空。
 *
 * 满足以下任一条件时判定为空 (true)：
 * 1. null 或 undefined；
 * 2. 字符串空值或纯空格；
 * 3. 数组长度为 0；
 * 4. Map 或 Set 集合容量为 0；
 * 5. 普通纯对象且自身可枚举属性为 0。
 * 其他数据类型（数值、布尔值、Symbol、函数）均判定为非空 (false)。
 *
 * @param value 待检测的任意值
 * @returns 是否为空
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === 'string') {
    return value.trim().length === 0;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (value instanceof Map || value instanceof Set) {
    return value.size === 0;
  }

  if (typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>).length === 0;
  }

  return false;
}

/**
 * 纯原生多类型防御性非空判定。
 *
 * 为 isEmpty 的严格逻辑反。
 *
 * @param value 待检测的任意值
 * @returns 是否非空
 */
export function isNotEmpty(value: unknown): boolean {
  return !isEmpty(value);
}
