/**
 * 飞行中请求合并去重调度器类型契约定义。
 *
 * @author Ateng
 * @since 2026-10-20
 */

/**
 * 请求去重指纹计算目标入参。
 */
export interface DedupeTarget {
  /**
   * HTTP 请求方法（如 GET、POST）。
   */
  method?: string;

  /**
   * 请求相对或绝对路径 URL。
   */
  url?: string;

  /**
   * 请求 URL Query 参数对象。
   */
  params?: unknown;

  /**
   * 显式指定的自定义指纹唯一键（若提供则直接优先使用）。
   */
  dedupeKey?: string;
}

/**
 * RequestDeduplicator 构造与配置选项。
 */
export interface RequestDeduplicatorOptions {
  /**
   * 自定义指纹生成函数。
   */
  keyGenerator?: (target: DedupeTarget) => string;
}
