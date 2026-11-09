/**
 * @atengk/form-designer-vue 深层路径访问与设值工具。
 *
 * 安全解析点路径（如 `userInfo.address.city`）与数组索引（如 `items[0].name`），
 * 提供高性能无递归对象深层读取与写入。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { toRaw } from 'vue';

/**
 * 将路径字符串解析为属性键数组。
 * 例如：`user.address[0].city` => `['user', 'address', '0', 'city']`
 */
export function parsePath(path: string): string[] {
  if (!path || typeof path !== 'string') {
    return [];
  }
  // 替换 [0] 格式为 .0，再按 . 分割
  return path
    .replace(/\[(\w+)\]/g, '.$1')
    .replace(/^\./, '')
    .split('.')
    .filter(Boolean);
}

/**
 * 安全获取对象深层路径的值。
 *
 * @param obj 目标对象
 * @param path 属性路径字符串或键数组
 * @param defaultValue 找不到或为 undefined 时的默认值
 * @returns 目标属性值
 */
export function getByPath<T = unknown>(
  obj: Record<string, unknown> | null | undefined,
  path: string | string[],
  defaultValue?: T,
): T {
  if (obj == null) {
    return defaultValue as T;
  }

  const segments = Array.isArray(path) ? path : parsePath(path);
  if (segments.length === 0) {
    return defaultValue as T;
  }

  let current: unknown = obj;
  for (const key of segments) {
    if (current == null || typeof current !== 'object') {
      return defaultValue as T;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current === undefined ? (defaultValue as T) : (current as T);
}

/**
 * 安全设置对象深层路径的值（若中间路径不存在则自动创建对象/数组）。
 *
 * @param obj 目标对象
 * @param path 属性路径字符串或键数组
 * @param value 目标设定的值
 * @returns 修改后的目标对象
 */
export function setByPath<T extends Record<string, unknown>>(
  obj: T,
  path: string | string[],
  value: unknown,
): T {
  if (obj == null || typeof obj !== 'object') {
    return obj;
  }

  const segments = Array.isArray(path) ? path : parsePath(path);
  if (segments.length === 0) {
    return obj;
  }

  let current: Record<string, unknown> = obj;
  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i];
    const nextKey = segments[i + 1];

    if (!key) {
      continue;
    }

    if (!(key in current) || current[key] == null || typeof current[key] !== 'object') {
      // 若下一个 key 是纯数字，初始化为数组，否则初始化为普通对象
      const isNextArray = nextKey ? /^\d+$/.test(nextKey) : false;
      current[key] = isNextArray ? [] : {};
    }

    current = current[key] as Record<string, unknown>;
  }

  const lastKey = segments[segments.length - 1];
  if (lastKey) {
    current[lastKey] = value;
  }

  return obj;
}

/**
 * 安全深度克隆工具（解包 Vue Proxy，防御 DataCloneError）。
 */
export function safeClone<T>(val: T): T {
  if (val == null || typeof val !== 'object') {
    return val;
  }
  const raw = toRaw(val);
  try {
    return structuredClone(raw);
  } catch {
    try {
      return JSON.parse(JSON.stringify(raw));
    } catch {
      return Array.isArray(raw) ? ([...raw] as unknown as T) : { ...raw };
    }
  }
}
