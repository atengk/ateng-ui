/**
 * @atengk/video-player-vue 核心强类型契约定义。
 *
 * 严格恪守 TypeScript 强类型闭环防线，零裸 any。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import type { ComponentPublicInstance, ComputedRef, MaybeRefOrGetter, Ref, ShallowRef } from 'vue';
import type { VideoSubtitleItem, VideoSubtitleStyle } from '../subtitles/types';

export type * from '../subtitles/types';

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
 * 进度条缩略图悬浮卡片配置契约（雪碧图切片或 WebVTT 格式）。
 */
export interface VideoThumbnailOptions {
  /**
   * 缩略图图片地址（雪碧图 URL 或 VTT 资源地址）。
   */
  url: string;
  /**
   * 雪碧图切片总图片数量（如 60 或 100）。
   */
  number?: number;
  /**
   * 雪碧图每行切片列数（如 10）。
   */
  column?: number;
  /**
   * 缩略图单帧宽度（像素）。默认 160。
   */
  width?: number;
  /**
   * 缩略图单帧高度（像素）。默认 90。
   */
  height?: number;
  /**
   * 缩略图放大缩放倍数。默认 1。
   */
  scale?: number;
}

/**
 * 本地播放历史记忆续播配置契约。
 */
export interface VideoPlaybackHistoryOptions {
  /**
   * 是否启用播放历史记忆续播。默认 false。
   */
  enabled?: boolean;
  /**
   * 自定义本地存储 Storage Key。默认按 `at_video_resume_${url}` 生成。
   */
  storageKey?: string;
  /**
   * 最小记忆与恢复时间阈值（秒）。播放进度小于该值时不予恢复，默认 5 秒。
   */
  minTime?: number;
  /**
   * 临近播放结束的时间阈值（秒）。剩余时长小于该值时不恢复，默认 5 秒。
   */
  maxTimeThreshold?: number;
  /**
   * 恢复历史进度后是否自动开始播放。默认 false。
   */
  autoPlay?: boolean;
  /**
   * 是否在播放器界面展示浮动提示卡片（如 "已恢复上次播放进度 01:23 [重新播放]"）。默认 true。
   */
  showPrompt?: boolean;
  /**
   * 浮动提示展示时长（毫秒）。默认 3000ms。
   */
  promptDuration?: number;
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
   * 关联的 AbortSignal 取消信号。
   */
  readonly abortSignal: AbortSignal;

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
   * 底层 HTMLVideoElement 媒体元素实例引用。
   */
  readonly videoElement: HTMLVideoElement | null;

  /**
   * 注册外部解复用器或插件的协同销毁钩子。
   *
   * @param hook 销毁回调函数
   */
  registerTeardownHook(hook: () => void): void;

  /**
   * 注册待受管回收的物理定时器。
   *
   * @param timer 定时器标识
   */
  registerTimer(timer: ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>): void;

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
   * 相对快进或快退指定时间步长（秒）。正数快进，负数快退。
   *
   * @param seconds 步进秒数
   */
  step(seconds: number): void;

