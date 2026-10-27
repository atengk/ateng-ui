/**
 * 基于 Artplayer.js 封装的工业级播放引擎适配器。
 *
 * 实现了 IVideoPlayerEngine 接口，收敛事件监听、指令分发与确定性资源清理。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import Artplayer, { type Option } from 'artplayer';
import { defaultTokenInjector } from '../security';
import { HlsDriver } from '../drivers/HlsDriver';
import { MpegtsDriver } from '../drivers/MpegtsDriver';
import type {
  IVideoPlayerEngine,
  VideoMarkerItem,
  VideoPlayerOptions,
  VideoPlayerType,
} from '../types';

/**
 * 快捷键键码语义化常量定义。
 */
const KEY_CODE_F = '70';
const KEY_CODE_M = '77';
const KEY_CODE_LEFT_BRACKET = '219';
const KEY_CODE_RIGHT_BRACKET = '221';
const KEY_CODE_COMMA = '188';
const KEY_CODE_PERIOD = '190';

/**
 * 引擎事件监听回调集合。
 */
export interface PlayerEngineEventHandlers {
  onReady?: (engine: IVideoPlayerEngine) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
  onError?: (error: unknown) => void;
  onFullscreen?: (isFullscreen: boolean) => void;
  onFullscreenWeb?: (isFullscreenWeb: boolean) => void;
  onMarkerClick?: (marker: VideoMarkerItem) => void;
}

export class ArtplayerEngine implements IVideoPlayerEngine {
  private artInstance: Artplayer | null = null;
  private handlers: PlayerEngineEventHandlers;
  private isDestroyed = false;
  private abortController = new AbortController();
  private teardownHooks: Array<() => void> = [];
  private timers = new Set<ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>>();

  constructor(
    container: HTMLElement,
    options: VideoPlayerOptions,
    handlers: PlayerEngineEventHandlers = {},
  ) {
    this.handlers = handlers;
    this.initArtplayer(container, options);
  }

  /**
   * 初始化 Artplayer 底层内核。
   */
  private initArtplayer(container: HTMLElement, options: VideoPlayerOptions): void {
    // 映射时间轴打点配置至 Artplayer highlight
    const highlight = options.markers?.map(m => ({
      time: m.time,
      text: m.text,
    }));

    // 若开启鉴权且未显式关闭，为直链追加 Token 查询参数兜底
    const finalUrl =
      options.auth !== false ? defaultTokenInjector.injectUrl(options.url) : options.url;

    const artOptions: Record<string, unknown> = {
      container,
      url: finalUrl,
      poster: options.poster ?? '',
      title: options.title ?? '',
      autoplay: options.autoplay ?? false,
      muted: options.muted ?? false,
      loop: options.loop ?? false,
      volume: options.volume ?? 0.7,
      playbackRate: true,
      setting: true,
      hotkey: options.hotkey ?? true,
      pip: options.pip ?? true,
      fullscreen: options.fullscreen ?? true,
      fullscreenWeb: options.fullscreenWeb ?? true,
      miniProgressBar: options.miniProgressBar ?? true,
      theme: options.theme ?? '#409EFF',
      screenshot: options.screenshot ?? true,
      moreVideoAttr: {
        crossOrigin: 'anonymous',
      },
    };

    if (options.playbackRates && options.playbackRates.length > 0) {
      artOptions.playbackRates = options.playbackRates;
    }

    if (options.quality && options.quality.length > 0) {
      artOptions.quality = options.quality;
    }

    if (highlight && highlight.length > 0) {
      artOptions.highlight = highlight;
    }

    if (options.thumbnails && options.thumbnails.url) {
      artOptions.thumbnails = {
        url: options.thumbnails.url,
        number: options.thumbnails.number ?? 60,
        column: options.thumbnails.column ?? 10,
        width: options.thumbnails.width ?? 160,
        height: options.thumbnails.height ?? 90,
        scale: options.thumbnails.scale ?? 1,
      };
    }

    if (options.isLive) {
      artOptions.isLive = true;
    }

    // 默认内置 HLS 与 FLV 解封装驱动器，支持用户自定义 customType 扩展或覆盖
    const createHlsDriver = (video: HTMLVideoElement, url: string): void => {
      const driver = new HlsDriver(video, url, {
        autoplay: options.autoplay,
        auth: options.auth !== false,
        onError: err => this.handlers.onError?.(err),
      });
      this.registerTeardownHook(() => driver.destroy());
    };

    const defaultCustomType: Record<string, (video: HTMLVideoElement, url: string) => void> = {
      m3u8: createHlsDriver,
      hls: createHlsDriver,
      flv: (video: HTMLVideoElement, url: string) => {
        const driver = new MpegtsDriver(video, url, {
          isLive: options.isLive ?? true,
          autoplay: options.autoplay,
          auth: options.auth !== false,
          liveBufferLatencyChasing: options.liveBufferLatencyChasing !== false,
          chaseThreshold: options.chaseThreshold ?? 3,
          onError: err => this.handlers.onError?.(err),
        });
        this.registerTeardownHook(() => driver.destroy());
      },
    };

    artOptions.customType = {
      ...defaultCustomType,
      ...options.customType,
    };

    if (options.type && options.type !== 'auto') {
      artOptions.type = options.type;
    }

    if (options.plugins && options.plugins.length > 0) {
      artOptions.plugins = options.plugins;
    }

    // 实例化内核并挂载事件
    this.artInstance = new Artplayer(artOptions as unknown as Option);
    this.bindEvents();
    this.bindHotkeys(container, options);
    this.bindMarkers(container, options);
  }

