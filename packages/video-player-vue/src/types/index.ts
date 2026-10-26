/**
 * @atengk/video-player-vue 核心强类型契约定义。
 *
 * 严格恪守 TypeScript 强类型闭环防线，零裸 any。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import type { ComponentPublicInstance, MaybeRefOrGetter, Ref, ShallowRef } from 'vue';

/**
 * 视频播放流协议与媒体类型。
 */
export type VideoPlayerType = 'auto' | 'mp4' | 'webm' | 'ogg' | 'hls' | 'flv' | 'm3u8';

/**
 * 视频画质与清晰度选项契约。
 */
export interface VideoQualityItem {
  /**
   * 清晰度显示文案（如 '1080P 高清'、'720P 标清'）。
   */
  html: string;
  /**
   * 对应清晰度的媒体流播放地址。
   */
  url: string;
  /**
   * 是否作为默认选中的画质。
   */
  default?: boolean;
}

/**
 * 时间轴事件打点与关键帧标注项契约。
 */
export interface VideoMarkerItem {
  /**
   * 打点所处的时间戳（秒）。
   */
  time: number;
  /**
   * 悬浮展示的文本描述或事件标签。
   */
  text: string;
  /**
   * 进度条打点标记颜色（十六进制或 CSS 颜色串）。
   */
  color?: string;
}

/**
 * 底层播放驱动适配器抽象接口 (SPI)。
 *
 * 定义播放控制、生命周期管理与事件订阅的标准规范，屏蔽底层具体播放器内核实现。
 */
export interface IVideoPlayerEngine {
  /**
   * 底层真实播放器内核实例句柄。
   */
  readonly rawInstance: unknown;

  /**
   * 当前是否处于播放中状态。
   */
  readonly playing: boolean;

  /**
   * 当前播放时间进度（秒）。
   */
  readonly currentTime: number;

  /**
   * 媒体总时长（秒）。若为直播流通常为 0 或 Infinity。
   */
  readonly duration: number;

  /**
   * 当前音量（0.0 ~ 1.0）。
   */
  readonly volume: number;

  /**
   * 是否静音。
   */
  readonly muted: boolean;

  /**
   * 当前播放倍速（如 1.0、1.5、2.0）。
   */
  readonly playbackRate: number;

  /**
   * 开始播放。
   */
  play(): Promise<void>;

  /**
   * 暂停播放。
   */
  pause(): void;

  /**
   * 切换播放与暂停状态。
   */
  toggle(): void;

  /**
   * 跳转至指定时间戳（秒）。
   *
   * @param time 目标时间秒数
   */
  seek(time: number): void;

  /**
   * 调整音量。
   *
   * @param volume 音量值（0.0 ~ 1.0）
   */
  setVolume(volume: number): void;

  /**
   * 设置是否静音。
   *
   * @param muted 是否静音
   */
  setMuted(muted: boolean): void;

  /**
   * 调整播放倍速。
   *
   * @param rate 播放倍速
   */
  setPlaybackRate(rate: number): void;

  /**
   * 切换画质清晰度。
   *
   * @param url 目标清晰度流地址
   */
  switchQuality(url: string): Promise<void>;

  /**
   * 切换播放源地址与协议类型。
   *
   * @param url 新的媒体流地址
   * @param type 协议类型
   */
  switchUrl(url: string, type?: VideoPlayerType): Promise<void>;

  /**
   * 提取当前画面截图并返回 Base64 图片数据。
   */
  screenshot(): Promise<string>;

  /**
   * 进入原生全屏。
   */
  enterFullscreen(): void;

  /**
   * 退出原生全屏。
   */
  exitFullscreen(): void;

  /**
   * 切换原生全屏状态。
   */
  toggleFullscreen(): void;

  /**
   * 进入网页全屏（铺满浏览器视口）。
   */
  enterWebFullscreen(): void;

  /**
   * 退出网页全屏。
   */
  exitWebFullscreen(): void;

  /**
   * 切换网页全屏状态。
   */
  toggleWebFullscreen(): void;

  /**
   * 销毁播放器实例并确定性释放底层物理句柄与监听器。
   */
  destroy(): void;
}

/**
 * 单路视频播放器初始化配置契约。
 */
