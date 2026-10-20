/**
 * 多租户上下文门面配置项与契约定义。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import type { TenantStorage } from './storage';

/**
 * TenantManager 构造初始化配置项。
 */
export interface TenantManagerOptions {
  /**
   * 存储在 Storage 中的租户标识键名，默认为 'tenant_id'。
   */
  tenantKey?: string;

  /**
   * 请求头中的租户标识 Header 名称，默认为 'X-Tenant-Id'。
   */
  headerName?: string;

  /**
   * 底层持久化存储驱动实例，默认根据宿主环境自适应探测选择。
   */
  storage?: TenantStorage;

  /**
   * 租户切换时的回调通知监听器。
   */
  onTenantChange?: (tenantId: string | null) => void;
}
