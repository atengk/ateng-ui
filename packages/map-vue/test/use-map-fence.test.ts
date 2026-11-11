/**
 * useMapFence 状态机单元测试。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { describe, it, expect, vi } from 'vitest';
import { useMapFence } from '../src/composables/use-map-fence';
import type { MapCoordinate } from '../src/types';

describe('useMapFence 状态机单元测试', () => {
  it('应当正确初始化并支持新增带有自动面积计算的多边形围栏', () => {
    const fenceState = useMapFence();

    // 北京天安门附近 4 个顶点形成的约 1km x 1km 矩形/多边形
    const polygonPoints: MapCoordinate[] = [
      { lng: 116.4, lat: 39.9 },
      { lng: 116.41, lat: 39.9 },
      { lng: 116.41, lat: 39.91 },
      { lng: 116.4, lat: 39.91 },
    ];

    const added = fenceState.addFence({
      name: '核心区域多边形',
      shape: 'polygon',
      points: polygonPoints,
    });

    expect(added.id).toBeDefined();
    expect(added.area).toBeGreaterThan(0);
    expect(fenceState.fences.value.length).toBe(1);
    expect(fenceState.fences.value[0]?.name).toBe('核心区域多边形');
  });

  it('应当正确计算圆形围栏的面积并支持更新围栏参数', () => {
    const fenceState = useMapFence();

    const circle = fenceState.addFence({
      name: '安防圆环',
      shape: 'circle',
      center: { lng: 116.4074, lat: 39.9042 },
      radius: 500, // 500米半径
    });

    // 圆面积 Math.PI * 500 * 500 ≈ 785398
    expect(circle.area).toBeCloseTo(Math.PI * 500 * 500, -2);

    // 更新半径
    const updated = fenceState.updateFence(circle.id, { radius: 1000 });
    expect(updated).not.toBeNull();
    expect(updated?.radius).toBe(1000);
    expect(updated?.area).toBeCloseTo(Math.PI * 1000 * 1000, -2);
  });

  it('应当支持删除与清空围栏', () => {
    const fenceState = useMapFence();

    const f1 = fenceState.addFence({
      shape: 'circle',
      center: { lng: 116.4, lat: 39.9 },
      radius: 200,
    });
    const f2 = fenceState.addFence({
      shape: 'circle',
      center: { lng: 116.42, lat: 39.9 },
      radius: 300,
    });

    expect(fenceState.fences.value.length).toBe(2);

    const removed = fenceState.removeFence(f1.id);
    expect(removed).toBe(true);
    expect(fenceState.fences.value.length).toBe(1);
    expect(fenceState.fences.value[0]?.id).toBe(f2.id);

    fenceState.clearFences();
    expect(fenceState.fences.value.length).toBe(0);
  });

  it('应当在点位流进入、滞留与离开围栏时准确触发空间越界感知告警', () => {
    const onEnter = vi.fn();
    const onLeave = vi.fn();
    const onInside = vi.fn();

    const fenceState = useMapFence({
      onPointEnter: onEnter,
      onPointLeave: onLeave,
      onPointInside: onInside,
    });

    // 创建中心在 (116.4074, 39.9042)、半径 1000 米的圆形围栏
    const fence = fenceState.addFence({
      name: '天安门围栏',
      shape: 'circle',
      center: { lng: 116.4074, lat: 39.9042 },
      radius: 1000,
    });

    // 1. 外部点（距离中心约 5000 米）
    const outsidePoint: MapCoordinate = { lng: 116.4674, lat: 39.9042 };
    let alarms = fenceState.checkPoint(outsidePoint, 'vehicle-01');
    expect(alarms.length).toBe(0);
    expect(onEnter).not.toHaveBeenCalled();

    // 2. 点位移动进入围栏内部（中心点）
    const insidePoint: MapCoordinate = { lng: 116.4074, lat: 39.9042 };
    alarms = fenceState.checkPoint(insidePoint, 'vehicle-01');
    expect(alarms.length).toBe(1);
    expect(alarms[0]?.action).toBe('enter');
    expect(alarms[0]?.fence.id).toBe(fence.id);
    expect(onEnter).toHaveBeenCalledTimes(1);

    // 3. 点位在围栏内部轻微移动（仍在内部）-> 触发 inside 滞留
    const stillInsidePoint: MapCoordinate = { lng: 116.408, lat: 39.9045 };
    alarms = fenceState.checkPoint(stillInsidePoint, 'vehicle-01');
    expect(alarms.length).toBe(1);
    expect(alarms[0]?.action).toBe('inside');
    expect(onInside).toHaveBeenCalledTimes(1);

    // 4. 点位移出围栏 -> 触发 leave 离开
    alarms = fenceState.checkPoint(outsidePoint, 'vehicle-01');
    expect(alarms.length).toBe(1);
    expect(alarms[0]?.action).toBe('leave');
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it('应当正确支持标绘模式切换与交互中临时顶点的维护', () => {
    const fenceState = useMapFence();
    expect(fenceState.drawMode.value).toBe('none');

    fenceState.setDrawMode('polygon');
    expect(fenceState.drawMode.value).toBe('polygon');

    fenceState.addDrawingPoint({ lng: 116.4, lat: 39.9 });
    fenceState.addDrawingPoint({ lng: 116.41, lat: 39.9 });
    fenceState.addDrawingPoint({ lng: 116.41, lat: 39.91 });
    expect(fenceState.drawingPoints.value.length).toBe(3);

    // 完成绘制
    const created = fenceState.finishDrawing();
    expect(created).not.toBeNull();
    expect(created?.shape).toBe('polygon');
    expect(fenceState.drawMode.value).toBe('none');
    expect(fenceState.drawingPoints.value.length).toBe(0);
  });
});
