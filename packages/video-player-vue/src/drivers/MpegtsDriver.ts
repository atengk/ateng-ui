/**
 * MpegtsDriver: 工业级 HTTP-FLV / WebSocket-FLV 流媒体播放驱动器。
 *
 * 核心能力：
 * 1. 基于 mpegts.js（B站现代活跃分支）实现低延迟流解封装；
 * 2. 内存防爆防泄露：强制开启 autoCleanupSourceBuffer 与滑动时间窗清理；
 * 3. 毫秒级智能低延迟追帧（延迟超阈值时自动 1.25x 加速追赶或跳帧至最新关键帧）；
 * 4. 鉴权双轨请求头注入与防盗链 URL 动态装配；
 * 5. 严密的六步生命周期配合与定时器确定性注销。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import mpegts from 'mpegts.js';
import { TokenInjector } from '../security';
import type { MpegtsDriverOptions } from '../types';

export class MpegtsDriver {
  private player: mpegts.Player | null = null;
  private video: HTMLVideoElement | null = null;
  private chasingTimer: ReturnType<typeof setInterval> | null = null;
  private isDestroyed = false;
  private targetPlaybackRate = 1.0;
  private isChasing = false;

  constructor(video: HTMLVideoElement, url: string, options: MpegtsDriverOptions = {}) {
    this.video = video;
    this.init(video, url, options);
  }

  /**
   * 初始化并装配 mpegts 播放器实例。
   */
  private init(video: HTMLVideoElement, url: string, options: MpegtsDriverOptions): void {
    const {
      isLive = true,
      cors = true,
      autoplay = false,
      auth = true,
      headers = {},
      autoCleanupSourceBuffer = true,
      liveBufferLatencyChasing = true,
      chaseThreshold = 3,
      onError,
    } = options;

    // 0. 静默底层非受管控制台日志输出，异常统一收敛至标准因果异常体系 (Q3 A)
    const loggingControl =
      mpegts.LoggingControl ||
      (mpegts as unknown as { default?: { LoggingControl?: typeof mpegts.LoggingControl } }).default
        ?.LoggingControl;
    if (loggingControl) {
      loggingControl.enableAll = false;
      loggingControl.enableError = false;
      loggingControl.enableWarn = false;
      loggingControl.enableInfo = false;
      loggingControl.enableDebug = false;
    }

    // 1. 浏览器 MSE 兼容性校验（防御 ESM/CJS/Mock 双模导出互操作差异）
    const getFeatures =
      typeof mpegts.getFeatureList === 'function'
        ? mpegts.getFeatureList
        : (
            mpegts as unknown as {
              default?: { getFeatureList?: () => { mseLivePlayback: boolean } };
            }
          ).default?.getFeatureList;

    const featureList = getFeatures?.() || { mseLivePlayback: false };

    if (!featureList.mseLivePlayback) {
      const errorMsg = '当前浏览器环境不支持 MediaSource Extension 进行 FLV 实时解码播放';
      onError?.(new Error(errorMsg));
      return;
    }

    // 2. 注入 Token 双轨请求头与防盗链 URL 查询参数
    const finalHeaders = auth ? TokenInjector.injectHeaders(headers) : { ...headers };
    const finalUrl = auth ? TokenInjector.injectUrl(url) : url;

    // 3. 构建 mpegts 媒体源与安全防爆配置
    const mediaDataSource: mpegts.MediaDataSource = {
      type: 'flv',
      isLive,
      cors,
      url: finalUrl,
    };

    const config: mpegts.Config = {
      enableWorker: true,
      lazyLoad: false,
      // 工业级内存泄漏防线：开启 SourceBuffer 自动清理与滑动窗口
      autoCleanupSourceBuffer,
      autoCleanupMaxBackwardDuration: 60,
      autoCleanupMinBackwardDuration: 30,
      headers: finalHeaders,
    };

    const create =
      typeof mpegts.createPlayer === 'function'
        ? mpegts.createPlayer
        : (mpegts as unknown as { default?: { createPlayer?: typeof mpegts.createPlayer } }).default
            ?.createPlayer;

    if (!create) {
      onError?.(new Error('未检测到 mpegts.createPlayer 工厂方法'));
      return;
    }

    const player = create(mediaDataSource, config);
    this.player = player;

    player.attachMediaElement(video);
    player.load();

    if (autoplay) {
      try {
        const playPromise = player.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {
            // 自动播放受浏览器拦截时静默兜底
          });
        }
      } catch {
        // 防御性忽略异常
      }
    }

    // 4. 监听底层解封装与网络异常
    player.on(mpegts.Events.ERROR, (errorType: string, errorDetail: string, errorInfo: unknown) => {
      onError?.({ errorType, errorDetail, errorInfo });
    });

    // 5. 毫秒级低延迟追帧状态机（仅在直播态生效）
    if (isLive && liveBufferLatencyChasing) {
      this.targetPlaybackRate = video.playbackRate || 1.0;
      this.setupLatencyChasing(video, chaseThreshold);
    }
  }

  /**
   * 启动智能低延迟追帧监测机制。
   *
   * @param video 视频元素
   * @param threshold 判定为滞后的延迟门限秒数（默认 3s）
   */
  private setupLatencyChasing(video: HTMLVideoElement, threshold: number): void {
    this.chasingTimer = setInterval(() => {
      if (this.isDestroyed || !this.player || video.paused || video.ended) {
        return;
      }

      // 若当前未处于追帧加速期，动态感知并记忆用户主动设置的目标播放倍速
      if (!this.isChasing && video.playbackRate !== 1.25) {
        this.targetPlaybackRate = video.playbackRate || 1.0;
      }

      const buffered = video.buffered;
      if (!buffered || buffered.length === 0) {
        return;
      }

      const bufferEnd = buffered.end(buffered.length - 1);
      const currentTime = video.currentTime;
      const latency = bufferEnd - currentTime;

      // 若积压延迟超过 2 倍门限 (如 > 6s)，直接跳帧瞬移至最新关键帧
      if (latency > threshold * 2) {
        video.currentTime = Math.max(0, bufferEnd - 0.5);
        video.playbackRate = this.targetPlaybackRate;
        this.isChasing = false;
      } else if (latency > threshold) {
        // 若滞后处于 3~6s，温和升速至 1.25x 加速追赶
        this.isChasing = true;
        video.playbackRate = 1.25;
      } else if (latency <= 1.0 && this.isChasing) {
        // 追赶对齐至 1 秒以内，平稳恢复用户设定的目标播放倍速
        video.playbackRate = this.targetPlaybackRate;
        this.isChasing = false;
      }
    }, 1000);
  }

  /**
   * 获取底层原始 mpegts.Player 实例。
   */
  get rawPlayer(): mpegts.Player | null {
    return this.player;
  }

  /**
   * 确定性销毁 FLV 驱动器与解封装管道。
   */
  destroy(): void {
    if (this.isDestroyed) {
      return;
    }
    this.isDestroyed = true;

    // 1. 确定性清理追帧定时器
    if (this.chasingTimer !== null) {
      clearInterval(this.chasingTimer);
      this.chasingTimer = null;
    }

    // 2. 彻底拆解 mpegts 播放器与物理 Video 绑定
    if (this.player) {
      try {
        this.player.pause();
        this.player.unload();
        this.player.detachMediaElement();
        this.player.destroy();
      } catch {
        // 隔离第三方库销毁内部异常
      }
      this.player = null;
    }

    if (this.video) {
      this.video = null;
    }
  }
}
