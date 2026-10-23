/**
 * 负责全局字典异步请求并发合并去重与纯内存常驻缓存的门面管理器。
 *
 * 遵循严格的单例无状态、纯内存常驻与防并发请求风暴契约。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { DictItem, DictProvider, DictLoader, DictBatchProvider } from './types';

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
   * 全局批量字典数据源提供者接口。
   */
  private batchProvider: DictBatchProvider | null = null;

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
   * 注入全局批量字典提供者函数。
   *
   * @param provider 接收多个 dictCode 数组并返回对应字典映射的异步提供者
   */
  public setBatchProvider(provider: DictBatchProvider): void {
    this.batchProvider = provider;
  }

  /**
   * 获取当前配置的全局批量字典提供者函数。
   */
  public getBatchProvider(): DictBatchProvider | null {
    return this.batchProvider;
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
   * 批量预加载字典项。
   *
   * 核心特性：
   * 1. 增量差异拉取：自动过滤并剔除已命中内存缓存的编码，杜绝重复网络请求；
   * 2. 双轨数据源调度：优先使用 batchProvider 批量拉取；未配置时平滑降级为并发 loadDict；
   * 3. 确定性空安全保底：无数据或异常时保证返回各编码的有效字典列表，绝不抛错阻断业务。
   *
   * @param codes 字典业务编码列表
   * @returns 字典编码对应 DictItem 数组的字典映射字典
   */
  public async preload(codes: string[]): Promise<Record<string, DictItem[]>> {
    const result: Record<string, DictItem[]> = {};
    if (!Array.isArray(codes) || codes.length === 0) {
      return result;
    }

    // 1. 差异增量过滤：提取内存缓存中尚未命中的 codes
    const missingCodes: string[] = [];
    for (const code of codes) {
      if (!code) continue;
      if (this.cache.has(code)) {
        result[code] = this.cache.get(code) ?? [];
      } else {
        missingCodes.push(code);
      }
    }

    // 全部已命中，秒级返回纯内存缓存
    if (missingCodes.length === 0) {
      return result;
    }

    // 2. 若配置了 batchProvider，一次性发起批量请求
    if (typeof this.batchProvider === 'function') {
      try {
        const batchMap = await this.batchProvider(missingCodes);
        if (batchMap && typeof batchMap === 'object') {
          for (const code of missingCodes) {
            const rawItems = batchMap[code];
            const safeItems = Array.isArray(rawItems) ? rawItems : [];
            this.cache.set(code, safeItems);
            result[code] = safeItems;
          }
        } else {
          for (const code of missingCodes) {
            this.cache.set(code, []);
            result[code] = [];
          }
        }
        return result;
      } catch {
        // 批量拉取异常时降级保底
        for (const code of missingCodes) {
          result[code] = [];
        }
        return result;
      }
    }

    // 3. 未配置 batchProvider 时，自动降级并发调用 loadDict 并去重
    try {
      const promises = missingCodes.map(async code => {
        const items = await this.loadDict(code);
        return { code, items };
      });
      const entries = await Promise.all(promises);
      for (const { code, items } of entries) {
        result[code] = items;
      }
      return result;
    } catch {
      for (const code of missingCodes) {
        result[code] = [];
      }
      return result;
    }
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
