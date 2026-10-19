/**
 * Sa-Token 鉴权凭据门面配置项与契约定义。
 *
 * @author Ateng
 * @since 2026-10-19
 */

import type { AuthStorage } from './storage';

/**
 * AuthManager 构造初始化配置项。
 */
export interface AuthManagerOptions {
  /**
   * 存储在 Storage 中的 Token 键名，默认为 'satoken'。
   */
  tokenKey?: string;

  /**
   * 双轨 Header 中的 Sa-Token 请求头名称，默认为 'satoken'。
   */
  headerName?: string;

  /**
   * 双轨 Header 中的 Bearer Authorization 请求头名称，默认为 'Authorization'。
   */
  bearerHeaderName?: string;

  /**
   * Bearer Token 前缀，默认为 'Bearer '。
   */
  tokenPrefix?: string;

  /**
   * 底层持久化存储适配器实例，默认根据宿主环境自适应探测选择。
   */
  storage?: AuthStorage;

  /**
   * 未授权 (HTTP 401 或业务 401) 发生时的回调通知。
   */
  onUnauthorized?: () => void;
}
