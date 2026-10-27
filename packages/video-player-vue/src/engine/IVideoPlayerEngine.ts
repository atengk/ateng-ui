/**
 * IVideoPlayerEngine: 底层播放驱动适配器抽象接口 (SPI)。
 *
 * 定义播放控制、生命周期管理与事件订阅的标准规范，屏蔽底层具体播放器内核实现。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import type { VideoPlayerType } from '../types';

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
   * 相对快进或快退指定秒数。
   *
   * @param seconds 步进秒数
   */
  step(seconds: number): void;

  /**
   * 逐帧微调步进。
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