  /**
   * 逐帧精确微调步进。
   *
   * @param frames 步进帧数（默认 1，正数向前，负数向后）
   * @param fps 视频估计帧率（默认 30 帧/秒）
   */
  stepFrame(frames?: number, fps?: number): void;

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
   * 是否展示截图按钮。默认 true。
   */
  screenshot?: boolean;
  /**
   * 是否为直播流（直播态隐藏点播进度条，展示实时直播标记）。默认 false。
   */
  isLive?: boolean;
  /**
   * 是否开启直播低延迟毫秒级追帧。默认 true。
   */
  liveBufferLatencyChasing?: boolean;
  /**
   * 直播追帧触发阈值（秒）。缓冲区落后超过此值触发追帧，默认 3。
   */
  chaseThreshold?: number;
  /**
   * 断流自动重连配置选项（设为 false 可显式关闭）。
   */
  reconnect?: boolean | StreamReconnectOptions;
  /**
   * 是否自动注入当前 Token 鉴权凭据。默认 true。
   */
  auth?: boolean;
  /**
   * 是否在播放前进行 Blob-JSON 双态安全嗅探。默认 false。
   */
  probeStream?: boolean;
  /**
   * 清晰度画质切换列表。
   */
  quality?: VideoQualityItem[];
  /**
   * 时间轴打点事件列表。
   */
  markers?: VideoMarkerItem[];
  /**
   * 进度条悬浮预览缩略图配置（雪碧图或 VTT 地址）。
   */
  thumbnails?: VideoThumbnailOptions;
  /**
   * 记忆续播配置（布尔值快捷开启或高级配置选项）。默认 false。
   */
  autoResume?: boolean | VideoPlaybackHistoryOptions;
  /**
   * 恢复历史记忆进度后是否自动播放。默认 false。
   */
  autoPlayResume?: boolean;
  /**
   * 自定义流媒体解封装加载器（扩展 SPI）。
   */
  customType?: Record<string, (video: HTMLVideoElement, url: string, art: unknown) => void>;
  /**
   * 多轨外挂字幕列表。
   */
  subtitles?: VideoSubtitleItem[];
  /**
   * 默认选中的字幕轨道 ID 或语言代码。
   */
  defaultSubtitle?: string;
  /**
   * 外挂字幕样式配置。
   */
  subtitleStyle?: VideoSubtitleStyle;
  /**
   * 注入的扩展插件函数列表（如弹幕插件）。
   */
  plugins?: Array<(art: unknown) => unknown>;
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
   * 是否为直播流（直播态隐藏点播进度条，展示实时直播标记）。默认 false。
   */
  isLive?: boolean;
  /**
   * 是否开启直播低延迟毫秒级追帧。默认 true。
   */
  liveBufferLatencyChasing?: boolean;
  /**
   * 直播追帧触发阈值（秒）。缓冲区落后超过此值触发追帧，默认 3。
   */
  chaseThreshold?: number;
  /**
   * 断流自动重连配置选项（设为 false 可显式关闭）。
   */
  reconnect?: boolean | StreamReconnectOptions;
  /**
   * 是否自动注入当前 Token 鉴权凭据。默认 true。
   */
  auth?: boolean;
  /**
   * 是否在播放前进行 Blob-JSON 双态安全嗅探。默认 false。
   */
  probeStream?: boolean;
  /**
   * 画质切换选项清单。
   */
  quality?: VideoQualityItem[];
  /**
   * 时间轴打点列表。
   */
  markers?: VideoMarkerItem[];
  /**
   * 进度条悬浮预览缩略图配置（雪碧图或 VTT 地址）。
   */
  thumbnails?: VideoThumbnailOptions;
  /**
   * 记忆续播配置（布尔值快捷开启或高级配置选项）。默认 false。
   */
  autoResume?: boolean | VideoPlaybackHistoryOptions;
  /**
   * 恢复历史记忆进度后是否自动播放。默认 false。
   */
  autoPlayResume?: boolean;
  /**
   * 自定义流媒体解复用器钩子（如 hls.js、mpegts.js 挂载）。
   */
  customType?: Record<string, (video: HTMLVideoElement, url: string, art: unknown) => void>;
  /**
   * 多轨外挂字幕列表。
   */
  subtitles?: VideoSubtitleItem[];
  /**
   * 默认选中的字幕轨道 ID 或语言代码。
   */
  defaultSubtitle?: string;
  /**
   * 外挂字幕样式配置。
   */
  subtitleStyle?: VideoSubtitleStyle;
  /**
   * 注入的扩展插件函数列表（如弹幕插件 createDanmakuPlugin）。
   */
  plugins?: Array<(art: unknown) => unknown>;
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
  /**
   * 记忆续播历史进度恢复事件。
   */
  (e: 'resume', time: number): void;
  /**
   * 时间轴事件打点标记点击跳帧事件。
   */
  (e: 'marker-click', marker: VideoMarkerItem): void;
  /**
   * 时间轴事件打点标记点击跳帧事件 (驼峰命名)。
   */
  (e: 'markerClick', marker: VideoMarkerItem): void;
  /**
   * 字幕轨道切换事件。
   */
  (e: 'subtitle-change', subtitle: VideoSubtitleItem | null): void;
  /**
   * 字幕轨道切换事件 (驼峰命名)。
   */
  (e: 'subtitleChange', subtitle: VideoSubtitleItem | null): void;
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
   * 相对快进或快退指定时间步长（秒）。正数快进，负数快退。
   *
   * @param seconds 步进秒数
   */
  step(seconds: number): void;