  /**
   * 绑定键盘全局快捷键体系。
   */
  private bindHotkeys(container: HTMLElement, options: VideoPlayerOptions): void {
    if (options.hotkey === false || !this.artInstance) {
      return;
    }

    // 1. 为 Artplayer 内部快捷键字典注册扩展按键
    try {
      this.artInstance.hotkey.add(KEY_CODE_F, () => {
        // 'F' 键切换全屏
        this.toggleFullscreen();
      });
      this.artInstance.hotkey.add(KEY_CODE_M, () => {
        // 'M' 键切换静音
        this.setMuted(!this.muted);
      });
      this.artInstance.hotkey.add(KEY_CODE_LEFT_BRACKET, () => {
        // '[' 键后退单帧
        this.stepFrame(-1);
      });
      this.artInstance.hotkey.add(KEY_CODE_RIGHT_BRACKET, () => {
        // ']' 键前进单帧
        this.stepFrame(1);
      });
      this.artInstance.hotkey.add(KEY_CODE_COMMA, () => {
        // ',' 键后退单帧
        this.stepFrame(-1);
      });
      this.artInstance.hotkey.add(KEY_CODE_PERIOD, () => {
        // '.' 键前进单帧
        this.stepFrame(1);
      });
    } catch {
      // 容错处理
    }

    // 2. 容器级键盘事件监听（保障失焦或单测环境下能够精准触发）
    const handleKeyDown = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === ' ' || key === 'spacebar') {
        event.preventDefault();
        this.toggle();
      } else if (key === 'arrowleft') {
        event.preventDefault();
        this.step(-5);
      } else if (key === 'arrowright') {
        event.preventDefault();
        this.step(5);
      } else if (key === 'arrowup') {
        event.preventDefault();
        this.setVolume(this.volume + 0.1);
      } else if (key === 'arrowdown') {
        event.preventDefault();
        this.setVolume(this.volume - 0.1);
      } else if (key === 'f') {
        event.preventDefault();
        this.toggleFullscreen();
      } else if (key === 'm') {
        event.preventDefault();
        this.setMuted(!this.muted);
      } else if (key === '[' || key === ',') {
        event.preventDefault();
        this.stepFrame(-1);
      } else if (key === ']' || key === '.') {
        event.preventDefault();
        this.stepFrame(1);
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    this.registerTeardownHook(() => {
      container.removeEventListener('keydown', handleKeyDown);
    });
  }

