/**
 * AmapDriverAdapter 高德地图 2.0 动态驱动适配器。
 *
 * 依据 ADR-0051 规范，实现 MapDriverAdapter SPI，
 * 通过 @amap/amap-jsapi-loader 动态按需加载高德 JS API 2.0，
 * 绝不在核心包体硬编码任何商业凭证。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import type {
  MapBounds,
  MapCoordinate,
  MapDriverAdapter,
  MapInitOptions,
  MapMarker,
} from '../types';

export interface AmapDriverOptions {
  /** 高德 Web 端 JS API Key (必填) */
  key: string;
  /** 高德安全密钥 securityJsCode (可选，2021年12月后新申请 Key 必填) */
  securityJsCode?: string;
  /** JS API 版本号，默认 '2.0' */
  version?: string;
  /** 需要挂载的高德插件列表 */
  plugins?: string[];
}

export class AmapDriverAdapter implements MapDriverAdapter {
  public readonly engineName = 'amap';

  private options: AmapDriverOptions;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private AMap: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private map: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private markerMap = new Map<string | number, any>();

  constructor(options: AmapDriverOptions) {
    if (!options || !options.key) {
      throw new Error('[AmapDriverAdapter] 初始化高德地图适配器必须传入有效的 key。');
    }
    this.options = {
      version: '2.0',
      plugins: [],
      ...options,
    };
  }

  /**
   * 动态加载高德 SDK 并初始化地图容器。
   */
  public async init(container: HTMLElement, initOptions: MapInitOptions): Promise<void> {
    if (this.map) {
      this.destroy();
    }

    // 注入高德安全密钥
    if (this.options.securityJsCode && typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any)._AMapSecurityConfig = {
        securityJsCode: this.options.securityJsCode,
      };
    }

    // 动态按需加载高德 JSAPI Loader
    const loader = await import('@amap/amap-jsapi-loader');
    this.AMap = await loader.load({
      key: this.options.key,
      version: this.options.version ?? '2.0',
      plugins: this.options.plugins ?? [],
    });

    const { center, zoom, minZoom = 3, maxZoom = 20, dark } = initOptions;

    this.map = new this.AMap.Map(container, {
      center: [center.lng, center.lat],
      zoom,
      zooms: [minZoom, maxZoom],
      mapStyle: dark ? 'amap://styles/dark' : 'amap://styles/normal',
    });
  }

  /**
   * 销毁高德地图实例。
   */
  public destroy(): void {
    this.clearMarkers();
    if (this.map) {
      this.map.destroy();
      this.map = null;
    }
    this.AMap = null;
  }

  /**
   * 平移地图中心点。
   */
  public setCenter(coord: MapCoordinate, animate = true): void {
    if (!this.map) return;
    if (animate && typeof this.map.panTo === 'function') {
      this.map.panTo([coord.lng, coord.lat]);
    } else {
      this.map.setCenter([coord.lng, coord.lat]);
    }
  }

  /**
   * 设置地图缩放等级。
   */
  public setZoom(zoom: number): void {
    if (!this.map) return;
    this.map.setZoom(zoom);
  }

  /**
   * 原子更新地图中心点与缩放等级。
   */
  public setView(coord: MapCoordinate, zoom?: number): void {
    if (!this.map) return;
    if (zoom !== undefined) {
      this.map.setZoomAndCenter(zoom, [coord.lng, coord.lat]);
    } else {
      this.setCenter(coord);
    }
  }

  /**
   * 缩放以自适应包含指定矩形范围。
   */
  public fitBounds(bounds: MapBounds): void {
    if (!this.map || !this.AMap) return;
    const [sw, ne] = bounds;
    const amapBounds = new this.AMap.Bounds([sw.lng, sw.lat], [ne.lng, ne.lat]);
    this.map.setBounds(amapBounds);
  }

  /**
   * 添加标记点。
   */
  public addMarker(marker: MapMarker): void {
    if (!this.map || !this.AMap) return;

    this.removeMarker(marker.id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const markerOpts: any = {
      position: [marker.coordinate.lng, marker.coordinate.lat],
      title: marker.title,
    };

    if (marker.icon) {
      if (typeof marker.icon === 'string') {
        markerOpts.icon = marker.icon;
      } else {
        markerOpts.icon = new this.AMap.Icon({
          image: marker.icon.url,
          size: marker.icon.size
            ? new this.AMap.Size(marker.icon.size[0], marker.icon.size[1])
            : undefined,
          imageOffset: marker.icon.anchor
            ? new this.AMap.Pixel(-marker.icon.anchor[0], -marker.icon.anchor[1])
            : undefined,
        });
      }
    }

    const amapMarker = new this.AMap.Marker(markerOpts);

    if (marker.popup) {
      const infoWindow = new this.AMap.InfoWindow({
        content: marker.popup,
        offset: new this.AMap.Pixel(0, -30),
      });
      amapMarker.on('click', () => {
        infoWindow.open(this.map, amapMarker.getPosition());
      });
    }

    this.map.add(amapMarker);
    this.markerMap.set(marker.id, amapMarker);
  }

  /**
   * 移除指定 ID 的标记点。
   */
  public removeMarker(id: string | number): void {
    const existing = this.markerMap.get(id);
    if (existing && this.map) {
      this.map.remove(existing);
      this.markerMap.delete(id);
    }
  }

  /**
   * 清空所有标记点。
   */
  public clearMarkers(): void {
    if (this.map && this.markerMap.size > 0) {
      const markers = Array.from(this.markerMap.values());
      this.map.remove(markers);
    }
    this.markerMap.clear();
  }

  /**
   * 重绘与视口自愈。
   */
  public invalidateSize(): void {
    if (this.map && typeof this.map.resize === 'function') {
      this.map.resize();
    }
  }

  /**
   * 获取底层高德地图原生实例。
   */
  public getRawInstance<T = unknown>(): T {
    return this.map as T;
  }
}