  /**
   * 逐帧精确微调步进。
   *
   * @param frames 步进帧数（默认 1，正数向前，负数向后）
   * @param fps 视频估计帧率（默认 30 帧/秒）
   */
  stepFrame(frames?: number, fps?: number): void;
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
  /**
   * 清除当前视频本地持久化的播放历史进度记录。
   */
  clearPlaybackHistory(): void;
  /**
   * 从头重新开始播放（跳转至第 0 秒并开始播放）。
   */
  replay(): Promise<void>;
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

    /**
     * 相对快进或快退指定时间步长（秒）。正数快进，负数快退。
     *
     * @param seconds 步进秒数
     */
    step(seconds: number): void;

    /**
     * 逐帧精确微调步进。
     *
     * @param frames 步进帧数（默认 1，正数向前，负数向后）
     * @param fps 视频估计帧率（默认 30 帧/秒）
     */
    stepFrame(frames?: number, fps?: number): void;
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
    retry(): void;
    clearPlaybackHistory(): void;
    replay(): Promise<void>;
  }
>;

/**
 * 流媒体断流重连状态机配置。
 */
export interface StreamReconnectOptions {
  /**
   * 最大重连尝试次数。超过后将转入硬失败态。默认 5 次。
   */
  maxRetries?: MaybeRefOrGetter<number>;
  /**
   * 基础重连延迟基数（毫秒）。默认 1000ms。
   */
  baseDelay?: MaybeRefOrGetter<number>;
  /**
   * 最大延迟上限封顶（毫秒）。默认 10000ms (10s)。
   */
  maxDelay?: MaybeRefOrGetter<number>;
  /**
   * 是否在重试间隔中引入轻微随机抖动因子 (Jitter) 以防网络惊群风暴。默认 true。
   */
  jitter?: boolean;
  /**
   * 单次重连动作触发回调。
   */
  onRetry?: (attempt: number, delay: number, error?: unknown) => void;
  /**
   * 重连达到最大限制依然失败时的终止回调。
   */
  onFail?: (error?: unknown) => void;
}

/**
 * useStreamReconnect 状态机对外暴露的响应式门面。
 */
export interface StreamReconnectReturn {
  /**
   * 当前是否正在执行重连等待或正在尝试连接中。
   */
  isReconnecting: Ref<boolean>;
  /**
   * 当前已经重连的尝试次数。
   */
  retryCount: Ref<number>;
  /**
   * 是否已达到最大重试次数并彻底失败。
   */
  hasFailed: Ref<boolean>;
  /**
   * 最近一次触发断流重连的异常上下文。
   */
  lastError: ShallowRef<unknown | null>;
  /**
   * 下一次重试的预计剩余等待时间（毫秒倒计时）。
   */
  remainingTime: Ref<number>;
  /**
   * 手动触发一次重连。
   *
   * @param err 异常上下文
   */
  triggerReconnect(err?: unknown): void;
  /**
   * 重置重试计数器与状态机。
   */
  reset(): void;
  /**
   * 手动强制立即重试（重置失败状态并即刻调度）。
   */
  manualRetry(): void;
}

/**
 * HlsDriver 流驱动初始化配置契约。
 */
