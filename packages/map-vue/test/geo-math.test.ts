/**
 * GeoMath 空间几何轻量算法单元测试。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { describe, it, expect } from 'vitest';
import {
  GeoMath,
  isPointInPolygon,
  isPointInCircle,
  isPointInRectangle,
  calculateHaversineDistance,
  calculatePolylineDistance,
  calculatePolygonArea,
  calculateBearing,
  interpolatePoint,
  type MapCoordinate,
} from '../src';

describe('GeoMath 空间几何算法引擎', () => {
  // 简易测试正方形凸多边形 (顺时针，4 个顶点)
  const squarePolygon: MapCoordinate[] = [
    { lng: 116.0, lat: 39.0 },
    { lng: 116.0, lat: 40.0 },
    { lng: 117.0, lat: 40.0 },
    { lng: 117.0, lat: 39.0 },
  ];

  // 凹多边形 (类似大写的 V 形或凹字)
  const concavePolygon: MapCoordinate[] = [
    { lng: 116.0, lat: 39.0 },
    { lng: 116.0, lat: 41.0 },
    { lng: 118.0, lat: 41.0 },
    { lng: 118.0, lat: 39.0 },
    { lng: 117.0, lat: 40.0 }, // 凹陷内缩点
  ];

  it('射线法 isPointInPolygon 应当精确检测凸多边形内、外与边界点', () => {
    // 内部中心点
    expect(isPointInPolygon({ lng: 116.5, lat: 39.5 }, squarePolygon)).toBe(true);
    // 外部远离点
    expect(isPointInPolygon({ lng: 115.0, lat: 39.5 }, squarePolygon)).toBe(false);
    expect(isPointInPolygon({ lng: 118.0, lat: 40.5 }, squarePolygon)).toBe(false);
    // 顶点精确重合
    expect(isPointInPolygon({ lng: 116.0, lat: 39.0 }, squarePolygon)).toBe(true);
  });

  it('射线法 isPointInPolygon 应当准确识别凹多边形内部与凹陷外部区域', () => {
    // 处于凹多边形两个分支内部的点
    expect(isPointInPolygon({ lng: 116.2, lat: 40.5 }, concavePolygon)).toBe(true);
    expect(isPointInPolygon({ lng: 117.8, lat: 40.5 }, concavePolygon)).toBe(true);

    // 处于凹多边形凹陷外侧的测试点 (lat 39.5 在凹陷点 40.0 下方外部)
    expect(isPointInPolygon({ lng: 117.0, lat: 39.2 }, concavePolygon)).toBe(false);
  });

  it('点在多边形判定当输入顶点不足 3 个时应当安全返回 false', () => {
    expect(isPointInPolygon({ lng: 116.5, lat: 39.5 }, [])).toBe(false);
    expect(isPointInPolygon({ lng: 116.5, lat: 39.5 }, [{ lng: 116, lat: 39 }])).toBe(false);
  });

  it('isPointInCircle 应当准确判定点是否在圆形围栏内', () => {
    const center: MapCoordinate = { lng: 116.4074, lat: 39.9042 };
    const radius = 1000; // 1000 米

    // 中心点必然在圆内
    expect(isPointInCircle(center, center, radius)).toBe(true);

    // 偏移极微小经纬度 (约 200 米)
    const nearPoint: MapCoordinate = { lng: 116.4084, lat: 39.9052 };
    expect(isPointInCircle(nearPoint, center, radius)).toBe(true);

    // 远离 5000 米的点
    const farPoint: MapCoordinate = { lng: 116.45, lat: 39.95 };
    expect(isPointInCircle(farPoint, center, radius)).toBe(false);
  });

  it('isPointInRectangle 应当准确判定点是否在矩形包围盒内', () => {
    const bounds = [
      { lng: 116.0, lat: 39.0 },
      { lng: 117.0, lat: 40.0 },
    ] as [MapCoordinate, MapCoordinate];

    expect(isPointInRectangle({ lng: 116.5, lat: 39.5 }, bounds)).toBe(true);
    expect(isPointInRectangle({ lng: 115.9, lat: 39.5 }, bounds)).toBe(false);
    expect(isPointInRectangle({ lng: 116.5, lat: 40.1 }, bounds)).toBe(false);
  });

  it('calculateHaversineDistance 球面大圆距离测距应当与基准吻合', () => {
    // 北京 (116.4074, 39.9042) 至 上海 (121.4737, 31.2304) 直线物理距离约为 1068 km
    const beijing = { lng: 116.4074, lat: 39.9042 };
    const shanghai = { lng: 121.4737, lat: 31.2304 };

    const distanceMeters = calculateHaversineDistance(beijing, shanghai);
    const distanceKm = distanceMeters / 1000;

    // 距离在 1060 km ~ 1080 km 之间
    expect(distanceKm).toBeGreaterThan(1060);
    expect(distanceKm).toBeLessThan(1080);
  });

  it('calculatePolylineDistance 应当准确累加折线总距离', () => {
    const p1 = { lng: 116.0, lat: 39.0 };
    const p2 = { lng: 116.0, lat: 39.01 };
    const p3 = { lng: 116.0, lat: 39.02 };

    const seg1 = calculateHaversineDistance(p1, p2);
    const seg2 = calculateHaversineDistance(p2, p3);
    const total = calculatePolylineDistance([p1, p2, p3]);

    expect(total).toBeCloseTo(seg1 + seg2, 1);
    expect(calculatePolylineDistance([p1])).toBe(0);
  });

  it('calculatePolygonArea 应当准确计算多边形真实地表面积', () => {
    // 经纬度微小正方形（跨度 0.01 度，边长约 1110m * 850m，面积量级在几十万至百万平方米）
    const smallSquare: MapCoordinate[] = [
      { lng: 116.4, lat: 39.9 },
      { lng: 116.4, lat: 39.91 },
      { lng: 116.41, lat: 39.91 },
      { lng: 116.41, lat: 39.9 },
    ];

    const area = calculatePolygonArea(smallSquare);
    expect(area).toBeGreaterThan(400000);
    expect(area).toBeLessThan(600000);

    expect(calculatePolygonArea([])).toBe(0);
    expect(calculatePolygonArea([smallSquare[0], smallSquare[1]])).toBe(0);
  });

  it('calculateBearing 航向角计算应当准确反映八个基本方向', () => {
    const origin: MapCoordinate = { lng: 116.0, lat: 39.0 };

    // 正北 (0° 或 360°)
    const north: MapCoordinate = { lng: 116.0, lat: 40.0 };
    expect(calculateBearing(origin, north)).toBeCloseTo(0, 0);

    // 正东 (90°)
    const east: MapCoordinate = { lng: 117.0, lat: 39.0 };
    expect(calculateBearing(origin, east)).toBeCloseTo(90, 0);

    // 正南 (180°)
    const south: MapCoordinate = { lng: 116.0, lat: 38.0 };
    expect(calculateBearing(origin, south)).toBeCloseTo(180, 0);

    // 正西 (270°)
    const west: MapCoordinate = { lng: 115.0, lat: 39.0 };
    expect(calculateBearing(origin, west)).toBeCloseTo(270, 0);
  });

  it('interpolatePoint 线性插值应当正确计算路径中间点', () => {
    const p1 = { lng: 116.0, lat: 39.0, alt: 0 };
    const p2 = { lng: 118.0, lat: 41.0, alt: 100 };

    const mid = interpolatePoint(p1, p2, 0.5);
    expect(mid.lng).toBe(117.0);
    expect(mid.lat).toBe(40.0);
    expect(mid.alt).toBe(50);

    // 进度越界保护
    expect(interpolatePoint(p1, p2, -1).lng).toBe(116.0);
    expect(interpolatePoint(p1, p2, 2).lng).toBe(118.0);
  });

  it('GeoMath 门面对象应当统一暴露出所有几何函数', () => {
    expect(typeof GeoMath.isPointInPolygon).toBe('function');
    expect(typeof GeoMath.distance).toBe('function');
    expect(typeof GeoMath.area).toBe('function');
    expect(typeof GeoMath.bearing).toBe('function');
  });
});
