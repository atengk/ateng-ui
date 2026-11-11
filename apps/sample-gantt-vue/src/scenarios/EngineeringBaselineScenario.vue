<script setup lang="ts">
/**
 * 看板二 · 工程建设与基线偏差预警场景看板。
 *
 * 验证计划基线对比条双层展示、工期延误智能标红预警、
 * 今天指示垂线、周末遮罩高亮与自定义工程质检标线。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { ref } from 'vue';
import {
  AtengGantt,
  type GanttTaskRecord,
  type GanttMarkLine,
  GanttValidator,
} from '@atengk/gantt-vue';
import { engineeringBaselineTasks, engineeringColumns } from '../data/mock-gantt-data';

const tasks = ref<GanttTaskRecord[]>(JSON.parse(JSON.stringify(engineeringBaselineTasks)));
const showWeekend = ref<boolean>(true);
const showTodayLine = ref<boolean>(true);

// 关键工程质量验收标线
const markLines: GanttMarkLine[] = [
  {
    date: '2026-11-12',
    label: '中期待验节点',
    color: '#f59e0b',
    style: 'dashed',
  },
  {
    date: '2026-11-25',
    label: '综合管廊封顶线',
    color: '#10b981',
    style: 'solid',
  },
];

const ganttRef = ref<InstanceType<typeof AtengGantt> | null>(null);

const delaySummary = ref<{ delayedCount: number; totalDelayDays: number }>({
  delayedCount: 0,
  totalDelayDays: 0,
});

/**
 * 遍历统计工程延误情况。
 */
const refreshDelayStats = (): void => {
  let count = 0;
  let days = 0;
  const traverse = (items: GanttTaskRecord[]): void => {
    for (const item of items) {
      const res = GanttValidator.isTaskDelayed(item);
      if (res.delayed) {
        count += 1;
        days += res.delayDays;
      }
      if (Array.isArray(item.children)) {
        traverse(item.children);
      }
    }
  };
  traverse(tasks.value);
  delaySummary.value = { delayedCount: count, totalDelayDays: days };
};

refreshDelayStats();

const toggleWeekend = (): void => {
  showWeekend.value = !showWeekend.value;
};

const toggleToday = (): void => {
  showTodayLine.value = !showTodayLine.value;
};
</script>

<template>
  <div class="scenario-panel">
    <div class="panel-header">
      <div class="header-info">
        <h3 class="panel-title">看板二 · 工程建设与基线偏差预警</h3>
        <p class="panel-desc">
          计划基准对比工期偏差、自动检测实际完工超出并标红报警、高亮周末及关键里程碑质量检验线。
        </p>
      </div>
      <div class="header-controls">
        <button
          type="button"
          class="ctrl-btn"
          :class="{ active: showWeekend }"
          @click="toggleWeekend"
        >
          {{ showWeekend ? '隐藏非工作日' : '高亮非工作日' }}
        </button>
        <button
          type="button"
          class="ctrl-btn"
          :class="{ active: showTodayLine }"
          @click="toggleToday"
        >
          {{ showTodayLine ? '隐藏今日标线' : '显示今日标线' }}
        </button>
      </div>
    </div>

    <!-- 延误统计警示栏 -->
    <div class="delay-alert-bar">
      <div class="alert-item">
        <span class="alert-icon">⚠️</span>
        <span class="alert-label">受阻工程分项:</span>
        <span class="alert-value alert-value--danger">{{ delaySummary.delayedCount }} 项</span>
      </div>
      <div class="alert-item">
        <span class="alert-icon">⏱️</span>
        <span class="alert-label">累计滞后天数:</span>
        <span class="alert-value alert-value--warning">{{ delaySummary.totalDelayDays }} 天</span>
      </div>
      <div class="alert-note">
        * 图中任务条下方半透明灰色条为计划基线，若实际工期滞后则自动触发红色警示
      </div>
    </div>

    <!-- 甘特图容器 -->
    <div class="gantt-wrapper">
      <AtengGantt
        ref="ganttRef"
        v-model:tasks="tasks"
        :columns="engineeringColumns"
        :show-weekend="showWeekend"
        :show-today-line="showTodayLine"
        :mark-lines="markLines"
        scale="day"
        @task-change="refreshDelayStats"
      />
    </div>
  </div>
</template>

<style scoped>
.scenario-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--at-gantt-bg, #ffffff);
  border: 1px solid var(--at-gantt-border-color, #e5e7eb);
  border-radius: 8px;
}

.panel-title {
  margin: 0 0 4px 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--at-gantt-text-color, #1f2937);
}

.panel-desc {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--at-gantt-text-muted, #6b7280);
}

.header-controls {
  display: flex;
  gap: 8px;
}

.ctrl-btn {
  padding: 6px 12px;
  font-size: 0.8125rem;
  font-weight: 500;
  background-color: var(--at-gantt-bg, #ffffff);
  color: var(--at-gantt-text-color, #374151);
  border: 1px solid var(--at-gantt-border-color, #d1d5db);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.ctrl-btn:hover {
  background-color: var(--at-gantt-action-btn-hover-bg, rgba(0, 0, 0, 0.04));
}

.ctrl-btn.active {
  background-color: var(--at-gantt-bar-color, #3b82f6);
  color: #ffffff;
  border-color: var(--at-gantt-bar-color, #3b82f6);
}

.delay-alert-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 10px 16px;
  background-color: var(--at-gantt-header-bg, #f9fafb);
  border: 1px solid var(--at-gantt-border-color, #e5e7eb);
  border-radius: 6px;
}

.alert-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8125rem;
}

.alert-label {
  color: var(--at-gantt-text-muted, #6b7280);
}

.alert-value {
  font-weight: 600;
}

.alert-value--danger {
  color: var(--at-gantt-delay-color, #ef4444);
}

.alert-value--warning {
  color: var(--at-gantt-warning-color, #f59e0b);
}

.alert-note {
  margin-left: auto;
  font-size: 0.75rem;
  color: var(--at-gantt-text-muted, #9ca3af);
}

.gantt-wrapper {
  flex: 1;
  min-height: 480px;
  border-radius: 8px;
  overflow: hidden;
}
</style>
