<script setup lang="ts">
/**
 * sample-echarts-vue 自验展厅主页面。
 *
 * 验证 AtengECharts 通用表现容器、useECharts 无头状态机、响应式更新与实例操作。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { ref } from 'vue';
import { AtengECharts, type AtengEChartsInstance, type EChartsOption } from '@atengk/echarts-vue';

// 1. 响应式柱状/折线混合图表配置
const barOption = ref<EChartsOption>({
  title: {
    text: '月度经营数据看板 (柱线混合)',
    subtext: 'Ticket #151 基础表现容器自验',
    left: 'center',
  },
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'cross' },
  },
  legend: {
    data: ['销售额 (万元)', '毛利率 (%)'],
    top: 36,
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true,
  },
  xAxis: {
    type: 'category',
    data: ['1月', '2月', '3月', '4月', '5月', '6月'],
  },
  yAxis: [
    {
      type: 'value',
      name: '销售额',
      min: 0,
      max: 250,
      interval: 50,
      axisLabel: { formatter: '{value} 万' },
    },
    {
      type: 'value',
      name: '毛利率',
      min: 0,
      max: 100,
      interval: 20,
      axisLabel: { formatter: '{value} %' },
    },
  ],
  series: [
    {
      name: '销售额 (万元)',
      type: 'bar',
      data: [120, 132, 101, 134, 190, 230],
      itemStyle: {
        color: '#409eff',
        borderRadius: [4, 4, 0, 0],
      },
    },
    {
      name: '毛利率 (%)',
      type: 'line',
      yAxisIndex: 1,
      data: [35, 42, 38, 55, 62, 70],
      smooth: true,
      lineStyle: { width: 3, color: '#67c23a' },
      itemStyle: { color: '#67c23a' },
    },
  ],
});

// 2. 环形占比图配置
const pieOption = ref<EChartsOption>({
  title: {
    text: '产品品类营收占比',
    left: 'center',
  },
  tooltip: {
    trigger: 'item',
    formatter: '{a} <br/>{b}: {c} 万元 ({d}%)',
  },
  legend: {
    orient: 'vertical',
    left: 'left',
  },
  series: [
    {
      name: '品类占比',
      type: 'pie',
      radius: ['45%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 8,
        borderColor: '#fff',
        borderWidth: 2,
      },
      label: {
        show: false,
        position: 'center',
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 18,
          fontWeight: 'bold',
        },
      },
      data: [
        { value: 1048, name: '企业云底座' },
        { value: 735, name: '智能硬件' },
        { value: 580, name: '数据安全套件' },
        { value: 484, name: '音视频中台' },
        { value: 300, name: '技术咨询' },
      ],
    },
  ],
});

// 3. 交互状态
const barChartRef = ref<AtengEChartsInstance | null>(null);
const eventLogs = ref<string[]>([]);
const lastClickInfo = ref<string>('暂无点击');
const previewImage = ref<string>('');

const log = (msg: string) => {
  const time = new Date().toLocaleTimeString();
  eventLogs.value.unshift(`[${time}] ${msg}`);
  if (eventLogs.value.length > 20) {
    eventLogs.value.pop();
  }
};

const onChartClick = (params: unknown) => {
  const p = params as { seriesName?: string; name?: string; value?: unknown };
  lastClickInfo.value = `点击系列: ${p.seriesName ?? '-'}，类目: ${p.name ?? '-'}，数值: ${p.value ?? '-'}`;
  log(`触发 chart-click: ${lastClickInfo.value}`);
};

const onRendered = () => {
  log('图表渲染完成 (rendered)');
};

// 4. 动态操作
const randomizeData = () => {
  const randomBars = Array.from({ length: 6 }, () => Math.floor(Math.random() * 150) + 50);
  const randomLines = Array.from({ length: 6 }, () => Math.floor(Math.random() * 50) + 30);
  const currentSeries = (barOption.value.series ?? []) as Array<Record<string, unknown>>;
  barOption.value = {
    ...barOption.value,
    series: [
      {
        ...currentSeries[0],
        data: randomBars,
      },
      {
        ...currentSeries[1],
        data: randomLines,
      },
    ],
  };
  log('已随机更新经营看板数据');
};

const exportBarImage = () => {
  if (barChartRef.value) {
    const dataUrl = barChartRef.value.getDataURL({ pixelRatio: 2 });
    previewImage.value = dataUrl;
    log('已生成图表 Base64 高清截图');
  }
};
</script>

<template>
  <div class="sample-container">
    <header class="header">
      <div class="title-wrap">
        <h1>@atengk/echarts-vue 自验展厅</h1>
        <span class="badge">Ticket #151 自验</span>
        <span class="badge-success">端口 3006</span>
      </div>
      <p class="subtitle">
        L2 专用能力/领域扩展层：基于 ECharts 5
        工业级封装，浅响应式隔离、通用表现容器与开箱即用体验。
      </p>
    </header>

    <div class="action-bar">
      <button class="btn btn-primary" @click="randomizeData">🔄 动态随机更新数据</button>
      <button class="btn btn-secondary" @click="exportBarImage">📷 导出柱线图 Base64 截图</button>
      <span class="tip">当前点击响应：{{ lastClickInfo }}</span>
    </div>

    <main class="chart-grid">
      <!-- 柱线混合图表卡片 -->
      <div class="chart-card">
        <div class="card-header">
          <span class="card-title">1. 柱状/折线混合图表 (AtengECharts 基础渲染)</span>
        </div>
        <div class="card-body">
          <AtengECharts
            ref="barChartRef"
            :option="barOption"
            height="380px"
            @chart-click="onChartClick"
            @rendered="onRendered"
          />
        </div>
      </div>

      <!-- 环形饼图卡片 -->
      <div class="chart-card">
        <div class="card-header">
          <span class="card-title">2. 环形品类占比图 (AtengECharts 默认 350px 高度)</span>
        </div>
        <div class="card-body">
          <AtengECharts :option="pieOption" @chart-click="onChartClick" />
        </div>
      </div>
    </main>

    <!-- 底部操作与日志区 -->
    <footer class="footer-section">
      <div class="log-card">
        <h3>交互事件日志</h3>
        <ul class="log-list">
          <li v-for="(item, index) in eventLogs" :key="index">
            {{ item }}
          </li>
          <li v-if="eventLogs.length === 0" class="log-empty">暂无事件触发</li>
        </ul>
      </div>

      <div v-if="previewImage" class="preview-card">
        <h3>导出图片预览 (2x 设备像素比)</h3>
        <img :src="previewImage" alt="Chart Preview" class="preview-img" />
      </div>
    </footer>
  </div>
</template>

<style scoped>
.sample-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #1f2937;
}

.header {
  margin-bottom: 24px;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 16px;
}

.title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}

h1 {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
}

.badge {
  background-color: #3b82f6;
  color: #fff;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 9999px;
}

.badge-success {
  background-color: #10b981;
  color: #fff;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 9999px;
}

.subtitle {
  color: #6b7280;
  margin: 8px 0 0;
  font-size: 14px;
}

.action-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
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

.btn-secondary {
  background-color: #f3f4f6;
  color: #374151;
  border-color: #d1d5db;
}
.btn-secondary:hover {
  background-color: #e5e7eb;
}

.tip {
  font-size: 13px;
  color: #4b5563;
  margin-left: 8px;
}

.chart-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(480px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.chart-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.card-header {
  padding: 12px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 600;
  font-size: 14px;
}

.card-body {
  padding: 16px;
}

.footer-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.log-card,
.preview-card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
}

h3 {
  margin: 0 0 12px;
  font-size: 14px;
  color: #374151;
}

.log-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 160px;
  overflow-y: auto;
  font-family: monospace;
  font-size: 12px;
}

.log-list li {
  padding: 4px 0;
  color: #4b5563;
  border-bottom: 1px dashed #e5e7eb;
}

.log-empty {
  color: #9ca3af;
}

.preview-img {
  max-width: 100%;
  height: auto;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
}
</style>
