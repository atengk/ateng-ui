/**
 * RenderThrottler 流式增量渲染节流器与匀速打字机引擎。
 *
 * 核心针对大模型高吞吐（50+ token/s）输出，限制主线程 DOM 重排与重新计算频度：
 * 1. 全速模式（typewriterSpeed: 0）：依托 requestAnimationFrame 进行 16~32ms 批处理合并；
 * 2. 呼吸打字模式（typewriterSpeed > 0）：字符缓冲队列匀速吐字，并支持动态追赶；
 * 3. 瞬间跳过（flushTypewriter）：支持用户点击消息气泡时立即跳过打字动画吐出全量。
 *
 * @author Ateng
 * @since 2026-11-09
 */

export interface RenderThrottlerOptions {
  /**
   * 打字机吐字速度（毫秒/字符）。
   * 0: 全速 RAF 批处理（16~32ms 窗口合并，默认 0）；
   * >0: 匀速队列排队吐字。
   */
  typewriterSpeed?: number;

  /**
   * 文本更新回调。
   *
   * @param fullText 当前累计已吐出的完整文本
   * @param delta 本次吐出的增量文本片段
   */
  onUpdate: (fullText: string, delta: string) => void;

  /**
   * 队列完全排空且流结束时的回调。
   */
  onComplete?: () => void;
}

/**
 * 环境安全的调度定时器。
 */
function scheduleRaf(callback: () => void): number {
  if (typeof requestAnimationFrame !== 'undefined') {
    return requestAnimationFrame(callback);
  }
  return setTimeout(callback, 16) as unknown as number;
}

function cancelRaf(handle: number): void {
  if (typeof cancelAnimationFrame !== 'undefined') {
    cancelAnimationFrame(handle);
  } else {
    clearTimeout(handle);
  }
}

export class RenderThrottler {
  private readonly options: Required<Pick<RenderThrottlerOptions, 'typewriterSpeed'>> &
    RenderThrottlerOptions;

  private renderedText = '';
  private pendingBatch = '';
  private charQueue: string[] = [];
  private rafHandle: number | null = null;
  private timerHandle: ReturnType<typeof setInterval> | null = null;
  private isFinished = false;

  public constructor(options: RenderThrottlerOptions) {
    this.options = {
      typewriterSpeed: 0,
      ...options,
    };
  }

  /**
   * 注入新的流式文本增量块。
   *
   * @param chunk 到达的分块文本
   */
  public feed(chunk: string): void {
    if (!chunk) return;

    if (this.options.typewriterSpeed <= 0) {
      // 模式 1：全速 RAF 批处理合并
      this.pendingBatch += chunk;
      if (this.rafHandle === null) {
        this.rafHandle = scheduleRaf(() => {
          this.flushBatch();
        });
      }
    } else {
      // 模式 2：打字机字符缓冲队列
      const chars = Array.from(chunk);
      this.charQueue.push(...chars);
      this.startTypewriterTimer();
    }
  }

  /**
   * 瞬间排空当前在途所有缓冲与排队字符，立即完成全部渲染。
   */
  public flushTypewriter(): void {
    this.cancelScheduled();

    let delta = '';
    if (this.pendingBatch) {
      delta += this.pendingBatch;
      this.pendingBatch = '';
    }

    if (this.charQueue.length > 0) {
      delta += this.charQueue.join('');
      this.charQueue = [];
    }

    if (delta) {
      this.renderedText += delta;
      this.options.onUpdate(this.renderedText, delta);
    }

    if (this.isFinished) {
      this.options.onComplete?.();
    }
  }

  /**
   * 标记上游流式传输已结束。
   */
  public finish(): void {
    this.isFinished = true;
    if (this.options.typewriterSpeed <= 0) {
      this.flushTypewriter();
    } else if (this.charQueue.length === 0) {
      this.options.onComplete?.();
    }
  }

  /**
   * 获取当前已完成渲染的完整文本。
   */
  public getRenderedText(): string {
    return this.renderedText;
  }

  /**
   * 获取是否仍有待排空的缓冲字符。
   */
  public hasPending(): boolean {
    return this.pendingBatch.length > 0 || this.charQueue.length > 0;
  }

  /**
   * 确定性销毁与定时器资源回收。
   */
  public dispose(): void {
    this.cancelScheduled();
    this.pendingBatch = '';
    this.charQueue = [];
  }

  private flushBatch(): void {
    this.rafHandle = null;
    if (!this.pendingBatch) return;

    const delta = this.pendingBatch;
    this.pendingBatch = '';
    this.renderedText += delta;
    this.options.onUpdate(this.renderedText, delta);

    if (this.isFinished && this.charQueue.length === 0) {
      this.options.onComplete?.();
    }
  }

  private startTypewriterTimer(): void {
    if (this.timerHandle !== null) return;

    const interval = Math.max(8, this.options.typewriterSpeed);
    this.timerHandle = setInterval(() => {
      this.tickTypewriter();
    }, interval);
  }

  private tickTypewriter(): void {
    if (this.charQueue.length === 0) {
      if (this.timerHandle !== null) {
        clearInterval(this.timerHandle);
        this.timerHandle = null;
      }
      if (this.isFinished) {
        this.options.onComplete?.();
      }
      return;
    }

    // 自适应追赶算法：当队列积压过大时每次多吐若干字，杜绝严重滞后
    const drainCount = this.charQueue.length > 200 ? Math.ceil(this.charQueue.length / 50) : 1;
    const chars = this.charQueue.splice(0, drainCount);
    const delta = chars.join('');

    this.renderedText += delta;
    this.options.onUpdate(this.renderedText, delta);

    if (this.charQueue.length === 0 && this.isFinished) {
      if (this.timerHandle !== null) {
        clearInterval(this.timerHandle);
        this.timerHandle = null;
      }
      this.options.onComplete?.();
    }
  }

  private cancelScheduled(): void {
    if (this.rafHandle !== null) {
      cancelRaf(this.rafHandle);
      this.rafHandle = null;
    }
    if (this.timerHandle !== null) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  }
}
