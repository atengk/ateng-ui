/**
 * 字典项解析、字段自适应映射与类型弱比对工具函数。
 *
 * @author Ateng
 * @since 2026-10-23
 */

import type { DictFieldNames, DictItem, DictValueType } from './types';

/**
 * 字段映射配置选项集合。
 */
export interface FieldMappingOptions {
  fieldNames?: DictFieldNames;
  labelField?: string;
  valueField?: string;
  tagTypeField?: string;
  disabledField?: string;
}

/**
 * 将任意原始数据项转换为规范的 DictItem。
 * 遵循安全回退链：自定义字段 -> 默认标准字段 -> 保底空值。
 *
 * @param rawItem 原始字典项对象或基础类型值
 * @param options 字段映射配置选项
 * @returns 规范化的 DictItem 实体
 */
export function normalizeDictItem(rawItem: unknown, options?: FieldMappingOptions): DictItem {
  if (typeof rawItem !== 'object' || rawItem === null) {
    return {
      label: String(rawItem ?? ''),
      value: (rawItem as string | number | boolean) ?? '',
    };
  }

  const hasCustomMapping = Boolean(
    options?.fieldNames ||
    options?.labelField ||
    options?.valueField ||
    options?.tagTypeField ||
    options?.disabledField,
  );

  // 若无自定义映射且本身已具备标准 label 与 value，直接复用原对象，保证 100% 后向兼容与零冗余开销
  if (!hasCustomMapping && 'label' in rawItem && 'value' in rawItem) {
    return rawItem as DictItem;
  }

  const record = rawItem as Record<string, unknown>;
  const labelKey = options?.labelField || options?.fieldNames?.label || 'label';
  const valueKey = options?.valueField || options?.fieldNames?.value || 'value';
  const tagTypeKey = options?.tagTypeField || options?.fieldNames?.tagType || 'tagType';
  const disabledKey = options?.disabledField || options?.fieldNames?.disabled || 'disabled';
  const cssClassKey = options?.fieldNames?.cssClass || 'cssClass';

  // 安全回退链：优先自定义字段名，次之标准字段名，最后保底
  const rawLabel = record[labelKey] ?? record['label'] ?? '';
  const label = typeof rawLabel === 'string' ? rawLabel : String(rawLabel ?? '');

  const value = (record[valueKey] ?? record['value']) as string | number | boolean;

  const rawTagType = (record[tagTypeKey] ?? record['tagType']) as
    'success' | 'warning' | 'info' | 'primary' | 'danger' | '' | undefined;

  const disabled = Boolean(record[disabledKey] ?? record['disabled'] ?? false);
  const cssClass = (record[cssClassKey] ?? record['cssClass']) as string | undefined;

  return {
    label,
    value,
    tagType: rawTagType,
    disabled,
    cssClass,
    raw: rawItem,
  };
}

/**
 * 批量归一化字典项数组。
 *
 * @param rawItems 原始字典项数组
 * @param options 字段映射配置选项
 * @returns 规范化的 DictItem 实体数组（保底返回 []）
 */
export function normalizeDictItems(rawItems: unknown[], options?: FieldMappingOptions): DictItem[] {
  if (!Array.isArray(rawItems)) {
    return [];
  }
  return rawItems.map(item => normalizeDictItem(item, options));
}

/**
 * 根据 valueType 规则判断两个字典值是否匹配。
 *
 * @param itemValue 字典项中配置的键值
 * @param targetValue 目标比对值
 * @param valueType 比对与类型转换策略
 * @returns 是否判定为匹配
 */
export function isDictValueMatched(
  itemValue: string | number | boolean | undefined | null,
  targetValue: string | number | boolean | undefined | null,
  valueType: DictValueType = 'auto',
): boolean {
  if (
    itemValue === undefined ||
    itemValue === null ||
    targetValue === undefined ||
    targetValue === null
  ) {
    return itemValue === targetValue;
  }

  if (valueType === 'number') {
    return Number(itemValue) === Number(targetValue);
  }

  if (valueType === 'string') {
    return String(itemValue) === String(targetValue);
  }

  // 默认 'auto' 模式：执行字符串级别安全弱比对
  return String(itemValue) === String(targetValue);
}

/**
 * 将目标值转换为与有效字典项严格匹配的真实值（用于 Element Plus 原生选项高亮回显）。
 *
 * @param val 外部传入的双向绑定值
 * @param items 当前规范化的字典项集合
 * @param valueType 转换策略
 * @returns 匹配的字典项真实值；若未匹配则返回原值
 */
export function coerceToMatchedValue(
  val: string | number | boolean | undefined | null,
  items: DictItem[],
  valueType: DictValueType = 'auto',
): string | number | boolean | undefined | null {
  if (val === undefined || val === null || val === '') {
    return val;
  }
  const matched = items.find(item => isDictValueMatched(item.value, val, valueType));
  if (matched !== undefined) {
    return matched.value;
  }
  return val;
}
