/**
 * @atengk/video-player-vue 弹幕轨道通道池与防碰撞/防重叠调度算法。
 *
 * 核心数学算法：
 * 1. 轨道高度与容量计算：trackHeight = fontSize * 1.4，totalTracks = floor((canvasHeight * area) / trackHeight)
 * 2. 尾部进屏防碰撞：前一条弹幕尾部必须先于新弹幕完全进入屏幕 (prev.x + prev.width < canvasWidth)
 * 3. 相对速度防追尾：当新弹幕速度大于前一条弹幕时，预测并规避屏幕视口内的追尾碰撞
 * 4. 广播级通道负载均衡：优先将新弹幕调度至可用空间最大、距离右边界最远的空闲轨道
 *
 * @author Ateng
 * @since 2026-10-26
 */

import type { DanmakuRenderObject } from './types';

export interface TrackPoolOptions {
  canvasWidth: number;
  canvasHeight: number;
  fontSize: number;
  area: number;
}

interface TrackOccupancy {
  /**
   * 轨道内最后一条弹幕引用。
   */
  lastItem: DanmakuRenderObject | null;
  /**
   * 静止弹幕（顶部/底部）占用解锁时间戳（毫秒）。
   */
  lockedUntil: number;
}

export class DanmakuTrackPool {
  private width: number;
  private height: number;
  private fontSize: number;
  private area: number;
  private tracks: TrackOccupancy[] = [];

  constructor(options: TrackPoolOptions) {
    this.width = Math.max(1, options.canvasWidth);
    this.height = Math.max(1, options.canvasHeight);
    this.fontSize = Math.max(12, options.fontSize);
    this.area = Math.min(1.0, Math.max(0.1, options.area));
    this.recalculateTracks();
  }

  /**
   * 单个轨道的行高（包含字号与字间距防溢出留白系数 1.4）。
   */
  get trackHeight(): number {
    return this.fontSize * 1.4;
  }

  /**
   * 当前可用总轨道通道数量。
   */
  get totalTracks(): number {
    return Math.max(1, Math.floor((this.height * this.area) / this.trackHeight));
  }

  /**
   * 重新计算轨道分布并保持轨道数组对齐。
   */
  private recalculateTracks(): void {
    const count = this.totalTracks;
    if (this.tracks.length === count) {
      return;
    }

    const next: TrackOccupancy[] = [];
    for (let i = 0; i < count; i++) {
      next.push(this.tracks[i] || { lastItem: null, lockedUntil: 0 });
    }
    this.tracks = next;
  }

  /**
   * 尺寸与参数更新。
   */
  update(options: Partial<TrackPoolOptions>): void {
    if (typeof options.canvasWidth === 'number' && options.canvasWidth > 0) {
      this.width = options.canvasWidth;
    }
    if (typeof options.canvasHeight === 'number' && options.canvasHeight > 0) {
      this.height = options.canvasHeight;
    }
    if (typeof options.fontSize === 'number' && options.fontSize > 0) {
      this.fontSize = options.fontSize;
    }
    if (typeof options.area === 'number' && options.area > 0) {
      this.area = Math.min(1.0, Math.max(0.1, options.area));
    }
    this.recalculateTracks();
  }

  /**
   * 为滚动弹幕分配最佳无碰撞轨道。
   *
   * @param candidate 待发射的弹幕元数据
   * @returns 匹配的轨道索引 (0 ~ totalTracks - 1)
   */
  allocateTrack(candidate: {
    id: string | number;
    text: string;
    time: number;
    mode?: string;
    width: number;
    speed: number;
  }): number {
    const total = this.totalTracks;
    const now = Date.now();
    const availableTracks: Array<{ index: number; margin: number }> = [];

    for (let i = 0; i < total; i++) {
      const track = this.tracks[i];
      if (!track) {
        continue;
      }

      // 1. 若当前轨道被静止弹幕锁定，不可用
      if (track.lockedUntil > now) {
        continue;
      }

      const prev = track.lastItem;
      // 2. 若轨道为空，属于完全可用轨道
      if (!prev) {
        availableTracks.push({ index: i, margin: this.width });
        continue;
      }

      // 3. 防碰撞条件 A：前一条弹幕尾部必须已完全进入屏幕
      const prevTail = prev.x + prev.width;
      if (prevTail >= this.width) {
        continue;
      }

      const margin = this.width - prevTail;

      // 4. 防碰撞条件 B：追尾预测
      // 若新弹幕速度更快，计算新弹幕头部在屏幕内是否会追上前一条弹幕尾部
      if (candidate.speed > prev.speed) {
        const speedDiff = candidate.speed - prev.speed;
        const timeToCatch = margin / speedDiff;
        const prevRemainingTime = prevTail / prev.speed;

        // 若追上时间小于前一条移出屏幕的时间，则在屏幕内会发生追尾碰撞
        if (timeToCatch < prevRemainingTime) {
          continue;
        }
      }

      availableTracks.push({ index: i, margin });
    }

    // 若存在安全轨道，优先选取空闲间隙 margin 最大的轨道以实现负载均衡
    if (availableTracks.length > 0) {
      availableTracks.sort((a, b) => b.margin - a.margin);
      return availableTracks[0]!.index;
    }

    // 若所有轨道在数学上都有碰撞风险，保底选择最旧一条或随机一条
    return Math.floor(Math.random() * total);
  }

  /**
   * 记录弹幕对象至轨道末尾。
   */
  registerItem(trackIndex: number, item: DanmakuRenderObject): void {
    const safeIndex = Math.max(0, Math.min(this.tracks.length - 1, trackIndex));
    const track = this.tracks[safeIndex];
    if (track) {
      track.lastItem = item;
    }
  }

  /**
   * 为顶部静止弹幕分配轨道（从上往下按优先级排列）。
   *
   * @param duration 展示时长（毫秒）
   */
  allocateTopTrack(duration = 4000): number {
    const total = this.totalTracks;
    const now = Date.now();

    for (let i = 0; i < total; i++) {
      const track = this.tracks[i];
      if (!track || track.lockedUntil <= now) {
        if (track) {
          track.lockedUntil = now + duration;
        }
        return i;
      }
    }

    // 全部轨道已满时，覆盖最靠顶部的轨道
    const fallbackTrack = this.tracks[0];
    if (fallbackTrack) {
      fallbackTrack.lockedUntil = now + duration;
    }
    return 0;
  }

  /**
   * 为底部静止弹幕分配轨道（从下往上按优先级排列）。
   *
   * @param duration 展示时长（毫秒）
   */
  allocateBottomTrack(duration = 4000): number {
    const total = this.totalTracks;
    const now = Date.now();

    for (let i = total - 1; i >= 0; i--) {
      const track = this.tracks[i];
      if (!track || track.lockedUntil <= now) {
        if (track) {
          track.lockedUntil = now + duration;
        }
        return i;
      }
    }

    // 全部轨道已满时，覆盖最底部的轨道
    const fallbackTrack = this.tracks[total - 1];
    if (fallbackTrack) {
      fallbackTrack.lockedUntil = now + duration;
    }
    return Math.max(0, total - 1);
  }

  /**
   * 清除所有轨道的占用与锁定状态。
   */
  reset(): void {
    for (const track of this.tracks) {
      track.lastItem = null;
      track.lockedUntil = 0;
    }
  }
}
