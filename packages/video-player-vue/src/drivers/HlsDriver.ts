/**
 * HlsDriver: 工业级 HLS (.m3u8) 流媒体播放驱动器。
 *
 * 核心能力：
 * 1. 基于 hls.js 深度定制，支持 ABR 码率自适应切换；
 * 2. 鉴权双轨请求头自动注入 (xhrSetup 拦截器)；
 * 3. 苹果 Safari 等原生支持 HLS 宿主环境的零破坏平滑降级；
 * 4. 严密的生命周期销毁与 detachMedia 显式解绑。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import Hls, { type ErrorData, Events } from 'hls.js';
import { TokenInjector } from '../security';
import type { HlsDriverOptions } from '../types';

export class HlsDriver {
  private hls: Hls | null = null;
  private video: HTMLVideoElement | null = null;
  private isDestroyed = false;

  constructor(video: HTMLVideoElement, url: string, options: HlsDriverOptions = {}) {
    this.video = video;
    this.init(video, url, options);
  }

  /**
   * 初始化并装配 HLS 解封装器。
   */
  private init(video: HTMLVideoElement, url: string, options: HlsDriverOptions): void {
    const { autoplay = false, auth = true, headers = {}, liveSync = true, onError } = options;

    // 1. 若开启鉴权，为直链追加 URL Token 兜底
    const finalUrl = auth ? TokenInjector.injectUrl(url) : url;

    // 2. 检测浏览器是否支持 MSE Hls.js（兼容 ESM/CJS/Mock 双模）
    const isSupported =
      typeof Hls.isSupported === 'function'
        ? Hls.isSupported()
        : Boolean(
            (
              Hls as unknown as { default?: { isSupported?: () => boolean } }
            ).default?.isSupported?.(),
          );

    const HlsCtor =
      typeof Hls === 'function' ? Hls : (Hls as unknown as { default?: typeof Hls }).default;

    if (isSupported && HlsCtor) {
      const hlsConfig: Partial<ConstructorParameters<typeof Hls>[0]> = {
        enableWorker: true,
        lowLatencyMode: liveSync,
        liveSyncDurationCount: 3,
        xhrSetup: (xhr: XMLHttpRequest) => {
          if (auth) {
            TokenInjector.injectXhr(xhr);
          }
          for (const [key, val] of Object.entries(headers)) {
            if (val) {
              try {
                xhr.setRequestHeader(key, val);
              } catch {
                // 防御性忽略异常
              }
            }
          }
        },
      };

      const hls = new HlsCtor(hlsConfig);
      this.hls = hls;

      hls.attachMedia(video);

      hls.on(Events.MEDIA_ATTACHED, () => {
        if (!this.isDestroyed) {
          hls.loadSource(finalUrl);
        }
      });

      hls.on(
        Events.MANIFEST_PARSED,
        (
          _event: string,
          data: { levels?: Array<{ height: number; bitrate: number; name?: string }> },
        ) => {
          if (data?.levels && options.onLevels) {
            options.onLevels(data.levels);
          }
          if (autoplay && !this.isDestroyed) {
            void video.play().catch(() => {
              // 自动播放受浏览器策略阻止时静默处理
            });
          }
        },
      );

      hls.on(Events.ERROR, (_event: string, data: ErrorData) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // 网络层故障，尝试调用 startLoad 恢复
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              // 解码层故障，尝试恢复媒体管线
              hls.recoverMediaError();
              break;
            default:
              this.destroy();
              break;
          }
        }
        onError?.(data);
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // 3. Safari 原生 HLS 回退兜底（显式设置 playsinline 防止 iOS 强制全屏拦截）
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.src = finalUrl;
      if (autoplay) {
        void video.play().catch(() => {
          // 忽略自动播放策略限制
        });
      }
    } else {
      const errorMsg =
        '当前浏览器环境既不支持 MediaSource Extension (Hls.js)，亦不支持原生 HLS 播放';
      onError?.(new Error(errorMsg));
    }
  }

  /**
   * 获取底层原始 Hls 实例句柄。
   */
  get rawHls(): Hls | null {
    return this.hls;
  }

  /**
   * 获取可用画质档位列表。
   */
  get levels(): Array<unknown> {
    return this.hls?.levels ?? [];
  }

  /**
   * 手动切换当前播放画质档位 (-1 为启用 ABR 自动码率调节)。
   *
   * @param levelIndex 目标画质索引
   */
  setCurrentLevel(levelIndex: number): void {
    if (this.hls) {
      this.hls.currentLevel = levelIndex;
    }
  }

  /**
   * 确定性销毁当前 HLS 实例与媒体连接。
   */
  destroy(): void {
    if (this.isDestroyed) {
      return;
    }
    this.isDestroyed = true;

    if (this.hls) {
      try {
        this.hls.stopLoad();
        this.hls.detachMedia();
        this.hls.destroy();
      } catch {
        // 隔离第三方库销毁时的内部异常
      }
      this.hls = null;
    }

    if (this.video) {
      this.video = null;
    }
  }
}
