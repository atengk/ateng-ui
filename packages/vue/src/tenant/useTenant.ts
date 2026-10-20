/**
 * 多租户上下文响应式 Hook 实现。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { computed, readonly, ref, type DeepReadonly, type Ref } from 'vue';
import type { TenantManager } from '@atengk/core';
import { useAtengConfig } from '../context';
import type { UseTenantOptions, UseTenantResult } from './types';

/**
 * 内部租户响应式状态存储结构。
 */
interface TenantInternalState {
  tenantId: Ref<string | null>;
}

/**
 * 基于 TenantManager 实例维度的响应式单例状态缓存映射。
 */
const tenantStateMap = new WeakMap<TenantManager, TenantInternalState>();

/**
 * 获取或初始化指定 TenantManager 对应的响应式状态单例。
 */
function getOrCreateTenantState(manager: TenantManager): TenantInternalState {
  const existing = tenantStateMap.get(manager);
  if (existing) {
    return existing;
  }

  const newState: TenantInternalState = {
    tenantId: ref<string | null>(manager.getTenantId()),
  };
  tenantStateMap.set(manager, newState);

  // 绑定外部租户切换事件监听（使用局部确定性引用，绝不使用非空断言 !）
  manager.onTenantChange(newTenantId => {
    newState.tenantId.value = newTenantId;
  });

  return newState;
}

/**
 * 多租户上下文响应式切片 Hook。
 *
 * @param options 多租户配置选项
 * @returns 包含响应式租户标识与切换门面的结果对象
 */
export function useTenant(options: UseTenantOptions = {}): UseTenantResult {
  const globalConfig = useAtengConfig();
  const manager = options.tenantManager ?? globalConfig.tenantManager;

  const state = getOrCreateTenantState(manager);

  const hasTenant = computed<boolean>(() => {
    return Boolean(state.tenantId.value);
  });

  /**
   * 写入并切换租户。
   */
  const setTenantId = (id: string | null | undefined): void => {
    manager.setTenantId(id);
    state.tenantId.value = manager.getTenantId();
  };

  /**
   * 清除当前租户。
   */
  const clearTenantId = (): void => {
    manager.clearTenantId();
    state.tenantId.value = null;
  };

  return {
    tenantId: readonly(state.tenantId) as DeepReadonly<Ref<string | null>>,
    hasTenant: readonly(hasTenant) as DeepReadonly<Ref<boolean>>,
    setTenantId,
    clearTenantId,
  };
}
