<script setup lang="ts">
/**
 * 经营趋势与时序对比预设自验场景组件。
 *
 * 验证 AtengTrendChart 预设、双 Y 轴、柱线混合、平滑渐变面积、DataZoom 缩放手柄、
 * 多指标千分位格式化 Tooltip 与标线标点。
 *
 * @author Ateng
 * @since 2026-11-05
 */

import { ref } from 'vue';
import {
  AtengTrendChart,
  type AtengTrendChartInstance,
  type TrendMetric,
  type TrendYAxisConfig,
} from '@atengk/echarts-vue';

const emit = defineEmits<{
  (e: 'log', message: string): void;
}>();

const trendChartRef = ref<AtengTrendChartInstance | null>(null);

const trendData = ref([
  { month: '2026-01', revenue: 1250000, cost: 820000, profitRate: 34.4 },
  { month: '2026-02', revenue: 1480000, cost: 910000, profitRate: 38.5 },
  { month: '2026-03', revenue: 1890000, cost: 1120000, profitRate: 40.7 },
  { month: '2026-04', revenue: 1620000, cost: 980000, profitRate: 39.5 },
  { month: '2026-05', revenue: 2150000, cost: 1250000, profitRate: 41.8 },
  { month: '2026-06', revenue: 2580000, cost: 1460000, profitRate: 43.4 },
  { month: '2026-07', revenue: 2340000, cost: 1390000, profitRate: 40.6 },
  { month: '2026-08', revenue: 2790000, cost: 1580000, profitRate: 43.3 },
  { month: '2026-09', revenue: 3120000, cost: 1720000, profitRate: 44.8 },
  { month: '2026-10', revenue: 2980000, cost: 1690000, profitRate: 43.2 },
  { month: '2026-11', revenue: 3450000, cost: 1910000, profitRate: 44.6 },
  { month: '2026-12', revenue: 4200000, cost: 2280000, profitRate: 45.7 },
]);

const isTrendZoom = ref(true);
const isTrendArea = ref(true);
const isTrendEmpty = ref(false);
const isTrendLoading = ref(false);

const trendMetrics = ref<TrendMetric[]>([
  {
    key: 'revenue',
    name: '营业收入',
    type: 'bar',
    unit: '元',
    color: '#409EFF',
    barBorderRadius: [4, 4, 0, 0],
    barWidth: 16,
  },
  {
    key: 'cost',
    name: '营业成本',
    type: 'bar',
    unit: '元',
    color: '#E6A23C',
    barBorderRadius: [4, 4, 0, 0],
    barWidth: 16,
  },
  {
    key: 'profitRate',
    name: '毛利率',
    type: 'line',
    yAxisIndex: 1,
    unit: '%',
    color: '#67C23A',
    smooth: true,
    markPoint: 'max',
  },
]);

const trendYAxis = ref<[TrendYAxisConfig, TrendYAxisConfig]>([
  { name: '财务金额 (元)', splitLine: true },
  { name: '毛利率 (%)', splitLine: false, unit: '%' },
]);

const areaMetrics = ref<TrendMetric[]>([
  {
    key: 'revenue',
    name: '营收走势 (面积渐变)',
    type: 'line',
    smooth: true,
    area: 'rgba(64, 158, 255, 0.45)',
    color: '#409EFF',
    unit: '元',
    markLine: 'average',
    markPoint: 'both',
  },
]);

const randomizeTrendData = () => {
  trendData.value = trendData.value.map(item => {
    const revenue = Math.floor(Math.random() * 3000000) + 1000000;
    const cost = Math.floor(revenue * (0.5 + Math.random() * 0.2));
    const profitRate = Number((((revenue - cost) / revenue) * 100).toFixed(1));
    return {
      ...item,
      revenue,
      cost,
      profitRate,
    };
  });
  emit('log', '已随机刷新 AtengTrendChart 趋势图扁平数据源 (验证千分位与双 Y 轴重绘)');
};

