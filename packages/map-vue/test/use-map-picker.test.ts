/**
 * useMapPicker 状态机单元测试。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { describe, it, expect, vi } from 'vitest';
import { useMapPicker } from '../src/composables/use-map-picker';
import type { MapCoordinate, GeocodeResult } from '../src/types';

describe('useMapPicker 单元测试', () => {
  it('应当正确初始化并计算三维坐标系多态对照表', () => {
    const initialCoord: MapCoordinate = { lng: 116.4074, lat: 39.9042, coordType: 'GCJ02' };
    const picker = useMapPicker({
      defaultCenter: initialCoord,
    });

    expect(picker.selectedCoord.value.lng).toBeCloseTo(116.4074, 4);
    expect(picker.selectedCoord.value.lat).toBeCloseTo(39.9042, 4);
    expect(picker.mode.value).toBe('marker');

    const coords = picker.coordsMap.value;
    expect(coords.gcj02.lng).toBeCloseTo(116.4074, 4);
    expect(coords.wgs84.lng).toBeDefined();
    expect(coords.bd09.lng).toBeDefined();
    // GCJ02 转 WGS84 经度会有轻微偏移
    expect(coords.wgs84.lng).not.toBe(116.4074);
  });

  it('应当支持切换选点模式', () => {
    const picker = useMapPicker({ mode: 'marker' });
    expect(picker.mode.value).toBe('marker');

    picker.setMode('crosshair');
    expect(picker.mode.value).toBe('crosshair');
  });

  it('应当在 pickCoord 时更新坐标并自动触发逆地理反查', async () => {
    const customProvider = vi.fn().mockResolvedValue([
      {
        coordinate: { lng: 116.4074, lat: 39.9042, coordType: 'GCJ02' },
        formattedAddress: '北京市东城区天安门广场',
        province: '北京市',
        city: '北京市',
        district: '东城区',
      } as GeocodeResult,
    ]);

    const picker = useMapPicker({
      geocodeProvider: customProvider,
    });

    await picker.pickCoord({ lng: 116.4074, lat: 39.9042 });

    expect(customProvider).toHaveBeenCalled();
    expect(picker.selectedAddress.value).not.toBeNull();
    expect(picker.selectedAddress.value?.formattedAddress).toBe('北京市东城区天安门广场');
    expect(picker.selectedAddress.value?.city).toBe('北京市');
  });

  it('内置默认 Provider 应当支持直接解析经纬度字符串搜索', async () => {
    const picker = useMapPicker();
    const results = await picker.search('121.4997, 31.2397');

    expect(results.length).toBeGreaterThan(0);
    const first = results[0];
    expect(first).toBeDefined();
    expect(first?.coordinate.lng).toBeCloseTo(121.4997, 4);
    expect(first?.coordinate.lat).toBeCloseTo(31.2397, 4);
  });

  it('内置默认 Provider 应当支持常用地标关键词模糊检索与项选择', async () => {
    const picker = useMapPicker();
    const results = await picker.search('天安门');

    expect(results.length).toBeGreaterThan(0);
    const item = results[0];
    expect(item).toBeDefined();
    expect(item?.formattedAddress).toContain('天安门');

    if (item) {
      picker.selectSearchResult(item);
      expect(picker.selectedCoord.value.lng).toBe(item.coordinate.lng);
      expect(picker.selectedAddress.value?.formattedAddress).toBe(item.formattedAddress);
      expect(picker.searchResults.value).toEqual([]);
    }
  });

  it('应当能够导出规范的 PickerResult 实体', () => {
    const picker = useMapPicker({
      defaultCenter: { lng: 116.4074, lat: 39.9042, coordType: 'GCJ02' },
    });

    const res = picker.getPickerResult();
    expect(res.coordinate.lng).toBeCloseTo(116.4074, 4);
    expect(res.coords.wgs84).toBeDefined();
    expect(res.coords.gcj02).toBeDefined();
    expect(res.coords.bd09).toBeDefined();
  });

  it('应当在调用 reset 时恢复默认状态', async () => {
    const defaultCenter = { lng: 114.0579, lat: 22.5431, coordType: 'GCJ02' as const };
    const picker = useMapPicker({ defaultCenter });

    await picker.pickCoord({ lng: 120.1536, lat: 30.2448 });
    expect(picker.selectedCoord.value.lng).toBe(120.1536);

    picker.reset();
    expect(picker.selectedCoord.value.lng).toBe(114.0579);
    expect(picker.selectedCoord.value.lat).toBe(22.5431);
    expect(picker.searchKeyword.value).toBe('');
    expect(picker.searchResults.value).toEqual([]);
  });
});
