/**
 * 负责全局字典异步请求并发合并去重与纯内存常驻缓存的门面管理器。
 *
 * 遵循严格的单例无状态、纯内存常驻与防并发请求风暴契约。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { DictItem, DictProvider, DictLoader } from './types';

/**
 * 字典管理器核心实现类。
 */
export class DictManagerClass {
  /**
   * 纯内存常驻缓存映射表，严禁写入 LocalStorage/SessionStorage 避免脏数据死锁。
   */
  private readonly cache = new Map<string, DictItem[]>();

  /**
   * 飞行中未决 Promise 映射表，用于毫秒级合并同 code 的并发重复请求。
   */
  private readonly inFlight = new Map<string, Promise<DictItem[]>>();

  /**
   * 全局字典数据源提供者接口。
   */
  private globalProvider: DictProvider | null = null;

  /**
   * 注入全局字典提供者函数。
   *
   * @param provider 接收 dictCode 并返回 DictItem 列表的异步提供者
   */
  public setProvider(provider: DictProvider): void {
    this.globalProvider = provider;
  }

  /**
   * 获取当前配置的全局字典提供者函数。
   */
  public getProvider(): DictProvider | null {
    return this.globalProvider;
  }

  /**
   * 检查指定字典编码是否已存在于内存缓存中。
   *
   * @param code 字典业务编码
   */
  public hasCache(code: string): boolean {
    return this.cache.has(code);
  }

  /**
   * 直接从内存缓存中同步获取字典项（若未缓存则返回 undefined）。
   *
   * @param code 字典业务编码
   */
  public getCache(code: string): DictItem[] | undefined {
    return this.cache.get(code);
  }

  /**
   * 确定性清理内存缓存。
   *
   * @param code 可选指定清理的单个字典编码；若不传则清空全部内存字典缓存
   */
  public clearCache(code?: string): void {
    if (code) {
      this.cache.delete(code);
    } else {
      this.cache.clear();
    }
  }

  /**
   * 核心异步加载接口：自动处理内存命中、并发合并去重、三级回退与空安全保底。
   *
   * @param code 字典业务编码
   * @param customLoader 可选的组件局部自定义加载器（优先级高于全局 provider）
   * @param forceRefresh 是否强制跳过内存缓存穿透拉取
   * @returns 保证 100% 返回数组（无数据或异常时保底返回 []，绝不返回 null）
   */
  public async loadDict(
    code: string,
    customLoader?: DictLoader,
    forceRefresh: boolean = false,
  ): Promise<DictItem[]> {
    if (!code) {
      if (typeof customLoader === 'function') {
        try {
          const items = await customLoader();
          return Array.isArray(items) ? items : [];
        } catch {
          return [];
        }
      }
      return [];
    }

    // 1. 若非强制刷新且已命中内存缓存，毫秒级直接同步返回
    if (!forceRefresh && this.cache.has(code)) {
      return this.cache.get(code) ?? [];
    }

    // 2. 若当前正有该 code 的飞行中请求，直接复用 Promise 杜绝重复请求风暴
    const existingInFlight = this.inFlight.get(code);
    if (existingInFlight && !forceRefresh) {
      return existingInFlight;
    }

    // 3. 构建新的异步请求并加入飞行中映射
    const requestPromise = (async (): Promise<DictItem[]> => {
      try {
        let items: DictItem[] = [];
        if (typeof customLoader === 'function') {
          items = await customLoader();
        } else if (typeof this.globalProvider === 'function') {
          items = await this.globalProvider(code);
        } else {
          return [];
        }

        const safeItems = Array.isArray(items) ? items : [];
        this.cache.set(code, safeItems);
        return safeItems;
      } catch {
        // 防御性异常处理：保底返回空数组，避免阻断视图渲染
        return [];
      } finally {
        this.inFlight.delete(code);
      }
    })();

    this.inFlight.set(code, requestPromise);
    return requestPromise;
  }
}

/**
 * 全局导出的单例字典管理器门面实例。
 */
export const DictManager: DictManagerClass = new DictManagerClass();
