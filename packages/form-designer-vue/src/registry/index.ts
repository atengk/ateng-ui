/**
 * @atengk/form-designer-vue 控件注册中心 (FormWidgetRegistry)。
 *
 * 遵循 ADR-0044，解耦具体 UI 库与表单设计器核心，统一维护所有已注册的控件适配器。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import type { FormWidgetAdapter, FormWidgetCategory } from '../types';

export class FormWidgetRegistry {
  private readonly adapters = new Map<string, FormWidgetAdapter>();

  /**
   * 注册单个控件适配器。
   *
   * @param adapter 适配器实例
   */
  public register(adapter: FormWidgetAdapter): void {
    if (!adapter || !adapter.type) {
      throw new Error('[FormWidgetRegistry] 控件适配器必须包含非空的 type 字段');
    }
    this.adapters.set(adapter.type, adapter);
  }

  /**
   * 批量注册控件适配器。
   *
   * @param adapters 适配器数组
   */
  public registerBatch(adapters: FormWidgetAdapter[]): void {
    if (Array.isArray(adapters)) {
      adapters.forEach(adapter => this.register(adapter));
    }
  }

  /**
   * 移除已注册的控件适配器。
   *
   * @param type 控件类型标识
   */
  public unregister(type: string): boolean {
    return this.adapters.delete(type);
  }

  /**
   * 查询指定类型的控件适配器。
   *
   * @param type 控件类型标识
   */
  public get(type: string): FormWidgetAdapter | undefined {
    return this.adapters.get(type);
  }

  /**
   * 检查指定类型的控件适配器是否存在。
   *
   * @param type 控件类型标识
   */
  public has(type: string): boolean {
    return this.adapters.has(type);
  }

  /**
   * 获取所有已注册的控件适配器列表。
   */
  public getAll(): FormWidgetAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * 按分类筛选已注册的控件适配器列表。
   *
   * @param category 物料分类
   */
  public getByCategory(category: FormWidgetCategory): FormWidgetAdapter[] {
    return this.getAll().filter(adapter => adapter.category === category);
  }

  /**
   * 清空所有已注册的控件。
   */
  public clear(): void {
    this.adapters.clear();
  }
}

/**
 * 全局共享的默认控件注册中心单例。
 */
export const defaultWidgetRegistry = new FormWidgetRegistry();
