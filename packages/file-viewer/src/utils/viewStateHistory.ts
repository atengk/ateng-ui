/**
 * 文档阅读状态弱引用与受控 LRU 记忆恢复工具。
 *
 * 为实现短暂重绘、v-if 切换或切 Tab 时自动复原用户阅读进度（滚动位置、缩放比、旋转角度、页码、工作表），
 * 本模块提供对象弱引用 (WeakMap) 与字符串 LRU 双轨缓存体系，确保 100% 内存安全与零垃圾滞留。
 *
 * @author Ateng
 * @since 2026-10-26
 */

export interface StoredViewState {
  page?: number;
  sheet?: number | string;
  zoomScale?: number;
  rotation?: number;
  scroll?: {
    top?: number;
    left?: number;
  };
  viewState?: Record<string, unknown>;
  timestamp: number;
}

export interface ResolveViewStateKeyInput {
  file?: File | Blob;
  url?: string;
  fileName?: string;
}

/**
 * 字符串键 LRU 缓存最大保留记录数，防止无界内存膨胀。
 */
const DEFAULT_LRU_CAPACITY = 100;

// 1. 对象弱引用存储 (File / Blob)：随原对象 GC 自动卸载，不造成内存泄漏
const weakObjectMap = new WeakMap<object, StoredViewState>();

// 2. 字符串键受控 LRU 存储 (URL / fileName)
const stringLruMap = new Map<string, StoredViewState>();

/**
 * 从文件、URL 或文件名提取最佳的唯一状态索引键。
 *
 * @param input 候选索引入参
 * @returns 确定的 key (对象引用或唯一字符串)，未提供时返回 undefined
 */
export function resolveViewStateKey(input: ResolveViewStateKeyInput): unknown {
  if (input.file && typeof input.file === 'object') {
    return input.file;
  }
  if (input.url && typeof input.url === 'string') {
    return input.url;
  }
  if (input.fileName && typeof input.fileName === 'string') {
    return `name:${input.fileName}`;
  }
  return undefined;
}

/**
 * 保存或合并指定文档的阅读状态。
 *
 * @param key 文档索引 key (对象引用或字符串)
 * @param state 待保存的部分或完整状态
 */
export function saveViewStateHistory(key: unknown, state: Partial<StoredViewState>): void {
  if (!key) {
    return;
  }

  const existing = restoreViewStateHistory(key) || { timestamp: Date.now() };
  const merged: StoredViewState = {
    ...existing,
    ...state,
    timestamp: Date.now(),
  };

  if (typeof key === 'object' && key !== null) {
    weakObjectMap.set(key, merged);
    return;
  }

  if (typeof key === 'string') {
    // 维护 LRU 顺序：先删后插
    if (stringLruMap.has(key)) {
      stringLruMap.delete(key);
    } else if (stringLruMap.size >= DEFAULT_LRU_CAPACITY) {
      // 淘汰最早一条
      const oldestKey = stringLruMap.keys().next().value;
      if (oldestKey !== undefined) {
        stringLruMap.delete(oldestKey);
      }
    }
    stringLruMap.set(key, merged);
  }
}

/**
 * 恢复指定文档的历史阅读状态。
 *
 * @param key 文档索引 key
 * @returns 已存储的状态副本，若无则返回 undefined
 */
export function restoreViewStateHistory(key: unknown): StoredViewState | undefined {
  if (!key) {
    return undefined;
  }

  if (typeof key === 'object' && key !== null) {
    const found = weakObjectMap.get(key);
    return found ? { ...found } : undefined;
  }

  if (typeof key === 'string') {
    const found = stringLruMap.get(key);
    if (!found) {
      return undefined;
    }
    // 命中后提升至最新访问位置
    stringLruMap.delete(key);
    stringLruMap.set(key, found);
    return { ...found };
  }

  return undefined;
}

/**
 * 清除已缓存的阅读状态。
 *
 * @param key 指定清除的 key；若不传则清空全量 LRU 缓存
 */
export function clearViewStateHistory(key?: unknown): void {
  if (key === undefined) {
    stringLruMap.clear();
    return;
  }

  if (typeof key === 'object' && key !== null) {
    weakObjectMap.delete(key);
    return;
  }

  if (typeof key === 'string') {
    stringLruMap.delete(key);
  }
}

/**
 * 获取当前字符串 LRU 缓存中的有效条目数。
 */
export function getViewStateHistorySize(): number {
  return stringLruMap.size;
}
