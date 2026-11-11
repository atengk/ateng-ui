/**
 * useMapTrack 轨迹回放状态机单元测试。
 *
 * 遵循工业级对抗性单测与 TDD 规范。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMapTrack } from '../src/composables/use-map-track';
import type { TrackPoint } from '../src/types';

describe('useMapTrack 轨迹回放状态机', () => {
  const mockTrackPoints: TrackPoint[] = [
    { coordinate: { lng: 116.4074, lat: 39.9042 }, timestamp: 0, speed: 40 },
    { coordinate: { lng: 116.4074, lat: 39.9142 }, timestamp: 1000, speed: 50 },
    {
      coordinate: { lng: 116.4174, lat: 39.9142 },
      timestamp: 2000,
      speed: 60,
      isStop: true,
      stopDuration: 30,
    },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('不足 2 个点时优雅保底，不可触发播放', () => {
    const { status, progress, play } = useMapTrack({
      trackPoints: () => [],
    });

    expect(status.value).toBe('idle');
    expect(progress.value).toBe(0);

    play();
    expect(status.value).toBe('idle');
  });

  it('正常初始化并能正确推导起始点位与航向角', () => {
    const { status, progress, currentCoordinate, currentHeading, currentIndex } = useMapTrack({
      trackPoints: () => mockTrackPoints,
    });

    expect(status.value).toBe('idle');
    expect(progress.value).toBe(0);
    expect(currentCoordinate.value?.lng).toBeCloseTo(116.4074);
    expect(currentCoordinate.value?.lat).toBeCloseTo(39.9042);
    // 从 (116.4074, 39.9042) 到 (116.4074, 39.9142) 为正北方向，航向角约为 0 度
    expect(currentHeading.value).toBeCloseTo(0, 1);
    expect(currentIndex.value).toBe(0);
  });

  it('支持手动 seek 跳转指定进度并计算准确的插值坐标与航向', () => {
    const onPointChange = vi.fn();
    const { progress, currentCoordinate, currentHeading, seek } = useMapTrack({
      trackPoints: () => mockTrackPoints,
      onPointChange,
    });

    // 跳转到 50% 进度 (位于第一段到第二段的折点附近)
    seek(0.5);
    expect(progress.value).toBe(0.5);
    expect(currentCoordinate.value).toBeDefined();
    expect(currentHeading.value).toBeGreaterThanOrEqual(0);
    expect(onPointChange).toHaveBeenCalled();

    // seek 到 1.0 (终点)
    seek(1.0);
    expect(progress.value).toBe(1.0);
    expect(currentCoordinate.value?.lng).toBeCloseTo(116.4174);
    expect(currentCoordinate.value?.lat).toBeCloseTo(39.9142);
  });

  it('支持播放、暂停、调速与重置控制', () => {
    const onStatusChange = vi.fn();
    const onFinish = vi.fn();

    const { status, speedRate, play, pause, stop, setSpeedRate } = useMapTrack({
      trackPoints: () => mockTrackPoints,
      onStatusChange,
      onFinish,
    });

    play();
    expect(status.value).toBe('playing');
    expect(onStatusChange).toHaveBeenCalledWith('playing');

    pause();
    expect(status.value).toBe('paused');
    expect(onStatusChange).toHaveBeenCalledWith('paused');

    setSpeedRate(2);
    expect(speedRate.value).toBe(2);

    stop();
    expect(status.value).toBe('idle');
  });

  it('自动播放至终点时触发 finish 回调，非 loop 模式下状态置为 finished', () => {
    const onFinish = vi.fn();
    let frameCallback: ((time: number) => void) | null = null;

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      frameCallback = cb;
      return 1;
    });

    const { status, progress, play } = useMapTrack({
      trackPoints: () => mockTrackPoints,
      onFinish,
      durationMs: 1000,
    });

    play();
    expect(status.value).toBe('playing');

    // 模拟时间推进
    if (frameCallback) {
      (frameCallback as (time: number) => void)(100);
      (frameCallback as (time: number) => void)(1200);
    }

    expect(progress.value).toBe(1);
    expect(status.value).toBe('finished');
    expect(onFinish).toHaveBeenCalled();
  });
});
