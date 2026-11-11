/**
 * MapResizeGuard 视口几何自愈守卫。
 *
 * 遵循 ADR-0020、ADR-0032 与 ADR-0051 规范，解决地图容器初始处于 display: none (0x0 几何)
 * 或在多标签页 (AtengTabsNav)、折叠手风琴或模态弹窗展开时，底层渲染引擎尺寸计算失效
 * 导致的切片大面积灰屏与中心点位移错位问题。
 *
 * @author Ateng
 * @since 2026-11-11
 */

export interface MapResizeGuardOptions {
  /** 触发自愈重绘的最小有效宽度阈值，默认为 1 像素 */
  minWidth?: number;
  /** 触发自愈重绘的最小有效高度阈值，默认为 1 像素 */
  minHeight?: number;
}

export class MapResizeGuard {
  private element: HTMLElement | null;
  private onResize: () => void;
  private observer: ResizeObserver | null = null;
  private minWidth: number;
  private minHeight: number;
  private isSuspended = false;
  private lastWidth = 0;
  private lastHeight = 0;
  private rafId: number | null = null;

  constructor(element: HTMLElement, onResize: () => void, options?: MapResizeGuardOptions) {
    this.element = element;
    this.onResize = onResize;
    this.minWidth = options?.minWidth ?? 1;
    this.minHeight = options?.minHeight ?? 1;

    this.init();
  }

  /**
   * 初始化 ResizeObserver 视口监听。
   */
  private init(): void {
    if (!this.element || typeof ResizeObserver === 'undefined') {
      return;
    }

    const rect = this.element.getBoundingClientRect();
    this.lastWidth = rect.width;
    this.lastHeight = rect.height;

    // 初始处于 0x0 尺寸时标记挂起
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
   * 处理尺寸几何变更与自愈调度。
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
   * 断开监听并销毁定时器句柄。
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
