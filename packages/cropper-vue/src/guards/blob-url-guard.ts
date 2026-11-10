/**
 * 临时对象 URL (Blob URL) 生命周期安全守卫。
 *
 * 遵循 ADR-0048 规范，内部维护受管 URL 集合，在源变更、重置与组件卸载时
 * 100% 确定性调用 URL.revokeObjectURL 释放内存，同时保护外部传入的 URL 免遭误销毁。
 *
 * @author Ateng
 * @since 2026-11-10
 */

export class BlobUrlGuard {
  /** 当前实例内部接管跟踪的 Object URL 集合 */
  private readonly trackedUrls = new Set<string>();

  /**
   * 为 Blob 或 File 实例创建并接管跟踪临时的 Object URL。
   *
   * @param source 原始 Blob 或 File 对象
   * @returns 生成的 `blob:` 协议 URL
   */
  public create(source: Blob | File): string {
    const url = URL.createObjectURL(source);
    this.trackedUrls.add(url);
    return url;
  }

  /**
   * 释放指定的 Object URL。
   * 仅当该 URL 由本守卫实例内部创建接管时才执行 revoke，外部 URL 严格静默跳过以防误杀。
   *
   * @param url 待释放的 URL 字符串
   */
  public revoke(url?: string | null): void {
    if (!url || typeof url !== 'string') {
      return;
    }
    if (this.trackedUrls.has(url)) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // 静默保护，防止环境兼容性异常抛出
      } finally {
        this.trackedUrls.delete(url);
      }
    }
  }

  /**
   * 确定性销毁并释放所有当前由本守卫实例接管跟踪的 Object URL。
   */
  public revokeAll(): void {
    if (this.trackedUrls.size === 0) {
      return;
    }
    for (const url of this.trackedUrls) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // 静默保护
      }
    }
    this.trackedUrls.clear();
  }

  /**
   * 判断指定 URL 是否属于本守卫受管的临时 Object URL。
   *
   * @param url 待检测的 URL
   */
  public isManaged(url?: string | null): boolean {
    if (!url || typeof url !== 'string') {
      return false;
    }
    return this.trackedUrls.has(url);
  }

  /**
   * 当前由本守卫接管跟踪的临时 URL 数量。
   */
  public get managedCount(): number {
    return this.trackedUrls.size;
  }
}