  /**
   * 绑定时间轴打点高亮与点击跳帧监听。
   */
  private bindMarkers(container: HTMLElement, options: VideoPlayerOptions): void {
    if (!options.markers || options.markers.length === 0 || !this.artInstance) {
      return;
    }

    const markers = options.markers;

    // 监听时间轴打点元素点击实现精准跳帧跳转
    const handleMarkerClick = (event: MouseEvent): void => {
      const target = event.target as HTMLElement | null;
      const highlightEl = target?.closest(
        '.art-progress-highlight, .art-highlight',
      ) as HTMLElement | null;
      if (highlightEl) {
        const text =
          highlightEl.innerText?.trim() ||
          highlightEl.textContent?.trim() ||
          highlightEl.getAttribute('title')?.trim() ||
          '';
        const els = Array.from(
          container.querySelectorAll<HTMLElement>('.art-progress-highlight, .art-highlight'),
        );
        const idx = els.indexOf(highlightEl);
        const sortedMarkers = [...markers].sort((a, b) => a.time - b.time);
        const matched =
          (text ? markers.find(m => m.text && (m.text === text || text.includes(m.text))) : null) ??
          (idx >= 0 ? (sortedMarkers[idx] ?? markers[idx]) : null);
        if (matched) {
          this.seek(matched.time);
          this.handlers.onMarkerClick?.(matched);
        }
      }
    };

    container.addEventListener('click', handleMarkerClick);
    this.registerTeardownHook(() => {
      container.removeEventListener('click', handleMarkerClick);
    });

    // ready 时注入打点颜色定制（对齐内部时间升序排序与文本关联）
    this.artInstance.on('ready', () => {
      const sortedMarkers = [...markers].sort((a, b) => a.time - b.time);
      const els = container.querySelectorAll<HTMLElement>(
        '.art-progress-highlight, .art-highlight',
      );
      els.forEach((el, index) => {
        const text = el.innerText || el.getAttribute('title') || '';
        const m =
          sortedMarkers.find(item => item.text && item.text === text) ?? sortedMarkers[index];
        if (m?.color) {
          el.style.backgroundColor = m.color;
        }
      });
    });
  }

  /**
   * 绑定底层播放器事件流。
   */
  private bindEvents(): void {
    if (!this.artInstance) {
      return;
    }

    const art = this.artInstance;

    art.on('ready', () => {
      if (!this.isDestroyed) {
        this.handlers.onReady?.(this);
      }
    });

    art.on('play', () => {
      this.handlers.onPlay?.();
    });

    art.on('pause', () => {
      this.handlers.onPause?.();
    });

    art.on('video:timeupdate', () => {
      this.handlers.onTimeUpdate?.(this.currentTime);
    });

    art.on('video:ended', () => {
      this.handlers.onEnded?.();
    });

    art.on('error', (err: unknown) => {
      this.handlers.onError?.(err);
    });

    art.on('fullscreen', (state: boolean) => {
      this.handlers.onFullscreen?.(state);
    });

    art.on('fullscreenWeb', (state: boolean) => {
      this.handlers.onFullscreenWeb?.(state);
    });
  }

  get rawInstance(): Artplayer | null {
    return this.artInstance;
  }

  get abortSignal(): AbortSignal {
    return this.abortController.signal;
  }

  get playing(): boolean {
    return Boolean(this.artInstance?.playing);
  }

  get currentTime(): number {
    return this.artInstance?.currentTime ?? 0;
  }

  get duration(): number {
    return this.artInstance?.duration ?? 0;
  }

  get volume(): number {
    return this.artInstance?.volume ?? 0;
  }

  get muted(): boolean {
    return Boolean(this.artInstance?.muted);
  }

  get playbackRate(): number {
    return this.artInstance?.playbackRate ?? 1.0;
  }

  get videoElement(): HTMLVideoElement | null {
    return (this.artInstance?.template?.$video as HTMLVideoElement) || null;
  }

  registerTeardownHook(hook: () => void): void {
    this.teardownHooks.push(hook);
  }

  registerTimer(timer: ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>): void {
    this.timers.add(timer);
  }

  async play(): Promise<void> {
    if (this.artInstance) {
      await this.artInstance.play();
    }
  }

  pause(): void {
    this.artInstance?.pause();
  }

  toggle(): void {
    this.artInstance?.toggle();
  }

  seek(time: number): void {
    if (this.artInstance) {
      this.artInstance.seek = time;
    }
  }

