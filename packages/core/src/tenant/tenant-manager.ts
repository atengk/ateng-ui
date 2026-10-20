/**
 * 多租户上下文门面实现与默认全局单例。
 *
 * 负责租户 ID 存取、销毁、请求头注入（默认 X-Tenant-Id），
 * 以及租户变更事件广播与对称监听注销。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { createDefaultTenantStorage, type TenantStorage } from './storage';
import type { TenantManagerOptions } from './types';

/**
 * 多租户上下文操作门面类。
 */
export class TenantManager {
  private readonly tenantKey: string;

  private readonly headerName: string;

  private readonly storage: TenantStorage;

  private readonly tenantChangeListeners: Set<(tenantId: string | null) => void> = new Set();

  public constructor(options?: TenantManagerOptions) {
    this.tenantKey = options?.tenantKey ?? 'tenant_id';
    this.headerName = options?.headerName ?? 'X-Tenant-Id';
    this.storage = options?.storage ?? createDefaultTenantStorage();

    if (options?.onTenantChange) {
      this.tenantChangeListeners.add(options.onTenantChange);
    }
  }

  /**
   * 获取当前有效租户标识。
   *
   * @returns 租户标识字符串，未设置时返回 null
   */
  public getTenantId(): string | null {
    return this.storage.getItem(this.tenantKey);
  }

  /**
   * 写入并持久化当前租户标识。
   * 若传入空字符串、纯空格或空值，将自动视为清空租户。
   *
   * @param tenantId 租户标识字符串
   */
  public setTenantId(tenantId: string | null | undefined): void {
    const cleanTenantId = tenantId ? tenantId.trim() : '';
    if (!cleanTenantId) {
      this.clearTenantId();
      return;
    }

    const prev = this.getTenantId();
    this.storage.setItem(this.tenantKey, cleanTenantId);

    if (prev !== cleanTenantId) {
      this.notifyListeners(cleanTenantId);
    }
  }

  /**
   * 清除并销毁当前已持久化的租户标识。
   */
  public clearTenantId(): void {
    const prev = this.getTenantId();
    this.storage.removeItem(this.tenantKey);

    if (prev !== null) {
      this.notifyListeners(null);
    }
  }

  /**
   * 获取待注入网络请求拦截器的租户请求头集合。
   * 若不存在有效租户，则安全保底返回空对象。
   *
   * @returns 请求头键值对
   */
  public getHeaders(): Record<string, string> {
    const tenantId = this.getTenantId();
    if (!tenantId) {
      return {};
    }

    return {
      [this.headerName]: tenantId,
    };
  }

  /**
   * 注册租户切换事件监听器。
   * 遵循对称门面设计原则，返回注销解绑函数。
   *
   * @param listener 租户变更回调函数
   * @returns 解绑注销函数
   */
  public onTenantChange(listener: (tenantId: string | null) => void): () => void {
    this.tenantChangeListeners.add(listener);
    return () => {
      this.tenantChangeListeners.delete(listener);
    };
  }

  /**
   * 清空所有已注册的租户监听器。
   */
  public clearListeners(): void {
    this.tenantChangeListeners.clear();
  }

  /**
   * 获取底层持久化存储驱动。
   *
   * @returns 当前使用的 TenantStorage
   */
  public getStorage(): TenantStorage {
    return this.storage;
  }

  /**
   * 广播通知所有监听器（带异常隔离守卫）。
   */
  private notifyListeners(tenantId: string | null): void {
    for (const listener of this.tenantChangeListeners) {
      try {
        listener(tenantId);
      } catch (error) {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[TenantManager] onTenantChange listener error:', error);
        }
      }
    }
  }
}

/**
 * 创建 TenantManager 实例工厂函数。
 *
 * @param options 门面配置项
 * @returns TenantManager 实例
 */
export function createTenantManager(options?: TenantManagerOptions): TenantManager {
  return new TenantManager(options);
}

/**
 * 全局默认的 TenantManager 开箱单例。
 */
export const tenantManager: TenantManager = createTenantManager();
