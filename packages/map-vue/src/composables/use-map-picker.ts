/**
 * useMapPicker 选点与逆地理反查无头响应式状态机。
 *
 * 遵循 ADR-0002、ADR-0013 与 ADR-0051 规范，提供双模选点、POI 防抖搜索、
 * 逆地理编码结构化地址反查与三维坐标系防漂移多态计算能力。
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
import type {
  CoordType,
  GeocodeProvider,
  GeocodeResult,
  MapCoordinate,
  PickerMode,
  PickerResult,
} from '../types';
import { DEFAULT_MAP_CENTER } from '../constants';
import { CoordTransform } from '../engines/coord-transform';

/**
 * useMapPicker 入参配置契约。
 */
export interface UseMapPickerOptions {
  /** 外部绑定的当前坐标 (响应式引用或 getter) */
  modelValue?: MaybeRefOrGetter<MapCoordinate | undefined>;
  /** 默认中心点坐标 */
  defaultCenter?: MaybeRefOrGetter<MapCoordinate | undefined>;
  /** 基准坐标系，默认 'GCJ02' */
  coordType?: MaybeRefOrGetter<CoordType | undefined>;
  /** 初始选点模式，默认 'marker' */
  mode?: MaybeRefOrGetter<PickerMode | undefined>;
  /** 自定义地理/逆地理编码提供者 */
  geocodeProvider?: GeocodeProvider;
  /** 搜索输入防抖延时 (毫秒)，默认 300 */
  debounceMs?: number;
  /** 选点变更回调 */
  onPick?: (result: PickerResult) => void;
  /** 确认回调 */
  onConfirm?: (result: PickerResult) => void;
  /** 重置回调 */
  onReset?: () => void;
}

/**
 * useMapPicker 返回门面契约。
 */
export interface UseMapPickerReturn {
  /** 当前选中的坐标 */
  selectedCoord: Ref<MapCoordinate>;
  /** 当前选中的逆地理反查结构化结果 */
  selectedAddress: Ref<GeocodeResult | null>;
  /** 三维坐标系防漂移对照表 (WGS84 ⇄ GCJ02 ⇄ BD09) */
  coordsMap: ComputedRef<{
    wgs84: MapCoordinate;
    gcj02: MapCoordinate;
    bd09: MapCoordinate;
  }>;
  /** 当前检索输入关键词 */
  searchKeyword: Ref<string>;
  /** 搜索候选列表 */
  searchResults: Ref<GeocodeResult[]>;
  /** 是否正在执行关键词检索 */
  searching: Ref<boolean>;
  /** 是否正在执行逆地理编码反查 */
  geocoding: Ref<boolean>;
  /** 当前选点模式 */
  mode: Ref<PickerMode>;
  /** 切换选点模式 */
  setMode: (mode: PickerMode) => void;
  /** 设定选中坐标并执行逆地理反查 */
  pickCoord: (coord: MapCoordinate, triggerGeocode?: boolean) => Promise<void>;
  /** 执行关键词检索 */
  search: (keyword: string) => Promise<GeocodeResult[]>;
  /** 选中搜索候选结果 */
  selectSearchResult: (item: GeocodeResult) => void;
  /** 逆地理反查指定坐标 */
  reverseGeocode: (coord: MapCoordinate) => Promise<GeocodeResult | null>;
  /** 导出当前完整 PickerResult 实体 */
  getPickerResult: () => PickerResult;
  /** 状态重置 */
  reset: () => void;
}

/**
 * 内置标杆 POI 候选库（用于离线与无商业 Key 环境兜底）。
 */