export interface HlsDriverOptions {
  /**
   * 是否自动开始播放。默认 false。
   */
  autoplay?: boolean;
  /**
   * 是否注入鉴权 Token。默认 true。
   */
  auth?: boolean;
  /**
   * 自定义请求头。
   */
  headers?: Record<string, string>;
  /**
   * 是否开启低延迟追帧同步。默认 true。
   */
  liveSync?: boolean;
  /**
   * 异常回调。
   */
  onError?: (error: unknown) => void;
}

/**
 * MpegtsDriver 流驱动初始化配置契约。
 */
export interface MpegtsDriverOptions {
  /**
   * 是否为直播流。默认 true。
   */
  isLive?: boolean;
  /**
   * 是否跨域请求。默认 true。
   */
  cors?: boolean;
  /**
   * 是否自动开始播放。默认 false。
   */
  autoplay?: boolean;
  /**
   * 是否注入鉴权 Token。默认 true。
   */
  auth?: boolean;
  /**
   * 自定义请求头。
   */
  headers?: Record<string, string>;
  /**
   * 是否开启内存泄漏防御与自动清理 SourceBuffer。默认 true。
   */
  autoCleanupSourceBuffer?: boolean;
  /**
   * 是否开启毫秒级低延迟追帧（积压超阈值时加速或跳帧）。默认 true。
   */
  liveBufferLatencyChasing?: boolean;
  /**
   * 追帧触发阈值（秒）。默认 3。
   */
  chaseThreshold?: number;
  /**
   * 异常回调。
   */
  onError?: (error: unknown) => void;
}

/**
 * 水印篡改告警事件详情契约。
 */
export interface WatermarkTamperDetail {
  /**
   * 篡改类型：'style' (样式被篡改) 或 'removal' (节点被移出 DOM)。
   */
  type: 'style' | 'removal';
  /**
   * 篡改发生的时间戳。
   */
  timestamp: number;
}

/**
 * AtengVideoWatermark 组件 Props 契约。
 */
export interface VideoWatermarkProps {
  /**
   * 水印文本内容。若传入字符串数组，则按多行文本渲染。
   */
  content?: string | string[];
  /**
   * 水印字体大小（像素），默认 16。
   */
  fontSize?: number;
  /**
   * 水印字体族，默认 'sans-serif'。
   */
  fontFamily?: string;
  /**
   * 水印字体颜色（十六进制或 CSS 颜色串），默认 '#ffffff'。
   */
  color?: string;
  /**
   * 水印整体透明度（0.0 ~ 1.0），默认 0.15。
   */
  opacity?: number;
  /**
   * 水印倾斜旋转角度（度），默认 -22。
   */
  rotate?: number;
  /**
   * 水印单元水平间距（像素），默认 160。
   */
  gapX?: number;
  /**
   * 水印单元垂直间距（像素），默认 120。
   */
  gapY?: number;
  /**
   * 是否开启防审查与防删除篡改自愈（MutationObserver 监听）。默认 true。
   */
  tamperProof?: boolean;
  /**
   * 是否开启动态微位移浮动（对抗录屏去除算法）。默认 true。
   */
  floating?: boolean;
  /**
   * 动态微位移刷新间隔周期（毫秒）。默认 3000ms。
   */
  floatInterval?: number;
  /**
   * 动态微位移随机漂移幅度（像素）。默认 15px。
   */
  floatDistance?: number;
  /**
   * 水印层级 z-index。默认 30。
   */
  zIndex?: number;
}

/**
 * AtengVideoWatermark 组件 Emits 事件契约。
 */
export interface VideoWatermarkEmits {
  /**
   * 水印节点被修改或删除时触发的安全告警事件。
   */
  (e: 'watermark-tampered', details: WatermarkTamperDetail): void;
  /**
   * 水印节点被修改或删除时触发的安全告警事件 (驼峰命名)。
   */
  (e: 'watermarkTampered', details: WatermarkTamperDetail): void;
}

/**
 * AtengVideoWatermark 组件 Ref 实例类型。
 */
