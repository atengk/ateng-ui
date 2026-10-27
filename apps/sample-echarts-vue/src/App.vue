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
import { AtengECharts, type AtengEChartsInstance, type EChartsOption } from '@atengk/echarts-vue';

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

// 选项卡状态（Tab 1: 基础大盘；Tab 2: 初始隐藏零尺寸 Tab）
const activeTab = ref<'dashboard' | 'hiddenTab'>('dashboard');

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
</script>

<template>
  <div class="sample-container" :class="{ 'dark-theme': isDark }">
    <header class="header">
      <div class="title-wrap">
        <h1>@atengk/echarts-vue 自验展厅</h1>
        <span class="badge">Ticket #154 自验</span>
        <span class="badge-success">端口 3006</span>
        <span class="badge-theme">{{
          isDark ? '🌙 当前: 暗黑模式 (ateng-dark)' : '☀️ 当前: 浅色模式 (ateng-light)'
        }}</span>
      </div>
      <p class="subtitle">
        L2 专用能力扩展层：notMerge 声明式同步、多态 DOM
        遮罩（Loading/Empty/Error）、暗黑热切换与事件透传。
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
        :class="{ active: activeTab === 'dashboard' }"
        @click="activeTab = 'dashboard'"
      >
        📊 主看板 (基础图表与多态遮罩)
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'hiddenTab' }"
        @click="activeTab = 'hiddenTab'"
      >
        ⚡ 隐藏选项卡 (初始 display: none 零尺寸自愈验证)
      </button>
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
