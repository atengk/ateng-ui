/**
 * 飞行中请求合并去重调度器实现。
 *
 * 针对并发触发的相同指纹（Method + URL + Params）只读请求，复用同一个正在执行中的 pending Promise，
 * 使向后端的并发瞬态请求数从 N 降为 1。当请求完成或失败后，飞行中未决表立即确定性释放，杜绝内存泄漏。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { generateDedupeKey } from './key';
import type { DedupeTarget, RequestDeduplicatorOptions } from './types';

/**
 * 飞行中并发请求去重调度器。
 */
export class RequestDeduplicator {
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private readonly keyGenerator: (target: DedupeTarget) => string;

  /**
   * 构造去重调度器。
   *
   * @param options 调度器配置
   */
  constructor(options: RequestDeduplicatorOptions = {}) {
    this.keyGenerator = options.keyGenerator ?? generateDedupeKey;
  }

  /**
   * 为指定请求目标特征生成指纹键。
   *
   * @param target 请求目标
   * @returns 唯一指纹键
   */
  public generateKey(target: DedupeTarget): string {
    return this.keyGenerator(target);
  }

  /**
   * 执行异步任务，若存在同指纹的飞行中未决任务则直接复用其 Promise。
   * 任务完成（成功结算或异常拒绝）后，自动确定性从飞行中表中剔除。
   *
   * @param keyOrTarget 指纹字符串或请求目标配置
   * @param task 实际执行的异步任务函数
   * @returns 异步执行结果 Promise
   */
  public async execute<T>(keyOrTarget: string | DedupeTarget, task: () => Promise<T>): Promise<T> {
    const key = typeof keyOrTarget === 'string' ? keyOrTarget : this.generateKey(keyOrTarget);

    if (!key) {
      return task();
    }

    const existingPromise = this.inFlight.get(key) as Promise<T> | undefined;
    if (existingPromise) {
      return existingPromise;
    }

    try {
      const promise = Promise.resolve()
        .then(() => task())
        .finally(() => {
          this.inFlight.delete(key);
        });

      this.inFlight.set(key, promise);
      return await promise;
    } catch (error) {
      this.inFlight.delete(key);
      throw error;
    }
  }

  /**
   * 检测指定指纹键或目标当前是否存在飞行中未决任务。
   *
   * @param keyOrTarget 指纹字符串或请求目标
   * @returns 若存在飞行中任务返回 true，否则返回 false
   */
  public isInFlight(keyOrTarget: string | DedupeTarget): boolean {
    const key = typeof keyOrTarget === 'string' ? keyOrTarget : this.generateKey(keyOrTarget);
    return this.inFlight.has(key);
  }

  /**
   * 获取当前飞行中未决任务的总数量。
   *
   * @returns 飞行中任务数量
   */
  public getInFlightCount(): number {
    return this.inFlight.size;
  }

  /**
   * 强制清空当前所有飞行中未决任务记录。
   */
  public clear(): void {
    this.inFlight.clear();
  }
}

/**
 * 创建独立的请求去重调度器实例。
 *
 * @param options 调度器配置项
 * @returns 独立的 RequestDeduplicator 实例
 */
export function createRequestDeduplicator(
  options?: RequestDeduplicatorOptions,
): RequestDeduplicator {
  return new RequestDeduplicator(options);
}

/**
 * 开箱即用的全局默认飞行中请求去重调度器单例。
 */
export const requestDeduplicator: RequestDeduplicator = createRequestDeduplicator();
