/**
 * useMap 核心无状态地图无头状态机。
 *
 * 遵循 ADR-0002、ADR-0013 与 ADR-0051 规范，以非响应式浅引用持有 MapDriverAdapter 底层实例，
 * 彻底杜绝 Vue 深度 Proxy 代理对第三方地图引擎带来的性能损耗与原型污染；
 * 统一封装生命周期、视口几何自愈与对称命令式门面。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import {
  ref,
  watch,
  onScopeDispose,
  getCurrentScope,
  toValue,
  type Ref,
  type MaybeRefOrGetter,
} from 'vue';
import type {
  CoordType,
  MapBounds,
  MapCoordinate,
  MapDriverAdapter,
  MapInitOptions,
  MapMarker,
} from '../types';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, TilePreset, TILE_URL_TEMPLATES } from '../constants';
import { LeafletDriverAdapter } from '../adapters/leaflet-driver-adapter';
import { MapResizeGuard } from '../guards/map-resize-guard';
import { useMapThemeSync } from './use-map-theme-sync';

export interface UseMapOptions {
  /** 地图挂载容器元素引用 */
  container?: MaybeRefOrGetter<HTMLElement | null | undefined>;
  /** 初始中心点坐标 */
  center?: MaybeRefOrGetter<MapCoordinate | undefined>;
  /** 初始缩放等级 */
  zoom?: MaybeRefOrGetter<number | undefined>;
  /** 最小缩放等级 */
  minZoom?: MaybeRefOrGetter<number | undefined>;
  /** 最大缩放等级 */
  maxZoom?: MaybeRefOrGetter<number | undefined>;
  /** 瓦片源预设枚举 */
  tilePreset?: MaybeRefOrGetter<TilePreset | string | undefined>;
  /** 自定义瓦片服务模板 URL */
  tileUrl?: MaybeRefOrGetter<string | undefined>;
  /** 渲染引擎类型，默认 'leaflet' */
  engine?: MaybeRefOrGetter<'leaflet' | 'amap' | 'baidu' | undefined>;
  /** 自定义底层驱动适配器 (最高优先级) */
  driver?: MaybeRefOrGetter<MapDriverAdapter | undefined>;
  /** 坐标系类型 */
  coordType?: MaybeRefOrGetter<CoordType | undefined>;
  /** 暗黑模式开关或 'auto' */
  dark?: MaybeRefOrGetter<boolean | 'auto' | undefined>;
  /** 是否开启地图交互 */
  interactive?: MaybeRefOrGetter<boolean | undefined>;
  /** 是否开启 ResizeObserver 自动尺寸自愈，默认 true */
  autoResize?: boolean;
  /** 单击事件回调 */
  onMapClick?: (e: { coordinate: MapCoordinate; originalEvent: MouseEvent }) => void;
  /** 双击事件回调 */
  onMapDblClick?: (e: { coordinate: MapCoordinate; originalEvent: MouseEvent }) => void;
  /** 视野移动结束回调 */
  onMapMoveEnd?: (center: MapCoordinate) => void;
  /** 缩放等级改变结束回调 */
  onMapZoomEnd?: (zoom: number) => void;
  /** 地图就绪回调 */
  onReady?: (driver: MapDriverAdapter) => void;
}

export interface UseMapReturn {
  /** 地图是否初始化就绪 */
  ready: Ref<boolean>;
  /** 是否正在加载初始化中 */
  loading: Ref<boolean>;
  /** 当前中心点坐标 */
  currentCenter: Ref<MapCoordinate>;
  /** 当前缩放等级 */
  currentZoom: Ref<number>;
  /** 当前是否处于暗黑主题 */
  isDark: Readonly<{ value: boolean }>;
  /** 挂载并初始化地图 */
  mount: (targetContainer?: HTMLElement) => Promise<void> | void;
  /** 彻底销毁释放地图资源 */
  dispose: () => void;
  /** 平移地图中心点 */
  setCenter: (coord: MapCoordinate, animate?: boolean) => void;
  /** 设置地图缩放等级 */
  setZoom: (zoom: number, animate?: boolean) => void;
  /** 平移动画至指定点 */
  panTo: (coord: MapCoordinate, animate?: boolean) => void;
  /** 缩放以包含指定矩形边界 */
  fitBounds: (bounds: MapBounds, padding?: [number, number]) => void;
  /** 添加标记点 */
  addMarker: (marker: MapMarker) => void;
  /** 移除指定标记点 */
  removeMarker: (id: string | number) => void;
  /** 清空所有标记点 */
  clearMarkers: () => void;
  /** 触发尺寸自愈重新计算 */
  invalidateSize: () => void;
  /** 获取底层原生驱动实例 */
  getDriver: () => MapDriverAdapter | null;
  /** 获取原生引擎实例 (如 Leaflet Map) */
  getRawInstance: <T = unknown>() => T | null;
  /** 获取当前挂载的 DOM 容器元素 */
  getContainer: () => HTMLElement | null;
}

