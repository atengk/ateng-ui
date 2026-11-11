/**
 * @atengk/map-vue 常量与瓦片预设矩阵。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import type { MapCoordinate } from '../types';

/**
 * 子包版本号常量。
 */
export const MAP_VUE_VERSION = '1.0.0';

/**
 * 标准开箱即用瓦片源预设枚举常量。
 */
export const TilePreset = {
  /** 全球开源 OpenStreetMap (WGS-84) */
  OSM: 'OSM',
  /** 国家天地图矢量底图 (需配置 tk 参数) */
  TIANDITU_VEC: 'TIANDITU_VEC',
  /** 国家天地图卫星影像底图 (需配置 tk 参数) */
  TIANDITU_IMG: 'TIANDITU_IMG',
  /** CartoDB 极简高质感明亮浅色底图 */
  CARTODB_LIGHT: 'CARTODB_LIGHT',
  /** CartoDB 极简高质感暗黑极客底图 */
  CARTODB_DARK: 'CARTODB_DARK',
  /** 高德在线矢量底图 (GCJ-02) */
  AMAP_VECTOR: 'AMAP_VECTOR',
} as const;

export type TilePreset = (typeof TilePreset)[keyof typeof TilePreset];

/**
 * 瓦片预设对应的标准 HTTP(S) URL 模板映射表。
 */
export const TILE_URL_TEMPLATES: Record<TilePreset, string> = {
  [TilePreset.OSM]: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  [TilePreset.CARTODB_LIGHT]: 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
  [TilePreset.CARTODB_DARK]: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
  [TilePreset.TIANDITU_VEC]:
    'https://t{s}.tianditu.gov.cn/vec_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk={token}',
  [TilePreset.TIANDITU_IMG]:
    'https://t{s}.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk={token}',
  [TilePreset.AMAP_VECTOR]:
    'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
};

/**
 * 默认中心点坐标（北京天安门，GCJ-02）。
 */
export const DEFAULT_MAP_CENTER: MapCoordinate = {
  lng: 116.4074,
  lat: 39.9042,
  coordType: 'GCJ02',
};

/**
 * 默认初始地图缩放等级。
 */
export const DEFAULT_MAP_ZOOM = 11;

/**
 * 默认瓦片版权署名信息。
 */
export const DEFAULT_MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';