export type AtengVideoWatermarkInstance = ComponentPublicInstance<
  VideoWatermarkProps,
  {
    /**
     * 手动触发水印重绘刷新。
     */
    refresh(): void;
    /**
     * 手动销毁水印实例与防篡改监听器。
     */
    destroy(): void;
  }
>;

/**
 * 分屏矩阵支持的布局模式：
 * - '1x1': 单画面
 * - '2x2': 4分屏对称宫格
 * - '3x3': 9分屏对称宫格
 * - '4x4': 16分屏对称宫格
 * - '1+5': 6分屏广播级主从布局（1个大画面+5个小画面）
 * - '1+7': 8分屏广播级主从布局（1个大画面+7个小画面）
 */
export type VideoGridLayout = '1x1' | '2x2' | '3x3' | '4x4' | '1+5' | '1+7';

/**
 * 分屏矩阵视频通道模型契约。
 */
export interface VideoGridChannel {
  /**
   * 通道唯一标识。
   */
  id: string | number;
  /**
   * 通道名称或监控点位描述。
   */
  title?: string;
  /**
   * 主码流视频播放地址（高清/超清，如 1080P/4K）。
   */
  url: string;
  /**
   * 次码流视频播放地址（标清/流畅，如 360P/D1）。
   * 在多路小宫格模式下拉取以节约带宽，放大独占时自动切为主码流 url。
   */
  subUrl?: string;
  /**
   * 媒体流协议类型。
   */
  type?: VideoPlayerType;
  /**
   * 封面海报图地址。
   */
  poster?: string;
  /**
   * 是否为直播流。默认 true。
   */
  isLive?: boolean;
  /**
   * 是否注入 Token 鉴权凭据。默认 true。
   */
  auth?: boolean;
  /**
   * 用户显式配置的静音状态。
   */
  muted?: boolean;
}

/**
 * 经过状态机解析后当前视口正在展示的通道实体。
 */
export interface VideoGridDisplayItem extends VideoGridChannel {
  /**
   * 经过主次码流自适应决策后实际加载的流地址。
   */
  effectiveUrl: string;
  /**
   * 经过多路音频互斥算法决策后实际生效的静音状态。
   */
  isMuted: boolean;
  /**
   * 当前通道是否处于聚焦高亮态。
   */
  isActive: boolean;
  /**
   * 当前通道是否处于独占放大全屏态。
   */
  isMaximized: boolean;
}

/**
 * 自动轮巡调度器配置契约。
 */
export interface VideoGridTourOptions {
  /**
   * 轮巡单页驻留时间（毫秒）。默认 10000ms (10秒)。
   */
  interval?: number;
  /**
   * 参与自动轮巡的完整通道池。若未提供则使用当前状态机传入的 channels。
   */
  pool?: VideoGridChannel[];
  /**
   * 轮巡翻页触发时的回调函数。
   */
  onStep?: (pageIndex: number, currentChannels: VideoGridChannel[]) => void;
}

/**
 * useVideoGrid 无头状态机入参配置。
 */
export interface UseVideoGridOptions {
  /**
   * 初始通道列表或通道池。
   */
  channels?: MaybeRefOrGetter<VideoGridChannel[]>;
  /**
   * 初始布局模式。默认 '2x2'。
   */
  layout?: MaybeRefOrGetter<VideoGridLayout | undefined>;
  /**
   * 默认聚焦选中的通道 ID。
   */
  activeId?: MaybeRefOrGetter<string | number | null | undefined>;
  /**
   * 是否开启主次码流动态自适应切换。默认 true。
   */
  autoSubStream?: MaybeRefOrGetter<boolean | undefined>;
  /**
   * 是否开启多路音频互斥不变量（仅当前激活路出声，其余强制静音）。默认 true。
   */
  audioExclusive?: MaybeRefOrGetter<boolean | undefined>;
}

/**
 * useVideoGrid 无头状态机返回的响应式状态与调度指令门面。
 */
