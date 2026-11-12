/**
 * LeafletDriverAdapter 底座驱动适配器。
 *
 * 依据 ADR-0051，基于 Leaflet 1.9.x 实现 MapDriverAdapter SPI，
 * 作为 @atengk/map-vue 的默认内置免密渲染驱动。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import L from 'leaflet';
import type {
  MapBounds,
  MapCoordinate,
  MapDriverAdapter,
  MapInitOptions,
  MapMarker,
  MapMarkerIcon,
} from '../types';
import { DEFAULT_MAP_ATTRIBUTION, TILE_URL_TEMPLATES, TilePreset } from '../constants';

/**
 * 防御 Leaflet 缩放动画中由于图层移除/状态竞态产生的 _latLngToNewLayerPoint 空指针异常。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const patchAnimateZoom = (targetProto: any) => {
  if (targetProto && typeof targetProto._animateZoom === 'function') {
    const orig = targetProto._animateZoom;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    targetProto._animateZoom = function (this: any, opt: any) {
      if (!this._map) return;
      return orig.call(this, opt);
    };
  }
};

patchAnimateZoom(L.Marker?.prototype);
patchAnimateZoom(L.Popup?.prototype);
patchAnimateZoom(L.Tooltip?.prototype);

export class LeafletDriverAdapter implements MapDriverAdapter {
  public readonly engineName = 'leaflet';

  private map: L.Map | null = null;
  private tileLayer: L.TileLayer | null = null;
  private markerLayer: L.LayerGroup | null = null;
  private markerMap = new Map<string | number, L.Marker>();

  /**
   * 初始化 Leaflet 地图容器。
   */
  public init(container: HTMLElement, options: MapInitOptions): void {
    if (this.map) {
      this.destroy();
    }

    const { center, zoom, minZoom = 3, maxZoom = 18, tileUrl, interactive = true } = options;

    this.map = L.map(container, {
      center: [center.lat, center.lng],
      zoom,
      minZoom,
      maxZoom,
      dragging: interactive,
      touchZoom: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      boxZoom: interactive,
      zoomControl: false,
      attributionControl: false,
    });

    const urlTemplate = tileUrl ?? TILE_URL_TEMPLATES[TilePreset.OSM];
    this.tileLayer = L.tileLayer(urlTemplate, {
      minZoom,
      maxZoom,
      attribution: DEFAULT_MAP_ATTRIBUTION,
    }).addTo(this.map);

    this.markerLayer = L.layerGroup().addTo(this.map);
  }

  /**
   * 彻底销毁地图实例并释放资源。
   */
  public destroy(): void {
    if (this.markerLayer) {
      this.markerLayer.clearLayers();
      this.markerLayer = null;
    }
    this.markerMap.clear();

    if (this.tileLayer) {
      this.tileLayer.remove();
      this.tileLayer = null;
    }

    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  /**
   * 平移地图中心点。
   */
  public setCenter(coord: MapCoordinate, animate = true): void {
    if (!this.map) return;
    this.map.panTo([coord.lat, coord.lng], { animate });
  }

  /**
   * 设置地图缩放等级。
   */
  public setZoom(zoom: number, animate = true): void {
    if (!this.map) return;
    this.map.setZoom(zoom, { animate });
  }

  /**
   * 原子更新地图中心点与缩放等级（避免平移与缩放动画重叠冲突）。
   */
  public setView(coord: MapCoordinate, zoom?: number, animate = true): void {
    if (!this.map) return;
    const targetZoom = zoom !== undefined ? zoom : this.map.getZoom();
    this.map.setView([coord.lat, coord.lng], targetZoom, { animate });
  }

  /**
   * 动态更新底图瓦片 URL 模板。
   */
  public updateTileUrl(url: string): void {
    if (this.tileLayer) {
      this.tileLayer.setUrl(url);
    }
  }

  /**
   * 缩放以包含指定矩形包围盒。
   */
  public fitBounds(bounds: MapBounds, padding: [number, number] = [20, 20]): void {
    if (!this.map) return;
    const [sw, ne] = bounds;
    const leafletBounds = L.latLngBounds([sw.lat, sw.lng], [ne.lat, ne.lng]);
    this.map.fitBounds(leafletBounds, { padding });
  }

  /**
   * 添加标记点。
   */
  public addMarker(marker: MapMarker): void {
    if (!this.map || !this.markerLayer) return;

    // 若已存在相同 ID 标记则先移除
    this.removeMarker(marker.id);

    const latLng: L.LatLngTuple = [marker.coordinate.lat, marker.coordinate.lng];
    const markerOptions: L.MarkerOptions = {
      title: marker.title,
    };

    if (marker.icon) {
      markerOptions.icon = this.resolveLeafletIcon(marker.icon);
    }

    const leafletMarker = L.marker(latLng, markerOptions);

    if (marker.popup) {
      leafletMarker.bindPopup(marker.popup);
    }

    this.markerLayer.addLayer(leafletMarker);
    this.markerMap.set(marker.id, leafletMarker);
  }

  /**
   * 移除指定 ID 的标记点。
   */
  public removeMarker(id: string | number): void {
    const existing = this.markerMap.get(id);
    if (existing && this.markerLayer) {
      this.markerLayer.removeLayer(existing);
      this.markerMap.delete(id);
    }
  }

  /**
   * 清空所有标记点。
   */
  public clearMarkers(): void {
    if (this.markerLayer) {
      this.markerLayer.clearLayers();
    }
    this.markerMap.clear();
  }

  /**
   * 触发视口尺寸自愈重新计算。
   */
  public invalidateSize(): void {
    if (this.map) {
      this.map.invalidateSize();
    }
  }

  /**
   * 获取底层原生 Leaflet 地图实例。
   */
  public getRawInstance<T = L.Map>(): T {
    return this.map as unknown as T;
  }

  private resolveLeafletIcon(icon: string | MapMarkerIcon): L.Icon {
    if (typeof icon === 'string') {
      return L.icon({
        iconUrl: icon,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
      });
    }

    return L.icon({
      iconUrl: icon.url,
      iconSize: icon.size ?? [25, 41],
      iconAnchor: icon.anchor ?? [12, 41],
      popupAnchor: [1, -34],
    });
  }
}