const toggleTrendZoom = () => {
  isTrendZoom.value = !isTrendZoom.value;
  emit('log', `已切换趋势图 DataZoom 缩放手柄状态为: ${isTrendZoom.value ? '启用' : '关闭'}`);
};

const toggleTrendArea = () => {
  isTrendArea.value = !isTrendArea.value;
  areaMetrics.value = [
    {
      ...areaMetrics.value[0],
      area: isTrendArea.value ? 'rgba(64, 158, 255, 0.45)' : false,
    },
  ];
  emit('log', `已切换面积平滑渐变状态为: ${isTrendArea.value ? '启用渐变' : '纯折线'}`);
};

const toggleTrendEmpty = () => {
  isTrendEmpty.value = !isTrendEmpty.value;
  emit('log', `已切换趋势图空数据遮罩为: ${isTrendEmpty.value ? '空状态' : '正常展示'}`);
};

const triggerTrendLoading = () => {
  isTrendLoading.value = true;
  emit('log', '已触发 AtengTrendChart 加载遮罩 (1.5 秒后自动恢复)');
  setTimeout(() => {
    isTrendLoading.value = false;
    emit('log', '趋势图加载完成');
  }, 1500);
};

const onChartClick = (params: unknown) => {
  const p = params as { seriesName?: string; name?: string; value?: unknown };
  emit(
    'log',
    `趋势图触发点击: 系列=${p.seriesName ?? '-'}, 月份=${p.name ?? '-'}, 数值=${p.value ?? '-'}`,
  );
};
</script>

<template>
  <div class="trend-scenario">
    <div class="action-bar">
      <button class="btn btn-primary" @click="randomizeTrendData">
        🔄 刷新趋势数据 (千分位重排)
      </button>
      <button class="btn btn-info" @click="toggleTrendZoom">
        🔍 {{ isTrendZoom ? '关闭 DataZoom 缩放' : '启用 DataZoom 缩放' }}
      </button>
      <button class="btn btn-theme" @click="toggleTrendArea">
        🎨 {{ isTrendArea ? '切换为纯折线' : '切换为平滑面积渐变' }}
      </button>
      <button class="btn btn-warning" @click="toggleTrendEmpty">
        📭 {{ isTrendEmpty ? '恢复趋势数据' : '置空趋势数据 (空遮罩)' }}
      </button>
      <button class="btn btn-secondary" @click="triggerTrendLoading">⏳ 模拟加载遮罩</button>
    </div>

    <div class="chart-grid">
      <!-- 预设卡片 1：年度财务双 Y 轴柱线混合趋势看板 -->
      <div class="chart-card">
        <div class="card-header">
          <span class="card-title">
            1. AtengTrendChart: 营业收入/成本/毛利率 (双 Y 轴 + 柱线混合 + 千分位 Tooltip)
          </span>
          <span class="badge-sub">开箱即用高频预设</span>
        </div>
        <div class="card-body">
          <AtengTrendChart
            ref="trendChartRef"
            :data="isTrendEmpty ? [] : trendData"
            dimension="month"
            :metrics="trendMetrics"
            :y-axis="trendYAxis"
            :data-zoom="isTrendZoom"
            :loading="isTrendLoading"
            theme="auto"
            height="380px"
            @chart-click="onChartClick"
          />
        </div>
      </div>

      <!-- 预设卡片 2：时序平滑面积渐变与基准均线看板 -->
      <div class="chart-card">
        <div class="card-header">
          <span class="card-title">
            2. AtengTrendChart: 单轴平滑面积渐变走势 (MarkLine 平均线 + MarkPoint 极值)
          </span>
          <span class="badge-sub">极简字段声明</span>
        </div>
        <div class="card-body">
          <AtengTrendChart
            :data="isTrendEmpty ? [] : trendData"
            dimension="month"
            :metrics="areaMetrics"
            :data-zoom="isTrendZoom"
            :loading="isTrendLoading"
            theme="auto"
            height="380px"
            @chart-click="onChartClick"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.trend-scenario {
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

.chart-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(460px, 1fr));
  gap: 20px;
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
