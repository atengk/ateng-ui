/**
 * useMapFence 电子围栏无头响应式状态机。
 *
 * 遵循 ADR-0002、ADR-0009 与 ADR-0051 规范，提供圆形、多边形与矩形围栏的
 * 空间几何增删改查、实时物理面积/半径推导与高精度点位越界感知引擎。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import {
  ref,
  computed,
  watch,
  toValue,
  type Ref,
  type ComputedRef,
  type MaybeRefOrGetter,
} from 'vue';
import type { FenceAlarmPayload, FenceDrawMode, FenceRecord, MapCoordinate } from '../types';
import { GeoMath } from '../engines/geo-math';

/**
 * useMapFence 入参配置契约。
 */
export interface UseMapFenceOptions {
  /** 初始围栏列表 */
  initialFences?: MaybeRefOrGetter<FenceRecord[] | undefined>;
  /** 初始绘制模式 */
  drawMode?: MaybeRefOrGetter<FenceDrawMode | undefined>;
  /** 初始聚焦围栏 ID */
  activeId?: MaybeRefOrGetter<string | number | null | undefined>;
  /** 围栏新建回调 */
  onFenceCreate?: (fence: FenceRecord) => void;
  /** 围栏更新回调 */
  onFenceUpdate?: (fence: FenceRecord) => void;
  /** 围栏删除回调 */
  onFenceDelete?: (id: string | number) => void;
  /** 围栏聚焦切换回调 */
  onFenceSelect?: (fence: FenceRecord | null) => void;
  /** 点位进入围栏告警回调 */
  onPointEnter?: (payload: FenceAlarmPayload) => void;
  /** 点位离开围栏告警回调 */
  onPointLeave?: (payload: FenceAlarmPayload) => void;
  /** 点位在围栏内滞留告警回调 */
  onPointInside?: (payload: FenceAlarmPayload) => void;
}

/**
 * useMapFence 状态机输出门面契约。
 */
export interface UseMapFenceReturn {
  /** 围栏记录集合 */
  fences: Ref<FenceRecord[]>;
  /** 当前聚焦选中的围栏 ID */
  activeId: Ref<string | number | null>;
  /** 当前聚焦选中的围栏实体 */
  activeFence: ComputedRef<FenceRecord | null>;
  /** 当前标绘绘制模式 */
  drawMode: Ref<FenceDrawMode>;
  /** 正在绘制过程中的临时点位集合 */
  drawingPoints: Ref<MapCoordinate[]>;
  /** 切换绘制模式 */
  setDrawMode: (mode: FenceDrawMode) => void;
  /** 标绘中追加临时顶点 */
  addDrawingPoint: (coord: MapCoordinate) => void;
  /** 结束绘制并生成新围栏 */
  finishDrawing: (name?: string) => FenceRecord | null;
  /** 取消当前正在进行的绘制 */
  cancelDrawing: () => void;
  /** 添加围栏实体 */
  addFence: (fence: Omit<FenceRecord, 'id'> & { id?: string | number }) => FenceRecord;
  /** 更新指定围栏实体 */
  updateFence: (id: string | number, partial: Partial<FenceRecord>) => FenceRecord | null;
  /** 删除指定围栏 */
  removeFence: (id: string | number) => boolean;
  /** 清空所有围栏 */
  clearFences: () => void;
  /** 聚焦选中指定围栏 */
  selectFence: (id: string | number | null) => void;
  /** 执行单点越界报警判定 */
  checkPoint: (point: MapCoordinate, trackerId?: string | number) => FenceAlarmPayload[];
  /** 重置状态机 */
  reset: () => void;
}

/**
 * 自增 ID 生成器。
 */
let fenceAutoId = 1;

/**
 * 辅助推导围栏物理面积。
 */
function computeFenceArea(fence: {
  shape: FenceRecord['shape'];
  radius?: number;
  points?: MapCoordinate[];
}): number {
  if (fence.shape === 'circle') {
    const r = fence.radius ?? 0;
    return Math.PI * r * r;
  }
  if (fence.points && fence.points.length >= 3) {
    return GeoMath.area(fence.points);
  }
  return 0;
}

/**
 * useMapFence 核心无头状态机实现。
 */
