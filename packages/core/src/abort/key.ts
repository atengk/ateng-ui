/**
 * 请求特征唯一键提取与确定性序列化算法。
 *
 * @author Ateng
 * @since 2026-10-19
 */

import type { RequestKeyTarget } from './types';

/**
 * 递归确定性序列化任意数据结构。
 * 针对普通对象递归按键名升序排序，确保相同内容不同属性顺序的对象产生 100% 一致的指纹字符串。
 */
function serializeValue(val: unknown): string {
  if (val === null || val === undefined) {
    return '';
  }

  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
    return JSON.stringify(val);
  }

  if (Array.isArray(val)) {
    const items = val.map(item => serializeValue(item));
    return `[${items.join(',')}]`;
  }

  if (typeof val === 'object') {
    const record = val as Record<string, unknown>;
    const sortedKeys = Object.keys(record).sort();
    const pairs = sortedKeys.map(key => {
      const serializedVal = serializeValue(record[key]);
      return `${JSON.stringify(key)}:${serializedVal}`;
    });
    return `{${pairs.join(',')}}`;
  }

  return String(val);
}

/**
 * 根据请求配置特征生成全局确定性唯一请求指纹键。
 * 格式为 `METHOD:URL?PARAMS#DATA`。
 *
 * @param target 请求配置对象
 * @returns 唯一请求键
 */
export function generateRequestKey(target: RequestKeyTarget): string {
  if (target.abortKey) {
    return target.abortKey;
  }

  const method = (target.method ?? 'GET').toUpperCase().trim();
  const url = (target.url ?? '').trim();
  const paramsStr = serializeValue(target.params);
  const dataStr = serializeValue(target.data);

  let key = `${method}:${url}`;
  if (paramsStr) {
    key += `?${paramsStr}`;
  }
  if (dataStr) {
    key += `#${dataStr}`;
  }

  return key;
}
