<script setup lang="ts">
/**
 * 通用表现容器与多态遮罩自验场景组件。
 *
 * 验证 AtengECharts 通用表现容器、声明式 Option 全量同步、ResizeObserver 几何自感知、
 * DOM 级 Loading/Empty/Error 三态遮罩与异常重试闭环。
 *
 * @author Ateng
 * @since 2026-11-05
 */

import { ref } from 'vue';
import { AtengECharts, type AtengEChartsInstance, type EChartsOption } from '@atengk/echarts-vue';

const emit = defineEmits<{
  (e: 'log', message: string): void;
}>();

const barChartRef = ref<AtengEChartsInstance | null>(null);
const isBarLoading = ref(false);
const isPieEmpty = ref(false);
const barError = ref<string | null>(null);
const isCompact = ref(false);
const previewImage = ref<string>('');
const lastClickInfo = ref<string>('暂无点击');

// 1. 响应式柱状/折线混合经营大盘配置
const barOption = ref<EChartsOption>({
  title: {
    text: '月度经营数据看板 (柱线混合)',
    subtext: '通用表现容器与多态遮罩自验',
    left: 'center',
    top: 8,
  },
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'cross' },
  },
  legend: {
    data: ['销售额 (万元)', '毛利率 (%)'],
    top: 56,
  },
  grid: {
    top: 92,
    left: '3%',
    right: 48,
    bottom: '4%',
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
      nameTextStyle: { padding: [0, 0, 4, 0] },
      min: 0,
      max: 250,
      interval: 50,
      axisLabel: { formatter: '{value} 万' },
    },
    {
      type: 'value',
      name: '毛利率',
      nameTextStyle: { padding: [0, 0, 4, 0] },
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
        borderRadius: [4, 4, 0, 0],
      },
    },
    {
      name: '毛利率 (%)',
      type: 'line',
      yAxisIndex: 1,
      data: [35, 42, 38, 55, 62, 70],
      smooth: true,
      lineStyle: { width: 3 },
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

const onChartClick = (params: unknown) => {
  const p = params as { seriesName?: string; name?: string; value?: unknown };
  lastClickInfo.value = `系列: ${p.seriesName ?? '-'}，类目: ${p.name ?? '-'}，数值: ${p.value ?? '-'}`;
  emit('log', `触发 chart-click: ${lastClickInfo.value}`);
};

const onLegendChange = (params: unknown) => {
  const p = params as { name?: string };
  emit('log', `触发 legend-change: 切换图例 [${p.name ?? ''}]`);
};

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
  emit('log', '已随机更新经营看板数据 (notMerge: true 全量声明式同步)');
};

const triggerLoading = () => {
  isBarLoading.value = true;
  emit('log', '已触发柱线图 DOM 加载遮罩 (2 秒后自动恢复)');
  setTimeout(() => {
    isBarLoading.value = false;
    emit('log', '柱线图加载完成，遮罩已自动移除');
  }, 2000);
};

const toggleEmptyState = () => {
  isPieEmpty.value = !isPieEmpty.value;
  emit('log', `环形图空状态已切换为: ${isPieEmpty.value ? '空数据态' : '正常数据态'}`);
};

const triggerError = () => {
  barError.value = 'HTTP 500: 后端经营分析微服务连接超时，请检查网关路由';
  emit('log', '已模拟图表渲染异常并挂载错误遮罩');
};

const onRetry = () => {
  barError.value = null;
  emit('log', '已点击重试按钮，重置异常态并重新渲染');
};

const toggleWidth = () => {
  isCompact.value = !isCompact.value;
  emit(
    'log',
    `容器宽度已切换为: ${isCompact.value ? '60% (压缩态)' : '100% (全宽态)'}，触发 ResizeObserver 防抖自适应`,
  );
};

const exportBarImage = () => {
  if (barChartRef.value) {
    const dataUrl = barChartRef.value.getDataURL({ pixelRatio: 2 });
    previewImage.value = dataUrl;
    emit('log', '已生成图表 Base64 高清截图');
  }
};
</script>

<template>
  <div class="container-scenario">
    <!-- 顶部操作条 -->
    <div class="action-bar">
      <button class="btn btn-primary" @click="randomizeData">🔄 动态全量同步数据</button>
      <button class="btn btn-info" @click="triggerLoading">⏳ 模拟加载遮罩</button>
      <button class="btn btn-warning" @click="toggleEmptyState">
        📭 切换环形图空状态 ({{ isPieEmpty ? '恢复数据' : '置空' }})
      </button>
      <button class="btn btn-danger" @click="triggerError">⚠️ 模拟错误遮罩</button>
      <button class="btn btn-secondary" @click="toggleWidth">
        📐 切换宽度 ({{ isCompact ? '还原 100%' : '压缩 60%' }})
      </button>
      <button class="btn btn-secondary" @click="exportBarImage">📷 导出截图</button>
      <span class="tip">交互响应：{{ lastClickInfo }}</span>
    </div>

    <!-- 图表网格 -->
    <div class="chart-grid" :class="{ compact: isCompact }">
      <!-- 柱线混合图表卡片 -->
      <div class="chart-card">
        <div class="card-header">
          <span class="card-title">1. 柱状/折线混合图表 (支持 Loading / Error 遮罩与重试)</span>
        </div>
        <div class="card-body">
          <AtengECharts
            ref="barChartRef"
            :option="barOption"
            height="380px"
            theme="auto"
            :loading="isBarLoading"
            :error="barError"
            @chart-click="onChartClick"
            @legend-change="onLegendChange"
            @retry="onRetry"
          />
        </div>
      </div>

      <!-- 环形饼图卡片 -->
      <div class="chart-card">
        <div class="card-header">
          <span class="card-title">2. 环形品类占比图 (支持 Empty 空状态遮罩)</span>
        </div>
        <div class="card-body">
          <AtengECharts
            :option="pieOption"
            theme="auto"
            height="380px"
            :empty="isPieEmpty"
            empty-text="当前筛选周期内暂无品类销售明细"
            @chart-click="onChartClick"
            @legend-change="onLegendChange"
          />
        </div>
      </div>
    </div>

    <!-- 截图预览 -->
    <div v-if="previewImage" class="preview-card">
      <h4>📷 导出截图预览 (2x 设备像素比)</h4>
      <img :src="previewImage" alt="Chart Preview" class="preview-img" />
    </div>
  </div>
</template>

<style scoped>
.container-scenario {
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
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.chart-grid.compact {
  max-width: 60%;
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
}

:global(.dark) .card-header {
  background: #191a1b;
  border-bottom-color: #2c2d2e;
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

.btn-warning {
  background-color: #f59e0b;
  color: #fff;
}
.btn-warning:hover {
  background-color: #d97706;
}

.btn-danger {
  background-color: #ef4444;
  color: #fff;
}
.btn-danger:hover {
  background-color: #dc2626;
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

.tip {
  font-size: 13px;
  color: #6b7280;
  margin-left: 8px;
}

:global(.dark) .tip {
  color: #9ca3af;
}

.preview-card {
  background: var(--bg-header, #f9fafb);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  padding: 16px;
}

:global(.dark) .preview-card {
  background: #1d1e1f;
  border-color: #2c2d2e;
}

h4 {
  margin: 0 0 10px;
  font-size: 14px;
  color: #374151;
}

:global(.dark) h4 {
  color: #e5eaf3;
}

.preview-img {
  max-width: 100%;
  max-height: 260px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
}
</style>