export interface UseVideoGridReturn {
  /**
   * 当前通道全量列表。
   */
  channels: Ref<VideoGridChannel[]>;
  /**
   * 当前聚焦激活选中的通道 ID。
   */
  activeChannelId: Ref<string | number | null>;
  /**
   * 当前网格布局模式。
   */
  layout: Ref<VideoGridLayout>;
  /**
   * 当前独占全屏放大的通道 ID（null 表示正常网格展示）。
   */
  maximizedChannelId: Ref<string | number | null>;
  /**
   * 是否处于自动轮巡调度状态。
   */
  isTouring: Ref<boolean>;
  /**
   * 当前轮巡批次/页码索引（0 起始）。
   */
  tourPageIndex: Ref<number>;
  /**
   * 当前网格布局最大可容纳的路数容量。
   */
  capacity: ComputedRef<number>;
  /**
   * 经过布局裁剪、主次码流自适应与音频互斥计算后，实际渲染的通道视图列表。
   */
  displayedChannels: ComputedRef<VideoGridDisplayItem[]>;

  /**
   * 聚焦选中指定通道。
   */
  selectChannel(id: string | number): void;
  /**
   * 切换通道的独占放大与宫格还原。
   */
  toggleMaximize(id?: string | number): void;
  /**
   * 退出独占放大，平滑恢复原有宫格。
   */
  restoreGrid(): void;
  /**
   * 切换分屏布局模式。
   */
  setLayout(layout: VideoGridLayout): void;
  /**
   * 启动自动轮巡调度器。
   */
  startTour(options?: VideoGridTourOptions): void;
  /**
   * 停止自动轮巡调度器。
   */
  stopTour(): void;
  /**
   * 立即调度至下一批轮巡通道。
   */
  nextTourPage(): void;
  /**
   * 立即调度至上一批轮巡通道。
   */
  prevTourPage(): void;
}

/**
 * AtengVideoGrid 组件 Props 契约。
 */
export interface VideoGridProps {
  /**
   * 通道列表。
   */
  channels: VideoGridChannel[];
  /**
   * 布局模式。默认 '2x2'。
   */
  layout?: VideoGridLayout;
  /**
   * 当前聚焦选中的通道 ID。
   */
  activeId?: string | number | null;
  /**
   * 是否开启主次码流自适应切换（宫格取 subUrl，放大取 url）。默认 true。
   */
  autoSubStream?: boolean;
  /**
   * 是否开启多路音频互斥（仅当前聚焦激活路出声）。默认 true。
   */
  audioExclusive?: boolean;
  /**
   * 通道聚焦激活时的高亮边框颜色。默认 '#38bdf8'。
   */
  themeColor?: string;
  /**
   * 通道之间的网格间距（像素）。默认 4。
   */
  gap?: number;
}

/**
 * AtengVideoGrid 组件 Emits 事件契约。
 */
export interface VideoGridEmits {
  /**
   * 通道被点击选中聚焦事件。
   */
  (e: 'channel-select', channel: VideoGridChannel): void;
  /**
   * 通道被点击选中聚焦事件 (驼峰命名)。
   */
  (e: 'channelSelect', channel: VideoGridChannel): void;
  /**
   * 通道被双击独占放大事件。
   */
  (e: 'channel-maximize', channel: VideoGridChannel): void;
  /**
   * 通道被双击独占放大事件 (驼峰命名)。
   */
  (e: 'channelMaximize', channel: VideoGridChannel): void;
  /**
   * 退出独占放大平滑恢复宫格事件。
   */
  (e: 'channel-restore'): void;
  /**
   * 退出独占放大平滑恢复宫格事件 (驼峰命名)。
   */
  (e: 'channelRestore'): void;
  /**
   * 分屏布局切换事件。
   */
  (e: 'layout-change', layout: VideoGridLayout): void;
  /**
   * 分屏布局切换事件 (驼峰命名)。
   */
  (e: 'layoutChange', layout: VideoGridLayout): void;
  /**
   * 轮巡调度器启停状态变更事件。
   */
  (e: 'tour-change', isTouring: boolean): void;
}

