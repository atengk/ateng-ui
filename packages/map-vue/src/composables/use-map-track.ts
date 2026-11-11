/**
 * useMapTrack 轨迹平滑动态回放无头响应式状态机。
 *
 * 遵循 ADR-0002、ADR-0009、ADR-0013 与 ADR-0051 规范，
 * 封装 requestAnimationFrame 亚像素平滑插帧、航向角推导转向与倍速时序控制。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import {
  ref,
  computed,
  watch,
  onScopeDispose,
  getCurrentScope,
  toValue,
  type MaybeRefOrGetter,
} from 'vue';
import type { MapCoordinate, TrackPlaybackStatus, TrackPoint } from '../types';
import { GeoMath } from '../engines/geo-math';

export interface UseMapTrackOptions {
  /** 轨迹节点数组 (支持 MaybeRefOrGetter 动态响应) */
  trackPoints: MaybeRefOrGetter<TrackPoint[]>;
  /** 初始倍速 (默认 1) */
  speedRate?: MaybeRefOrGetter<number>;
  /** 初始进度 (0 ~ 1，默认 0) */
  initialProgress?: MaybeRefOrGetter<number>;
  /** 总播放基础耗时 (毫秒，默认 10000 即 10 秒) */
  durationMs?: number;
  /** 是否循环播放 (默认 false) */
  loop?: MaybeRefOrGetter<boolean>;
  /** 播放状态变化事件 */
  onStatusChange?: (status: TrackPlaybackStatus) => void;
  /** 进度变化事件 */
  onProgressChange?: (progress: number) => void;
  /** 当前点位与航向变化事件 */
  onPointChange?: (payload: {
    point: TrackPoint;
    index: number;
    coordinate: MapCoordinate;
    heading: number;
  }) => void;
  /** 播放完毕事件 */
  onFinish?: () => void;
}

