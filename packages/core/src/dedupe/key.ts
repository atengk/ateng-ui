/**
 * 请求特征去重指纹计算与确定性序列化算法。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import type { DedupeTarget } from './types';

/**
 * 递归确定性序列化任意数据结构。
 * 针对普通对象递归按键名升序排序，确保相同内容不同属性顺序的对象产生 100% 一致的指纹字符串。
 *
 * @param val 待序列化数据
 * @returns 确定性字符串
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
 * 根据请求配置特征生成飞行中去重合并唯一指纹键。
 * 格式为 `METHOD:URL?PARAMS`。
 *
 * @param target 请求配置对象
 * @returns 唯一请求去重键
 */
export function generateDedupeKey(target: DedupeTarget): string {
  if (target.dedupeKey) {
    return target.dedupeKey;
  }

  const method = (target.method ?? 'GET').toUpperCase().trim();
  const url = (target.url ?? '').trim();
  const paramsStr = serializeValue(target.params);

  let key = `${method}:${url}`;
  if (paramsStr) {
    key += `?${paramsStr}`;
  }

  return key;
}
