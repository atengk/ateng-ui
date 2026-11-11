/**
 * MapDriverAdapter SPI 驱动适配器单元测试。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LeafletDriverAdapter, AmapDriverAdapter, type MapMarker } from '../src';

describe('MapDriverAdapter SPI 驱动适配器', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  describe('LeafletDriverAdapter 默认免密驱动', () => {
    it('应当正确初始化 Leaflet 地图实例并暴露 engineName', () => {
      const adapter = new LeafletDriverAdapter();
      expect(adapter.engineName).toBe('leaflet');

      adapter.init(container, {
        center: { lng: 116.4074, lat: 39.9042 },
        zoom: 12,
      });

      const raw = adapter.getRawInstance();
      expect(raw).toBeDefined();

      adapter.destroy();
    });

    it('应当支持平移、缩放与标记点生命周期维护', () => {
      const adapter = new LeafletDriverAdapter();
      adapter.init(container, {
        center: { lng: 116.4074, lat: 39.9042 },
        zoom: 12,
      });

      adapter.setCenter({ lng: 116.5, lat: 39.8 }, false);
      adapter.setZoom(14, false);

      const marker: MapMarker = {
        id: 'marker-1',
        coordinate: { lng: 116.4074, lat: 39.9042 },
        title: '测试图钉',
        popup: '测试弹窗',
      };

      adapter.addMarker(marker);
      // 重复添加相同 ID 应当安全覆盖更新
      adapter.addMarker(marker);

      adapter.removeMarker('marker-1');
      adapter.clearMarkers();
      adapter.invalidateSize();

      adapter.destroy();
    });

    it('应当支持自适应矩形包围盒 fitBounds', () => {
      const adapter = new LeafletDriverAdapter();
      adapter.init(container, {
        center: { lng: 116.4074, lat: 39.9042 },
        zoom: 12,
      });

      adapter.fitBounds([
        { lng: 116.3, lat: 39.8 },
        { lng: 116.5, lat: 40.0 },
      ]);

      adapter.destroy();
    });
  });

  describe('AmapDriverAdapter 动态商业驱动', () => {
    it('未传入有效 key 时构造函数应当快速失败抛出语义化异常', () => {
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new AmapDriverAdapter({} as any);
      }).toThrowError(/必须传入有效的 key/);
    });

    it('传入有效 key 时应当正确实例化并声明 engineName 为 amap', () => {
      const adapter = new AmapDriverAdapter({
        key: 'MOCK_AMAP_KEY',
        securityJsCode: 'MOCK_SECURITY_CODE',
      });

      expect(adapter.engineName).toBe('amap');
      // 未加载 SDK 前调用方法应安全静默不报错
      adapter.setCenter({ lng: 116.4, lat: 39.9 });
      adapter.setZoom(10);
      adapter.clearMarkers();
      adapter.invalidateSize();
      adapter.destroy();
    });
  });
});
