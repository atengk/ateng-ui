/**
 * Sa-Token 鉴权凭据门面实现。
 *
 * 负责 Token 存取、销毁、双轨请求头组装（satoken 与 Authorization: Bearer <token>），
 * 以及 401 未授权自动清理与上层事件回调通知。
 *
 * @author Ateng
 * @since 2026-10-19
 */

import { AuthStorage, createDefaultAuthStorage } from './storage';
import type { AuthManagerOptions } from './types';

/**
 * Sa-Token 鉴权凭据操作门面。
 */
export class AuthManager {
  private readonly tokenKey: string;

  private readonly headerName: string;

  private readonly bearerHeaderName: string;

  private readonly tokenPrefix: string;

  private readonly storage: AuthStorage;

  private readonly unauthorizedListeners: Set<() => void> = new Set();

  public constructor(options?: AuthManagerOptions) {
    this.tokenKey = options?.tokenKey ?? 'satoken';
    this.headerName = options?.headerName ?? 'satoken';
    this.bearerHeaderName = options?.bearerHeaderName ?? 'Authorization';
    this.tokenPrefix = options?.tokenPrefix ?? 'Bearer ';
    this.storage = options?.storage ?? createDefaultAuthStorage();

    if (options?.onUnauthorized) {
      this.unauthorizedListeners.add(options.onUnauthorized);
    }
  }

  /**
   * 获取当前有效 Token 凭据。
   *
   * @returns Token 字符串，若未登录或不存在则返回 null
   */
  public getToken(): string | null {
    return this.storage.getItem(this.tokenKey);
  }

  /**
   * 写入并持久化 Token 凭据。
   * 若传入空字符串、纯空格或空值，将自动视为清空凭据。
   *
   * @param token Token 字符串
   */
  public setToken(token: string | null | undefined): void {
    const cleanToken = token ? token.trim() : '';
    if (!cleanToken) {
      this.clearToken();
      return;
    }
    this.storage.setItem(this.tokenKey, cleanToken);
  }

  /**
   * 清除并销毁当前已持久化的 Token 凭据。
   */
  public clearToken(): void {
    this.storage.removeItem(this.tokenKey);
  }

  /**
   * 获取待注入网络请求拦截器的双轨请求头集合。
   * 若不存在有效 Token，则安全保底返回空对象。
   *
   * @returns 请求头键值对
   */
  public getHeaders(): Record<string, string> {
    const token = this.getToken();
    if (!token) {
      return {};
    }

    return {
      [this.headerName]: token,
      [this.bearerHeaderName]: `${this.tokenPrefix}${token}`,
    };
  }

  /**
   * 触发未授权 (401) 自动化清理与事件广播。
   * 自动清空持久化凭据，并依次通知所有已注册的监听器。
   */
  public handleUnauthorized(): void {
    // 1. 销毁本地脏凭据
    this.clearToken();

    // 2. 广播执行未授权回调通知（具备异常隔离守卫，避免单个监听器异常中断整体清理）
    for (const listener of this.unauthorizedListeners) {
      try {
        listener();
      } catch (error) {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[AuthManager] onUnauthorized listener error:', error);
        }
      }
    }
  }

  /**
   * 注册未授权 (401) 状态变更监听器。
   * 遵循对称门面设计原则，返回注销解绑函数。
   *
   * @param listener 未授权回调函数
   * @returns 解绑注销函数
   */
  public onUnauthorized(listener: () => void): () => void {
    this.unauthorizedListeners.add(listener);
    return () => {
      this.unauthorizedListeners.delete(listener);
    };
  }

  /**
   * 清空所有已注册的未授权监听器。
   */
  public clearListeners(): void {
    this.unauthorizedListeners.clear();
  }

  /**
   * 获取底层持久化存储实例。
   *
   * @returns 当前使用的 AuthStorage
   */
  public getStorage(): AuthStorage {
    return this.storage;
  }
}

/**
 * 创建 AuthManager 鉴权凭据门面实例工厂函数。
 *
 * @param options 门面配置项
 * @returns AuthManager 实例
 */
export function createAuthManager(options?: AuthManagerOptions): AuthManager {
  return new AuthManager(options);
}

/**
 * 全局默认的 AuthManager 开箱即用单例。
 */
export const authManager: AuthManager = createAuthManager();
