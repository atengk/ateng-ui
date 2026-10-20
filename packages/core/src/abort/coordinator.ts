/**
 * 异步请求取消协调器与防竞态状态机。
 *
 * @author Ateng
 * @since 2026-10-19
 */

import { generateRequestKey } from './key';
import type { AbortRegistration, RegisterAbortOptions } from './types';

interface PendingEntry {
  controller: AbortController;
  cleanup?: () => void;
}

/**
 * 判断指定异常是否为由取消或中断引起的操作中止错误。
 *
 * @param error 待检测的异常对象
 * @returns 若为中止取消异常返回 true，否则返回 false
 */
export function isAbortError(error: unknown): boolean {
  if (!error) {
    return false;
  }

  if (typeof error === 'string') {
    return error === 'canceled' || error === 'AbortError' || error === 'ERR_CANCELED';
  }

  if (typeof error !== 'object') {
    return false;
  }

  const err = error as { name?: string; code?: string; message?: string };
  return (
    err.name === 'AbortError' ||
    err.name === 'CanceledError' ||
    err.code === 'ERR_CANCELED' ||
    err.message === 'canceled'
  );
}

/**
 * 异步请求取消协调器。
 * 集中管理未决请求的生命周期，支持根据请求特征或显式键注册、销毁与取消，
 * 并提供 cancelDuplicate 抗竞态控制与外部生命周期信号级联。
 */
export class AbortCoordinator {
  private readonly pendingMap = new Map<string, Set<PendingEntry>>();

  /**
   * 统一释放条目挂载的监听资源并按需触发中断。
   */
  private cleanupEntry(entry: PendingEntry, abortReason?: string | Error): void {
    if (entry.cleanup) {
      entry.cleanup();
      entry.cleanup = undefined;
    }
    if (abortReason !== undefined && !entry.controller.signal.aborted) {
      entry.controller.abort(abortReason);
    }
  }

  /**
   * 从指定指纹键集合中精准剔除单个条目。
   */
  private removeEntry(key: string, entry: PendingEntry): void {
    const entries = this.pendingMap.get(key);
    if (!entries) {
      return;
    }

    entries.delete(entry);
    if (entry.cleanup) {
      entry.cleanup();
      entry.cleanup = undefined;
    }

    if (entries.size === 0) {
      this.pendingMap.delete(key);
    }
  }

  /**
   * 注册未决请求并获取受控 AbortController。
   *
   * @param options 注册选项
   * @returns 注册结果（包含唯一键、controller 与 signal）
   */
  public register(options: RegisterAbortOptions): AbortRegistration {
    const key = options.key ?? (options.target ? generateRequestKey(options.target) : '');

    if (!key) {
      throw new Error('Either key or target must be provided to register an abort controller.');
    }

    // 1. 若配置 cancelDuplicate: true，中断并清理同指纹的所有前序未决请求
    if (options.cancelDuplicate) {
      this.cancel(key, options.reason ?? 'Canceled duplicate request');
    }

    // 2. 创建受管的 AbortController 与当前条目
    const controller = new AbortController();
    const entry: PendingEntry = { controller };

    // 3. 处理外部生命周期 signal 级联联动
    if (options.signal) {
      if (options.signal.aborted) {
        controller.abort(options.signal.reason);
      } else {
        const onExternalAbort = () => {
          this.removeEntry(key, entry);
          controller.abort(options.signal?.reason);
        };
        options.signal.addEventListener('abort', onExternalAbort, { once: true });
        entry.cleanup = () => {
          options.signal?.removeEventListener('abort', onExternalAbort);
        };
      }
    }

    let entries = this.pendingMap.get(key);
    if (!entries) {
      entries = new Set();
      this.pendingMap.set(key, entries);
    }
    entries.add(entry);

    return {
      key,
      controller,
      signal: controller.signal,
    };
  }

  /**
   * 当请求正常响应或发生错误后，从协调器中移除未决追踪并释放清理监听。
   *
   * @param key 请求唯一指纹键
   * @param controller 可选的特定控制器（用于精确注销并发实例）
   */
  public remove(key: string, controller?: AbortController): void {
    const entries = this.pendingMap.get(key);
    if (!entries) {
      return;
    }

    if (controller) {
      for (const entry of entries) {
        if (entry.controller === controller) {
          this.removeEntry(key, entry);
          break;
        }
      }
    } else {
      for (const entry of entries) {
        this.cleanupEntry(entry);
      }
      this.pendingMap.delete(key);
    }
  }

  /**
   * 手动中断并注销指定的未决请求。
   *
   * @param key 请求唯一指纹键
   * @param reason 中断原因
   * @returns 若成功中断返回 true，若请求不存在或已被注销返回 false
   */
  public cancel(key: string, reason?: string | Error): boolean {
    const entries = this.pendingMap.get(key);
    if (!entries || entries.size === 0) {
      return false;
    }

    this.pendingMap.delete(key);
    for (const entry of entries) {
      this.cleanupEntry(entry, reason);
    }
    return true;
  }

  /**
   * 批量中断所有当前活跃的未决请求并彻底清空映射。
   *
   * @param reason 中断原因
   */
  public cancelAll(reason?: string | Error): void {
    for (const entries of this.pendingMap.values()) {
      for (const entry of entries) {
        this.cleanupEntry(entry, reason);
      }
    }
    this.pendingMap.clear();
  }

  /**
   * 查询指定请求当前是否处于未决（执行中）状态。
   *
   * @param key 请求唯一指纹键
   * @returns 若处于未决状态返回 true，否则返回 false
   */
  public isPending(key: string): boolean {
    const entries = this.pendingMap.get(key);
    return Boolean(entries && entries.size > 0);
  }

  /**
   * 获取当前处于未决状态的请求总数量。
   *
   * @returns 未决请求计数
   */
  public getPendingCount(): number {
    let count = 0;
    for (const entries of this.pendingMap.values()) {
      count += entries.size;
    }
    return count;
  }
}

/**
 * 创建 AbortCoordinator 请求取消协调器实例工厂函数。
 *
 * @returns AbortCoordinator 实例
 */
export function createAbortCoordinator(): AbortCoordinator {
  return new AbortCoordinator();
}
