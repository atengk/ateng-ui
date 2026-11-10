/**
 * @atengk/barcode-vue ScannerAudioFeedback 单元测试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  playScanBeep,
  triggerVibrate,
  playSuccessFeedback,
  setAudioContextMock,
  resetAudioContextMock,
} from '../src/utils/audioFeedback';

describe('audioFeedback (Web Audio 蜂鸣声与设备震动)', () => {
  let mockOscillator: any;
  let mockGain: any;
  let mockAudioContext: any;

  beforeEach(() => {
    mockOscillator = {
      type: 'sine',
      frequency: {
        setValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };

    mockGain = {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };

    mockAudioContext = {
      state: 'running',
      currentTime: 10,
      destination: {},
      createOscillator: vi.fn().mockReturnValue(mockOscillator),
      createGain: vi.fn().mockReturnValue(mockGain),
      resume: vi.fn().mockResolvedValue(undefined),
    };

    setAudioContextMock(mockAudioContext);
  });

  afterEach(() => {
    resetAudioContextMock();
    vi.restoreAllMocks();
  });

  it('能够调用 Web Audio API 动态合成 880Hz 蜂鸣音频流', () => {
    playScanBeep({ frequency: 880, durationMs: 120 });

    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    expect(mockAudioContext.createGain).toHaveBeenCalled();
    expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(880, 10);
    expect(mockOscillator.start).toHaveBeenCalled();
    expect(mockOscillator.stop).toHaveBeenCalled();
  });

  it('在 AudioContext 挂起 (suspended) 时能自动尝试 resume', () => {
    mockAudioContext.state = 'suspended';
    playScanBeep();
    expect(mockAudioContext.resume).toHaveBeenCalled();
  });

  it('triggerVibrate 能够安全调用 navigator.vibrate', () => {
    const vibrateSpy = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateSpy,
      configurable: true,
      writable: true,
    });

    triggerVibrate(80);
    expect(vibrateSpy).toHaveBeenCalledWith(80);
  });

  it('playSuccessFeedback 能联合触发声音与震动', () => {
    const vibrateSpy = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateSpy,
      configurable: true,
      writable: true,
    });

    playSuccessFeedback({ sound: true, vibrate: true });

    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    expect(vibrateSpy).toHaveBeenCalled();
  });

  it('当 options.sound 为 false 时不触发声音', () => {
    playSuccessFeedback({ sound: false, vibrate: false });
    expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
  });
});
