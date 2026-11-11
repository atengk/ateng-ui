/**
 * GeoMath 空间几何轻量算法引擎。
 *
 * 依据 ADR-0051 规范，零外部大型 GIS 依赖，内置经典光线投射法 (Ray-Casting) 点在多边形内判定、
 * 球面大圆距离 (Haversine Formula) 测距、基于球体投影的多边形面积计算与大圆切线角推导。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import type { MapBounds, MapCoordinate } from '../types';

/** 地球平均物理半径 (米) */
const EARTH_RADIUS = 6378137.0;

/**
 * 角度转弧度。
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180.0;
}

/**
 * 弧度转角度。
 */
function toDegrees(radians: number): number {
  return (radians * 180.0) / Math.PI;
}

/**
 * 判断点是否在多边形内（包含边界）。
 * 采用经典光线投射法 (Ray-Casting Algorithm / 奇偶测试)。
 *
 * @param point 待检测坐标点
 * @param polygon 多边形顶点数组 (至少 3 个点)
 * @returns boolean
 */
export function isPointInPolygon(point: MapCoordinate, polygon: MapCoordinate[]): boolean {
  if (!polygon || polygon.length < 3) {
    return false;
  }

  const { lng, lat } = point;
  let inside = false;
  const len = polygon.length;

  for (let i = 0, j = len - 1; i < len; j = i++) {
    const pi = polygon[i];
    const pj = polygon[j];
    if (!pi || !pj) {
      continue;
    }

    const xi = pi.lng;
    const yi = pi.lat;
    const xj = pj.lng;
    const yj = pj.lat;

    // 顶点精确重合直接判定在内部
    if (xi === lng && yi === lat) {
      return true;
    }

    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * 判断点是否在圆形电子围栏内。
 *
 * @param point 待检测点
 * @param center 圆形中心点
 * @param radiusMeters 半径 (米)
 * @returns boolean
 */
export function isPointInCircle(
  point: MapCoordinate,
  center: MapCoordinate,
  radiusMeters: number,
): boolean {
  const dist = calculateHaversineDistance(point, center);
  return dist <= radiusMeters;
}

/**
 * 判断点是否在空间矩形包围盒内。
 *
 * @param point 待检测点
 * @param bounds [西南角, 东北角]
 * @returns boolean
 */
export function isPointInRectangle(point: MapCoordinate, bounds: MapBounds): boolean {
  const [sw, ne] = bounds;
  const minLng = Math.min(sw.lng, ne.lng);
  const maxLng = Math.max(sw.lng, ne.lng);
  const minLat = Math.min(sw.lat, ne.lat);
  const maxLat = Math.max(sw.lat, ne.lat);

  return point.lng >= minLng && point.lng <= maxLng && point.lat >= minLat && point.lat <= maxLat;
}

/**
 * 使用 Haversine 大圆距离公式计算两点之间的地表球面物理距离 (单位：米)。
 *
 * @param p1 起点坐标
 * @param p2 终点坐标
 * @returns 两点间距离 (米)
 */
export function calculateHaversineDistance(p1: MapCoordinate, p2: MapCoordinate): number {
  const lat1 = toRadians(p1.lat);
  const lat2 = toRadians(p2.lat);
  const dLat = toRadians(p2.lat - p1.lat);
  const dLng = toRadians(p2.lng - p1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS * c * 100) / 100;
}

/**
 * 计算连续折线总长度 (单位：米)。
 *
 * @param points 折线点序列
 * @returns 总距离 (米)
 */
export function calculatePolylineDistance(points: MapCoordinate[]): number {
  if (!points || points.length < 2) {
    return 0;
  }
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    if (p1 && p2) {
      total += calculateHaversineDistance(p1, p2);
    }
  }
  return Math.round(total * 100) / 100;
}

/**
 * 基于标准球体投影与鞋带公式 (Shoelace Formula) 计算多边形地表真实物理面积 (单位：平方米)。
 *
 * @param points 多边形顶点数组 (至少 3 个点)
 * @returns 面积 (平方米)
 */
export function calculatePolygonArea(points: MapCoordinate[]): number {
  if (!points || points.length < 3) {
    return 0;
  }

  const len = points.length;
  let total = 0;

  for (let i = 0; i < len; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % len];
    if (!p1 || !p2) {
      continue;
    }
    const dLng = toRadians(p2.lng - p1.lng);
    const lat1 = toRadians(p1.lat);
    const lat2 = toRadians(p2.lat);
    total += dLng * (2 + Math.sin(lat1) + Math.sin(lat2));
  }

  const area = (Math.abs(total) * EARTH_RADIUS * EARTH_RADIUS) / 4.0;
  return Math.round(area * 100) / 100;
}

/**
 * 计算从起点到终点的大圆切线航向方位角 (Bearing Angle)。
 * 返回范围为 0 ~ 360 度，0 度表示正北，90 度表示正东，180 度正南，270 度正西。
 *
 * @param from 起点坐标
 * @param to 终点坐标
 * @returns 航向角 (0 ~ 360 度)
 */
export function calculateBearing(from: MapCoordinate, to: MapCoordinate): number {
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const dLng = toRadians(to.lng - from.lng);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  const brng = toDegrees(Math.atan2(y, x));
  return (brng + 360.0) % 360.0;
}

/**
 * 沿线段两点之间进行线性插值，推导指定进度位置的坐标点。
 *
 * @param from 起点
 * @param to 终点
 * @param fraction 进度比例 (0 ~ 1)
 */
export function interpolatePoint(
  from: MapCoordinate,
  to: MapCoordinate,
  fraction: number,
): MapCoordinate {
  const clampedFraction = Math.max(0, Math.min(1, fraction));
  return {
    lng: from.lng + (to.lng - from.lng) * clampedFraction,
    lat: from.lat + (to.lat - from.lat) * clampedFraction,
    alt:
      from.alt !== undefined && to.alt !== undefined
        ? from.alt + (to.alt - from.alt) * clampedFraction
        : undefined,
    coordType: from.coordType ?? to.coordType,
  };
}

/**
 * GeoMath 静态单例门面。
 */
export const GeoMath = {
  isPointInPolygon,
  isPointInCircle,
  isPointInRectangle,
  distance: calculateHaversineDistance,
  polylineDistance: calculatePolylineDistance,
  area: calculatePolygonArea,
  bearing: calculateBearing,
  interpolate: interpolatePoint,
};
