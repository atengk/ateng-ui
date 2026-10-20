/**
 * 全局上下文与配置类型定义。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import type { HttpClient, BusinessException } from '@atengk/core';

/**
 * @atengk/vue 全局插件与上下文可配置选项接口。
 */
export interface AtengVueOptions {
  /**
   * 自定义默认 HttpClient 实例。未指定时 Fallback 至 @atengk/core 的全局单例 http。
   */
  httpClient?: HttpClient;

  /**
   * 默认分页大小。未指定时默认为 10。
   */
  defaultPageSize?: number;

  /**
   * 全局请求异常处理回调。
   *
   * @param error 捕获到的业务异常或未知错误
   */
  onError?: (error: BusinessException | unknown) => void;

  /**
   * useStream 默认是否在组件挂载时自动连接。未指定时默认为 true。
   */
  autoConnectStream?: boolean;

  /**
   * useWebSocket 默认是否在组件挂载时自动连接。未指定时默认为 true。
   */
  autoConnectWebSocket?: boolean;
}

/**
 * 解析后的全局生效配置上下文对象。
 */
export interface AtengVueContext {
  /**
   * 生效的 HTTP 客户端实例。
   */
  httpClient: HttpClient;

  /**
   * 生效的默认分页大小。
   */
  defaultPageSize: number;

  /**
   * 生效的全局异常处理回调。
   */
  onError?: (error: BusinessException | unknown) => void;

  /**
   * useStream 默认自动连接配置。
   */
  autoConnectStream: boolean;

  /**
   * useWebSocket 默认自动连接配置。
   */
  autoConnectWebSocket: boolean;
}