export function useMapFence(options: UseMapFenceOptions = {}): UseMapFenceReturn {
  const fences = ref<FenceRecord[]>(
    toValue(options.initialFences) ? [...(toValue(options.initialFences) ?? [])] : [],
  );
  const activeId = ref<string | number | null>(toValue(options.activeId) ?? null);
  const drawMode = ref<FenceDrawMode>(toValue(options.drawMode) ?? 'none');
  const drawingPoints = ref<MapCoordinate[]>([]);

  // 维护 trackerId -> 上一次所在的围栏 ID 集合（用于 enter/leave/inside 告警触发）
  const trackerHistoryMap = new Map<string | number, Set<string | number>>();

  const activeFence = computed<FenceRecord | null>(() => {
    if (activeId.value === null) return null;
    return fences.value.find(f => f.id === activeId.value) ?? null;
  });

  /**
   * 添加围栏。
   */
  const addFence = (input: Omit<FenceRecord, 'id'> & { id?: string | number }): FenceRecord => {
    const id = input.id ?? `fence_${Date.now()}_${fenceAutoId++}`;
    const calculatedArea = input.area ?? computeFenceArea(input);

    const record: FenceRecord = {
      ...input,
      id,
      area: calculatedArea,
      strokeColor: input.strokeColor ?? '#3b82f6',
      fillColor: input.fillColor ?? '#3b82f6',
      strokeWidth: input.strokeWidth ?? 2,
      fillOpacity: input.fillOpacity ?? 0.2,
    };

    fences.value.push(record);
    options.onFenceCreate?.(record);
    return record;
  };

  /**
   * 更新围栏。
   */
  const updateFence = (id: string | number, partial: Partial<FenceRecord>): FenceRecord | null => {
    const idx = fences.value.findIndex(f => f.id === id);
    if (idx === -1) return null;

    const existing = fences.value[idx];
    if (!existing) return null;

    const merged = { ...existing, ...partial };
    // 自动重算面积
    if (partial.radius !== undefined || partial.points !== undefined) {
      merged.area = partial.area ?? computeFenceArea(merged);
    }

    fences.value[idx] = merged;
    options.onFenceUpdate?.(merged);
    return merged;
  };

  /**
   * 删除围栏。
   */
  const removeFence = (id: string | number): boolean => {
    const idx = fences.value.findIndex(f => f.id === id);
    if (idx === -1) return false;

    fences.value.splice(idx, 1);
    if (activeId.value === id) {
      activeId.value = null;
      options.onFenceSelect?.(null);
    }
    options.onFenceDelete?.(id);
    return true;
  };

  /**
   * 清空所有围栏。
   */
  const clearFences = (): void => {
    fences.value = [];
    activeId.value = null;
    drawingPoints.value = [];
    trackerHistoryMap.clear();
    options.onFenceSelect?.(null);
  };

  /**
   * 聚焦选中指定围栏。
   */
  const selectFence = (id: string | number | null): void => {
    activeId.value = id;
    const target = fences.value.find(f => f.id === id) ?? null;
    options.onFenceSelect?.(target);
  };

  /**
   * 切换标绘模式。
   */
  const setDrawMode = (mode: FenceDrawMode): void => {
    drawMode.value = mode;
    drawingPoints.value = [];
  };

  /**
   * 标绘中增加顶点。
   */
  const addDrawingPoint = (coord: MapCoordinate): void => {
    drawingPoints.value.push({ ...coord });
  };

  /**
   * 结束绘制并入库。
   */
  const finishDrawing = (name?: string): FenceRecord | null => {
    const mode = drawMode.value;
    const pts = [...drawingPoints.value];
    if (mode === 'none') return null;

    let created: FenceRecord | null = null;

    if (mode === 'circle') {
      const center = pts[0];
      const edge = pts[1];
      if (center && edge) {
        const radius = GeoMath.distance(center, edge);
        created = addFence({
          name: name || `圆形围栏 ${fences.value.length + 1}`,
          shape: 'circle',
          center,
          radius,
        });
      }
    } else if (mode === 'polygon' || mode === 'rectangle') {
      if (pts.length >= 3) {
        created = addFence({
          name: name || `${mode === 'polygon' ? '多边形' : '矩形'}围栏 ${fences.value.length + 1}`,
          shape: mode,
          points: pts,
        });
      }
    }

    drawMode.value = 'none';
    drawingPoints.value = [];
    return created;
  };

  /**
   * 取消绘制。
   */
  const cancelDrawing = (): void => {
    drawMode.value = 'none';
    drawingPoints.value = [];
  };

  /**
   * 越界报警判定核心算法。
   */
  const checkPoint = (point: MapCoordinate, trackerId?: string | number): FenceAlarmPayload[] => {
    const tid = trackerId ?? `${point.lng.toFixed(6)}_${point.lat.toFixed(6)}`;
    const prevSet = trackerHistoryMap.get(tid) ?? new Set<string | number>();
    const currentSet = new Set<string | number>();
    const payloads: FenceAlarmPayload[] = [];
    const now = Date.now();

    for (const fence of fences.value) {
      let isInside = false;

      if (fence.shape === 'circle' && fence.center && fence.radius !== undefined) {
        isInside = GeoMath.isPointInCircle(point, fence.center, fence.radius);
      } else if (
        (fence.shape === 'polygon' || fence.shape === 'rectangle') &&
        fence.points?.length
      ) {
        isInside = GeoMath.isPointInPolygon(point, fence.points);
      }

      if (isInside) {
        currentSet.add(fence.id);
        if (!prevSet.has(fence.id)) {
          // 刚进入
          const p: FenceAlarmPayload = { point, fence, action: 'enter', timestamp: now };
          payloads.push(p);
          options.onPointEnter?.(p);
        } else {
          // 持续滞留
          const p: FenceAlarmPayload = { point, fence, action: 'inside', timestamp: now };
          payloads.push(p);
          options.onPointInside?.(p);
        }
      } else {
        if (prevSet.has(fence.id)) {
          // 刚移出离开
          const p: FenceAlarmPayload = { point, fence, action: 'leave', timestamp: now };
          payloads.push(p);
          options.onPointLeave?.(p);
        }
      }
    }

    trackerHistoryMap.set(tid, currentSet);
    return payloads;
  };

  const reset = (): void => {
    clearFences();
    drawMode.value = 'none';
  };

  // 监听外部属性联动
  watch(
    () => toValue(options.initialFences),
    val => {
      if (val) {
        fences.value = [...val];
      }
    },
    { deep: true },
  );

  watch(
    () => toValue(options.drawMode),
    val => {
      if (val !== undefined && val !== drawMode.value) {
        drawMode.value = val;
      }
    },
  );

  return {
    fences,
    activeId,
    activeFence,
    drawMode,
    drawingPoints,
    setDrawMode,
    addDrawingPoint,
    finishDrawing,
    cancelDrawing,
    addFence,
    updateFence,
    removeFence,
    clearFences,
    selectFence,
    checkPoint,
    reset,
  };
}
