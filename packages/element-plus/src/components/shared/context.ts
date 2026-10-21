/**
 * 组件间通信上下文标识与协议定义。
 *
 * 规范 AtengTable 与 AtengQueryForm 等容器组件之间的依赖注入上下文。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { InjectionKey } from 'vue';

export interface AtengTableContext {
  /**
   * 触发表格条件检索。
   *
   * @param params 检索条件模型
   */
  search: (params?: Record<string, unknown>) => Promise<unknown> | void;

  /**
   * 重置表格检索条件。
   */
  reset: () => Promise<unknown> | void;

  /**
   * 当前表格是否处于加载状态。
   */
  loading?: { value: boolean };

  /**
   * 获取当前所有选中的数据行。
   */
  getSelectedRows?: () => Record<string, unknown>[];

  /**
   * 获取当前表格分页或检索入参模型。
   */
  getQueryParams?: () => Record<string, unknown> | undefined;
}

export const ATENG_TABLE_CONTEXT_KEY: InjectionKey<AtengTableContext> = Symbol('AtengTableContext');
