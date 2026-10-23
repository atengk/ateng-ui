/**
 * useSelection 跨页多选响应式状态机实现。
 *
 * 管理跨页勾选集合、雪花 Long ID 大数键值安全归一化与数据刷新同步。
 *
 * @author Ateng
 * @since 2026-10-23
 */

import { computed, shallowRef } from 'vue';
import type { UseSelectionOptions, UseSelectionResult } from './types';

/**
 * 跨页多选状态机 Hook。
 *
 * @template T 行数据实体模型类型
 * @param options 可选配置项
 * @returns 跨页多选状态机操作门面与响应式状态
 */
export function useSelection<T = Record<string, unknown>>(
  options?: UseSelectionOptions<T>,
): UseSelectionResult<T> {
  // 1. 唯一键提取辅助函数（统一归一化为 string 存储）
  const getKey = (row: T): string => {
    if (!row || typeof row !== 'object') {
      return '';
    }
    if (typeof options?.rowKey === 'function') {
      return String(options.rowKey(row));
    }
    const keyProp = options?.rowKey || 'id';
    const val = (row as Record<string, unknown>)[keyProp];
    return val !== undefined && val !== null ? String(val) : '';
  };

  // 2. 初始数据装载
  const initialMap = new Map<string, T>();
  if (Array.isArray(options?.initialSelected)) {
    for (const item of options.initialSelected) {
      const k = getKey(item);
      if (k) {
        initialMap.set(k, item);
      }
    }
  }

  // 3. 响应式映射容器（使用 shallowRef 托管 Map，兼顾性能与响应式追踪）
  const selectedMap = shallowRef<Map<string, T>>(initialMap);

  // 4. 派生只读响应式状态
  const selectedKeys = computed<string[]>(() => {
    return Array.from(selectedMap.value.keys());
  });

  const selectedRows = computed<T[]>(() => {
    return Array.from(selectedMap.value.values());
  });

  const selectedCount = computed<number>(() => {
    return selectedMap.value.size;
  });

  // 5. 状态查询动作
  const isSelected = (row: T): boolean => {
    const k = getKey(row);
    return k !== '' && selectedMap.value.has(k);
  };

  const isKeySelected = (key: string | number | bigint): boolean => {
    return selectedMap.value.has(String(key));
  };

  // 6. 原子变更动作（不可变 Map 替换保证纯单向响应式更新）
  const select = (rows: T | T[]): void => {
    const list = Array.isArray(rows) ? rows : [rows];
    if (list.length === 0) return;

    let hasChange = false;
    const nextMap = new Map(selectedMap.value);

    for (const item of list) {
      const k = getKey(item);
      if (k && !nextMap.has(k)) {
        nextMap.set(k, item);
        hasChange = true;
      }
    }

    if (hasChange) {
      selectedMap.value = nextMap;
    }
  };

  const deselect = (rows: T | T[]): void => {
    const list = Array.isArray(rows) ? rows : [rows];
    if (list.length === 0 || selectedMap.value.size === 0) return;

    let hasChange = false;
    const nextMap = new Map(selectedMap.value);

    for (const item of list) {
      const k = getKey(item);
      if (k && nextMap.has(k)) {
        nextMap.delete(k);
        hasChange = true;
      }
    }

    if (hasChange) {
      selectedMap.value = nextMap;
    }
  };

  const toggle = (row: T): void => {
    const k = getKey(row);
    if (!k) return;

    const nextMap = new Map(selectedMap.value);
    if (nextMap.has(k)) {
      nextMap.delete(k);
    } else {
      nextMap.set(k, row);
    }
    selectedMap.value = nextMap;
  };

  const clear = (): void => {
    if (selectedMap.value.size > 0) {
      selectedMap.value = new Map();
    }
  };

  const selectAll = (rows: T[]): void => {
    if (!Array.isArray(rows) || rows.length === 0) return;

    let hasChange = false;
    const nextMap = new Map(selectedMap.value);

    for (const item of rows) {
      const k = getKey(item);
      if (k && !nextMap.has(k)) {
        nextMap.set(k, item);
        hasChange = true;
      }
    }

    if (hasChange) {
      selectedMap.value = nextMap;
    }
  };

  const syncWithData = (currentData: T[]): void => {
    if (!Array.isArray(currentData) || currentData.length === 0 || selectedMap.value.size === 0) {
      return;
    }

    let hasChange = false;
    const nextMap = new Map(selectedMap.value);

    for (const item of currentData) {
      const k = getKey(item);
      if (k && nextMap.has(k)) {
        nextMap.set(k, item);
        hasChange = true;
      }
    }

    if (hasChange) {
      selectedMap.value = nextMap;
    }
  };

  return {
    selectedKeys,
    selectedRows,
    selectedCount,
    isSelected,
    isKeySelected,
    select,
    deselect,
    toggle,
    clear,
    selectAll,
    syncWithData,
  };
}
