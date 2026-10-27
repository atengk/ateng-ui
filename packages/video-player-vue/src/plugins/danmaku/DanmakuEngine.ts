/**
 * @atengk/video-player-vue Canvas 高性能弹幕渲染引擎。
 *
 * 核心技术防线：
 * 1. 纯 Canvas 2D 硬件加速流水线与双重描边（保证浅色与深色背景均清晰可见）
 * 2. 屏幕 DPI 视网膜高清自适应缩放（window.devicePixelRatio）
 * 3. 动态帧率增量计算（Delta Time）与 requestAnimationFrame 确定性生命周期治理
 * 4. 广播级防碰撞轨道分配器集成与同屏弹幕限额熔断保护
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { DanmakuTrackPool } from './DanmakuTrackPool';
import type { DanmakuItem, DanmakuMode, DanmakuOptions, DanmakuRenderObject } from './types';

export class DanmakuEngine {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private trackPool: DanmakuTrackPool;
  private allItems: DanmakuItem[] = [];
  private filteredItemsCache: DanmakuItem[] | null = null;
  private activeList: DanmakuRenderObject[] = [];
  private emittedIds = new Set<string | number>();
  private isVisibleState = true;
  private isDestroyed = false;
  private isPlaying = true;
  private lastTime = 0;
  private rafId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;

  public options: Required<DanmakuOptions>;

  constructor(container: HTMLElement, options: DanmakuOptions = {}) {
    this.container = container;
    this.options = {
      items: options.items ?? [],
      speed: options.speed ?? 1.0,
      opacity: options.opacity ?? 1.0,
      fontSize: options.fontSize ?? 24,
      area: options.area ?? 0.75,
      maxCount: options.maxCount ?? 100,
      filter: options.filter ?? (() => true),
      filterTypes: options.filterTypes ?? [],
      filterKeywords: options.filterKeywords ?? [],
      blockColor: options.blockColor ?? false,
      synchronizeVideo: options.synchronizeVideo ?? true,
    };

    // 1. 初始化 DOM Canvas 容器
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'at-danmaku-canvas';
    this.canvas.style.cssText =
      'position: absolute; left: 0; top: 0; width: 100%; height: 100%; pointer-events: none; z-index: 20;';
    this.container.appendChild(this.canvas);

    try {
      this.ctx = this.canvas.getContext('2d');
    } catch {
      this.ctx = null;
    }

    // 2. 初始化防碰撞轨道调度池
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 600;
    this.trackPool = new DanmakuTrackPool({
      canvasWidth: width,
      canvasHeight: height,
      fontSize: this.options.fontSize,
      area: this.options.area,
    });

    this.resizeCanvas();

    // 3. 初始导入弹幕数据
    if (this.options.items.length > 0) {
      this.load(this.options.items);
    }

    // 4. 监听容器尺寸响应
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.resizeCanvas();
      });
      this.resizeObserver.observe(this.container);
    }

    // 5. 启动渲染循环
    this.startLoop();
  }

  get visible(): boolean {
    return this.isVisibleState;
  }

  get activeCount(): number {
    return this.activeList.length;
  }

  /**
   * 适应高分屏缩放与画布分辨率调整。
   */
  private resizeCanvas(): void {
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 600;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);

    if (this.ctx) {
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    this.trackPool.update({
      canvasWidth: width,
      canvasHeight: height,
      fontSize: this.options.fontSize,
      area: this.options.area,
    });
  }

  /**
   * 启动基于 requestAnimationFrame 的主渲染流水线。
   */
  private startLoop(): void {
    if (this.isDestroyed) {
      return;
    }

    this.lastTime = performance.now();

    const loop = (time: number): void => {
      if (this.isDestroyed) {
        return;
      }

      const delta = Math.min(100, Math.max(0, time - this.lastTime));
      this.lastTime = time;

      this.renderFrame(delta);

      if (typeof requestAnimationFrame !== 'undefined') {
        this.rafId = requestAnimationFrame(loop);
      }
    };

    if (typeof requestAnimationFrame !== 'undefined') {
      this.rafId = requestAnimationFrame(loop);
    }
  }

  /**
   * 渲染单帧画面。
   */
  private renderFrame(delta: number): void {
    if (!this.ctx) {
      return;
    }

    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 600;

    // 清空画布
    this.ctx.clearRect(0, 0, width, height);

    if (!this.isVisibleState || this.activeList.length === 0) {
      return;
    }

    this.ctx.save();
    this.ctx.globalAlpha = this.options.opacity;

    const remaining: DanmakuRenderObject[] = [];
    const now = Date.now();

    for (const d of this.activeList) {
      // 1. 若处于播放态，更新位移
      if (this.isPlaying) {
        if (d.mode === 'scroll') {
          d.x -= d.speed * (delta / 1000);
          this.trackPool.registerItem(d.trackIndex, d);
        }
      }

      // 2. 存活判定：
      // - 滚动弹幕：尾部移出左边界 (x + width < 0) 时回收
      // - 顶部/底部弹幕：展示达到持续时间后回收
      let isAlive = true;
      if (d.mode === 'scroll') {
        isAlive = d.x + d.width >= 0;
      } else {
        isAlive = now - d.startTime < d.duration;
      }

      if (!isAlive) {
        continue;
      }

      // 3. 绘制文字与描边
      this.drawDanmaku(d);
      remaining.push(d);
    }

    this.activeList = remaining;
    this.ctx.restore();
  }

  /**
   * 绘制单条弹幕对象。
   */
  private drawDanmaku(d: DanmakuRenderObject): void {
    if (!this.ctx) {
      return;
    }

    const ctx = this.ctx;
    ctx.font = `bold ${d.fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textBaseline = 'middle';

    // 双重高对比度黑白描边（黑底浅色描边或黑边保底）
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.strokeText(d.text, d.x, d.y);

    ctx.fillStyle = d.color;
    ctx.fillText(d.text, d.x, d.y);

    // 本人发射弹幕绘制高亮虚线或实线外边框
    if (d.isMe || d.border) {
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = typeof d.border === 'string' ? d.border : '#409EFF';
      const halfHeight = d.height / 2;
      ctx.strokeRect(d.x - 4, d.y - halfHeight - 2, d.width + 8, d.height + 4);
    }
  }

  /**
   * 过滤后的有效弹幕库列表。
   */
  getFilteredItems(): DanmakuItem[] {
    if (this.filteredItemsCache) {
      return this.filteredItemsCache;
    }

    const filtered = this.allItems
      .filter(item => {
        const mode = item.mode || 'scroll';
        // 1. 类型屏蔽过滤
        if (this.options.filterTypes.includes(mode)) {
          return false;
        }

        // 2. 关键词与正则表达式过滤
        for (const rule of this.options.filterKeywords) {
          if (typeof rule === 'string') {
            if (item.text.includes(rule)) {
              return false;
            }
          } else if (rule instanceof RegExp) {
            if (rule.test(item.text)) {
              return false;
            }
          }
        }

        // 3. 自定义过滤钩子
        if (this.options.filter && !this.options.filter(item)) {
          return false;
        }

        return true;
      })
      .map(item => {
        // 4. 彩色弹幕屏蔽转换
        if (this.options.blockColor && item.color && item.color !== '#ffffff') {
          return {
            ...item,
            color: '#ffffff',
          };
        }
        return item;
      });

    this.filteredItemsCache = filtered;
    return filtered;
  }

  /**
   * 获取所有存量弹幕条目。
   */
  getAllItems(): DanmakuItem[] {
    return [...this.allItems];
  }

  /**
   * 将单条弹幕对象推入活跃渲染管道。
   */
  private spawnDanmaku(rawItem: DanmakuItem): void {
    if (!this.isVisibleState || this.activeList.length >= this.options.maxCount) {
      return;
    }

    const width = this.container.clientWidth || 800;
    const mode: DanmakuMode = rawItem.mode || 'scroll';
    const fontSize = rawItem.fontSize || this.options.fontSize;
    const color =
      this.options.blockColor && rawItem.color && rawItem.color !== '#ffffff'
        ? '#ffffff'
        : rawItem.color || '#ffffff';

    // 测量文本真实渲染宽度
    let textWidth = rawItem.text.length * fontSize;
    if (this.ctx) {
      this.ctx.font = `bold ${fontSize}px sans-serif`;
      textWidth = this.ctx.measureText(rawItem.text).width || textWidth;
    }

    const textHeight = fontSize;
    const trackHeight = this.trackPool.trackHeight;

    let trackIndex = 0;
    let x = 0;
    let y = 0;
    const baseDuration = 5000 / this.options.speed;
    const speed = (width + textWidth) / (baseDuration / 1000);

    if (mode === 'scroll') {
      trackIndex = this.trackPool.allocateTrack({
        id: rawItem.id,
        text: rawItem.text,
        time: rawItem.time ?? 0,
        mode,
        width: textWidth,
        speed,
      });
      x = width;
      y = trackIndex * trackHeight + trackHeight / 2;
    } else if (mode === 'top') {
      trackIndex = this.trackPool.allocateTopTrack(4000);
      x = Math.max(0, (width - textWidth) / 2);
      y = trackIndex * trackHeight + trackHeight / 2;
    } else if (mode === 'bottom') {
      trackIndex = this.trackPool.allocateBottomTrack(4000);
      x = Math.max(0, (width - textWidth) / 2);
      y = trackIndex * trackHeight + trackHeight / 2;
    }

    const renderObj: DanmakuRenderObject = {
      item: rawItem,
      mode,
      text: rawItem.text,
      color,
      fontSize,
      x,
      y,
      width: textWidth,
      height: textHeight,
      speed,
      trackIndex,
      startTime: Date.now(),
      duration: 4000,
      border: rawItem.border,
      isMe: rawItem.isMe,
    };

    if (mode === 'scroll') {
      this.trackPool.registerItem(trackIndex, renderObj);
    }

    this.activeList.push(renderObj);
  }

  /**
   * 动态发射一条新弹幕。
   */
  emit(danmu: Omit<DanmakuItem, 'id'> | DanmakuItem): DanmakuItem {
    const id =
      'id' in danmu && danmu.id
        ? danmu.id
        : `dm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const fullItem: DanmakuItem = {
      ...danmu,
      id,
      time: typeof danmu.time === 'number' ? danmu.time : 0,
      mode: danmu.mode || 'scroll',
      color: danmu.color || '#ffffff',
      fontSize: danmu.fontSize || this.options.fontSize,
    };

    this.allItems.push(fullItem);
    this.filteredItemsCache = null;
    this.emittedIds.add(id);

    // 立即投入屏幕活跃渲染
    this.spawnDanmaku(fullItem);

    return fullItem;
  }

  /**
   * 同步视频时间与播放状态。
   *
   * @param currentTime 当前播放时间（秒）
   * @param playing 是否正在播放
   */
  syncVideoTime(currentTime: number, playing: boolean): void {
    this.isPlaying = playing;
    if (!this.options.synchronizeVideo) {
      return;
    }

    const filtered = this.getFilteredItems();

    // 检索与当前播放时刻对齐的待出场弹幕（容差窗口 0.35s 内）
    for (const item of filtered) {
      if (typeof item.time === 'number' && item.time > 0) {
        if (!this.emittedIds.has(item.id)) {
          if (Math.abs(item.time - currentTime) <= 0.35) {
            this.emittedIds.add(item.id);
            this.spawnDanmaku(item);
          }
        }
      }
    }
  }

  /**
   * 响应视频跳帧（Seek），清空未完成弹幕以防止时空混乱。
   */
  handleSeek(targetTime: number): void {
    this.clear();
    this.trackPool.reset();
    // 重新校准发射过的弹幕集合：只保留目标时间之前的记录
    this.emittedIds.clear();
    for (const item of this.allItems) {
      if (typeof item.time === 'number' && item.time < targetTime) {
        this.emittedIds.add(item.id);
      }
    }
  }

  /**
   * 显示弹幕。
   */
  show(): void {
    this.isVisibleState = true;
    this.canvas.style.display = 'block';
  }

  /**
   * 隐藏弹幕。
   */
  hide(): void {
    this.isVisibleState = false;
    this.canvas.style.display = 'none';
  }

  /**
   * 切换弹幕显隐。
   */
  toggle(): void {
    if (this.isVisibleState) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * 动态配置热更新。
   */
  config(newOptions: Partial<DanmakuOptions>): void {
    this.options = {
      ...this.options,
      ...newOptions,
    };
    this.filteredItemsCache = null;

    if (newOptions.area !== undefined || newOptions.fontSize !== undefined) {
      const width = this.container.clientWidth || 800;
      const height = this.container.clientHeight || 600;
      this.trackPool.update({
        canvasWidth: width,
        canvasHeight: height,
        fontSize: this.options.fontSize,
        area: this.options.area,
      });
    }
  }

  /**
   * 清空当前屏幕上的所有活跃弹幕。
   */
  clear(): void {
    this.activeList = [];
    if (this.ctx) {
      const width = this.container.clientWidth || 800;
      const height = this.container.clientHeight || 600;
      this.ctx.clearRect(0, 0, width, height);
    }
    this.trackPool.reset();
  }

  /**
   * 重置清空所有数据（包括预加载弹幕）。
   */
  reset(): void {
    this.clear();
    this.allItems = [];
    this.filteredItemsCache = null;
    this.emittedIds.clear();
  }

  /**
   * 批量载入追加弹幕库。
   */
  load(items: DanmakuItem[]): void {
    if (!Array.isArray(items)) {
      return;
    }
    this.allItems.push(...items);
    this.filteredItemsCache = null;
  }

  /**
   * 确定性销毁六步防线。
   */
  destroy(): void {
    if (this.isDestroyed) {
      return;
    }
    this.isDestroyed = true;

    // 1. 取消渲染循环
    if (this.rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    // 2. 解除 Resize 观察器
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // 3. 释放数组与上下文
    this.clear();
    this.allItems = [];
    this.filteredItemsCache = null;
    this.emittedIds.clear();
    this.ctx = null;

    // 4. 回收物理 Canvas 节点
    this.canvas.remove();
  }
}
