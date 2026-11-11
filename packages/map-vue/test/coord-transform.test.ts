/**
 * CoordTransform 坐标防漂移算法高精度单元测试。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { describe, it, expect } from 'vitest';
import {
  CoordTransform,
  outOfChina,
  wgs84ToGcj02,
  gcj02ToWgs84,
  gcj02ToBd09,
  bd09ToGcj02,
  wgs84ToBd09,
  bd09ToWgs84,
  transformCoordinate,
  calculateHaversineDistance,
  type MapCoordinate,
} from '../src';

describe('CoordTransform 坐标转换引擎', () => {
  // 北京天安门基准参考坐标 (真实经纬度)
  const beijingWgs: MapCoordinate = { lng: 116.397428, lat: 39.90923, coordType: 'WGS84' };
  // 纽约自由女神像坐标 (境外)
  const newYorkWgs: MapCoordinate = { lng: -74.0445, lat: 40.6892, coordType: 'WGS84' };

  it('应当正确判定中国境内外坐标边界', () => {
    expect(outOfChina(beijingWgs.lng, beijingWgs.lat)).toBe(false);
    expect(outOfChina(newYorkWgs.lng, newYorkWgs.lat)).toBe(true);
    expect(outOfChina(0, 0)).toBe(true);
  });

  it('境外坐标转换应当保持原始数值不变', () => {
    const gcj = wgs84ToGcj02(newYorkWgs);
    expect(gcj.lng).toBe(newYorkWgs.lng);
    expect(gcj.lat).toBe(newYorkWgs.lat);

    const backWgs = gcj02ToWgs84(gcj);
    expect(backWgs.lng).toBe(newYorkWgs.lng);
    expect(backWgs.lat).toBe(newYorkWgs.lat);
  });

  it('WGS-84 转 GCJ-02 应当产生正确的火星偏移，且可双向往返微米级逼近', () => {
    const gcj = wgs84ToGcj02(beijingWgs);
    expect(gcj.coordType).toBe('GCJ02');
    // 火星坐标在经度和纬度上均有数百米微小偏置
    expect(gcj.lng).not.toBe(beijingWgs.lng);
    expect(gcj.lat).not.toBe(beijingWgs.lat);

    // 往返逆算回算回 WGS-84
    const backWgs = gcj02ToWgs84(gcj);
    expect(backWgs.coordType).toBe('WGS84');

    // 验证往返误差（两点距离误差必须小于 0.5 米）
    const errorDistance = calculateHaversineDistance(beijingWgs, backWgs);
    expect(errorDistance).toBeLessThan(0.5);
  });

  it('GCJ-02 与 BD-09 之间应当无损双向互转', () => {
    const gcj = wgs84ToGcj02(beijingWgs);
    const bd09 = gcj02ToBd09(gcj);
    expect(bd09.coordType).toBe('BD09');

    // 百度坐标偏移量验证
    expect(bd09.lng).toBeGreaterThan(gcj.lng);
    expect(bd09.lat).toBeGreaterThan(gcj.lat);

    // 逆算回 GCJ-02
    const backGcj = bd09ToGcj02(bd09);
    expect(backGcj.coordType).toBe('GCJ02');

    const errorDistance = calculateHaversineDistance(gcj, backGcj);
    expect(errorDistance).toBeLessThan(0.1);
  });

  it('WGS-84 与 BD-09 之间应当正确级联转换', () => {
    const bd09 = wgs84ToBd09(beijingWgs);
    expect(bd09.coordType).toBe('BD09');

    const backWgs = bd09ToWgs84(bd09);
    expect(backWgs.coordType).toBe('WGS84');

    const errorDistance = calculateHaversineDistance(beijingWgs, backWgs);
    expect(errorDistance).toBeLessThan(0.5);
  });

  it('通用 transformCoordinate 应当根据源类型与目标类型智能转译', () => {
    // 相同类型直接返回副本
    const same = transformCoordinate(beijingWgs, 'WGS84');
    expect(same.lng).toBe(beijingWgs.lng);

    // WGS84 -> BD09
    const toBd = transformCoordinate(beijingWgs, 'BD09');
    expect(toBd.coordType).toBe('BD09');

    // BD09 -> WGS84
    const backWgs = transformCoordinate(toBd, 'WGS84');
    expect(backWgs.coordType).toBe('WGS84');
    expect(calculateHaversineDistance(beijingWgs, backWgs)).toBeLessThan(0.5);

    // 静态门面 CoordTransform.transform 测试
    const facadeResult = CoordTransform.transform(beijingWgs, 'GCJ02');
    expect(facadeResult.coordType).toBe('GCJ02');
  });
});