export function useMapTrack(options: UseMapTrackOptions) {
  const {
    trackPoints,
    speedRate: initialSpeedRate = 1,
    initialProgress = 0,
    durationMs = 10000,
    loop = false,
    onStatusChange,
    onProgressChange,
    onPointChange,
    onFinish,
  } = options;

  const status = ref<TrackPlaybackStatus>('idle');
  const progress = ref<number>(Math.max(0, Math.min(1, toValue(initialProgress))));
  const speedRate = ref<number>(toValue(initialSpeedRate));
  const currentIndex = ref<number>(0);

  // 内部 requestAnimationFrame ID
  let animId: number | null = null;
  let lastTimestamp: number | null = null;

  // 获取解包后的轨迹序列
  const points = computed<TrackPoint[]>(() => toValue(trackPoints) || []);

  // 计算每段线段的累计距离与总距离
  const segmentDistances = computed<number[]>(() => {
    const pts = points.value;
    if (pts.length < 2) return [];
    const dists: number[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i]?.coordinate;
      const p2 = pts[i + 1]?.coordinate;
      if (p1 && p2) {
        dists.push(GeoMath.distance(p1, p2));
      } else {
        dists.push(0);
      }
    }
    return dists;
  });

  const totalDistance = computed<number>(() => {
    return segmentDistances.value.reduce((acc, cur) => acc + cur, 0);
  });

  // 累计进度分布界限 (各顶点对应的进度 0 ~ 1)
  const cumulativeProgressList = computed<number[]>(() => {
    const dists = segmentDistances.value;
    const total = totalDistance.value;
    if (dists.length === 0 || total === 0) {
      // 若距离为 0 或等分
      const count = points.value.length;
      if (count < 2) return [0];
      return points.value.map((_, i) => i / (count - 1));
    }
    const result: number[] = [0];
    let acc = 0;
    for (const d of dists) {
      acc += d;
      result.push(Math.min(1, acc / total));
    }
    return result;
  });

  // 根据当前 progress 计算当前坐标与航向
  const currentCoordinate = ref<MapCoordinate | null>(null);
  const currentHeading = ref<number>(0);

  function calculateStateAtProgress(targetProgress: number) {
    const pts = points.value;
    if (pts.length === 0) {
      currentCoordinate.value = null;
      currentHeading.value = 0;
      currentIndex.value = 0;
      return;
    }

    if (pts.length === 1) {
      currentCoordinate.value = pts[0]?.coordinate ? { ...pts[0].coordinate } : null;
      currentHeading.value = 0;
      currentIndex.value = 0;
      return;
    }

    const clamped = Math.max(0, Math.min(1, targetProgress));
    const cumProg = cumulativeProgressList.value;

    // 寻找所处的线段
    let segIdx = 0;
    for (let i = 0; i < cumProg.length - 1; i++) {
      const startP = cumProg[i] ?? 0;
      const endP = cumProg[i + 1] ?? 1;
      if (clamped >= startP && clamped <= endP) {
        segIdx = i;
        break;
      }
      if (i === cumProg.length - 2) {
        segIdx = i;
      }
    }

    const pStart = pts[segIdx];
    const pEnd = pts[segIdx + 1];

    if (!pStart || !pEnd) {
      return;
    }

    const startProg = cumProg[segIdx] ?? 0;
    const endProg = cumProg[segIdx + 1] ?? 1;
    const span = endProg - startProg;
    const fraction = span > 0 ? (clamped - startProg) / span : 0;

    const interpolated = GeoMath.interpolate(pStart.coordinate, pEnd.coordinate, fraction);
    const heading = GeoMath.bearing(pStart.coordinate, pEnd.coordinate);

    currentIndex.value = segIdx;
    currentCoordinate.value = interpolated;
    currentHeading.value = heading;

    onPointChange?.({
      point: pStart,
      index: segIdx,
      coordinate: interpolated,
      heading,
    });
  }

  // 帧动画循环回调
  function tick(timestamp: number) {
    if (status.value !== 'playing') {
      return;
    }

    if (lastTimestamp === null) {
      lastTimestamp = timestamp;
    }

    const deltaMs = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    const effectiveDuration = Math.max(100, durationMs / Math.max(0.1, speedRate.value));
    const step = deltaMs / effectiveDuration;
    let nextProgress = progress.value + step;

    if (nextProgress >= 1) {
      const isLoop = toValue(loop);
      if (isLoop) {
        nextProgress = 0;
        progress.value = 0;
        calculateStateAtProgress(0);
        onProgressChange?.(0);
        animId = requestAnimationFrame(tick);
      } else {
        progress.value = 1;
        calculateStateAtProgress(1);
        onProgressChange?.(1);
        status.value = 'finished';
        onStatusChange?.('finished');
        onFinish?.();
        stopAnimation();
      }
      return;
    }

    progress.value = nextProgress;
    calculateStateAtProgress(nextProgress);
    onProgressChange?.(nextProgress);

    animId = requestAnimationFrame(tick);
  }

  function startAnimation() {
    stopAnimation();
    lastTimestamp = null;
    animId = requestAnimationFrame(tick);
  }

  function stopAnimation() {
    if (animId !== null) {
      cancelAnimationFrame(animId);
      animId = null;
    }
    lastTimestamp = null;
  }

  function play() {
    if (points.value.length < 2) {
      return;
    }
    if (status.value === 'finished' || progress.value >= 1) {
      progress.value = 0;
      calculateStateAtProgress(0);
    }
    status.value = 'playing';
    onStatusChange?.('playing');
    startAnimation();
  }

  function pause() {
    if (status.value === 'playing') {
      status.value = 'paused';
      onStatusChange?.('paused');
      stopAnimation();
    }
  }

  function stop() {
    stopAnimation();
    status.value = 'idle';
    progress.value = 0;
    calculateStateAtProgress(0);
    onStatusChange?.('idle');
    onProgressChange?.(0);
  }

  function seek(targetProgress: number) {
    const clamped = Math.max(0, Math.min(1, targetProgress));
    progress.value = clamped;
    calculateStateAtProgress(clamped);
    onProgressChange?.(clamped);

    if (clamped >= 1 && status.value === 'playing') {
      pause();
    }
  }

  function setSpeedRate(rate: number) {
    if (rate > 0) {
      speedRate.value = rate;
    }
  }

  // 监听轨迹数据源变化
  watch(
    () => points.value,
    newPoints => {
      stop();
      if (newPoints.length > 0) {
        calculateStateAtProgress(0);
      }
    },
    { immediate: true },
  );

  // 确定性销毁句柄防泄漏
  if (getCurrentScope()) {
    onScopeDispose(() => {
      stopAnimation();
    });
  }

  return {
    status,
    progress,
    speedRate,
    currentIndex,
    currentCoordinate,
    currentHeading,
    play,
    pause,
    stop,
    seek,
    setSpeedRate,
  };
}