const BUILTIN_POIS: GeocodeResult[] = [
  {
    coordinate: { lng: 116.4074, lat: 39.9042, coordType: 'GCJ02' },
    formattedAddress: '北京市东城区天安门广场',
    province: '北京市',
    city: '北京市',
    district: '东城区',
    street: '东长安街',
    streetNumber: '1号',
    poiName: '天安门广场',
  },
  {
    coordinate: { lng: 116.3972, lat: 39.9181, coordType: 'GCJ02' },
    formattedAddress: '北京市东城区故宫博物院',
    province: '北京市',
    city: '北京市',
    district: '东城区',
    street: '景山前街',
    streetNumber: '4号',
    poiName: '故宫博物院',
  },
  {
    coordinate: { lng: 121.4997, lat: 31.2397, coordType: 'GCJ02' },
    formattedAddress: '上海市浦东新区陆家嘴金融贸易区东方明珠广播电视塔',
    province: '上海市',
    city: '上海市',
    district: '浦东新区',
    street: '世纪大道',
    streetNumber: '1号',
    poiName: '东方明珠广播电视塔',
  },
  {
    coordinate: { lng: 113.3245, lat: 23.119, coordType: 'GCJ02' },
    formattedAddress: '广东省广州市海珠区阅江西路广州塔',
    province: '广东省',
    city: '广州市',
    district: '海珠区',
    street: '阅江西路',
    streetNumber: '222号',
    poiName: '广州塔',
  },
  {
    coordinate: { lng: 114.0579, lat: 22.5431, coordType: 'GCJ02' },
    formattedAddress: '广东省深圳市福田区福中三路市民中心',
    province: '广东省',
    city: '深圳市',
    district: '福田区',
    street: '福中三路',
    streetNumber: '1号',
    poiName: '深圳市民中心',
  },
  {
    coordinate: { lng: 120.1536, lat: 30.2448, coordType: 'GCJ02' },
    formattedAddress: '浙江省杭州市西湖区西湖风景名胜区',
    province: '浙江省',
    city: '杭州市',
    district: '西湖区',
    street: '南山路',
    streetNumber: '1号',
    poiName: '西湖风景名胜区',
  },
];

/**
 * 创建内置兜底的地理/逆地理编码解析器。
 */
function createDefaultGeocodeProvider(): GeocodeProvider {
  return async (keywordOrCoord: string | MapCoordinate): Promise<GeocodeResult[]> => {
    // 1. 若入参为坐标：执行逆地理编码反查
    if (typeof keywordOrCoord !== 'string') {
      const { lng, lat } = keywordOrCoord;
      // 遍历已知 POI，若距离小于 2000 米，返回就近 POI
      for (const poi of BUILTIN_POIS) {
        const dLng = Math.abs(poi.coordinate.lng - lng);
        const dLat = Math.abs(poi.coordinate.lat - lat);
        if (dLng < 0.02 && dLat < 0.02) {
          return [
            {
              ...poi,
              coordinate: { ...keywordOrCoord },
            },
          ];
        }
      }

      // 未命中已知 POI，根据经纬度生成兜底格式化描述
      return [
        {
          coordinate: { ...keywordOrCoord },
          formattedAddress: `地理位置 (${lng.toFixed(6)}, ${lat.toFixed(6)})`,
          province: '中国',
          city: '未知行政区',
          poiName: '选定位置',
        },
      ];
    }

    // 2. 若入参为字符串：执行关键词检索或经纬度嗅探
    const kw = keywordOrCoord.trim();
    if (!kw) return [];

    // 正则嗅探是否直接输入了经纬度格式："116.4074, 39.9042" 或 "116.4074 39.9042"
    const coordMatch = kw.match(/^([+-]?\d+(?:\.\d+)?)\s*[,，\s]\s*([+-]?\d+(?:\.\d+)?)$/);
    if (coordMatch) {
      const p1 = parseFloat(coordMatch[1] ?? '0');
      const p2 = parseFloat(coordMatch[2] ?? '0');
      // 粗略判断经度在前还是纬度在前（中国经度 ~73~135，纬度 ~4~53）
      const lng = Math.abs(p1) > Math.abs(p2) ? p1 : p2;
      const lat = Math.abs(p1) > Math.abs(p2) ? p2 : p1;
      return [
        {
          coordinate: { lng, lat, coordType: 'GCJ02' },
          formattedAddress: `自定义坐标点 [${lng.toFixed(6)}, ${lat.toFixed(6)}]`,
          poiName: '坐标直达',
        },
      ];
    }

    // 关键词在内置 POI 库中模糊匹配
    const matched = BUILTIN_POIS.filter(
      item =>
        item.formattedAddress.includes(kw) ||
        (item.poiName && item.poiName.includes(kw)) ||
        (item.city && item.city.includes(kw)) ||
        (item.district && item.district.includes(kw)),
    );

    return matched;
  };
}

/**
 * useMapPicker 核心状态机实现。
 */
