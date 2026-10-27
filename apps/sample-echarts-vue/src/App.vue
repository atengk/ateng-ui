<script setup lang="ts">
/**
 * sample-echarts-vue 自验展厅主页面。
 *
 * 验证 AtengECharts 通用表现容器、useECharts 无头状态机、ResizeObserver 几何自感知、
 * 暗黑模式无损热切换、声明式 Option 全量同步与 DOM 级多态遮罩（Loading/Empty/Error）。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { ref } from 'vue';
import {
  AtengECharts,
  AtengTrendChart,
  AtengDonutChart,
  AtengFunnelChart,
  type AtengEChartsInstance,
  type AtengTrendChartInstance,
  type AtengDonutChartInstance,
  type AtengFunnelChartInstance,
  type EChartsOption,
  type TrendMetric,
  type TrendYAxisConfig,
} from '@atengk/echarts-vue';

// 1. 响应式柱状/折线混合图表配置
const barOption = ref<EChartsOption>({
  title: {
    text: '月度经营数据看板 (柱线混合)',
    subtext: 'Ticket #151 ~ #154 容器多态遮罩与事件透传',
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

// 3. Tab 2 零尺寸挂起自愈图表（时序面积图）
const areaOption = ref<EChartsOption>({
  title: {
    text: '高频并发请求时序追踪 (Tab 零尺寸自愈)',
    left: 'center',
  },
  tooltip: {
    trigger: 'axis',
  },
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
  yAxis: {
    type: 'value',
    name: 'QPS',
  },
  series: [
    {
      name: '系统吞吐量',
      type: 'line',
      smooth: true,
      areaStyle: {
        opacity: 0.3,
      },
      lineStyle: {
        width: 2,
      },
      data: [820, 932, 901, 1434, 1290, 1330, 1320],
    },
  ],
});

// 4. 交互与状态控制
const barChartRef = ref<AtengEChartsInstance | null>(null);
const eventLogs = ref<string[]>([]);
const lastClickInfo = ref<string>('暂无点击');
const previewImage = ref<string>('');

// 多态遮罩状态控制
const isBarLoading = ref(false);
const isPieEmpty = ref(false);
const barError = ref<string | null>(null);

// 动态暗黑模式状态
const isDark = ref(false);

// 动态容器宽度测试
const isCompact = ref(false);

// 选项卡状态（Tab 1: 基础大盘；Tab 2: Ticket #155 趋势图；Tab 3: Ticket #156 环形图与漏斗图；Tab 4: 初始隐藏零尺寸 Tab）
const activeTab = ref<'dashboard' | 'trendPreset' | 'donutFunnelPreset' | 'hiddenTab'>(
  'donutFunnelPreset',
);

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

const onLegendChange = (params: unknown) => {
  const p = params as { name?: string; selected?: Record<string, boolean> };
  log(`触发 legend-change: 切换图例 [${p.name ?? ''}]`);
};

const onRendered = () => {
  log('图表渲染完成 (rendered)');
};

const onThemeChange = (theme: string) => {
  log(`图表主题热切换为: ${theme}`);
};

// 模拟加载遮罩
const triggerLoading = () => {
  isBarLoading.value = true;
  log('已触发柱线图 DOM 加载遮罩 (2 秒后自动恢复)');
  setTimeout(() => {
    isBarLoading.value = false;
    log('柱线图加载完成，遮罩已自动移除');
  }, 2000);
};

// 切换空数据遮罩
const toggleEmptyState = () => {
  isPieEmpty.value = !isPieEmpty.value;
  log(`环形图空状态已切换为: ${isPieEmpty.value ? '空数据态' : '正常数据态'}`);
};

// 模拟接口报错
const triggerError = () => {
  barError.value = 'HTTP 500: 后端经营分析微服务连接超时，请检查网关路由';
  log('已模拟图表渲染异常并挂载错误遮罩');
};

const onRetry = () => {
  barError.value = null;
  log('已点击重试按钮，重置异常态并重新渲染');
};

// 切换暗黑模式
const toggleDarkMode = () => {
  isDark.value = !isDark.value;
  if (isDark.value) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  log(`系统亮暗模式已切换为: ${isDark.value ? 'Dark (暗色)' : 'Light (浅色)'}`);
};

// 动态更新数据
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
  log('已随机更新经营看板数据 (notMerge: true 全量声明式同步)');
};

const toggleWidth = () => {
  isCompact.value = !isCompact.value;
  log(
    `容器宽度已切换为: ${isCompact.value ? '60% (压缩态)' : '100% (全宽态)'}，触发 ResizeObserver 防抖自适应`,
  );
};

const exportBarImage = () => {
  if (barChartRef.value) {
    const dataUrl = barChartRef.value.getDataURL({ pixelRatio: 2 });
    previewImage.value = dataUrl;
    log('已生成图表 Base64 高清截图');
  }
};

// 5. Ticket #155 高频预设 AtengTrendChart 演示数据与状态
const trendChartRef = ref<AtengTrendChartInstance | null>(null);

const trendData = ref([
  { date: '2026-01', sales: 1250000, cost: 820000, profitRate: 34.4 },
  { date: '2026-02', sales: 1480000, cost: 910000, profitRate: 38.5 },
  { date: '2026-03', sales: 1890000, cost: 1120000, profitRate: 40.7 },
  { date: '2026-04', sales: 1620000, cost: 980000, profitRate: 39.5 },
  { date: '2026-05', sales: 2150000, cost: 1250000, profitRate: 41.8 },
  { date: '2026-06', sales: 2580000, cost: 1460000, profitRate: 43.4 },
  { date: '2026-07', sales: 2340000, cost: 1390000, profitRate: 40.6 },
  { date: '2026-08', sales: 2790000, cost: 1580000, profitRate: 43.3 },
  { date: '2026-09', sales: 3120000, cost: 1720000, profitRate: 44.8 },
  { date: '2026-10', sales: 2980000, cost: 1690000, profitRate: 43.2 },
  { date: '2026-11', sales: 3450000, cost: 1910000, profitRate: 44.6 },
  { date: '2026-12', sales: 4200000, cost: 2280000, profitRate: 45.7 },
]);

const isTrendZoom = ref(true);
const isTrendArea = ref(true);
const isTrendEmpty = ref(false);
const isTrendLoading = ref(false);

const trendMetrics = ref<TrendMetric[]>([
  {
    key: 'sales',
    name: '销售收入',
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
    key: 'sales',
    name: '销售走势 (面积渐变)',
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
    const sales = Math.floor(Math.random() * 3000000) + 1000000;
    const cost = Math.floor(sales * (0.5 + Math.random() * 0.2));
    const profitRate = Number((((sales - cost) / sales) * 100).toFixed(1));
    return {
      ...item,
      sales,
      cost,
      profitRate,
    };
  });
  log('已随机刷新 AtengTrendChart 趋势图扁平数据源 (验证千分位与双 Y 轴重绘)');
};

const toggleTrendZoom = () => {
  isTrendZoom.value = !isTrendZoom.value;
  log(`已切换趋势图 DataZoom 缩放手柄状态为: ${isTrendZoom.value ? '启用' : '关闭'}`);
};

const toggleTrendArea = () => {
  isTrendArea.value = !isTrendArea.value;
  areaMetrics.value = [
    {
      ...areaMetrics.value[0],
      area: isTrendArea.value ? 'rgba(64, 158, 255, 0.45)' : false,
    },
  ];
  log(`已切换面积平滑渐变状态为: ${isTrendArea.value ? '启用渐变' : '纯折线'}`);
};

const toggleTrendEmpty = () => {
  isTrendEmpty.value = !isTrendEmpty.value;
  log(`已切换趋势图空数据遮罩为: ${isTrendEmpty.value ? '空状态' : '正常展示'}`);
};

const triggerTrendLoading = () => {
  isTrendLoading.value = true;
  log('已触发 AtengTrendChart 加载遮罩 (1.5 秒后自动恢复)');
  setTimeout(() => {
    isTrendLoading.value = false;
    log('趋势图加载完成');
  }, 1500);
};

// 6. Ticket #156 高频预设 AtengDonutChart & AtengFunnelChart 演示数据与状态
const donutChartRef = ref<AtengDonutChartInstance | null>(null);
const funnelChartRef = ref<AtengFunnelChartInstance | null>(null);

const donutData = ref([
  { name: '云原生底座套件', value: 3480000 },
  { name: '数据安全与鉴权中台', value: 2560000 },
  { name: 'AI 智能交互代理', value: 2190000 },
  { name: '微服务网关支撑', value: 1650000 },
  { name: '音视频流媒体引擎', value: 1120000 },
]);

const isDonutRose = ref(false);
const isDonutSummary = ref(true);
const isDonutEmpty = ref(false);

const randomizeDonutData = () => {
  donutData.value = donutData.value.map(item => ({
    ...item,
    value: Math.floor(Math.random() * 3000000) + 500000,
  }));
  log('已随机更新分类占比数据 (验证中心指标卡动态自动求和)');
};

const toggleDonutRose = () => {
  isDonutRose.value = !isDonutRose.value;
  log(
    `已切换环形图模式为: ${isDonutRose.value ? '南丁格尔玫瑰图 (roseType: radius)' : '标准同心环形图'}`,
  );
};

const toggleDonutSummary = () => {
  isDonutSummary.value = !isDonutSummary.value;
  log(`已切换中心指标卡为: ${isDonutSummary.value ? '显示中心汇总' : '关闭中心指标卡'}`);
};

const toggleDonutEmpty = () => {
  isDonutEmpty.value = !isDonutEmpty.value;
  log(`已切换环形图空遮罩为: ${isDonutEmpty.value ? '空状态' : '正常数据'}`);
};

// 漏斗图数据与控制
const funnelData = ref([
  { stage: '1. 展厅页面曝光', count: 120000 },
  { stage: '2. 组件源码浏览', count: 68000 },
  { stage: '3. 点击复制代码', count: 35000 },
  { stage: '4. pnpm 安装引入', count: 18000 },
  { stage: '5. 生产工程落地', count: 9600 },
]);

const funnelSort = ref<'descending' | 'ascending'>('descending');
const funnelGap = ref<number>(3);
const isFunnelEmpty = ref(false);

const randomizeFunnelData = () => {
  let current = 100000 + Math.floor(Math.random() * 50000);
  funnelData.value = funnelData.value.map(item => {
    const val = current;
    current = Math.floor(current * (0.45 + Math.random() * 0.25));
    return {
      ...item,
      count: val,
    };
  });
  log('已随机刷新漏斗转化数据 (验证环节转化率与总体转化率实时重算)');
};

const toggleFunnelSort = () => {
  funnelSort.value = funnelSort.value === 'descending' ? 'ascending' : 'descending';
  log(
    `已切换漏斗排列方式为: ${funnelSort.value === 'descending' ? '降序 (漏斗形)' : '升序 (金字塔形)'}`,
  );
};

const toggleFunnelGap = () => {
  funnelGap.value = funnelGap.value === 3 ? 8 : 3;
  log(`已调整漏斗阶段断层间距为: ${funnelGap.value}px`);
};

const toggleFunnelEmpty = () => {
  isFunnelEmpty.value = !isFunnelEmpty.value;
  log(`已切换漏斗图空遮罩为: ${isFunnelEmpty.value ? '空状态' : '正常数据'}`);
};
</script>

<template>
  <div class="sample-container" :class="{ 'dark-theme': isDark }">
    <header class="header">
      <div class="title-wrap">
        <h1>@atengk/echarts-vue 自验展厅</h1>
        <span class="badge">Ticket #156 自验</span>
        <span class="badge-success">端口 3006</span>
        <span class="badge-theme">{{
          isDark ? '🌙 当前: 暗黑模式 (ateng-dark)' : '☀️ 当前: 浅色模式 (ateng-light)'
        }}</span>
      </div>
      <p class="subtitle">
        L2 专用能力扩展层：高频预设 AtengDonutChart &
        AtengFunnelChart（分类占比与漏斗转化）、AtengTrendChart 趋势看板、 notMerge 声明式同步与多态
        DOM 遮罩。
      </p>
    </header>

    <div class="action-bar">
      <button class="btn btn-theme" @click="toggleDarkMode">
        {{ isDark ? '☀️ 切换为浅色模式' : '🌙 切换为暗黑模式' }}
      </button>
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
      <span class="tip">当前点击响应：{{ lastClickInfo }}</span>
    </div>

    <!-- 选项卡导航切换 (验证 display: none 零尺寸挂起自愈) -->
    <div class="tab-nav">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'donutFunnelPreset' }"
        @click="activeTab = 'donutFunnelPreset'"
      >
        🍩 预设看板：AtengDonutChart & AtengFunnelChart (分类占比与漏斗转化)
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'trendPreset' }"
        @click="activeTab = 'trendPreset'"
      >
        📈 预设看板：AtengTrendChart (双 Y 轴/柱线混合/渐变/缩放手柄)
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'dashboard' }"
        @click="activeTab = 'dashboard'"
      >
        📊 基础大盘 (通用容器与多态遮罩)
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'hiddenTab' }"
        @click="activeTab = 'hiddenTab'"
      >
        ⚡ 隐藏选项卡 (初始 display: none 零尺寸自愈验证)
      </button>
    </div>

    <!-- 选项卡：Ticket #156 高频预设环形图与漏斗图视图 -->
    <div v-show="activeTab === 'donutFunnelPreset'" class="tab-content">
      <div class="action-bar" style="margin-bottom: 16px">
        <button class="btn btn-primary" @click="randomizeDonutData">
          🔄 刷新分类数据 (求和重算)
        </button>
        <button class="btn btn-theme" @click="toggleDonutRose">
          🌹 {{ isDonutRose ? '切换为标准环形图' : '切换为南丁格尔玫瑰图' }}
        </button>
        <button class="btn btn-info" @click="toggleDonutSummary">
          🎯 {{ isDonutSummary ? '关闭中心指标卡' : '显示中心指标卡' }}
        </button>
        <button class="btn btn-warning" @click="toggleDonutEmpty">
          📭 {{ isDonutEmpty ? '恢复分类数据' : '置空分类数据 (空遮罩)' }}
        </button>
        <span style="border-left: 1px solid #dcdfe6; margin: 0 4px; height: 20px" />
        <button class="btn btn-primary" @click="randomizeFunnelData">⚡ 刷新漏斗转化数据</button>
        <button class="btn btn-secondary" @click="toggleFunnelSort">
          📐 {{ funnelSort === 'descending' ? '切换为金字塔形 (升序)' : '切换为漏斗形 (降序)' }}
        </button>
        <button class="btn btn-secondary" @click="toggleFunnelGap">
          📏 阶段间隙 (当前: {{ funnelGap }}px)
        </button>
        <button class="btn btn-warning" @click="toggleFunnelEmpty">
          📭 {{ isFunnelEmpty ? '恢复漏斗数据' : '置空漏斗数据' }}
        </button>
      </div>

      <main class="chart-grid">
        <!-- 预设卡片 1：分类占比与中心指标卡 -->
        <div class="chart-card">
          <div class="card-header">
            <span class="card-title">
              1. AtengDonutChart: 业务品类营收环形图 (中心指标卡 + 玫瑰图切换)
            </span>
            <span class="badge-sub">千分位 + 自动求和</span>
          </div>
          <div class="card-body">
            <AtengDonutChart
              ref="donutChartRef"
              :data="isDonutEmpty ? [] : donutData"
              name-key="name"
              value-key="value"
              unit="元"
              :rose-type="isDonutRose ? 'radius' : false"
              :center-summary="isDonutSummary ? { title: '业务总产值' } : false"
              theme="auto"
              height="380px"
              @chart-click="onChartClick"
              @legend-change="onLegendChange"
              @rendered="onRendered"
              @theme-change="onThemeChange"
            />
          </div>
        </div>

        <!-- 预设卡片 2：电商全链路业务转化漏斗 -->
        <div class="chart-card">
          <div class="card-header">
            <span class="card-title">
              2. AtengFunnelChart: 组件库采纳全链路漏斗 (环节转化率 + 总体转化率)
            </span>
            <span class="badge-sub">自动计算前后转化率</span>
          </div>
          <div class="card-body">
            <AtengFunnelChart
              ref="funnelChartRef"
              :data="isFunnelEmpty ? [] : funnelData"
              name-key="stage"
              value-key="count"
              unit="次"
              :sort="funnelSort"
              :gap="funnelGap"
              theme="auto"
              height="380px"
              @chart-click="onChartClick"
              @legend-change="onLegendChange"
              @rendered="onRendered"
              @theme-change="onThemeChange"
            />
          </div>
        </div>
      </main>
    </div>

    <!-- 选项卡：Ticket #155 高频预设趋势图视图 -->
    <div v-show="activeTab === 'trendPreset'" class="tab-content">
      <div class="action-bar" style="margin-bottom: 16px">
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

      <main class="chart-grid">
        <!-- 预设卡片 1：年度财务双 Y 轴柱线混合趋势看板 -->
        <div class="chart-card">
          <div class="card-header">
            <span class="card-title">
              1. AtengTrendChart: 经营收入/成本/毛利率 (双 Y 轴 + 柱线混合 + 千分位 Tooltip)
            </span>
            <span class="badge-sub">开箱即用高频预设</span>
          </div>
          <div class="card-body">
            <AtengTrendChart
              ref="trendChartRef"
              :data="isTrendEmpty ? [] : trendData"
              dimension="date"
              :metrics="trendMetrics"
              :y-axis="trendYAxis"
              :data-zoom="isTrendZoom"
              :loading="isTrendLoading"
              theme="auto"
              height="380px"
              @chart-click="onChartClick"
              @legend-change="onLegendChange"
              @rendered="onRendered"
              @theme-change="onThemeChange"
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
              dimension="date"
              :metrics="areaMetrics"
              :data-zoom="isTrendZoom"
              :loading="isTrendLoading"
              theme="auto"
              height="380px"
              @chart-click="onChartClick"
              @legend-change="onLegendChange"
              @theme-change="onThemeChange"
            />
          </div>
        </div>
      </main>
    </div>

    <!-- 选项卡 1：主看板视图 -->
    <div v-show="activeTab === 'dashboard'" class="tab-content">
      <main class="chart-grid" :class="{ compact: isCompact }">
        <!-- 柱线混合图表卡片 -->
        <div class="chart-card">
          <div class="card-header">
            <span class="card-title">1. 柱状/折线混合图表 (支持 Loading / Error 遮罩)</span>
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
              @rendered="onRendered"
              @theme-change="onThemeChange"
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
              :empty="isPieEmpty"
              empty-text="当前筛选周期内暂无品类销售明细"
              @chart-click="onChartClick"
              @legend-change="onLegendChange"
              @theme-change="onThemeChange"
            />
          </div>
        </div>
      </main>
    </div>

    <!-- 选项卡 2：初始隐藏选项卡 (v-show 导致初始化时为 0x0 尺寸) -->
    <div v-show="activeTab === 'hiddenTab'" class="tab-content">
      <div class="chart-card">
        <div class="card-header">
          <span class="card-title">3. 初始隐藏容器图表 (零尺寸挂起与切回自愈测试)</span>
          <span class="badge-sub">挂载时 display: none 0x0 尺寸</span>
        </div>
        <div class="card-body">
          <AtengECharts
            :option="areaOption"
            height="380px"
            theme="auto"
            @chart-click="onChartClick"
            @theme-change="onThemeChange"
          />
        </div>
      </div>
    </div>

    <!-- 底部操作与日志区 -->
    <footer class="footer-section">
      <div class="log-card">
        <h3>交互事件与多态遮罩调度日志</h3>
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
  transition:
    background-color 0.3s,
    color 0.3s;
}

.sample-container.dark-theme {
  background-color: #141414;
  color: #e5eaf3;
}

.header {
  margin-bottom: 24px;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 16px;
}

.dark-theme .header {
  border-bottom-color: #2c2d2e;
}

.title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
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

.badge-theme {
  background-color: #6366f1;
  color: #fff;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 9999px;
}

.badge-sub {
  background-color: #f59e0b;
  color: #fff;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 8px;
}

.subtitle {
  color: #6b7280;
  margin: 8px 0 0;
  font-size: 14px;
}

.dark-theme .subtitle {
  color: #9ca3af;
}

.action-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.tab-nav {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 8px;
}

.dark-theme .tab-nav {
  border-bottom-color: #2c2d2e;
}

.tab-btn {
  padding: 8px 16px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #4b5563;
  transition: all 0.2s;
}

.dark-theme .tab-btn {
  background: #1f2022;
  border-color: #363637;
  color: #a3a6ad;
}

.tab-btn:hover {
  background: #e5e7eb;
}

.dark-theme .tab-btn:hover {
  background: #2b2c2d;
}

.tab-btn.active {
  background: #2563eb;
  color: #fff;
  border-color: #2563eb;
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

.btn-theme {
  background-color: #4f46e5;
  color: #fff;
}
.btn-theme:hover {
  background-color: #4338ca;
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

.dark-theme .btn-secondary {
  background-color: #1f2022;
  color: #e5eaf3;
  border-color: #363637;
}

.tip {
  font-size: 13px;
  color: #4b5563;
  margin-left: 8px;
}

.dark-theme .tip {
  color: #9ca3af;
}

.chart-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(480px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.chart-grid.compact {
  max-width: 60%;
}

.chart-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  margin-bottom: 20px;
  transition:
    background-color 0.3s,
    border-color 0.3s;
}

.dark-theme .chart-card {
  background: #1d1e1f;
  border-color: #2c2d2e;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.card-header {
  padding: 12px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 600;
  font-size: 14px;
  display: flex;
  align-items: center;
}

.dark-theme .card-header {
  background: #191a1b;
  border-bottom-color: #2c2d2e;
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

.dark-theme .log-card,
.dark-theme .preview-card {
  background: #1d1e1f;
  border-color: #2c2d2e;
}

h3 {
  margin: 0 0 12px;
  font-size: 14px;
  color: #374151;
}

.dark-theme h3 {
  color: #e5eaf3;
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

.dark-theme .log-list li {
  color: #9ca3af;
  border-bottom-color: #2c2d2e;
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
