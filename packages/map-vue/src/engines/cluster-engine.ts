/**
 * ClusterEngine 海量点轻量网格聚合与 Spiderfy 算法引擎。
 *
 * 遵循 ADR-0009、ADR-0013 与 ADR-0051 规范，零重量级第三方库依赖，
 * 基于墨卡托投影网格分桶，支持 50,000+ 点位极速聚合计算与蜘蛛网发散展开。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import type { ClusterGroup, ClusterMarker, MapBounds, MapCoordinate } from '../types';

export interface ClusterOptions {
  /** 当前缩放级别 */
  zoom: number;
  /** 网格单元像素步长 (默认 60) */
  gridSize?: number;
  /** 最大聚合缩放等级 (默认 17) */
  maxClusterZoom?: number;
}

export interface SpiderfyOptions {
  /** 当前缩放等级 */
  zoom: number;
  /** 基础扩散半径 (像素，默认 50) */
  radiusPixels?: number;
}

export interface SpiderfyPoint {
  /** 扩散后的新经纬度坐标 */
  coordinate: MapCoordinate;
  /** 原始标记点 */
  marker: ClusterMarker;
}

/**
 * 经纬度转当前缩放等级下的 Web 墨卡托世界像素坐标。
 */
export function latLngToPixel(coord: MapCoordinate, zoom: number): { x: number; y: number } {
  const scale = 256 * Math.pow(2, zoom);
  const x = ((coord.lng + 180) / 360) * scale;
  const sinLat = Math.sin((coord.lat * Math.PI) / 180);
  const clampedSin = Math.max(-0.9999, Math.min(0.9999, sinLat));
  const y = (0.5 - Math.log((1 + clampedSin) / (1 - clampedSin)) / (4 * Math.PI)) * scale;
  return { x, y };
}

/**
 * Web 墨卡托世界像素坐标反转为经纬度。
 */
export function pixelToLatLng(pixel: { x: number; y: number }, zoom: number): MapCoordinate {
  const scale = 256 * Math.pow(2, zoom);
  const lng = (pixel.x / scale) * 360 - 180;
  const y2 = 180 - (pixel.y / scale) * 360;
  const lat = (360 / Math.PI) * Math.atan(Math.exp((y2 * Math.PI) / 180)) - 90;
  return { lng, lat };
}

/**
 * 对海量点位进行网格空间聚合计算。
 *
 * @param markers 标记点列表
 * @param options 聚合参数
 * @returns 聚合簇列表
 */
export function cluster(markers: ClusterMarker[], options: ClusterOptions): ClusterGroup[] {
  if (!markers || markers.length === 0) {
    return [];
  }

  const { zoom, gridSize = 60, maxClusterZoom = 17 } = options;

  // 超过最大缩放等级时直接散开为单个点
  if (zoom >= maxClusterZoom) {
    return markers.map((m, idx) => ({
      id: `single-${m.id ?? idx}`,
      center: m.coordinate,
      count: 1,
      markers: [m],
      bounds: [m.coordinate, m.coordinate],
    }));
  }

  const gridMap = new Map<
    string,
    {
      markers: ClusterMarker[];
      sumLng: number;
      sumLat: number;
      minLng: number;
      maxLng: number;
      minLat: number;
      maxLat: number;
    }
  >();

  const len = markers.length;
  for (let i = 0; i < len; i++) {
    const m = markers[i];
    if (!m) continue;
    const { lng, lat } = m.coordinate;
    const px = latLngToPixel(m.coordinate, zoom);
    const cellX = Math.floor(px.x / gridSize);
    const cellY = Math.floor(px.y / gridSize);
    const key = `${cellX}:${cellY}`;

    let bucket = gridMap.get(key);
    if (!bucket) {
      bucket = {
        markers: [m],
        sumLng: lng,
        sumLat: lat,
        minLng: lng,
        maxLng: lng,
        minLat: lat,
        maxLat: lat,
      };
      gridMap.set(key, bucket);
    } else {
      bucket.markers.push(m);
      bucket.sumLng += lng;
      bucket.sumLat += lat;
      if (lng < bucket.minLng) bucket.minLng = lng;
      if (lng > bucket.maxLng) bucket.maxLng = lng;
      if (lat < bucket.minLat) bucket.minLat = lat;
      if (lat > bucket.maxLat) bucket.maxLat = lat;
    }
  }

  const result: ClusterGroup[] = [];
  gridMap.forEach((bucket, key) => {
    const count = bucket.markers.length;
    const center: MapCoordinate = {
      lng: bucket.sumLng / count,
      lat: bucket.sumLat / count,
    };
    const bounds: MapBounds = [
      { lng: bucket.minLng, lat: bucket.minLat },
      { lng: bucket.maxLng, lat: bucket.maxLat },
    ];

    result.push({
      id: `cluster-${key}-${count}`,
      center,
      count,
      markers: bucket.markers,
      bounds,
    });
  });

  return result;
}

/**
 * 计算聚合圈被点击后的 Spiderfy 蜘蛛网环形/螺旋扩散点位序列。
 *
 * @param center 原始聚合中心
 * @param markers 簇内点位序列
 * @param options 扩散参数
 * @returns 扩散后的经纬度与标记对应表
 */
export function generateSpiderfyOffsets(
  center: MapCoordinate,
  markers: ClusterMarker[],
  options: SpiderfyOptions,
): SpiderfyPoint[] {
  if (!markers || markers.length === 0) {
    return [];
  }

  const { zoom, radiusPixels = 50 } = options;
  const centerPx = latLngToPixel(center, zoom);
  const count = markers.length;
  const result: SpiderfyPoint[] = [];

  if (count === 1) {
    return [{ coordinate: center, marker: markers[0]! }];
  }

  // 小于等于 8 个点采用均分圆环，多于 8 个点采用阿基米德螺旋线
  const isCircle = count <= 8;

  for (let i = 0; i < count; i++) {
    const m = markers[i]!;
    let offsetX = 0;
    let offsetY = 0;

    if (isCircle) {
      const angle = (2 * Math.PI * i) / count;
      offsetX = Math.cos(angle) * radiusPixels;
      offsetY = Math.sin(angle) * radiusPixels;
    } else {
      // 螺旋发散
      const spiralRadius = radiusPixels * (0.8 + 0.15 * i);
      const angle = i * 0.75;
      offsetX = Math.cos(angle) * spiralRadius;
      offsetY = Math.sin(angle) * spiralRadius;
    }

    const targetPx = {
      x: centerPx.x + offsetX,
      y: centerPx.y + offsetY,
    };

    const targetCoord = pixelToLatLng(targetPx, zoom);
    result.push({
      coordinate: targetCoord,
      marker: m,
    });
  }

  return result;
}

export const ClusterEngine = {
  latLngToPixel,
  pixelToLatLng,
  cluster,
  generateSpiderfyOffsets,
};