/**
 * AtengVideoGrid 组件 Ref 实例类型。
 */
export type AtengVideoGridInstance = ComponentPublicInstance<
  VideoGridProps,
  {
    /**
     * 当前状态机门面。
     */
    gridState: UseVideoGridReturn;
    selectChannel(id: string | number): void;
    toggleMaximize(id?: string | number): void;
    restoreGrid(): void;
    setLayout(layout: VideoGridLayout): void;
    startTour(options?: VideoGridTourOptions): void;
    stopTour(): void;
    nextTourPage(): void;
    prevTourPage(): void;
  }
>;

/**
 * 云台动作指令枚举类型。
 */
export type PtzAction =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'up-left'
  | 'up-right'
  | 'down-left'
  | 'down-right'
  | 'zoom-in'
  | 'zoom-out'
  | 'focus-in'
  | 'focus-out'
  | 'iris-in'
  | 'iris-out'
  | 'stop'
  | 'preset-goto'
  | 'preset-set'
  | 'preset-delete';

/**
 * 语义化云台控制指令载荷契约（与底层具体网络协议 100% 解耦）。
 */
export interface PtzCommand {
  /**
   * 云台动作指令。
   */
  action: PtzAction;
  /**
   * 调控步进速度（通常 1~10 或 1~255）。
   */
  speed?: number;
  /**
   * 目标预置位编号索引。
   */
  presetIndex?: number;
  /**
   * 预置位显示别名。
   */
  presetName?: string;
  /**
   * 指令触发时间戳（毫秒）。
   */
  timestamp?: number;
  /**
   * 自定义扩展协议载荷（如 GB28181/ONVIF 通道 ID、设备编码等）。
   */
  payload?: Record<string, unknown>;
}

/**
 * 云台预置位项数据契约。
 */
export interface PtzPresetItem {
  /**
   * 预置位编号（1 起始）。
   */
  index: number;
  /**
   * 预置位自定义标题（如 '东大门全景'、'车牌卡口'）。
   */
  name: string;
}

/**
 * AtengPtzControl 组件 Props 契约。
 */
export interface PtzControlProps {
  /**
   * 当前云台步进调速档位（默认 5）。
   */
  speed?: number;
  /**
   * 最小调速档位（默认 1）。
   */
  minSpeed?: number;
  /**
   * 最大调速档位（默认 10）。
   */
  maxSpeed?: number;
  /**
   * 云台预置位列表。
   */
  presets?: PtzPresetItem[];
  /**
   * 是否整体禁用云台控制。
   */
  disabled?: boolean;
  /**
   * 是否展示预置位管理与快捷调用面板（默认 true）。
   */
  showPresets?: boolean;
  /**
   * 是否展示云台速度滑块调节（默认 true）。
   */
  showSpeed?: boolean;
  /**
   * 是否展示光学调节按键（变焦 Zoom、变倍 Focus、光圈 Iris，默认 true）。
   */
  showOptical?: boolean;
  /**
   * 罗盘与高亮主题色（默认 '#38bdf8'）。
   */
  themeColor?: string;
}

/**
 * AtengPtzControl 组件 Emits 事件契约。
 */
export interface PtzControlEmits {
  /**
   * 派发语义化云台动作指令（转动、缩放、聚焦、光圈、预置位等）。
   */
  (e: 'command', cmd: PtzCommand): void;
  /**
   * 云台调速档位变更事件。
   */
  (e: 'speed-change', speed: number): void;
  /**
   * 双向绑定云台调速档位。
   */
  (e: 'update:speed', speed: number): void;
  /**
   * 新增/保存当前点位预置位。
   */
  (e: 'preset-add', preset: PtzPresetItem): void;
  /**
   * 删除指定预置位。
   */
  (e: 'preset-delete', index: number): void;
}

