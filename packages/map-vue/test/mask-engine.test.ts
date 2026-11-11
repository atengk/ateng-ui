/**
 * MaskEngine 行政区划反向掩膜几何引擎单元测试。
 *
 * 遵循极端边界覆盖与几何准确性单测规范。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { describe, it, expect } from 'vitest';
import { MaskEngine } from '../src/engines/mask-engine';
import type { GeoJSONGeometryData } from '../src/types';

describe('MaskEngine 行政区划反向掩膜几何引擎', () => {
  const mockPolygonGeoJSON: GeoJSONGeometryData = {
    type: 'Polygon',
    coordinates: [
      [
        [116.3, 39.8],
        [116.5, 39.8],
        [116.5, 40.0],
        [116.3, 40.0],
        [116.3, 39.8],
      ],
    ],
  };

  const mockFeatureCollection: GeoJSONGeometryData = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [116.3, 39.8],
              [116.5, 39.8],
              [116.5, 40.0],
              [116.3, 40.0],
              [116.3, 39.8],
            ],
          ],
        },
      },
    ],
  };

  it('空数据或无效数据安全保底', () => {
    const res = MaskEngine.buildInvertedMask(null);
    expect(res.holes).toEqual([]);
    expect(res.bounds).toBeNull();
  });

  it('解析标准 Polygon 构建反向掩膜多环多边形', () => {
    const res = MaskEngine.buildInvertedMask(mockPolygonGeoJSON);

    // 应该包含世界外框与一个内孔洞
    expect(res.worldRing.length).toBeGreaterThan(3);
    expect(res.holes.length).toBe(1);
    expect(res.holes[0]?.length).toBe(5);

    // 经纬度外包围盒计算准确
    expect(res.bounds).toBeDefined();
    expect(res.bounds![0].lng).toBe(116.3);
    expect(res.bounds![0].lat).toBe(39.8);
    expect(res.bounds![1].lng).toBe(116.5);
    expect(res.bounds![1].lat).toBe(40.0);
  });

  it('解析 FeatureCollection 并正确提取所有边界环', () => {
    const res = MaskEngine.buildInvertedMask(mockFeatureCollection);
    expect(res.holes.length).toBe(1);
    expect(res.boundaries.length).toBe(1);
  });

  it('支持提取行政边界折线用于高亮描边', () => {
    const boundaries = MaskEngine.extractBoundaries(mockPolygonGeoJSON);
    expect(boundaries.length).toBe(1);
    expect(boundaries[0]?.length).toBe(5);
    expect(boundaries[0]![0]).toEqual({ lng: 116.3, lat: 39.8 });
  });
});
