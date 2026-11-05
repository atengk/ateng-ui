<script setup lang="ts">
/**
 * 极值达成率仪表盘与多维画像雷达图自验场景组件。
 *
 * 验证 AtengGaugeChart 极值目标达成、多段阈值色阶、现代环形圆角进度条与经典指针双模，
 * 以及 AtengRadarChart 多维业务画像、polygon/circle 网格与渐变半透明填充。
 *
 * @author Ateng
 * @since 2026-11-05
 */

import { ref } from 'vue';
import {
  AtengGaugeChart,
  AtengRadarChart,
  type AtengGaugeChartInstance,
  type AtengRadarChartInstance,
} from '@atengk/echarts-vue';

const emit = defineEmits<{
  (e: 'log', message: string): void;
}>();

const gaugeChartRef = ref<AtengGaugeChartInstance | null>(null);
const radarChartRef = ref<AtengRadarChartInstance | null>(null);

// 1. 云服务可用性 SLA 达成率
const gaugeValue = ref(99.96);
const isGaugeProgress = ref(true);
const isGaugeEmpty = ref(false);

const gaugeThresholds = [
  { value: 99.0, color: '#F56C6C' },
  { value: 99.9, color: '#E6A23C' },
  { value: 100.0, color: '#67C23A' },
];

const randomizeGaugeValue = () => {
  gaugeValue.value = Number((98.5 + Math.random() * 1.5).toFixed(2));
  emit('log', `已随机刷新云服务 SLA 可用性达成率数值: ${gaugeValue.value}%`);
};

const toggleGaugeProgress = () => {
  isGaugeProgress.value = !isGaugeProgress.value;
  emit(
    'log',
    `已切换仪表盘表现形态为: ${isGaugeProgress.value ? '环形进度条模式' : '经典指针模式'}`,
  );
};

const toggleGaugeEmpty = () => {
  isGaugeEmpty.value = !isGaugeEmpty.value;
  emit('log', `已切换仪表盘空遮罩状态为: ${isGaugeEmpty.value ? '空状态' : '正常数据'}`);
};

// 2. 研发团队效能与安全成熟度画像
const radarIndicators = [
  '代码规范与质量',
  '系统架构解耦',
  '全维自动化单测',
  'DevOps 交付效能',
  '安全合规与审计',
];

const radarData = ref([
  { name: '本团队综合指标', value: [92, 95, 90, 85, 96], color: '#409EFF' },
  { name: '行业标杆参考线', value: [95, 95, 92, 90, 92], color: '#67C23A' },
]);

const isRadarArea = ref(true);
const isRadarEmpty = ref(false);

const randomizeRadarData = () => {
  radarData.value = radarData.value.map(item => ({
    ...item,
    value: item.value.map(() => Math.floor(Math.random() * 25) + 75),
  }));
  emit('log', '已随机刷新研发效能多维雷达图各维度指标');
};

const toggleRadarArea = () => {
  isRadarArea.value = !isRadarArea.value;
  emit('log', `已切换雷达图区域填充模式为: ${isRadarArea.value ? '半透明渐变填充' : '纯轮廓线条'}`);
};

const toggleRadarEmpty = () => {
  isRadarEmpty.value = !isRadarEmpty.value;
  emit('log', `已切换雷达图空遮罩状态为: ${isRadarEmpty.value ? '空状态' : '正常数据'}`);
};
</script>

<template>
  <div class="gauge-radar-scenario">
    <div class="action-bar">
      <button class="btn btn-primary" @click="randomizeGaugeValue">
        🔄 随机生成 SLA 达成率 ({{ gaugeValue }}%)
      </button>
      <button class="btn btn-theme" @click="toggleGaugeProgress">
        🎛️ {{ isGaugeProgress ? '切换为经典指针模式' : '切换为环形进度条模式' }}
      </button>
      <button class="btn btn-warning" @click="toggleGaugeEmpty">
        📭 {{ isGaugeEmpty ? '恢复仪表盘数据' : '置空仪表盘数据' }}
      </button>
      <span class="divider" />
      <button class="btn btn-primary" @click="randomizeRadarData">⚡ 刷新多维效能分值</button>
      <button class="btn btn-theme" @click="toggleRadarArea">
        🎨 {{ isRadarArea ? '切换为纯轮廓线' : '切换为渐变填充' }}
      </button>
      <button class="btn btn-warning" @click="toggleRadarEmpty">
        📭 {{ isRadarEmpty ? '恢复雷达数据' : '置空雷达数据' }}
      </button>
    </div>

    <div class="chart-grid">
      <!-- 预设卡片 1：年度 KPI 目标达成率仪表盘 -->
      <div class="chart-card">
        <div class="card-header">
          <span class="card-title">
            1. AtengGaugeChart: 云服务 SLA 可用性达成率 (多段色阶 + 进度条/指针切换)
          </span>
          <span class="badge-sub">开箱即用指标大盘</span>
        </div>
        <div class="card-body">
          <AtengGaugeChart
            ref="gaugeChartRef"
            :value="isGaugeEmpty ? (null as unknown as number) : gaugeValue"
            name="SLA 可用性达成率"
            :min="98.0"
            :max="100.0"
            :thresholds="gaugeThresholds"
            :progress="isGaugeProgress"
            :pointer="!isGaugeProgress"
            unit="%"
            theme="auto"
            height="380px"
          />
        </div>
      </div>

      <!-- 预设卡片 2：团队工程成熟度画像雷达图 -->
      <div class="chart-card">
        <div class="card-header">
          <span class="card-title">
            2. AtengRadarChart: 研发工程成熟度画像 (多数据集对比 + 渐变填充)
          </span>
          <span class="badge-sub">多维能力矩阵</span>
        </div>
        <div class="card-body">
          <AtengRadarChart
            ref="radarChartRef"
            :indicators="radarIndicators"
            :data="isRadarEmpty ? [] : radarData"
            :area="isRadarArea"
            theme="auto"
            height="380px"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gauge-radar-scenario {
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

.btn-warning {
  background-color: #f59e0b;
  color: #fff;
}
.btn-warning:hover {
  background-color: #d97706;
}
</style>
