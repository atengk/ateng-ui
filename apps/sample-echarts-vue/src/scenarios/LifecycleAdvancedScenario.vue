<script setup lang="ts">
/**
 * 高级生命周期、脱壳全屏与高清导出自验场景组件。
 *
 * 验证模态弹窗 Dialog 0x0 挂起自愈、初始隐藏 Tab 零尺寸自愈、原生/页面全屏双模脱壳、
 * 2x/3x 高清图片报表导出驱动与 `#toolbar` 作用域插槽完全接管。
 *
 * @author Ateng
 * @since 2026-11-05
 */

import { ref } from 'vue';
import {
  AtengECharts,
  AtengTrendChart,
  type AtengEChartsInstance,
  type AtengTrendChartInstance,
  type EChartsOption,
  type TrendMetric,
} from '@atengk/echarts-vue';

const emit = defineEmits<{
  (e: 'log', message: string): void;
}>();

const toolbarChartRef = ref<AtengEChartsInstance | null>(null);
const customToolbarChartRef = ref<AtengTrendChartInstance | null>(null);
const isDialogOpen = ref(false);
const activeSubTab = ref<'toolbar' | 'hiddenTab'>('toolbar');

// 1. 柱线混合图表配置 (全屏与导出自验)
const overviewOption = ref<EChartsOption>({
  title: {
    text: '企业级全景监控大盘',
    subtext: '全屏脱壳与高清导出增强自验',
    left: 'center',
    top: 8,
  },
  tooltip: {
    trigger: 'axis',
  },
  grid: {
    top: 72,
    left: '3%',
    right: '4%',
    bottom: '4%',
    containLabel: true,
  },
  xAxis: {
    type: 'category',
    data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
  },
  yAxis: {
    type: 'value',
    name: '调用量 (万次)',
  },
  series: [
    {
      name: 'API 调用量',
      type: 'bar',
      data: [320, 432, 401, 534, 590, 630, 610],
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        color: '#409EFF',
      },
    },
  ],
});

// 2. 隐藏 Tab 时序面积图 (0x0 几何挂起自愈测试)
const areaOption = ref<EChartsOption>({
  title: {
    text: '高频并发时序追踪 (Tab 零尺寸自愈)',
    left: 'center',
  },
  tooltip: { trigger: 'axis' },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true,
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
  },
  yAxis: { type: 'value', name: 'QPS' },
  series: [
    {
      name: '系统吞吐量',
      type: 'line',
      smooth: true,
      areaStyle: { opacity: 0.3 },
      lineStyle: { width: 2 },
      data: [820, 932, 901, 1434, 1290, 1330, 1320],
    },
  ],
});

// 3. 趋势图数据 (弹窗与自定义插槽)
const trendData = ref([
  { month: '1月', revenue: 120, cost: 80, rate: 33.3 },
  { month: '2月', revenue: 132, cost: 85, rate: 35.6 },
  { month: '3月', revenue: 101, cost: 70, rate: 30.7 },
  { month: '4月', revenue: 134, cost: 90, rate: 32.8 },
  { month: '5月', revenue: 190, cost: 110, rate: 42.1 },
  { month: '6月', revenue: 230, cost: 125, rate: 45.7 },
]);

const trendMetrics: TrendMetric[] = [
  { key: 'revenue', name: '营业收入 (万元)', type: 'bar' },
  { key: 'rate', name: '毛利率 (%)', type: 'line', yAxisIndex: 1, unit: '%' },
];

const triggerToolbarFullscreen = async (mode: 'auto' | 'native' | 'page' = 'page') => {
  if (toolbarChartRef.value) {
    const success = await toolbarChartRef.value.toggleFullscreen(mode);
    emit('log', `已编程式切换全屏模式 [${mode}]: ${success ? '成功' : '失败'}`);
  }
};

const triggerToolbarExport = (ratio = 2) => {
  if (toolbarChartRef.value) {
    const success = toolbarChartRef.value.exportImage({
      pixelRatio: ratio,
      filename: `sample_chart_${ratio}x`,
    });
    emit('log', `已编程式触发高清 ${ratio}x 导出: ${success ? '成功' : '失败'}`);
  }
};

const onFullscreenChange = (isFullscreen: boolean) => {
  emit(
    'log',
    `触发 fullscreen-change 事件: 当前全屏状态 = ${isFullscreen ? '全屏已激活' : '已还原窗口'}`,
  );
};

const onChartExport = (payload: { filename: string; type: string; pixelRatio: number }) => {
  emit(
    'log',
    `触发 export 导出事件: 文件名=${payload.filename}, 格式=${payload.type}, 分辨率=${payload.pixelRatio}x`,
  );
};

const openDialog = () => {
  isDialogOpen.value = true;
  emit('log', '已打开模态弹窗：验证 display: none / 初次挂载时图表零尺寸自愈');
};

const closeDialog = () => {
  isDialogOpen.value = false;
  emit('log', '已关闭模态弹窗');
};
</script>