export interface VideoPlayerOptions {
  /**
   * 视频播放源地址。
   */
  url: string;
  /**
   * 媒体流协议类型，默认 'auto' 自动推断。
   */
  type?: VideoPlayerType;
  /**
   * 视频封面海报图片地址。
   */
  poster?: string;
  /**
   * 视频标题。
   */
  title?: string;
  /**
   * 是否自动播放。默认 false。
   */
  autoplay?: boolean;
  /**
   * 是否静音。默认 false。
   */
  muted?: boolean;
  /**
   * 是否循环播放。默认 false。
   */
  loop?: boolean;
  /**
   * 默认音量（0.0 ~ 1.0）。默认 0.7。
   */
  volume?: number;
  /**
   * 可选的倍速播放列表，默认 [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]。
   */
  playbackRates?: number[];
  /**
   * 是否开启画中画 (PiP) 按钮。默认 true。
   */
  pip?: boolean;
  /**
   * 是否开启原生全屏按钮。默认 true。
   */
  fullscreen?: boolean;
  /**
   * 是否开启网页全屏按钮。默认 true。
   */
  fullscreenWeb?: boolean;
  /**
   * 是否在控制栏隐藏时常驻底部微型进度条。默认 true。
   */
  miniProgressBar?: boolean;
  /**
   * 播放器主题高亮颜色（十六进制色值，默认 '#409EFF'）。
   */
  theme?: string;
  /**
   * 是否启用键盘全局快捷键（空格播放暂停、方向键快进音量等）。默认 true。
   */
  hotkey?: boolean;
  /**
   * 是否支持截图按钮。默认 true。
   */
  screenshot?: boolean;
  /**
   * 清晰度画质切换列表。
   */
  quality?: VideoQualityItem[];
  /**
   * 时间轴打点事件列表。
   */
  markers?: VideoMarkerItem[];
  /**
   * 自定义流媒体解封装加载器（扩展 SPI）。
   */
  customType?: Record<string, (video: HTMLVideoElement, url: string, art: unknown) => void>;
}

/**
 * AtengVideoPlayer 组件 Props 契约。
 */
export interface AtengVideoPlayerProps {
  /**
   * 视频媒体源地址。
   */
  url: string;
  /**
   * 媒体流协议类型，默认 'auto' 自动识别。
   */
  type?: VideoPlayerType;
  /**
   * 封面海报图地址。
   */
  poster?: string;
  /**
   * 视频标题。
   */
  title?: string;
  /**
   * 是否自动播放。默认 false。
   */
  autoplay?: boolean;
  /**
   * 是否静音播放。默认 false。
   */
  muted?: boolean;
  /**
   * 是否循环播放。默认 false。
   */
  loop?: boolean;
  /**
   * 默认初始音量（0.0 ~ 1.0）。默认 0.7。
   */
  volume?: number;
  /**
   * 可选倍速档位列表。
   */
  playbackRates?: number[];
  /**
   * 是否开启画中画控制入口。默认 true。
   */
  pip?: boolean;
  /**
   * 是否开启原生全屏按钮。默认 true。
   */
  fullscreen?: boolean;
  /**
   * 是否开启网页全屏按钮。默认 true。
   */
  fullscreenWeb?: boolean;
  /**
   * 是否在控制栏自动隐藏后常驻极简微进度条。默认 true。
   */
  miniProgressBar?: boolean;
  /**
   * 主题高亮主色调。
   */
  theme?: string;
  /**
   * 是否启用键盘快捷键。默认 true。
   */
  hotkey?: boolean;
  /**
   * 是否展示截图抓拍按钮。默认 true。
   */
  screenshot?: boolean;
  /**
   * 画质切换选项清单。
   */
  quality?: VideoQualityItem[];
  /**
   * 时间轴打点列表。
   */
  markers?: VideoMarkerItem[];
  /**
   * 自定义流媒体解复用器钩子（如 hls.js、mpegts.js 挂载）。
   */
  customType?: Record<string, (video: HTMLVideoElement, url: string, art: unknown) => void>;
}

/**
 * AtengVideoPlayer 组件 Emits 事件契约。
 */
export interface AtengVideoPlayerEmits {
  /**
   * 底层播放引擎就绪事件。
   */
  (e: 'ready', engine: IVideoPlayerEngine): void;
  /**
   * 视频开始播放事件。
   */
  (e: 'play'): void;
  /**
   * 视频暂停事件。
   */
  (e: 'pause'): void;
  /**
   * 时间进度更新事件。
   */
  (e: 'timeupdate', currentTime: number): void;
  /**
   * 播放完成到达末尾事件。
   */
  (e: 'ended'): void;
  /**
   * 播放异常错误事件。
   */
  (e: 'error', error: unknown): void;
  /**
   * 原生全屏状态变化事件。
   */
  (e: 'fullscreen', isFullscreen: boolean): void;
  /**
   * 网页全屏状态变化事件。
   */
  (e: 'fullscreenWeb', isFullscreenWeb: boolean): void;
}

