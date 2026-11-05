/**
 * 行政区划 GeoJSON 与多级下钻模拟数据源。
 *
 * 提供全国、广东省、深圳市三级 GeoJSON 边界数据与 GeoDataProvider SPI 驱动实现。
 *
 * @author Ateng
 * @since 2026-11-05
 */

import type { GeoDataProvider } from '@atengk/echarts-vue';

export const mockGeoChina = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: '广东省', code: '440000' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [112.0, 21.5],
            [117.0, 21.5],
            [116.5, 25.5],
            [112.5, 25.5],
            [112.0, 21.5],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: '浙江省', code: '330000' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [118.0, 27.0],
            [122.5, 27.0],
            [122.0, 31.0],
            [118.5, 31.0],
            [118.0, 27.0],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: '北京市', code: '110000' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [115.5, 39.5],
            [117.5, 39.5],
            [117.5, 41.0],
            [115.5, 41.0],
            [115.5, 39.5],
          ],
        ],
      },
    },
  ],
};

export const mockGeoGuangdong = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: '深圳市', code: '440300' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [113.7, 22.4],
            [114.6, 22.4],
            [114.6, 22.9],
            [113.7, 22.9],
            [113.7, 22.4],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: '广州市', code: '440100' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [112.9, 22.6],
            [113.9, 22.6],
            [113.9, 23.9],
            [112.9, 23.9],
            [112.9, 22.6],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: '珠海市', code: '440400' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [113.0, 21.8],
            [113.8, 21.8],
            [113.8, 22.4],
            [113.0, 22.4],
            [113.0, 21.8],
          ],
        ],
      },
    },
  ],
};

export const mockGeoShenzhen = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: '南山区', code: '440305' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [113.85, 22.48],
            [114.02, 22.48],
            [114.02, 22.62],
            [113.85, 22.62],
            [113.85, 22.48],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: '福田区', code: '440304' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [114.02, 22.51],
            [114.11, 22.51],
            [114.11, 22.6],
            [114.02, 22.6],
            [114.02, 22.51],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: '宝安区', code: '440306' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [113.75, 22.55],
            [113.95, 22.55],
            [113.95, 22.85],
            [113.75, 22.85],
            [113.75, 22.55],
          ],
        ],
      },
    },
  ],
};

/**
 * 模拟 GeoJSON SPI 驱动器，按区划代码按需返回模拟数据。
 */
export const createMockGeoProvider = (onFetch?: (code: string) => void): GeoDataProvider => {
  return async (code: string) => {
    onFetch?.(code);
    if (code === 'china' || code === '100000' || code === '全国') return mockGeoChina;
    if (code === '440000' || code === 'guangdong' || code === '广东省') return mockGeoGuangdong;
    if (code === '440300' || code === 'shenzhen' || code === '深圳市') return mockGeoShenzhen;
    return mockGeoChina;
  };
};

/**
 * 各级行政区划关联的业务指标模拟数据集。
 */
export const mockMapLevelData: Record<string, Array<{ name: string; value: number }>> = {
  china: [
    { name: '广东省', value: 1280 },
    { name: '浙江省', value: 920 },
    { name: '北京市', value: 850 },
  ],
  '440000': [
    { name: '深圳市', value: 580 },
    { name: '广州市', value: 490 },
    { name: '珠海市', value: 210 },
  ],
  '440300': [
    { name: '南山区', value: 260 },
    { name: '福田区', value: 190 },
    { name: '宝安区', value: 130 },
  ],
};
