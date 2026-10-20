/**
 * 多租户上下文响应式状态机类型定义。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import type { DeepReadonly, Ref } from 'vue';
import type { TenantManager } from '@atengk/core';

/**
 * useTenant 可选配置项。
 */
export interface UseTenantOptions {
  /**
   * 自定义关联的 TenantManager 实例。未指定时自动读取全局上下文或 Fallback 至全局单例 tenantManager。
   */
  tenantManager?: TenantManager;
}

/**
 * useTenant 返回的响应式状态与操作门面。
 */
export interface UseTenantResult {
  /**
   * 当前生效的租户标识字符串，未设置时为 null，受到 readonly 只读保护。
   */
  tenantId: DeepReadonly<Ref<string | null>>;

  /**
   * 当前是否已绑定有效租户标识，受到 readonly 只读保护。
   */
  hasTenant: DeepReadonly<Ref<boolean>>;

  /**
   * 写入并切换租户标识，触发全应用响应式更新并持久化。
   *
   * @param id 租户标识
   */
  setTenantId: (id: string | null | undefined) => void;

  /**
   * 清除当前租户标识并同步销毁持久化存储。
   */
  clearTenantId: () => void;
}
