/**
 * @atengk/map-vue 基座构建与类型契约基线单元测试。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { describe, it, expect } from 'vitest';
import {
  MAP_VUE_VERSION,
  TilePreset,
  TILE_URL_TEMPLATES,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  type CoordType,
  type MapCoordinate,
  type MapMarker,
  type FenceShape,
  type FenceRecord,
  type TrackPoint,
  type MapDriverAdapter,
  type MapBounds,
  type GeocodeResult,
} from '../src';

describe('@atengk/map-vue Baseline', () => {
  it('应当正确导出包版本常量与核心标识', () => {
    expect(MAP_VUE_VERSION).toBe('1.0.0');
  });

  it('应当具备完备的 CoordType 坐标系联合类型约束', () => {
    const coords: CoordType[] = ['WGS84', 'GCJ02', 'BD09'];
    expect(coords).toHaveLength(3);
    expect(coords).toContain('WGS84');
    expect(coords).toContain('GCJ02');
    expect(coords).toContain('BD09');
  });

  it('应当具备完备的 TilePreset 瓦片预设矩阵并正确映射 URL 模板', () => {
    expect(TilePreset.OSM).toBe('OSM');
    expect(TilePreset.TIANDITU_VEC).toBe('TIANDITU_VEC');
    expect(TilePreset.TIANDITU_IMG).toBe('TIANDITU_IMG');
    expect(TilePreset.CARTODB_LIGHT).toBe('CARTODB_LIGHT');
    expect(TilePreset.CARTODB_DARK).toBe('CARTODB_DARK');
    expect(TilePreset.AMAP_VECTOR).toBe('AMAP_VECTOR');

    expect(TILE_URL_TEMPLATES[TilePreset.OSM]).toContain('openstreetmap.org');
    expect(TILE_URL_TEMPLATES[TilePreset.CARTODB_DARK]).toContain('dark_all');
  });

  it('应当正确导出默认中心点与默认缩放等级', () => {
    expect(DEFAULT_MAP_CENTER.lng).toBe(116.4074);
    expect(DEFAULT_MAP_CENTER.lat).toBe(39.9042);
    expect(DEFAULT_MAP_CENTER.coordType).toBe('GCJ02');
    expect(DEFAULT_MAP_ZOOM).toBe(11);
  });

  it('应当正确构造 MapCoordinate 地理坐标实体契约', () => {
    const coord: MapCoordinate = {
      lng: 121.4737,
      lat: 31.2304,
      alt: 12,
      coordType: 'WGS84',
    };

    expect(coord.lng).toBe(121.4737);
    expect(coord.lat).toBe(31.2304);
    expect(coord.alt).toBe(12);
    expect(coord.coordType).toBe('WGS84');
  });

  it('应当正确构造 MapMarker 标记实体契约', () => {
    const marker: MapMarker = {
      id: 'marker-101',
      coordinate: { lng: 116.4074, lat: 39.9042 },
      title: '天安门广场',
      icon: {
        url: '/icons/pin.png',
        size: [32, 48],
        anchor: [16, 48],
      },
      popup: '<b>北京核心地标</b>',
      data: { category: 'monument' },
    };

    expect(marker.id).toBe('marker-101');
    expect(marker.title).toBe('天安门广场');
    expect(typeof marker.icon).toBe('object');
    expect(marker.data?.category).toBe('monument');
  });

  it('应当正确构造 FenceRecord 电子围栏实体契约', () => {
    const shapes: FenceShape[] = ['circle', 'polygon', 'rectangle'];
    expect(shapes).toHaveLength(3);

    const circleFence: FenceRecord = {
      id: 'fence-circle-1',
      name: '禁停圆区',
      shape: 'circle',
      center: { lng: 116.4, lat: 39.9 },
      radius: 500,
      area: 785398,
      strokeColor: '#ef4444',
      fillOpacity: 0.2,
    };

    const polygonFence: FenceRecord = {
      id: 'fence-poly-1',
      name: '工业园区红线',
      shape: 'polygon',
      points: [
        { lng: 116.41, lat: 39.91 },
        { lng: 116.42, lat: 39.91 },
        { lng: 116.42, lat: 39.92 },
      ],
      area: 125000,
    };

    expect(circleFence.shape).toBe('circle');
    expect(circleFence.radius).toBe(500);
    expect(polygonFence.points).toHaveLength(3);
  });

  it('应当正确构造 TrackPoint 轨迹时序节点契约', () => {
    const trackPoint: TrackPoint = {
      coordinate: { lng: 116.401, lat: 39.902 },
      timestamp: 1731300000000,
      speed: 45.5,
      heading: 90,
      isStop: false,
    };

    expect(trackPoint.speed).toBe(45.5);
    expect(trackPoint.heading).toBe(90);
    expect(trackPoint.isStop).toBe(false);
  });

  it('应当正确实现 MapDriverAdapter SPI 契约定义', () => {
    const mockDriver: MapDriverAdapter = {
      engineName: 'mock-engine',
      init: () => {},
      destroy: () => {},
      setCenter: () => {},
      setZoom: () => {},
      fitBounds: () => {},
      addMarker: () => {},
      removeMarker: () => {},
      clearMarkers: () => {},
      invalidateSize: () => {},
      getRawInstance: () => ({ mock: true }),
    };

    expect(mockDriver.engineName).toBe('mock-engine');
    expect(mockDriver.getRawInstance()).toEqual({ mock: true });
  });

  it('应当正确构造 MapBounds 与 GeocodeResult 契约', () => {
    const bounds: MapBounds = [
      { lng: 116.3, lat: 39.8 },
      { lng: 116.5, lat: 40.0 },
    ];
    const geocode: GeocodeResult = {
      coordinate: { lng: 116.4074, lat: 39.9042 },
      formattedAddress: '北京市东城区东长安街天安门广场',
      province: '北京市',
      city: '北京市',
      district: '东城区',
    };

    expect(bounds).toHaveLength(2);
    expect(geocode.formattedAddress).toContain('天安门广场');
    expect(geocode.province).toBe('北京市');
  });
});
