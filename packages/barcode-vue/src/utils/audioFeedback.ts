/**
 * @atengk/barcode-vue Web Audio 原生蜂鸣音与设备震动发生器。
 *
 * 依据 ADR-0047，纯 Web 原生 API 动态合成短促清脆的工业扫码“滴”声（880Hz / 120ms），
 * 零外部 MP3/WAV 静态资产依赖，确保离线与内网环境下 100% 可用；协同设备触觉震动反馈。
 *
 * @author Ateng
 * @since 2026-11-10
 */

export interface BeepOptions {
  /** 蜂鸣频率 (Hz)，默认 880 (标准 A5 高音) */
  frequency?: number;
  /** 蜂鸣持续时长 (毫秒)，默认 120 */
  durationMs?: number;
  /** 音量增益倍率 (0.0 ~ 1.0)，默认 0.15 柔和不刺耳 */
  gain?: number;
}

export interface FeedbackOptions {
  /** 是否启用音频蜂鸣反馈，默认 true */
  sound?: boolean;
  /** 是否启用触觉震动反馈，默认 true */
  vibrate?: boolean;
  /** 蜂鸣参数配置 */
  beepOptions?: BeepOptions;
  /** 震动毫秒时长或模式数组，默认 80ms */
  vibratePattern?: number | number[];
}

/** 内部单例 AudioContext 缓存 */
let globalAudioContext: unknown = null;
let mockAudioContextInstance: unknown = null;

/**
 * 注入测试用 AudioContext Mock 桩。
 *
 * @param mockCtx 模拟的 AudioContext 对象
 */
export function setAudioContextMock(mockCtx: unknown): void {
  mockAudioContextInstance = mockCtx;
}

/**
 * 重置 AudioContext Mock 桩。
 */
export function resetAudioContextMock(): void {
  mockAudioContextInstance = null;
  globalAudioContext = null;
}

/**
 * 获取或懒加载单例 AudioContext。
 */
function getAudioContext(): unknown {
  if (mockAudioContextInstance) {
    return mockAudioContextInstance;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  if (!globalAudioContext) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (AudioContextClass) {
      try {
        globalAudioContext = new AudioContextClass();
      } catch {
        globalAudioContext = null;
      }
    }
  }

  return globalAudioContext;
}

/**
 * 播放清脆短促的条码识别成功蜂鸣声。
 *
 * @param options 蜂鸣频率与时长参数
 */
export function playScanBeep(options?: BeepOptions): void {
  const ctx = getAudioContext() as {
    state?: string;
    currentTime: number;
    destination: unknown;
    createOscillator: () => {
      type: string;
      frequency: { setValueAtTime: (freq: number, time: number) => void };
      connect: (target: unknown) => void;
      start: (time: number) => void;
      stop: (time: number) => void;
    };
    createGain: () => {
      gain: {
        setValueAtTime: (val: number, time: number) => void;
        exponentialRampToValueAtTime: (val: number, time: number) => void;
      };
      connect: (target: unknown) => void;
    };
    resume?: () => Promise<void>;
  } | null;

  if (!ctx) {
    return;
  }

  try {
    // 若浏览器策略将上下文置于挂起状态，尝试自动唤醒
    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      ctx.resume().catch(() => {});
    }

    const freq = options?.frequency ?? 880;
    const duration = (options?.durationMs ?? 120) / 1000;
    const maxGain = options?.gain ?? 0.15;
    const now = ctx.currentTime;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, now);

    // 设置指数衰减包络，避免音频爆音
    gainNode.gain.setValueAtTime(maxGain, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + duration);
  } catch {
    // 捕获不可预测的宿主音频通道异常，静默处理不抛出
  }
}

/**
 * 触发物理设备的触觉震动反馈。
 *
 * @param pattern 震动时长 (ms) 或时间序列数组，默认 80ms
 */
export function triggerVibrate(pattern: number | number[] = 80): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
    } catch {
      // 容错吸收部分宿主 WebView 权限拦截
    }
  }
}

/**
 * 联合派发扫码成功的声音蜂鸣与触觉震动双重反馈。
 *
 * @param options 反馈控制选项
 */
export function playSuccessFeedback(options?: FeedbackOptions): void {
  const shouldSound = options?.sound ?? true;
  const shouldVibrate = options?.vibrate ?? true;

  if (shouldSound) {
    playScanBeep(options?.beepOptions);
  }

  if (shouldVibrate) {
    triggerVibrate(options?.vibratePattern ?? 80);
  }
}
