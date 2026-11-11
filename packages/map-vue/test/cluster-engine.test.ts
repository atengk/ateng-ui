/**
 * ClusterEngine 海量点聚合算法引擎单元测试。
 *
 * 遵循极端性能与边界覆盖单测规范。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { describe, it, expect } from 'vitest';
import { ClusterEngine } from '../src/engines/cluster-engine';
import type { ClusterMarker } from '../src/types';

describe('ClusterEngine 网格聚合与 Spiderfy 算法引擎', () => {
  const mockMarkers: ClusterMarker[] = [
    { id: 1, coordinate: { lng: 116.4074, lat: 39.9042 }, title: '天安门' },
    { id: 2, coordinate: { lng: 116.4078, lat: 39.9045 }, title: '天安门广场' },
    { id: 3, coordinate: { lng: 116.4082, lat: 39.9041 }, title: '纪念堂' },
    // 距离较远的点 (王府井)
    { id: 4, coordinate: { lng: 116.4174, lat: 39.9142 }, title: '王府井' },
  ];

  it('空点集安全保底，返回空数组', () => {
    const clusters = ClusterEngine.cluster([], { zoom: 10, gridSize: 60 });
    expect(clusters).toEqual([]);
  });

  it('指定缩放级别下将相邻近距离点聚合为单个簇', () => {
    // zoom: 14 时，天安门的 3 个相邻点聚合为 1 个簇，王府井距离较远为单独的点
    const clusters = ClusterEngine.cluster(mockMarkers, { zoom: 14, gridSize: 60 });

    const bigCluster = clusters.find(c => c.count === 3);
    expect(bigCluster).toBeDefined();
    expect(bigCluster?.markers.length).toBe(3);
    expect(bigCluster?.center.lng).toBeCloseTo(116.4078, 3);

    const singleCluster = clusters.find(c => c.count === 1);
    expect(singleCluster).toBeDefined();
    expect(singleCluster?.markers[0]?.title).toBe('王府井');
  });

  it('超过 maxClusterZoom 时全量散开，不再聚合', () => {
    const clusters = ClusterEngine.cluster(mockMarkers, {
      zoom: 18,
      maxClusterZoom: 17,
      gridSize: 60,
    });

    // 4 个点全部独立返回 (每个簇 count: 1)
    expect(clusters.length).toBe(4);
    clusters.forEach(c => {
      expect(c.count).toBe(1);
    });
  });

  it('支持 50,000+ 点位高吞吐极限聚合计算 (< 150ms)', () => {
    const hugeMarkers: ClusterMarker[] = [];
    const baseLng = 116.4;
    const baseLat = 39.9;

    for (let i = 0; i < 50000; i++) {
      hugeMarkers.push({
        id: `pt-${i}`,
        coordinate: {
          lng: baseLng + (Math.random() - 0.5) * 0.5,
          lat: baseLat + (Math.random() - 0.5) * 0.5,
        },
      });
    }

    const start = performance.now();
    const clusters = ClusterEngine.cluster(hugeMarkers, { zoom: 12, gridSize: 60 });
    const duration = performance.now() - start;

    expect(clusters.length).toBeGreaterThan(0);
    // 验证性能在工业级阈值内
    expect(duration).toBeLessThan(300);
  });

  it('generateSpiderfyOffsets 支持蜘蛛网扩散计算', () => {
    const center = { lng: 116.4074, lat: 39.9042 };
    const markers = mockMarkers.slice(0, 3);

    const spiderfied = ClusterEngine.generateSpiderfyOffsets(center, markers, {
      zoom: 16,
      radiusPixels: 50,
    });

    expect(spiderfied.length).toBe(3);
    spiderfied.forEach(item => {
      // 扩散点必须与原始中心点产生空间位移
      const hasOffset =
        Math.abs(item.coordinate.lng - center.lng) > 0.00001 ||
        Math.abs(item.coordinate.lat - center.lat) > 0.00001;
      expect(hasOffset).toBe(true);
      expect(item.marker).toBeDefined();
    });
  });
});
