/**
 * @atengk/ai-chat-vue 工业级 LocalStorage 持久化存储适配器。
 *
 * 内置防溢出保护（QuotaExceededError 降级处理）与 SSR 内存降级机制。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import type { StorageAdapter } from '../types';
import type { StorageAdapterOptions } from './StorageAdapter';

export class LocalStorageAdapter implements StorageAdapter {
  private readonly prefix: string;
  private readonly isMemoryOnly: boolean;
  private readonly memoryStore = new Map<string, string>();

  public constructor(options: StorageAdapterOptions = {}) {
    this.prefix = options.prefix ?? 'at_ai_chat:';
    this.isMemoryOnly = Boolean(options.useMemoryFallback) || !this.checkLocalStorageAvailable();
  }

  /**
   * 嗅探环境中的 window.localStorage 是否真正可用。
   */
  private checkLocalStorageAvailable(): boolean {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    try {
      const probeKey = `__probe_${Date.now()}`;
      window.localStorage.setItem(probeKey, '1');
      window.localStorage.removeItem(probeKey);
      return true;
    } catch {
      return false;
    }
  }

  private resolveKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  public getItem(key: string): string | null {
    if (this.isMemoryOnly) {
      return this.memoryStore.get(this.resolveKey(key)) ?? null;
    }
    try {
      return window.localStorage.getItem(this.resolveKey(key));
    } catch {
      return this.memoryStore.get(this.resolveKey(key)) ?? null;
    }
  }

  public setItem(key: string, value: string): void {
    const fullKey = this.resolveKey(key);
    if (this.isMemoryOnly) {
      this.memoryStore.set(fullKey, value);
      return;
    }

    try {
      window.localStorage.setItem(fullKey, value);
    } catch (err) {
      const isQuotaError =
        err instanceof Error &&
        (err.name === 'QuotaExceededError' ||
          err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
          (err as { code?: number }).code === 22);

      if (isQuotaError) {
        console.warn(
          `[ateng-ui:ai-chat] LocalStorage 存储配额超出，正在转入内存安全降级模式：`,
          err,
        );
        // 发生配额超出时降级至内存存储，保证运行时不崩溃
        this.memoryStore.set(fullKey, value);
      } else {
        console.warn(`[ateng-ui:ai-chat] LocalStorage setItem 失败：`, err);
        this.memoryStore.set(fullKey, value);
      }
    }
  }

  public removeItem(key: string): void {
    const fullKey = this.resolveKey(key);
    this.memoryStore.delete(fullKey);
    if (!this.isMemoryOnly) {
      try {
        window.localStorage.removeItem(fullKey);
      } catch {
        // 静默降级
      }
    }
  }

  public clear(): void {
    this.memoryStore.clear();
    if (!this.isMemoryOnly) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith(this.prefix)) {
            keysToRemove.push(k);
          }
        }
        for (const k of keysToRemove) {
          window.localStorage.removeItem(k);
        }
      } catch {
        // 静默降级
      }
    }
  }
}