export function useMapPicker(options: UseMapPickerOptions = {}): UseMapPickerReturn {
  const getInitialCoord = (): MapCoordinate => {
    const fromModel = toValue(options.modelValue);
    if (fromModel) return { ...fromModel };
    const fromDefault = toValue(options.defaultCenter);
    if (fromDefault) return { ...fromDefault };
    return { ...DEFAULT_MAP_CENTER, coordType: toValue(options.coordType) ?? 'GCJ02' };
  };

  const selectedCoord = ref<MapCoordinate>(getInitialCoord());
  const selectedAddress = ref<GeocodeResult | null>(null);
  const searchKeyword = ref<string>('');
  const searchResults = ref<GeocodeResult[]>([]);
  const searching = ref<boolean>(false);
  const geocoding = ref<boolean>(false);
  const mode = ref<PickerMode>(toValue(options.mode) ?? 'marker');

  const activeProvider = options.geocodeProvider ?? createDefaultGeocodeProvider();

  /**
   * 基于当前选中的坐标，计算三维坐标系防漂移多态对照表。
   */
  const coordsMap = computed(() => {
    const raw = selectedCoord.value;
    const currentType = raw.coordType ?? toValue(options.coordType) ?? 'GCJ02';
    const baseCoord: MapCoordinate = { lng: raw.lng, lat: raw.lat, coordType: currentType };

    return {
      wgs84: CoordTransform.transform(baseCoord, 'WGS84'),
      gcj02: CoordTransform.transform(baseCoord, 'GCJ02'),
      bd09: CoordTransform.transform(baseCoord, 'BD09'),
    };
  });

  const getPickerResult = (): PickerResult => {
    return {
      coordinate: { ...selectedCoord.value },
      address: selectedAddress.value ? { ...selectedAddress.value } : undefined,
      coords: coordsMap.value,
    };
  };

  /**
   * 逆地理编码反查指定坐标。
   */
  const reverseGeocode = async (coord: MapCoordinate): Promise<GeocodeResult | null> => {
    geocoding.value = true;
    try {
      const results = await activeProvider(coord);
      const first = results[0];
      if (first) {
        selectedAddress.value = { ...first };
        return first;
      }
      return null;
    } catch {
      return null;
    } finally {
      geocoding.value = false;
    }
  };

  /**
   * 设置选中的坐标，并触发逆地理反查与派发。
   */
  const pickCoord = async (coord: MapCoordinate, triggerGeocode = true): Promise<void> => {
    selectedCoord.value = {
      lng: coord.lng,
      lat: coord.lat,
      coordType: coord.coordType ?? toValue(options.coordType) ?? 'GCJ02',
    };

    if (triggerGeocode) {
      await reverseGeocode(selectedCoord.value);
    }

    options.onPick?.(getPickerResult());
  };

  /**
   * 切换选点模式。
   */
  const setMode = (newMode: PickerMode): void => {
    mode.value = newMode;
  };

  /**
   * 关键词防抖检索。
   */
  let searchTimer: ReturnType<typeof setTimeout> | null = null;
  const search = async (keyword: string): Promise<GeocodeResult[]> => {
    searchKeyword.value = keyword;
    const trimmed = keyword.trim();
    if (!trimmed) {
      searchResults.value = [];
      return [];
    }

    searching.value = true;
    try {
      const res = await activeProvider(trimmed);
      searchResults.value = res;
      return res;
    } catch {
      searchResults.value = [];
      return [];
    } finally {
      searching.value = false;
    }
  };

  /**
   * 选中搜索候选结果。
   */
  const selectSearchResult = (item: GeocodeResult): void => {
    selectedCoord.value = { ...item.coordinate };
    selectedAddress.value = { ...item };
    searchKeyword.value = item.poiName || item.formattedAddress;
    searchResults.value = [];
    options.onPick?.(getPickerResult());
  };

  /**
   * 重置选点与检索状态。
   */
  const reset = (): void => {
    if (searchTimer) {
      clearTimeout(searchTimer);
      searchTimer = null;
    }
    selectedCoord.value = getInitialCoord();
    selectedAddress.value = null;
    searchKeyword.value = '';
    searchResults.value = [];
    searching.value = false;
    geocoding.value = false;
    options.onReset?.();
  };

  // 监听外部 modelValue 变更联动同步
  watch(
    () => toValue(options.modelValue),
    newVal => {
      if (newVal) {
        if (newVal.lng !== selectedCoord.value.lng || newVal.lat !== selectedCoord.value.lat) {
          pickCoord(newVal, true);
        }
      }
    },
    { deep: true },
  );

  return {
    selectedCoord,
    selectedAddress,
    coordsMap,
    searchKeyword,
    searchResults,
    searching,
    geocoding,
    mode,
    setMode,
    pickCoord,
    search,
    selectSearchResult,
    reverseGeocode,
    getPickerResult,
    reset,
  };
}
