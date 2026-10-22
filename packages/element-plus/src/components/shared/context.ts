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

  /**
   * 注册关联的表单重置钩子（供 AtengQueryForm 挂载时接入协同自愈）。
   *
   * @param handler 表单重置回调
   * @returns 注销函数
   */
  registerResetHandler?: (handler: () => void) => () => void;

  /**
   * 注册关联表单的查询参数获取器（供 AtengQueryForm 挂载时提供实时表单模型）。
   *
   * @param getter 表单参数获取函数
   * @returns 注销函数
   */
  registerQueryGetter?: (getter: () => Record<string, unknown>) => () => void;
}

export const ATENG_TABLE_CONTEXT_KEY: InjectionKey<AtengTableContext> = Symbol('AtengTableContext');