/**
 * useVideoPlayer Hook 返回的响应式状态与指令门面契约。
 */
export interface UseVideoPlayerReturn {
  /**
   * 绑定的底层播放引擎抽象句柄。
   */
  engine: ShallowRef<IVideoPlayerEngine | null>;
  /**
   * 是否处于播放状态。
   */
  playing: Ref<boolean>;
  /**
   * 当前播放时间进度（秒）。
   */
  currentTime: Ref<number>;
  /**
   * 媒体总时长（秒）。
   */
  duration: Ref<number>;
  /**
   * 当前音量（0.0 ~ 1.0）。
   */
  volume: Ref<number>;
  /**
   * 是否静音。
   */
  muted: Ref<boolean>;
  /**
   * 当前播放倍速。
   */
  playbackRate: Ref<number>;
  /**
   * 是否处于原生全屏状态。
   */
  fullscreen: Ref<boolean>;
  /**
   * 是否处于网页全屏状态。
   */
  fullscreenWeb: Ref<boolean>;
  /**
   * 是否处于画中画状态。
   */
  pip: Ref<boolean>;
  /**
   * 当前已缓冲时间范围百分比（0.0 ~ 1.0）。
   */
  buffered: Ref<number>;
  /**
   * 视频是否正在加载缓冲。
   */
  loading: Ref<boolean>;
  /**
   * 异常错误对象。
   */
  error: ShallowRef<unknown | null>;

  /**
   * 开始播放。
   */
  play(): Promise<void>;
  /**
   * 暂停播放。
   */
  pause(): void;
  /**
   * 切换播放与暂停。
   */
  toggle(): void;
  /**
   * 精准快进/快退到目标时间戳。
   */
  seek(time: number): void;
  /**
   * 调整音量。
   */
  setVolume(vol: number): void;
  /**
   * 设置是否静音。
   */
  setMuted(muted: boolean): void;
  /**
   * 设置播放倍速。
   */
  setPlaybackRate(rate: number): void;
  /**
   * 切换清晰度画质。
   */
  switchQuality(url: string): Promise<void>;
  /**
   * 切换视频播放地址。
   */
  switchUrl(url: string, type?: VideoPlayerType): Promise<void>;
  /**
   * 截取当前画面并返回 Base64 字符串。
   */
  screenshot(): Promise<string>;
  /**
   * 进入原生全屏。
   */
  enterFullscreen(): void;
  /**
   * 退出原生全屏。
   */
  exitFullscreen(): void;
  /**
   * 切换原生全屏。
   */
  toggleFullscreen(): void;
  /**
   * 进入网页全屏。
   */
  enterWebFullscreen(): void;
  /**
   * 退出网页全屏。
   */
  exitWebFullscreen(): void;
  /**
   * 切换网页全屏。
   */
  toggleWebFullscreen(): void;
  /**
   * 确定性销毁播放器并释放资源。
   */
  destroy(): void;
}

/**
 * useVideoPlayer Hook 入参配置契约。
 */
export interface UseVideoPlayerOptions extends VideoPlayerOptions {
  /**
   * 容器 DOM 元素或 Ref 句柄。
   */
  container?: MaybeRefOrGetter<HTMLElement | null | undefined>;
}

/**
 * AtengVideoPlayer 组件 Ref 实例类型。
 */
export type AtengVideoPlayerInstance = ComponentPublicInstance<
  AtengVideoPlayerProps,
  {
    engine: IVideoPlayerEngine | null;
    play(): Promise<void>;
    pause(): void;
    toggle(): void;
    seek(time: number): void;
    setVolume(vol: number): void;
    setMuted(muted: boolean): void;
    setPlaybackRate(rate: number): void;
    screenshot(): Promise<string>;
    enterFullscreen(): void;
    exitFullscreen(): void;
    toggleFullscreen(): void;
    enterWebFullscreen(): void;
    exitWebFullscreen(): void;
    toggleWebFullscreen(): void;
    destroy(): void;
  }
>;
