/**
 * 带 TTL 时效与命名空间隔离的缓存管理器类型契约。
 *
 * @author Ateng
 * @since 2026-10-20
 */

/**
 * 底层键值存储驱动契约接口。
 */
export interface CacheDriver {
  /**
   * 读取存储值。
   */
  getItem(key: string): string | null;

  /**
   * 写入键值。
   */
  setItem(key: string, value: string): void;

  /**
   * 移除键。
   */
  removeItem(key: string): void;

  /**
   * 清空所有数据（可选）。
   */
  clear?(): void;

  /**
   * 获取底层所有已存键名（可选，用于精准按命名空间清理）。
   */
  getAllKeys?(): string[];
}

/**
 * CacheStorage 初始化配置项。
 */
export interface CacheStorageOptions {
  /**
   * 命名空间前缀，用于隔离不同模块或系统的数据，默认为 'at_cache:'。
   */
  namespace?: string;

  /**
   * 底层存储驱动，默认自适应选择 LocalStorage 或内存驱动。
   */
  driver?: CacheDriver;

  /**
   * 缺省存活时长（毫秒）。未单独指定 ttlMs 时生效；若未配置则永久有效。
   */
  defaultTtlMs?: number;
}

/**
 * 缓存数据物理封装着色结构体。
 */
export interface CacheEnvelope<T = unknown> {
  /**
   * 真实业务数据载荷。
   */
  value: T;

  /**
   * 过期时间戳（毫秒）。null 表示永久有效。
   */
  expiresAt: number | null;
}
