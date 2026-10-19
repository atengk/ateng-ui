/**
 * Sa-Token 鉴权凭据持久化存储抽象与宿主自适应适配器。
 *
 * 遵循平台宿主中立原则，支持浏览器 LocalStorage 与 Node/SSR 内存存储的自适应选择与自定义扩展。
 *
 * @author Ateng
 * @since 2026-10-19
 */

/**
 * 鉴权凭据持久化存储契约接口。
 */
export interface AuthStorage {
  /**
   * 读取存储的凭据值。
   *
   * @param key 键名
   * @returns 凭据字符串或 null
   */
  getItem(key: string): string | null;

  /**
   * 写入凭据值。
   *
   * @param key 键名
   * @param value 凭据字符串
   */
  setItem(key: string, value: string): void;

  /**
   * 移除指定凭据。
   *
   * @param key 键名
   */
  removeItem(key: string): void;

  /**
   * 清空全部凭据数据（可选）。
   */
  clear?(): void;
}

/**
 * 内存存储适配器（适用于 Node.js、SSR 渲染及单元测试宿主）。
 */
export class MemoryAuthStorage implements AuthStorage {
  private readonly store = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  public removeItem(key: string): void {
    this.store.delete(key);
  }

  /**
   * 清空所有内存存储数据。
   */
  public clear(): void {
    this.store.clear();
  }
}

/**
 * 浏览器 LocalStorage 存储适配器（具备环境探测与权限异常静默降级）。
 */
export class LocalStorageAuthStorage implements AuthStorage {
  /**
   * 安全获取浏览器原生 Storage 实例。
   */
  private getStorage(): Storage | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage;
      }
    } catch {
      // 浏览器权限受限（如无痕模式安全策略）时安全降级
    }
    return null;
  }

  public getItem(key: string): string | null {
    const storage = this.getStorage();
    if (!storage) {
      return null;
    }
    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  }

  public setItem(key: string, value: string): void {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }
    try {
      storage.setItem(key, value);
    } catch {
      // 存储超限或权限受限时安全降级
    }
  }

  public removeItem(key: string): void {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }
    try {
      storage.removeItem(key);
    } catch {
      // 权限受限时安全降级
    }
  }

  public clear(): void {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }
    try {
      storage.clear();
    } catch {
      // 权限受限时安全降级
    }
  }
}

/**
 * 探测当前宿主环境的 localStorage 是否实际可用。
 *
 * @returns 若完全可用返回 true，否则返回 false
 */
export function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    const testKey = '__ateng_auth_storage_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * 创建自适应默认存储实例。
 * 浏览器端优先采用 LocalStorage，Node/SSR 或权限受限环境自动降级为 Memory。
 *
 * @returns AuthStorage 存储实例
 */
export function createDefaultAuthStorage(): AuthStorage {
  return isLocalStorageAvailable() ? new LocalStorageAuthStorage() : new MemoryAuthStorage();
}
