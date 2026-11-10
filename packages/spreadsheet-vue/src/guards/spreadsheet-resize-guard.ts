/**
 * 电子表格视口几何自愈守卫 (SpreadsheetResizeGuard)。
 *
 * 遵循 ADR-0020、ADR-0035 与 ADR-0049，解决容器初始处于 display: none (0x0 几何)
 * 或标签页/弹窗展开时 Canvas 尺寸计算失效导致的白屏与渲染模糊问题。
 *
 * @author Ateng
 * @since 2026-11-10
 */

export interface SpreadsheetResizeGuardOptions {
  /** 触发自愈重绘的最小有效宽度阈值，默认为 1 */
  minWidth?: number;
  /** 触发自愈重绘的最小有效高度阈值，默认为 1 */
  minHeight?: number;
}

export class SpreadsheetResizeGuard {
  private element: HTMLElement | null;
  private onResize: () => void;
  private observer: ResizeObserver | null = null;
  private minWidth: number;
  private minHeight: number;
  private isSuspended = false;
  private lastWidth = 0;
  private lastHeight = 0;
  private rafId: number | null = null;

  constructor(element: HTMLElement, onResize: () => void, options?: SpreadsheetResizeGuardOptions) {
    this.element = element;
    this.onResize = onResize;
    this.minWidth = options?.minWidth ?? 1;
    this.minHeight = options?.minHeight ?? 1;

    this.init();
  }

  /**
   * 初始化 ResizeObserver 监听。
   */
  private init(): void {
    if (!this.element || typeof ResizeObserver === 'undefined') {
      return;
    }

    const rect = this.element.getBoundingClientRect();
    this.lastWidth = rect.width;
    this.lastHeight = rect.height;

    // 初始处于 0x0 几何时标记为挂起状态
    if (rect.width < this.minWidth || rect.height < this.minHeight) {
      this.isSuspended = true;
    }

    this.observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        this.handleResize(width, height);
      }
    });

    this.observer.observe(this.element);
  }

  /**
   * 处理尺寸变更与几何自愈触发。
   */
  private handleResize(width: number, height: number): void {
    const isValidDimension = width >= this.minWidth && height >= this.minHeight;

    if (!isValidDimension) {
      // 尺寸收缩至不可见时挂起
      this.isSuspended = true;
      return;
    }

    const dimensionChanged =
      Math.abs(width - this.lastWidth) > 1 || Math.abs(height - this.lastHeight) > 1;

    if (this.isSuspended || dimensionChanged) {
      this.isSuspended = false;
      this.lastWidth = width;
      this.lastHeight = height;

      if (this.rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this.rafId);
      }

      const schedule =
        typeof requestAnimationFrame !== 'undefined'
          ? requestAnimationFrame
          : (fn: () => void) => setTimeout(fn, 16);

      this.rafId = schedule(() => {
        this.rafId = null;
        this.onResize();
      }) as unknown as number;
    }
  }

  /**
   * 手动立即触发一次几何状态检查。
   */
  public checkNow(): void {
    if (!this.element) return;
    const rect = this.element.getBoundingClientRect();
    this.handleResize(rect.width, rect.height);
  }

  /**
   * 当前是否处于 0x0 挂起状态。
   */
  public get suspended(): boolean {
    return this.isSuspended;
  }

  /**
   * 断开监听并销毁资源。
   */
  public disconnect(): void {
    if (this.rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.element = null;
  }
}
