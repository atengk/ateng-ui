<script setup lang="ts">
/**
 * 行政区划与散点地图多级下钻自验场景组件。
 *
 * 验证 AtengMapChart 预设、GeoDataProvider SPI 驱动、全国 ➔ 广东省 ➔ 深圳市三级下钻状态机、
 * 路径栈回退与渐变面包屑药丸导航。
 *
 * @author Ateng
 * @since 2026-11-05
 */

import { ref, computed } from 'vue';
import {
  AtengMapChart,
  type AtengMapChartInstance,
  type GeoDataProvider,
} from '@atengk/echarts-vue';
import { createMockGeoProvider, mockMapLevelData } from './data/mockGeo';

const emit = defineEmits<{
  (e: 'log', message: string): void;
}>();

const mapChartRef = ref<AtengMapChartInstance | null>(null);
const isMapEmpty = ref(false);

const mockGeoProvider: GeoDataProvider = createMockGeoProvider(code => {
  emit('log', `[GeoSPI] 正在异步拉取行政区划 GeoJSON: [${code}]`);
});

const currentMapData = computed(() => {
  const currentCode = mapChartRef.value?.currentNode?.code ?? 'china';
  return mockMapLevelData[currentCode] ?? mockMapLevelData.china;
});

const drillToGuangdong = async () => {
  if (mapChartRef.value) {
    await mapChartRef.value.drillTo({ code: '440000', name: '广东省' });
    emit('log', '已编程式受控下钻至: [广东省 (440000)]');
  }
};

const drillToShenzhen = async () => {
  if (mapChartRef.value) {
    await mapChartRef.value.drillTo({ code: '440300', name: '深圳市' });
    emit('log', '已编程式受控下钻至: [深圳市 (440300)]');
  }
};

const handleMapBack = async () => {
  if (mapChartRef.value) {
    await mapChartRef.value.back();
    emit('log', '已触发地图回退上一级');
  }
};

const handleMapReset = async () => {
  if (mapChartRef.value) {
    await mapChartRef.value.reset();
    emit('log', '已重置地图路径回到全国根节点');
  }
};

const toggleMapEmpty = () => {
  isMapEmpty.value = !isMapEmpty.value;
  emit('log', `已切换地图空状态遮罩为: ${isMapEmpty.value ? '空数据态' : '正常数据态'}`);
};

const onChartClick = (params: unknown) => {
  const p = params as { name?: string; value?: unknown };
  emit('log', `地图触发区域点击: 区域=${p.name ?? '-'}, 订单量=${p.value ?? '-'}`);
};
</script>

<template>
  <div class="map-scenario">
    <div class="action-bar">
      <button class="btn btn-primary" @click="drillToGuangdong">📍 下钻至广东省 (440000)</button>
      <button class="btn btn-info" @click="drillToShenzhen">🏙️ 下钻至深圳市 (440300)</button>
      <button class="btn btn-secondary" @click="handleMapBack">◀ 返回上一级</button>
      <button class="btn btn-theme" @click="handleMapReset">🌐 重置回到全国</button>
      <button class="btn btn-warning" @click="toggleMapEmpty">
        📭 {{ isMapEmpty ? '恢复地图数据' : '置空地图数据' }}
      </button>
    </div>

    <div class="chart-card">
      <div class="card-header">
        <span class="card-title">
          1. AtengMapChart: 全国物流仓储与订单密度 (全国 ➔ 省 ➔ 市 三级行政区划受控下钻)
        </span>
        <span class="badge-sub">GeoDataProvider SPI + 渐变面包屑药丸</span>
      </div>
      <div class="card-body">
        <AtengMapChart
          ref="mapChartRef"
          :data="isMapEmpty ? [] : currentMapData"
          :geo-provider="mockGeoProvider"
          theme="auto"
          height="520px"
          @chart-click="onChartClick"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-scenario {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.action-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.chart-card {
  background: var(--bg-card, #ffffff);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

:global(.dark) .chart-card {
  background: #1d1e1f;
  border-color: #2c2d2e;
}

.card-header {
  padding: 12px 16px;
  background: var(--bg-header, #f9fafb);
  border-bottom: 1px solid var(--border-color, #e5e7eb);
  font-weight: 600;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

:global(.dark) .card-header {
  background: #191a1b;
  border-bottom-color: #2c2d2e;
}

.badge-sub {
  background-color: #f59e0b;
  color: #fff;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
}

.card-body {
  padding: 16px;
}

.btn {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.btn-primary {
  background-color: #2563eb;
  color: #fff;
}
.btn-primary:hover {
  background-color: #1d4ed8;
}

.btn-info {
  background-color: #0284c7;
  color: #fff;
}
.btn-info:hover {
  background-color: #0369a1;
}

.btn-theme {
  background-color: #4f46e5;
  color: #fff;
}
.btn-theme:hover {
  background-color: #4338ca;
}

.btn-warning {
  background-color: #f59e0b;
  color: #fff;
}
.btn-warning:hover {
  background-color: #d97706;
}

.btn-secondary {
  background-color: #f3f4f6;
  color: #374151;
  border-color: #d1d5db;
}
.btn-secondary:hover {
  background-color: #e5e7eb;
}

:global(.dark) .btn-secondary {
  background-color: #1f2022;
  color: #e5eaf3;
  border-color: #363637;
}
</style>