<template>
  <div class="lifecycle-advanced-scenario">
    <div class="action-bar">
      <button class="btn btn-primary" @click="triggerToolbarFullscreen('page')">
        🖥️ 页面级脱壳全屏 (CSS Fixed 视口无黑边)
      </button>
      <button class="btn btn-info" @click="triggerToolbarFullscreen('native')">
        🪟 浏览器原生系统全屏 (F11 级)
      </button>
      <button class="btn btn-secondary" @click="triggerToolbarExport(2)">
        📷 高清 2x 导出 (默认)
      </button>
      <button class="btn btn-warning" @click="triggerToolbarExport(3)">
        🖼️ 超清 3x 导出 (300 DPI 印刷级)
      </button>
      <button class="btn btn-info" @click="openDialog">🪟 模态弹窗内初次渲染自验</button>
      <span class="divider" />
      <button
        class="btn btn-secondary"
        :class="{ active: activeSubTab === 'hiddenTab' }"
        @click="activeSubTab = activeSubTab === 'hiddenTab' ? 'toolbar' : 'hiddenTab'"
      >
        ⚡ {{ activeSubTab === 'hiddenTab' ? '返回工具栏卡片' : '切换至初始隐藏 Tab (0x0 自愈)' }}
      </button>
    </div>

    <!-- 主展示区 -->
    <div v-show="activeSubTab === 'toolbar'" class="chart-grid">
      <!-- 卡片 1: 默认内置浮动操作胶囊 -->
      <div class="chart-card">
        <div class="card-header">
          <span class="card-title">1. 内置轻量浮动操作胶囊 (全屏脱壳 + 高清导出)</span>
          <span class="badge-sub">悬浮右上角浮现工具按钮</span>
        </div>
        <div class="card-body">
          <AtengECharts
            ref="toolbarChartRef"
            :option="overviewOption"
            theme="auto"
            height="380px"
            :allow-fullscreen="true"
            fullscreen-mode="auto"
            :allow-export="true"
            :export-options="{ pixelRatio: 2, filename: 'sample_business_overview' }"
            @fullscreen-change="onFullscreenChange"
            @export="onChartExport"
          />
        </div>
      </div>

      <!-- 卡片 2: 自定义 #toolbar 插槽完全替换 -->
      <div class="chart-card">
        <div class="card-header">
          <span class="card-title">2. 自定义 #toolbar 插槽 (预设图表定制扩展按钮)</span>
          <span class="badge-sub">完全插槽接管与反转</span>
        </div>
        <div class="card-body">
          <AtengTrendChart
            ref="customToolbarChartRef"
            :data="trendData"
            dimension="month"
            :metrics="trendMetrics"
            theme="auto"
            height="380px"
            :allow-fullscreen="true"
            :allow-export="true"
            @fullscreen-change="onFullscreenChange"
            @export="onChartExport"
          >
            <template #toolbar="{ isFullscreen, toggleFullscreen, exportImage }">
              <button
                type="button"
                class="btn btn-sm btn-primary"
                style="font-size: 11px; padding: 2px 8px"
                @click="toggleFullscreen('page')"
              >
                {{ isFullscreen ? '↩️ 还原' : '🔍 脱壳全屏' }}
              </button>
              <button
                type="button"
                class="btn btn-sm btn-secondary"
                style="font-size: 11px; padding: 2px 8px"
                @click="exportImage({ pixelRatio: 3, filename: 'custom_trend_report' })"
              >
                💾 导出 3x 报表
              </button>
            </template>
          </AtengTrendChart>
        </div>
      </div>
    </div>

    <!-- 初始隐藏 Tab：0x0 尺寸挂起与切回自愈测试 -->
    <div v-show="activeSubTab === 'hiddenTab'" class="chart-card">
      <div class="card-header">
        <span class="card-title">3. 初始隐藏容器图表 (零尺寸挂起与切回可见毫秒级自愈测试)</span>
        <span class="badge-sub">挂载时 display: none 0x0 尺寸</span>
      </div>
      <div class="card-body">
        <AtengECharts :option="areaOption" height="380px" theme="auto" />
      </div>
    </div>

    <!-- 模态弹窗内渲染图表自验 -->
    <div v-if="isDialogOpen" class="sample-dialog-backdrop" @click.self="closeDialog">
      <div class="sample-dialog-content">
        <div class="sample-dialog-header">
          <h3>🪟 模态弹窗图表渲染自验 (0x0 几何挂起自愈)</h3>
          <button type="button" class="sample-dialog-close" @click="closeDialog">✕</button>
        </div>
        <div class="sample-dialog-body">
          <p style="font-size: 13px; color: #6b7280; margin-bottom: 12px">
            验证模态弹窗弹出时从 0x0 几何零尺寸平滑过渡展开并由 ResizeObserver 自动自愈重排。
          </p>
          <AtengTrendChart
            :data="trendData"
            dimension="month"
            :metrics="trendMetrics"
            height="320px"
            theme="auto"
            :allow-fullscreen="true"
            :allow-export="true"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lifecycle-advanced-scenario {
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

.divider {
  border-left: 1px solid var(--border-color, #dcdfe6);
  margin: 0 4px;
  height: 20px;
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

.btn.active {
  background-color: #2563eb;
  color: #fff;
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

/* 模态弹窗样式 */
.sample-dialog-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.sample-dialog-content {
  width: 100%;
  max-width: 720px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  animation: dialog-pop 0.25s ease-out;
}

:global(.dark) .sample-dialog-content {
  background: #1d1e1f;
  border: 1px solid #363637;
}

.sample-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

:global(.dark) .sample-dialog-header {
  border-bottom-color: #2c2d2e;
}

.sample-dialog-header h3 {
  margin: 0;
  font-size: 16px;
}

.sample-dialog-close {
  background: transparent;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #9ca3af;
  padding: 4px;
}

.sample-dialog-close:hover {
  color: #ef4444;
}

.sample-dialog-body {
  padding: 20px;
}

@keyframes dialog-pop {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