/**
 * useDigitalZoom 电子放大状态机配置选项。
 */
export interface DigitalZoomOptions {
  /**
   * 初始缩放倍率（默认 1.0）。
   */
  initialScale?: number;
  /**
   * 最小允许缩放倍率（默认 1.0）。
   */
  minScale?: number;
  /**
   * 最大允许缩放倍率（默认 5.0）。
   */
  maxScale?: number;
  /**
   * 每次滚轮或调用 zoomIn/Out 的步进增量（默认 0.25）。
   */
  step?: number;
  /**
   * 挂载平移拖拽与缩放的容器节点引用（可选）。
   */
  containerRef?: MaybeRefOrGetter<HTMLElement | null>;
  /**
   * 缩放或偏移变化回调。
   */
  onZoomChange?: (scale: number, offset: { x: number; y: number }) => void;
}

/**
 * useDigitalZoom 电子放大状态机返回值契约。
 */
export interface UseDigitalZoomReturn {
  /**
   * 当前电子放大倍率（1.0 ~ 5.0）。
   */
  scale: Ref<number>;
  /**
   * X 轴平移偏移量（px）。
   */
  offsetX: Ref<number>;
  /**
   * Y 轴平移偏移量（px）。
   */
  offsetY: Ref<number>;
  /**
   * 当前是否处于鼠标按住拖拽平移状态。
   */
  isDragging: Ref<boolean>;
  /**
   * 计算得出的硬件加速 CSS Transform 样式对象。
   */
  transformStyle: ComputedRef<Record<string, string>>;
  /**
   * 电子放大放大步进。
   */
  zoomIn(delta?: number): void;
  /**
   * 电子放大缩小步进。
   */
  zoomOut(delta?: number): void;
  /**
   * 重置电子放大至 1.0x 原始居中视角。
   */
  resetZoom(): void;
  /**
   * 直接设置目标缩放倍率与焦点中心。
   */
  setZoom(scale: number, origin?: { x: number; y: number }): void;
  /**
   * 设置平移偏移量（内部自动执行边界防脱框阻尼）。
   */
  setOffset(x: number, y: number): void;
  /**
   * 鼠标滚轮缩放事件处理器。
   */
  handleWheel(event: WheelEvent): void;
  /**
   * 鼠标拖拽平移按下事件处理器。
   */
  startDrag(event: MouseEvent): void;
}

/**
 * usePtzGesture 画面手势联动配置契约。
 */
export interface PtzGestureOptions {
  /**
   * 拖拽位移触发云台转动的最小像素门限（默认 15px）。
   */
  threshold?: number;
  /**
   * 当前云台移动步进速度（默认 5）。
   */
  speed?: MaybeRefOrGetter<number>;
  /**
   * 云台语义化指令派发回调。
   */
  onCommand?: (cmd: PtzCommand) => void;
}

/**
 * usePtzGesture 画面手势联动状态机返回值契约。
 */
export interface UsePtzGestureReturn {
  /**
   * 是否正在通过手势与云台交互。
   */
  isInteracting: Ref<boolean>;
  /**
   * 当前手势驱动的动作指令（无交互时为 null）。
   */
  activeAction: Ref<PtzAction | null>;
  /**
   * 鼠标按下事件处理器。
   */
  handleMouseDown(event: MouseEvent): void;
  /**
   * 鼠标移动事件处理器。
   */
  handleMouseMove(event: MouseEvent): void;
  /**
   * 鼠标抬起/离开事件处理器。
   */
  handleMouseUp(event?: MouseEvent): void;
  /**
   * 滚轮手势调焦事件处理器。
   */
  handleWheel(event: WheelEvent): void;
}

/**
 * AtengPtzControl 组件 Ref 实例类型。
 */
export type AtengPtzControlInstance = ComponentPublicInstance<
  PtzControlProps,
  {
    sendCommand(action: PtzAction, extra?: Partial<PtzCommand>): void;
    setSpeed(speed: number): void;
  }
>;
