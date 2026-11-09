/**
 * DraftManager 本地草稿箱容灾管理器。
 *
 * 遵循 ADR-0044 规范，提供 500ms 防抖静默落盘、浏览器安全沙箱/配额降级防御与生命周期句柄清理。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import type { DraftManagerOptions, DraftRecord } from '../types';

/**
 * 内存备用降级存储字典（应对无 window 环境或 localStorage 配额超限/权限拒绝）。
 */
const memoryStorageFallback = new Map<string, string>();

/**
 * 本地草稿箱容灾管理器类。
 */
export class DraftManager<T extends Record<string, unknown> = Record<string, unknown>> {
  private readonly key: string;
  private readonly storageKey: string;
  private readonly debounceMs: number;
  private readonly maxAgeMs?: number;
  private readonly onSave?: (record: DraftRecord<T>) => void;
  private readonly onError?: (error: Error) => void;

  private timer: ReturnType<typeof setTimeout> | null = null;
  private pendingData: T | null = null;
  private isDisposed = false;

  public constructor(key: string, options: DraftManagerOptions = {}) {
    if (!key || typeof key !== 'string') {
      throw new Error('[DraftManager] 草稿存储键 key 必须为非空有效字符串');
    }
    const prefix = options.prefix ?? '@atengk/form-draft:';
    this.key = key;
    this.storageKey = `${prefix}${key}`;
    this.debounceMs = options.debounceMs ?? 500;
    this.maxAgeMs = options.maxAgeMs;
    this.onSave = options.onSave as ((record: DraftRecord<T>) => void) | undefined;
    this.onError = options.onError;
  }

  /**
   * 保存草稿数据（默认 500ms 防抖合并）。
   *
   * @param data 待保存的数据实体
   * @param immediate 是否绕过防抖立即同步落盘
   */
  public save(data: T, immediate = false): void {
    if (this.isDisposed) {
      return;
    }

    this.pendingData = data;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (immediate || this.debounceMs <= 0) {
      this.commit();
      return;
    }

    this.timer = setTimeout(() => {
      this.timer = null;
      this.commit();
    }, this.debounceMs);
  }

  /**
   * 立即将等待中的防抖数据刷入持久化存储。
   */
  public flush(): void {
    if (this.isDisposed || !this.pendingData) {
      return;
    }
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.commit();
  }

  /**
   * 获取当前有效草稿记录。
   * 若记录已过期或损坏，则自动清理并返回 null。
   */
  public get(): DraftRecord<T> | null {
    if (this.isDisposed) {
      return null;
    }

    const raw = this.readRaw();
    if (!raw) {
      return null;
    }

    try {
      const record = JSON.parse(raw) as DraftRecord<T>;
      if (!record || typeof record !== 'object' || typeof record.timestamp !== 'number') {
        this.clear();
        return null;
      }

      // 校验过期时效
      if (this.maxAgeMs && this.maxAgeMs > 0) {
        const isExpired = Date.now() - record.timestamp > this.maxAgeMs;
        if (isExpired) {
          this.clear();
          return null;
        }
      }

      return record;
    } catch (error) {
      this.clear();
      this.handleError(
        error instanceof Error
          ? error
          : new Error(`[DraftManager] 解析草稿 JSON 失败: ${String(error)}`),
      );
      return null;
    }
  }

  /**
   * 检查是否存在有效草稿。
   */
  public hasDraft(): boolean {
    return this.get() !== null;
  }

  /**
   * 物理清除当前草稿记录并取消未落盘的防抖任务。
   */
  public clear(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.pendingData = null;

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(this.storageKey);
      }
    } catch {
      // ignore
    }
    memoryStorageFallback.delete(this.storageKey);
  }

  /**
   * 销毁管理器，清理定时器句柄与未完成写入。
   */
  public dispose(): void {
    if (this.isDisposed) {
      return;
    }
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.pendingData = null;
    this.isDisposed = true;
  }

  /**
   * 执行实际落盘写入。
   */
  private commit(): void {
    if (this.isDisposed || this.pendingData === null) {
      return;
    }

    const now = Date.now();
    const record: DraftRecord<T> = {
      key: this.key,
      data: this.pendingData,
      timestamp: now,
      updatedAt: new Date(now).toISOString(),
    };

    this.pendingData = null;

    try {
      const serialized = JSON.stringify(record);
      let writtenToStorage = false;

      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem(this.storageKey, serialized);
          writtenToStorage = true;
        } catch (storageError) {
          // 配额超限或权限被拒绝，降级写入内存 Map
          memoryStorageFallback.set(this.storageKey, serialized);
          this.handleError(
            storageError instanceof Error
              ? storageError
              : new Error(
                  `[DraftManager] LocalStorage 写入受阻，已降级至内存存储: ${String(storageError)}`,
                ),
          );
        }
      }

      if (!writtenToStorage) {
        memoryStorageFallback.set(this.storageKey, serialized);
      }

      this.onSave?.(record);
    } catch (serializeError) {
      this.handleError(
        serializeError instanceof Error
          ? serializeError
          : new Error(`[DraftManager] 序列化草稿数据失败: ${String(serializeError)}`),
      );
    }
  }

  /**
   * 读取存储中的原始字符串。
   */
  private readRaw(): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const value = window.localStorage.getItem(this.storageKey);
        if (value !== null) {
          return value;
        }
      }
    } catch {
      // 访问 localStorage 受阻，尝试读取内存降级
    }
    return memoryStorageFallback.get(this.storageKey) ?? null;
  }

  /**
   * 统一异常派发与捕获防卫。
   */
  private handleError(error: Error): void {
    if (this.onError) {
      try {
        this.onError(error);
      } catch {
        // 防止外部回调异常导致内部逻辑崩塌
      }
    }
  }
}

/**
 * 工厂函数：创建草稿箱容灾管理器实例。
 */
export function createDraftManager<T extends Record<string, unknown> = Record<string, unknown>>(
  key: string,
  options?: DraftManagerOptions,
): DraftManager<T> {
  return new DraftManager<T>(key, options);
}
