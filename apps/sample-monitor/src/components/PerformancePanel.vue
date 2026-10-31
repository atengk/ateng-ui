<script setup lang="ts">
/**
 * 性能指标动态大盘与长任务卡顿注入面板。
 *
 * @author Ateng
 * @since 2026-10-31
 */

import { ref, onMounted } from 'vue';
import { ElButton, ElMessage, ElCard, ElTag, ElRow, ElCol, ElStatistic } from 'element-plus';
import { setupSampleMonitor } from '../monitor';
import { calculateRating, type PerformancePayload } from '@atengk/monitor';

const monitor = setupSampleMonitor();

const metrics = ref({
  fcp: 240,
  lcp: 850,
  cls: 0.02,
  ttfb: 85,
  longTaskCount: 0,
});

onMounted(() => {
  if (typeof performance !== 'undefined') {
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0) {
      const nav = navEntries[0] as PerformanceNavigationTiming;
      metrics.value.ttfb = Math.max(0, Math.round(nav.responseStart - nav.requestStart)) || 85;
    }
  }
});

// 模拟主线程阻塞卡顿 (>120ms)
const triggerLongTask = () => {
  ElMessage.warning('开始执行主线程 CPU 密集计算，将阻塞 120ms...');
  const start = performance.now();
  while (performance.now() - start < 120) {
    // 强制占满主线程
  }
  metrics.value.longTaskCount++;

  monitor.emit<PerformancePayload>({
    type: 'performance',
    level: 'warn',
    payload: {
      name: 'longtask',
      value: 120,
      rating: 'poor',
      entry: {
        duration: 120,
        startTime: start,
        attribution: 'CPU intensive task in sample console',
      },
    },
  });

  ElMessage.error('长任务执行完毕！已触发 >50ms 卡顿告警');
};
</script>

<template>
  <el-card shadow="never" class="panel-card">
    <template #header>
      <div class="card-header">
        <span class="title">3. 性能指标动态大盘与卡顿感知</span>
        <el-tag type="success" effect="plain">Web Vitals & Long Task</el-tag>
      </div>
    </template>

    <div class="actions-bar">
      <el-button type="danger" plain @click="triggerLongTask">
        执行阻塞长任务 120ms (触发 LongTask / Jank 告警)
      </el-button>
    </div>

    <el-row :gutter="16" class="metrics-row">
      <el-col :span="4">
        <el-card shadow="hover" class="metric-card">
          <el-statistic title="FCP (首次内容绘制)" :value="metrics.fcp" suffix="ms" />
          <el-tag
            size="small"
            :type="calculateRating('FCP', metrics.fcp) === 'good' ? 'success' : 'warning'"
          >
            {{ calculateRating('FCP', metrics.fcp) }}
          </el-tag>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="hover" class="metric-card">
          <el-statistic title="LCP (最大内容绘制)" :value="metrics.lcp" suffix="ms" />
          <el-tag
            size="small"
            :type="calculateRating('LCP', metrics.lcp) === 'good' ? 'success' : 'warning'"
          >
            {{ calculateRating('LCP', metrics.lcp) }}
          </el-tag>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="hover" class="metric-card">
          <el-statistic title="CLS (累计布局位移)" :value="metrics.cls" :precision="2" />
          <el-tag
            size="small"
            :type="calculateRating('CLS', metrics.cls) === 'good' ? 'success' : 'warning'"
          >
            {{ calculateRating('CLS', metrics.cls) }}
          </el-tag>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="hover" class="metric-card">
          <el-statistic title="TTFB (首包响应耗时)" :value="metrics.ttfb" suffix="ms" />
          <el-tag
            size="small"
            :type="calculateRating('TTFB', metrics.ttfb) === 'good' ? 'success' : 'warning'"
          >
            {{ calculateRating('TTFB', metrics.ttfb) }}
          </el-tag>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="hover" class="metric-card">
          <el-statistic title="Long Tasks 累计" :value="metrics.longTaskCount" suffix="次" />
          <el-tag size="small" :type="metrics.longTaskCount > 0 ? 'danger' : 'info'">
            {{ metrics.longTaskCount > 0 ? '检测到卡顿' : '流畅' }}
          </el-tag>
        </el-card>
      </el-col>
    </el-row>
  </el-card>
</template>

<style scoped>
.panel-card {
  margin-bottom: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.title {
  font-weight: 600;
  font-size: 16px;
}
.actions-bar {
  margin-bottom: 16px;
}
.metrics-row {
  margin-top: 10px;
}
.metric-card {
  text-align: center;
  background: var(--el-fill-color-lighter);
}
</style>
