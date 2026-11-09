<script setup lang="ts">
/**
 * 千人千面数据驾驶舱与下游专业引擎协同展厅看板 (Dashboard 5)。
 *
 * 验证 useGridItem() 尺寸感知总线，
 * 验证与 @atengk/echarts-vue (趋势图、环形图、仪表盘) 深度协同无白屏重绘，
 * 验证卡片尺寸拖拽缩放时防抖广播触发图表自愈自适应。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref } from 'vue';
import { AtengGridLayout, AtengGridItem } from '@atengk/grid-layout-vue';
import type { GridLayoutItem } from '@atengk/grid-layout-vue';
import {
  AtengTrendChart,
  AtengDonutChart,
  AtengGaugeChart,
  type TrendMetric,
} from '@atengk/echarts-vue';
import { ElMessage } from 'element-plus';

interface CockpitCardPayload {
  title: string;
  type: 'trend' | 'donut' | 'gauge' | 'metric' | 'editor';
  category: string;
}

// 1. 营收与走势图数据集
const trendData = ref([
  { month: '1月', revenue: 4200, profit: 1200 },
  { month: '2月', revenue: 3800, profit: 1100 },
  { month: '3月', revenue: 5100, profit: 1650 },
  { month: '4月', revenue: 6400, profit: 2100 },
  { month: '5月', revenue: 5900, profit: 1950 },
  { month: '6月', revenue: 7800, profit: 2800 },
  { month: '7月', revenue: 8600, profit: 3200 },
  { month: '8月', revenue: 9200, profit: 3600 },
]);

const trendMetrics: TrendMetric[] = [
  { key: 'revenue', name: '营业收入 (万元)', type: 'bar' },
  { key: 'profit', name: '净利润 (万元)', type: 'line', smooth: true },
];

// 2. 算力支出多维环形数据集
const donutData = ref([
  { name: 'GPU 智能算力集群', value: 4500000 },
  { name: '微服务网格中台', value: 2800000 },
  { name: '分布式存储系统', value: 1950000 },
  { name: '多区域 CDN 网络', value: 1400000 },
  { name: '安全合规与审计', value: 950000 },
]);

// 3. 服务可用性 SLA 仪表盘数据
const gaugeValue = ref(99.98);

// 4. 驾驶舱栅格初始布局
const initialCards: GridLayoutItem<CockpitCardPayload>[] = [
  {
    id: 'chart-trend',
    x: 0,
    y: 0,
    w: 8,
    h: 4,
    minW: 4,
    minH: 3,
    data: {
      title: '📈 业务营收与利润趋势 (双轴柱线)',
      type: 'trend',
      category: '经营指标',
    },
  },
  {
    id: 'chart-donut',
    x: 8,
    y: 0,
    w: 4,
    h: 4,
    minW: 3,
    minH: 3,
    data: {
      title: '🍩 云基础设施算力分布',
      type: 'donut',
      category: '成本管控',
    },
  },
  {
    id: 'chart-gauge',
    x: 0,
    y: 4,
    w: 4,
    h: 3,
    minW: 3,
    minH: 2,
    data: {
      title: '⚡ 核心链路 SLA 达成率',
      type: 'gauge',
      category: '服务质量',
    },
  },
  {
    id: 'card-metrics',
    x: 4,
    y: 4,
    w: 4,
    h: 3,
    minW: 3,
    minH: 2,
    data: {
      title: '📊 实时运营指标总览',
      type: 'metric',
      category: '业务总览',
    },
  },
  {
    id: 'card-editor',
    x: 8,
    y: 4,
    w: 4,
    h: 3,
    minW: 3,
    minH: 2,
    data: {
      title: '💻 动态编排规则配置 (JSON)',
      type: 'editor',
      category: '配置中心',
    },
  },
];

const layout = ref<GridLayoutItem<CockpitCardPayload>[]>(JSON.parse(JSON.stringify(initialCards)));

const showGridLines = ref(true);
const editable = ref(true);
const gridRef = ref<InstanceType<typeof AtengGridLayout> | null>(null);

const randomizeData = () => {
  // 随机刷新趋势图
  trendData.value = trendData.value.map(item => ({
    ...item,
    revenue: Math.floor(Math.random() * 6000) + 3000,
    profit: Math.floor(Math.random() * 2500) + 1000,
  }));
  // 随机刷新环形图
  donutData.value = donutData.value.map(item => ({
    ...item,
    value: Math.floor(Math.random() * 4000000) + 800000,
  }));
  // 随机刷新仪表盘
  gaugeValue.value = Number((99.5 + Math.random() * 0.49).toFixed(2));
  ElMessage.success('已随机刷新驾驶舱图表数据集，触发下游引擎平滑过渡动画！');
};

const resetLayout = () => {
  layout.value = JSON.parse(JSON.stringify(initialCards));
};
</script>

<template>
  <div class="cockpit-dashboard">
    <!-- 顶部状态栏 -->
    <div class="dashboard-header">
      <div class="header-left">
        <h2 class="dashboard-title">看板 5：千人千面数据驾驶舱与下游专业引擎协同</h2>
        <p class="dashboard-desc">
          验证 <code>useGridItem()</code> 依赖注入总线向子树暴露
          <code>pixelWidth / pixelHeight / onResize</code>； 真实集成
          <code>@atengk/echarts-vue</code> 柱线趋势图、多维环形图与 SLA 仪表盘，
          实测卡片缩放拉伸时图表自适应重绘自愈，无白屏、无模糊变形。
        </p>
      </div>
      <div class="header-metrics">
        <el-tag v-if="gridRef?.maximizedId" type="warning" size="large">
          🔍 聚焦审查中: ID {{ gridRef.maximizedId }}
        </el-tag>
        <el-tag type="success" size="large">协同引擎: @atengk/echarts-vue 5.x</el-tag>
        <el-tag type="info" size="large">驾驶舱卡片: {{ layout.length }} 项</el-tag>
      </div>
    </div>

    <!-- 工具控制面板 -->
    <el-card class="control-card" shadow="never">
      <div class="control-row">
        <div class="control-group">
          <span class="control-label">编辑态 (拖拽/拉伸):</span>
          <el-switch v-model="editable" active-text="编辑中" inactive-text="只读预览" />
        </div>

        <div class="control-group">
          <span class="control-label">纯 CSS 辅助参考网格:</span>
          <el-switch v-model="showGridLines" />
        </div>

        <div class="control-group action-buttons">
          <el-button type="primary" size="small" @click="randomizeData">
            🎲 随机刷新驾驶舱数据
          </el-button>
          <el-button size="small" @click="resetLayout"> 🔄 重置驾驶舱布局 </el-button>
        </div>
      </div>
    </el-card>

    <!-- 网格画布大盘 -->
    <div class="cockpit-canvas-wrapper">
      <AtengGridLayout
        ref="gridRef"
        v-model:layout="layout"
        :cell-height="'80px'"
        :show-grid-lines="showGridLines"
        :editable="editable"
      >
        <AtengGridItem v-for="item in layout" :key="item.id" :item="item">
          <template
            #default="{
              isDragging,
              isResizing,
              isMaximized,
              isCollapsed,
              toggleMaximize,
              toggleCollapse,
            }"
          >
            <div
              class="cockpit-card"
              :class="{
                'cockpit-card--dragging': isDragging,
                'cockpit-card--resizing': isResizing,
                'cockpit-card--maximized': isMaximized,
                'cockpit-card--collapsed': isCollapsed,
              }"
            >
              <!-- 卡片头部手柄 -->
              <div class="cockpit-card-header at-grid-drag-handle">
                <div class="header-left-meta">
                  <span class="drag-icon">⋮⋮</span>
                  <span class="card-title">{{ item.data?.title }}</span>
                </div>
                <div class="header-right-meta">
                  <el-tag size="small" type="primary" effect="plain">
                    {{ item.w }}×{{ item.h }}
                  </el-tag>
                  <el-tag size="small" type="info">
                    {{ item.data?.category }}
                  </el-tag>
                  <div class="card-action-btn-group" @pointerdown.stop @mousedown.stop>
                    <el-button
                      size="small"
                      link
                      :type="isCollapsed ? 'warning' : 'info'"
                      :title="isCollapsed ? '展开卡片' : '折叠卡片'"
                      @click="toggleCollapse"
                    >
                      {{ isCollapsed ? '🔽 展开' : '🔼 折叠' }}
                    </el-button>
                    <el-button
                      size="small"
                      link
                      :type="isMaximized ? 'primary' : 'info'"
                      :title="isMaximized ? '还原卡片' : '全屏最大化聚焦'"
                      @click="toggleMaximize"
                    >
                      {{ isMaximized ? '🗗 还原' : '⛶ 聚焦' }}
                    </el-button>
                  </div>
                </div>
              </div>

              <!-- 卡片内容主体：真实嵌入专业图表 -->
              <div v-show="!isCollapsed" class="cockpit-card-body">
                <!-- 1. 营业收入趋势柱线混合图 -->
                <div v-if="item.data?.type === 'trend'" class="chart-container">
                  <AtengTrendChart
                    :data="trendData"
                    dimension="month"
                    :metrics="trendMetrics"
                    theme="auto"
                    height="100%"
                  />
                </div>

                <!-- 2. 算力支出多维环形图 -->
                <div v-else-if="item.data?.type === 'donut'" class="chart-container">
                  <AtengDonutChart
                    :data="donutData"
                    name-key="name"
                    value-key="value"
                    theme="auto"
                    height="100%"
                  />
                </div>

                <!-- 3. SLA 可用性仪表盘 -->
                <div v-else-if="item.data?.type === 'gauge'" class="chart-container">
                  <AtengGaugeChart
                    :value="gaugeValue"
                    :min="98"
                    :max="100"
                    unit="%"
                    title="核心 SLA 达成率"
                    theme="auto"
                    height="100%"
                  />
                </div>

                <!-- 4. 实时关键指标 -->
                <div v-else-if="item.data?.type === 'metric'" class="metric-grid-container">
                  <div class="metric-stat-box">
                    <span class="stat-num stat-num--primary">¥1,894.2万</span>
                    <span class="stat-lbl">本月累计流水</span>
                  </div>
                  <div class="metric-stat-box">
                    <span class="stat-num stat-num--success">142,890</span>
                    <span class="stat-lbl">实时在线设备</span>
                  </div>
                  <div class="metric-stat-box">
                    <span class="stat-num stat-num--warning">12.4ms</span>
                    <span class="stat-lbl">全局平均时延</span>
                  </div>
                  <div class="metric-stat-box">
                    <span class="stat-num stat-num--danger">0</span>
                    <span class="stat-lbl">未恢复致命异常</span>
                  </div>
                </div>

                <!-- 5. 编排规则配置编辑器 -->
                <div v-else class="config-editor-container">
                  <div class="config-tip">
                    ⚙️ 布局坐标流感知：卡片实时坐标为 ({{ item.x }}, {{ item.y }})，跨度为
                    {{ item.w }}×{{ item.h }}。
                  </div>
                  <pre class="json-code"><code>{{ JSON.stringify(item, null, 2) }}</code></pre>
                </div>
              </div>

              <!-- 卡片折叠态占位提示 -->
              <div v-if="isCollapsed" class="cockpit-card-collapsed-tip">
                <span>⚡ 卡片已收缩折叠为 1 行（点击右上角展开恢复）</span>
              </div>
            </div>
          </template>
        </AtengGridItem>
      </AtengGridLayout>
    </div>
  </div>
</template>

<style scoped>
.cockpit-dashboard {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
}

.dashboard-title {
  font-size: 18px;
  margin: 0 0 6px 0;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.dashboard-desc {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.dashboard-desc code {
  background-color: var(--el-fill-color-light);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--el-color-primary);
}

.header-metrics {
  display: flex;
  gap: 12px;
}

.control-card {
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
}

.control-row {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-regular);
}

.action-buttons {
  margin-left: auto;
}

.cockpit-canvas-wrapper {
  background-color: var(--el-bg-color-page);
  border: 2px dashed var(--el-border-color);
  border-radius: 8px;
  padding: 12px;
  min-height: 600px;
  box-sizing: border-box;
}

.cockpit-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: var(--at-grid-border-radius, 8px);
  box-shadow: var(--el-box-shadow-lighter);
  overflow: hidden;
  box-sizing: border-box;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.cockpit-card--dragging,
.cockpit-card--resizing {
  border-color: var(--el-color-primary);
  box-shadow: var(--el-box-shadow);
}

.cockpit-card--maximized {
  border-color: var(--el-color-primary);
  box-shadow: var(--el-box-shadow-dark);
}

.cockpit-card--collapsed {
  border-style: dashed;
}

.card-action-btn-group {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: 6px;
}

.cockpit-card-collapsed-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 0 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  background-color: var(--el-fill-color-lighter);
}

.cockpit-card-header {
  padding: 8px 12px;
  background-color: var(--el-fill-color-lighter);
  border-bottom: 1px solid var(--el-border-color-lighter);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.drag-icon {
  color: var(--el-text-color-placeholder);
  cursor: grab;
  font-weight: bold;
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.header-right-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cockpit-card-body {
  flex: 1;
  position: relative;
  overflow: hidden;
  padding: 8px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.chart-container {
  width: 100%;
  height: 100%;
  min-height: 120px;
  position: relative;
}

.metric-grid-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 12px;
  height: 100%;
  padding: 8px;
  box-sizing: border-box;
}

.metric-stat-box {
  background-color: var(--el-fill-color-light);
  border-radius: 6px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 6px;
}

.stat-num {
  font-size: 20px;
  font-weight: 700;
  font-family: Consolas, Monaco, monospace;
}

.stat-num--primary {
  color: var(--el-color-primary);
}

.stat-num--success {
  color: var(--el-color-success);
}

.stat-num--warning {
  color: var(--el-color-warning);
}

.stat-num--danger {
  color: var(--el-color-danger);
}

.stat-lbl {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.config-editor-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-tip {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  background-color: var(--el-fill-color-lighter);
  padding: 6px 8px;
  border-radius: 4px;
}

.json-code {
  flex: 1;
  margin: 0;
  overflow-y: auto;
  background-color: var(--el-fill-color-darker);
  color: var(--el-text-color-primary);
  font-family: Consolas, Monaco, monospace;
  font-size: 11px;
  padding: 8px;
  border-radius: 4px;
}
</style>