export function useMap(options: UseMapOptions = {}): UseMapReturn {
  const ready = ref(false);
  const loading = ref(false);
  const currentCenter = ref<MapCoordinate>({
    ...(toValue(options.center) ?? DEFAULT_MAP_CENTER),
  });
  const currentZoom = ref<number>(toValue(options.zoom) ?? DEFAULT_MAP_ZOOM);

  // 内部浅引用持有驱动与自愈守卫，严禁深度响应式代理
  let driverInstance: MapDriverAdapter | null = null;
  let resizeGuard: MapResizeGuard | null = null;
  let activeContainer: HTMLElement | null = null;

  // 响应式暗黑模式同步
  const themeSync = useMapThemeSync({
    theme: () => toValue(options.dark) ?? 'auto',
  });

  const resolveTileUrl = (): string => {
    const customUrl = toValue(options.tileUrl);
    if (customUrl) return customUrl;
    const preset = (toValue(options.tilePreset) ?? TilePreset.OSM) as TilePreset;
    return TILE_URL_TEMPLATES[preset] ?? TILE_URL_TEMPLATES[TilePreset.OSM];
  };

  /**
   * 创建或解析当前生效的驱动适配器。
   */
  const resolveDriver = (): MapDriverAdapter => {
    const customDriver = toValue(options.driver);
    if (customDriver) return customDriver;

    // 默认使用内置免密 Leaflet 驱动
    return new LeafletDriverAdapter();
  };

  /**
   * 绑定底层原生引擎的交互事件。
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bindDriverEvents = (raw: any): void => {
    if (!raw || typeof raw.on !== 'function') return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    raw.on('click', (e: any) => {
      if (!e) return;
      const lng = e.latlng?.lng ?? e.lnglat?.getLng?.() ?? e.lnglat?.lng;
      const lat = e.latlng?.lat ?? e.lnglat?.getLat?.() ?? e.lnglat?.lat;
      if (lng !== undefined && lat !== undefined) {
        options.onMapClick?.({
          coordinate: { lng, lat, coordType: toValue(options.coordType) ?? 'GCJ02' },
          originalEvent: e.originalEvent,
        });
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    raw.on('dblclick', (e: any) => {
      if (!e) return;
      const lng = e.latlng?.lng ?? e.lnglat?.getLng?.() ?? e.lnglat?.lng;
      const lat = e.latlng?.lat ?? e.lnglat?.getLat?.() ?? e.lnglat?.lat;
      if (lng !== undefined && lat !== undefined) {
        options.onMapDblClick?.({
          coordinate: { lng, lat, coordType: toValue(options.coordType) ?? 'GCJ02' },
          originalEvent: e.originalEvent,
        });
      }
    });

    raw.on('moveend', () => {
      if (typeof raw.getCenter === 'function') {
        const center = raw.getCenter();
        const lng = center.lng ?? center.getLng?.();
        const lat = center.lat ?? center.getLat?.();
        if (lng !== undefined && lat !== undefined) {
          currentCenter.value = { lng, lat, coordType: toValue(options.coordType) ?? 'GCJ02' };
          options.onMapMoveEnd?.(currentCenter.value);
        }
      }
    });

    raw.on('zoomend', () => {
      if (typeof raw.getZoom === 'function') {
        const z = raw.getZoom();
        currentZoom.value = z;
        options.onMapZoomEnd?.(z);
      }
    });
  };

  /**
   * 挂载并初始化地图实例。
   */
  const mount = async (targetContainer?: HTMLElement): Promise<void> => {
    const container = targetContainer ?? toValue(options.container);
    if (!container) return;

    if (driverInstance) {
      dispose();
    }

    loading.value = true;
    activeContainer = container;

    try {
      driverInstance = resolveDriver();

      const initOptions: MapInitOptions = {
        center: currentCenter.value,
        zoom: currentZoom.value,
        minZoom: toValue(options.minZoom),
        maxZoom: toValue(options.maxZoom),
        tileUrl: resolveTileUrl(),
        interactive: toValue(options.interactive) ?? true,
        dark: themeSync.isDark.value,
      };

      await driverInstance.init(container, initOptions);
      if (!driverInstance) return;

      // 绑定交互事件监听
      const raw = driverInstance.getRawInstance();
      bindDriverEvents(raw);

      // 挂载尺寸自愈守卫
      if (options.autoResize !== false && !resizeGuard) {
        resizeGuard = new MapResizeGuard(container, () => {
          invalidateSize();
        });
      }

      ready.value = true;
      if (driverInstance) {
        options.onReady?.(driverInstance);
      }
    } finally {
      loading.value = false;
    }
  };

  /**
   * 销毁并释放资源。
   */
  const dispose = (): void => {
    if (resizeGuard) {
      resizeGuard.disconnect();
      resizeGuard = null;
    }

    themeSync.dispose();

    if (driverInstance) {
      try {
        driverInstance.destroy();
      } catch {
        // 忽略宿主销毁降级异常
      }
      driverInstance = null;
    }

    activeContainer = null;
    ready.value = false;
    loading.value = false;
  };

  const setCenter = (coord: MapCoordinate, animate = true): void => {
    currentCenter.value = { ...coord };
    driverInstance?.setCenter(coord, animate);
  };

  const setZoom = (zoom: number, animate = true): void => {
    currentZoom.value = zoom;
    driverInstance?.setZoom(zoom, animate);
  };

  const panTo = (coord: MapCoordinate, animate = true): void => {
    setCenter(coord, animate);
  };

  const fitBounds = (bounds: MapBounds, padding?: [number, number]): void => {
    driverInstance?.fitBounds(bounds, padding);
  };

  const addMarker = (marker: MapMarker): void => {
    driverInstance?.addMarker(marker);
  };

  const removeMarker = (id: string | number): void => {
    driverInstance?.removeMarker(id);
  };

  const clearMarkers = (): void => {
    driverInstance?.clearMarkers();
  };

  const invalidateSize = (): void => {
    driverInstance?.invalidateSize();
  };

  const getDriver = (): MapDriverAdapter | null => {
    return driverInstance;
  };

  const getRawInstance = <T = unknown>(): T | null => {
    return (driverInstance?.getRawInstance<T>() ?? null) as T | null;
  };

  // 监听外部 center 与 zoom 响应式变化同步更新
  watch(
    () => toValue(options.center),
    newCenter => {
      if (newCenter && driverInstance) {
        const diff =
          Math.abs(newCenter.lng - currentCenter.value.lng) > 0.000001 ||
          Math.abs(newCenter.lat - currentCenter.value.lat) > 0.000001;
        if (diff) {
          setCenter(newCenter, false);
        }
      }
    },
  );

  watch(
    () => toValue(options.zoom),
    newZoom => {
      if (newZoom !== undefined && newZoom !== currentZoom.value && driverInstance) {
        setZoom(newZoom, false);
      }
    },
  );

  if (getCurrentScope()) {
    onScopeDispose(dispose);
  }

  return {
    ready,
    loading,
    currentCenter,
    currentZoom,
    isDark: themeSync.isDark,
    mount,
    dispose,
    setCenter,
    setZoom,
    panTo,
    fitBounds,
    addMarker,
    removeMarker,
    clearMarkers,
    invalidateSize,
    getDriver,
    getRawInstance,
    getContainer: () => activeContainer,
  };
}
