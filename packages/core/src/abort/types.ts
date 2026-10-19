/**
 * 异步请求取消协调器与防竞态类型契约。
 *
 * @author Ateng
 * @since 2026-10-19
 */

/**
 * 请求特征提取目标对象（用于计算唯一指纹键）。
 */
export interface RequestKeyTarget {
  /**
   * 请求 URL 路径。
   */
  url?: string;

  /**
   * HTTP 请求方法（如 'GET', 'POST' 等）。
   */
  method?: string;

  /**
   * Query 路径查询参数。
   */
  params?: unknown;

  /**
   * Request Body 载荷数据。
   */
  data?: unknown;

  /**
   * 显式指定的唯一取消标识键（若指定则直接使用，绕过自动指纹计算）。
   */
  abortKey?: string;
}

/**
 * 注册未决请求时的配置选项。
 */
export interface RegisterAbortOptions {
  /**
   * 唯一请求标识键。若未指定，可提供 target 自动生成。
   */
  key?: string;

  /**
   * 请求特征配置对象（当未提供 key 时用于自动计算）。
   */
  target?: RequestKeyTarget;

  /**
   * 是否在同指纹请求未决时自动中断前序请求，默认为 false。
   */
  cancelDuplicate?: boolean;

  /**
   * 外部传入的原生 AbortSignal（支持与调用方生命周期级联联动）。
   */
  signal?: AbortSignal;

  /**
   * 中断原因提示文本。
   */
  reason?: string;
}

/**
 * 注册未决请求后的返回实体。
 */
export interface AbortRegistration {
  /**
   * 本次请求的唯一标识键。
   */
  key: string;

  /**
   * 为本次请求分配的受管 AbortController。
   */
  controller: AbortController;

  /**
   * 控制器对应的原生 AbortSignal。
   */
  signal: AbortSignal;
}
