/**
 * @atengk/ai-chat-vue 结构化持久化存储适配器契约与基类定义。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import type { StorageAdapter } from '../types';

export type { StorageAdapter };

/**
 * 存储适配器通用配置项。
 */
export interface StorageAdapterOptions {
  /**
   * 存储键名隔离命名空间前缀（默认 'at_ai_chat:'）。
   */
  prefix?: string;

  /**
   * 强制开启内存存储降级（主要用于 SSR 或纯无持久化沙箱环境）。
   */
  useMemoryFallback?: boolean;
}
