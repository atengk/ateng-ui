/**
 * 监控上下文管理与状态存储门面。
 *
 * @author Ateng
 * @since 2026-10-31
 */

import type {
  ContextStoreInstance,
  MonitorContext,
  MonitorContextSnapshot,
  UserContext,
} from '../types/context';
import type { MonitorOptions } from '../types/options';
import { generateId } from '../utils/id';
import { getCurrentUrl, getDeviceContext, getDocumentTitle } from '../utils/device';

/**
 * 创建全生命周期受管的上下文存储实例。
 *
 * @param options 初始初始化配置
 * @returns 具备防御性克隆特性的 ContextStoreInstance
 */
export function createContextStore(options?: MonitorOptions): ContextStoreInstance {
  // 1. 初始化静态元数据与会话标识
  const initialAppVersion = options?.appVersion || '1.0.0';
  const initialEnvironment = options?.environment || 'dev';
  const initialSessionId = options?.sessionId || generateId();
  const initialTenantId = options?.tenantId;

  // 2. 内存受管状态模型
  let state: MonitorContext = {
    appVersion: initialAppVersion,
    environment: initialEnvironment,
    sessionId: initialSessionId,
    tenantId: initialTenantId,
    user: undefined,
    tags: {},
    extra: {},
  };

  return {
    getContext(): MonitorContext {
      // 防御性深克隆，杜绝调用方就地突变内部状态
      return {
        ...state,
        user: state.user ? { ...state.user } : undefined,
        tags: { ...state.tags },
        extra: { ...state.extra },
      };
    },

    getSnapshot(): MonitorContextSnapshot {
      return {
        ...this.getContext(),
        device: getDeviceContext(),
        url: getCurrentUrl(),
        title: getDocumentTitle(),
      };
    },

    setUser(user?: UserContext): void {
      state.user = user ? { ...user } : undefined;
    },

    setTenant(tenantId?: string): void {
      state.tenantId = tenantId;
    },

    setTag(key: string, value: string): void {
      if (!key) return;
      state.tags[key] = value;
    },

    setTags(tags: Record<string, string>): void {
      if (!tags) return;
      state.tags = {
        ...state.tags,
        ...tags,
      };
    },

    setExtra(key: string, value: unknown): void {
      if (!key) return;
      state.extra[key] = value;
    },

    reset(): void {
      state = {
        appVersion: initialAppVersion,
        environment: initialEnvironment,
        sessionId: initialSessionId,
        tenantId: initialTenantId,
        user: undefined,
        tags: {},
        extra: {},
      };
    },
  };
}
