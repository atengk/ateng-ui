/**
 * MaskEngine 行政区划反向遮罩几何算法引擎。
 *
 * 遵循 ADR-0009、ADR-0013 与 ADR-0051 规范，零重量级 GIS 依赖，
 * 纯数学解析 GeoJSON 边界多边形并构建 Inverted Polygon Mask，实现全局压暗遮罩与目标区域镂空高亮。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import type { GeoJSONGeometryData, MapBounds, MapCoordinate } from '../types';

export interface InvertedMaskResult {
  /** 世界外边界封闭环 (全球多边形) */
  worldRing: MapCoordinate[];
  /** 目标镂空孔洞多边形序列 (每个孔洞为一个坐标序列) */
  holes: MapCoordinate[][];
  /** 纯行政边界多边形轮廓折线 (用于单独高亮描边) */
  boundaries: MapCoordinate[][];
  /** 目标行政区划整体外包围盒 (用于 fitBounds 自适应定位) */
  bounds: MapBounds | null;
}

/**
 * 全球超大包围环 (覆盖全球经纬度并留出视口余量)。
 */
export const DEFAULT_WORLD_RING: MapCoordinate[] = [
  { lng: -360, lat: 90 },
  { lng: 360, lat: 90 },
  { lng: 360, lat: -90 },
  { lng: -360, lat: -90 },
  { lng: -360, lat: 90 },
];

/**
 * 递归解析任意 GeoJSON 几何结构中的多边形坐标环。
 */
function extractPolygonRings(data: unknown): MapCoordinate[][] {
  if (!data || typeof data !== 'object') {
    return [];
  }

  const result: MapCoordinate[][] = [];

  const raw = data as Record<string, unknown>;

  // FeatureCollection
  if (raw.type === 'FeatureCollection' && Array.isArray(raw.features)) {
    for (const f of raw.features) {
      result.push(...extractPolygonRings(f));
    }
    return result;
  }

  // Feature
  if (raw.type === 'Feature' && raw.geometry) {
    return extractPolygonRings(raw.geometry);
  }

  // Polygon: coordinates is [ [ [lng, lat], ... ], ... ]
  if (raw.type === 'Polygon' && Array.isArray(raw.coordinates)) {
    const coords = raw.coordinates as number[][][];
    for (const ring of coords) {
      const ringCoords = ring.map(([lng, lat]) => ({ lng: lng ?? 0, lat: lat ?? 0 }));
      if (ringCoords.length >= 3) {
        result.push(ringCoords);
      }
    }
    return result;
  }

  // MultiPolygon: coordinates is [ [ [ [lng, lat], ... ] ] ]
  if (raw.type === 'MultiPolygon' && Array.isArray(raw.coordinates)) {
    const multiCoords = raw.coordinates as number[][][][];
    for (const poly of multiCoords) {
      for (const ring of poly) {
        const ringCoords = ring.map(([lng, lat]) => ({ lng: lng ?? 0, lat: lat ?? 0 }));
        if (ringCoords.length >= 3) {
          result.push(ringCoords);
        }
      }
    }
    return result;
  }

  return result;
}

/**
 * 构建反向镂空多边形掩膜结构。
 *
 * @param geoData GeoJSON 数据对象
 * @returns InvertedMaskResult
 */
export function buildInvertedMask(
  geoData: GeoJSONGeometryData | null | undefined,
): InvertedMaskResult {
  if (!geoData) {
    return {
      worldRing: [...DEFAULT_WORLD_RING],
      holes: [],
      boundaries: [],
      bounds: null,
    };
  }

  const rings = extractPolygonRings(geoData);
  if (rings.length === 0) {
    return {
      worldRing: [...DEFAULT_WORLD_RING],
      holes: [],
      boundaries: [],
      bounds: null,
    };
  }

  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const ring of rings) {
    for (const pt of ring) {
      if (pt.lng < minLng) minLng = pt.lng;
      if (pt.lng > maxLng) maxLng = pt.lng;
      if (pt.lat < minLat) minLat = pt.lat;
      if (pt.lat > maxLat) maxLat = pt.lat;
    }
  }

  const bounds: MapBounds = [
    { lng: minLng, lat: minLat },
    { lng: maxLng, lat: maxLat },
  ];

  return {
    worldRing: [...DEFAULT_WORLD_RING],
    holes: rings,
    boundaries: rings,
    bounds,
  };
}

/**
 * 单独提取行政边界多边形用于高亮描边。
 */
export function extractBoundaries(
  geoData: GeoJSONGeometryData | null | undefined,
): MapCoordinate[][] {
  return extractPolygonRings(geoData);
}

export const MaskEngine = {
  DEFAULT_WORLD_RING,
  buildInvertedMask,
  extractBoundaries,
};
