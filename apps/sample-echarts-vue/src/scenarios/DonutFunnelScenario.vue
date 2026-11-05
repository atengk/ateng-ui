<script setup lang="ts">
/**
 * 业务占比环形图与流转漏斗预设自验场景组件。
 *
 * 验证 AtengDonutChart 居中绝对指标卡（自动求和/千分位）、南丁格尔玫瑰图切换，
 * 以及 AtengFunnelChart 双轨转化率自动推导计算、升降序切换与断层间隙调节。
 *
 * @author Ateng
 * @since 2026-11-05
 */

import { ref } from 'vue';
import {
  AtengDonutChart,
  AtengFunnelChart,
  type AtengDonutChartInstance,
  type AtengFunnelChartInstance,
} from '@atengk/echarts-vue';

const emit = defineEmits<{
  (e: 'log', message: string): void;
}>();

const donutChartRef = ref<AtengDonutChartInstance | null>(null);
const funnelChartRef = ref<AtengFunnelChartInstance | null>(null);

// 1. 多云基础设施算力支出数据集
const donutData = ref([
  { name: '云原生容器底座', value: 3480000 },
  { name: '数据安全与鉴权中台', value: 2560000 },
  { name: 'AI 智能交互代理', value: 2190000 },
  { name: '微服务网关集群', value: 1650000 },
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
  emit('log', '已随机更新多云算力费用占比数据 (验证中心指标卡动态自动求和与千分位)');
};

const toggleDonutRose = () => {
  isDonutRose.value = !isDonutRose.value;
  emit(
    'log',
    `已切换环形图模式为: ${isDonutRose.value ? '南丁格尔玫瑰图 (roseType: radius)' : '标准同心环形图'}`,
  );
};

const toggleDonutSummary = () => {
  isDonutSummary.value = !isDonutSummary.value;
  emit('log', `已切换中心指标卡为: ${isDonutSummary.value ? '显示中心汇总' : '关闭中心指标卡'}`);
};

const toggleDonutEmpty = () => {
  isDonutEmpty.value = !isDonutEmpty.value;
  emit('log', `已切换环形图空遮罩为: ${isDonutEmpty.value ? '空状态' : '正常数据'}`);
};

// 2. B2B SaaS 客户全生命周期转化漏斗数据集
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
  emit('log', '已随机刷新漏斗转化数据 (验证环节转化率与总体转化率实时重算)');
};

const toggleFunnelSort = () => {
  funnelSort.value = funnelSort.value === 'descending' ? 'ascending' : 'descending';
  emit(
    'log',
    `已切换漏斗排列方式为: ${funnelSort.value === 'descending' ? '降序 (漏斗形)' : '升序 (金字塔形)'}`,
  );
};

const toggleFunnelGap = () => {
  funnelGap.value = funnelGap.value === 3 ? 8 : 3;
  emit('log', `已调整漏斗阶段断层间距为: ${funnelGap.value}px`);
};

const toggleFunnelEmpty = () => {
  isFunnelEmpty.value = !isFunnelEmpty.value;
  emit('log', `已切换漏斗图空遮罩为: ${isFunnelEmpty.value ? '空状态' : '正常数据'}`);
};
</script>

<template>
  <div class="donut-funnel-scenario">
    <div class="action-bar">
      <button class="btn btn-primary" @click="randomizeDonutData">
        🔄 刷新算力占比 (自动求和)
      </button>
      <button class="btn btn-theme" @click="toggleDonutRose">
        🌹 {{ isDonutRose ? '切换为标准环形图' : '切换为南丁格尔玫瑰图' }}
      </button>
      <button class="btn btn-info" @click="toggleDonutSummary">
        🎯 {{ isDonutSummary ? '关闭中心指标卡' : '显示中心指标卡' }}
      </button>
      <button class="btn btn-warning" @click="toggleDonutEmpty">
        📭 {{ isDonutEmpty ? '恢复占比数据' : '置空占比数据' }}
      </button>
      <span class="divider" />
      <button class="btn btn-primary" @click="randomizeFunnelData">⚡ 刷新漏斗转化数据</button>
      <button class="btn btn-secondary" @click="toggleFunnelSort">
        📐 {{ funnelSort === 'descending' ? '切换为金字塔形 (升序)' : '切换为漏斗形 (降序)' }}
      </button>
      <button class="btn btn-secondary" @click="toggleFunnelGap">
        📏 间距调节 (当前: {{ funnelGap }}px)
      </button>
      <button class="btn btn-warning" @click="toggleFunnelEmpty">
        📭 {{ isFunnelEmpty ? '恢复漏斗数据' : '置空漏斗数据' }}
      </button>
    </div>

    <div class="chart-grid">
      <!-- 预设卡片 1：分类占比与中心指标卡 -->
      <div class="chart-card">
        <div class="card-header">
          <span class="card-title">
            1. AtengDonutChart: 企业多云算力费用占比 (中心指标卡 + 玫瑰图切换)
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
            :center-summary="isDonutSummary ? { title: '算力总支出' } : false"
            theme="auto"
            height="380px"
          />
        </div>
      </div>

      <!-- 预设卡片 2：电商/SaaS全链路业务转化漏斗 -->
      <div class="chart-card">
        <div class="card-header">
          <span class="card-title">
            2. AtengFunnelChart: SaaS 客户全生命周期漏斗 (环节转化率 + 总体转化率)
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
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.donut-funnel-scenario {
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

.btn-primary {
  background-color: #2563eb;
  color: #fff;
}
.btn-primary:hover {
  background-color: #1d4ed8;
}

.btn-theme {
  background-color: #4f46e5;
  color: #fff;
}
.btn-theme:hover {
  background-color: #4338ca;
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
</style>
