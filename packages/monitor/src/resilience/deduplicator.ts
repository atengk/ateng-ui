/**
 * 高频异常防抖聚合与去重器 (Error Deduplicator)。
 *
 * @author Ateng
 * @since 2026-10-31
 */

interface DedupeRecord {
  count: number;
  lastTime: number;
}

/**
 * 错误去重器选项配置。
 */
export interface DeduplicatorOptions {
  /** 聚合防抖时间窗口 (毫秒)，默认 5000ms */
  windowMs?: number;
}

/**
 * 基于时间窗口的高频异常去重器。
 */
export class ErrorDeduplicator {
  private readonly _windowMs: number;
  private readonly _records = new Map<string, DedupeRecord>();

  constructor(options?: DeduplicatorOptions) {
    this._windowMs = options?.windowMs ?? 5000;
  }

  /**
   * 处理一个错误指纹，判定当前是否为窗口内的重复异常，并累计重复计数。
   *
   * @param fingerprint 错误唯一指纹
   * @param now 当前时间戳 (毫秒)，默认 Date.now()
   * @returns 去重判定结果及当前累计重复次数
   */
  process(
    fingerprint: string,
    now: number = Date.now(),
  ): { isDuplicate: boolean; repeatCount: number } {
    if (!fingerprint) {
      return { isDuplicate: false, repeatCount: 1 };
    }

    const record = this._records.get(fingerprint);

    // 若此前已有记录且在当前时间窗口内，判定为高频重复
    if (record && now - record.lastTime < this._windowMs) {
      record.count += 1;
      record.lastTime = now;
      return {
        isDuplicate: true,
        repeatCount: record.count,
      };
    }

    // 首次出现或已超过时间窗口，开启新一轮计数
    this._records.set(fingerprint, {
      count: 1,
      lastTime: now,
    });

    return {
      isDuplicate: false,
      repeatCount: 1,
    };
  }

  /**
   * 获取指定指纹当前的累计重复次数。
   *
   * @param fingerprint 错误指纹
   */
  getCount(fingerprint: string): number {
    return this._records.get(fingerprint)?.count ?? 0;
  }

  /**
   * 重置清空所有去重记录。
   */
  clear(): void {
    this._records.clear();
  }
}