  step(seconds: number): void {
    const current = this.currentTime;
    const target = Math.max(0, current + seconds);
    this.seek(target);
  }

  stepFrame(frames = 1, fps = 30): void {
    const frameRate = fps > 0 ? fps : 30;
    this.step(frames / frameRate);
  }

  setVolume(volume: number): void {
    if (this.artInstance) {
      this.artInstance.volume = Math.max(0, Math.min(1, volume));
    }
  }

  setMuted(muted: boolean): void {
    if (this.artInstance) {
      this.artInstance.muted = muted;
    }
  }

  setPlaybackRate(rate: number): void {
    if (this.artInstance) {
      this.artInstance.playbackRate = rate;
    }
  }

  async switchQuality(url: string): Promise<void> {
    if (this.artInstance) {
      await this.artInstance.switchQuality(url);
    }
  }

  async switchUrl(url: string, type?: VideoPlayerType): Promise<void> {
    if (this.artInstance) {
      if (type && type !== 'auto') {
        this.artInstance.type = type;
      }
      await this.artInstance.switchUrl(url);
    }
  }

  async screenshot(): Promise<string> {
    if (!this.artInstance) {
      return '';
    }
    try {
      const dataUrl = await this.artInstance.getDataURL();
      return dataUrl ?? '';
    } catch {
      // 跨域媒体源若未配置 CORS 标头，Canvas toDataURL 会被浏览器污染限制，进行安全降级保底
      return '';
    }
  }

  enterFullscreen(): void {
    if (this.artInstance) {
      this.artInstance.fullscreen = true;
    }
  }

  exitFullscreen(): void {
    if (this.artInstance) {
      this.artInstance.fullscreen = false;
    }
  }

  toggleFullscreen(): void {
    if (this.artInstance) {
      this.artInstance.fullscreen = !this.artInstance.fullscreen;
    }
  }

  enterWebFullscreen(): void {
    if (this.artInstance) {
      this.artInstance.fullscreenWeb = true;
    }
  }

  exitWebFullscreen(): void {
    if (this.artInstance) {
      this.artInstance.fullscreenWeb = false;
    }
  }

  toggleWebFullscreen(): void {
    if (this.artInstance) {
      this.artInstance.fullscreenWeb = !this.artInstance.fullscreenWeb;
    }
  }

  /**
   * 确定性销毁六步防线：
   * 1. 中断正在执行的所有网络请求与探测管道
   * 2. 触发外部解封装器与自定义扩展的协同注销钩子
   * 3. 释放与解绑 video.src / video.srcObject
   * 4. 调用 video.load() 强制触发 GPU / 硬件解码缓冲释放
   * 5. 清理所有已注册的重试与轮询定时器
   * 6. 销毁 Artplayer 实例并清空 DOM 容器
   */
  destroy(): void {
    if (this.isDestroyed) {
      return;
    }
    this.isDestroyed = true;

    // 1. 中断飞行中请求
    this.abortController.abort();

    // 2. 触发解封装器卸载钩子
    for (const hook of this.teardownHooks) {
      try {
        hook();
      } catch {
        // 隔离单个钩子异常
      }
    }
    this.teardownHooks = [];

    // 3. 释放与解绑 video.src / video.srcObject
    if (this.artInstance?.template?.$video) {
      const video = this.artInstance.template.$video as HTMLVideoElement;
      try {
        video.pause();
        video.removeAttribute('src');
        video.src = '';
      } catch {
        // 防御性忽略 DOM 异常
      }

      // 4. 调用 video.load() 强制触发 GPU / 硬件解码缓冲释放
      try {
        if (typeof video.load === 'function') {
          video.load();
        }
      } catch {
        // 防御性忽略 DOM 异常
      }
    }

    // 5. 注销所有受管定时器
    for (const timer of this.timers) {
      clearTimeout(timer);
      clearInterval(timer);
    }
    this.timers.clear();

    // 6. 彻底销毁 Artplayer
    if (this.artInstance) {
      try {
        this.artInstance.destroy(true);
      } catch {
        // 防御性忽略销毁期间的异常
      }
      this.artInstance = null;
    }
  }
}
