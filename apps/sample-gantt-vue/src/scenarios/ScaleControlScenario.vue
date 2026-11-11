<script setup lang="ts">
/**
 * 看板三 · 多粒度动态缩放与视图控制场景看板。
 *
 * 验证 5 大时间轴刻度（日/周/月/季/年）动态切换、平滑定位居中、
 * 左右双栏分界线拖拽宽度控制与宏观排期视图。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { ref } from 'vue';
import {
  AtengGantt,
  type GanttTaskRecord,
  type GanttScale,
  type GanttColumn,
} from '@atengk/gantt-vue';
import { scaleMacroTasks } from '../data/mock-gantt-data';

const tasks = ref<GanttTaskRecord[]>(JSON.parse(JSON.stringify(scaleMacroTasks)));
const currentScale = ref<GanttScale>('month');
const splitWidth = ref<number>(380);
const ganttRef = ref<InstanceType<typeof AtengGantt> | null>(null);

const scales: Array<{ value: GanttScale; label: string }> = [
  { value: 'day', label: '日视图' },
  { value: 'week', label: '周视图' },
  { value: 'month', label: '月视图' },
  { value: 'quarter', label: '季视图' },
  { value: 'year', label: '年视图' },
];

const columns: GanttColumn[] = [
  { field: 'id', title: '战役编号', width: 90, align: 'center' },
  { field: 'name', title: '核心战役与战略攻坚项目', width: 230 },
  { field: 'progress', title: '阶段达成', width: 80, align: 'center' },
];

const setScale = (s: GanttScale): void => {
  currentScale.value = s;
};

const handleZoomIn = (): void => {
  ganttRef.value?.zoomIn();
};

const handleZoomOut = (): void => {
  ganttRef.value?.zoomOut();
};

const handleScrollToMidYear = (): void => {
  ganttRef.value?.scrollToDate('2026-07-01');
};

const handleScrollToToday = (): void => {
  ganttRef.value?.scrollToToday();
};

const handleResetSplit = (): void => {
  splitWidth.value = 380;
};
</script>

<template>
  <div class="scenario-panel">
    <div class="panel-header">
      <div class="header-info">
        <h3 class="panel-title">看板三 · 多粒度动态缩放与视图控制</h3>
        <p class="panel-desc">
          覆盖从微观到宏观的 5 大时间刻度无缝缩放、日期精准居中视口联动、左侧树表分栏宽度保护。
        </p>
      </div>

      <!-- 时间刻度单选组 -->
      <div class="scale-radio-group">
        <button
          v-for="s in scales"
          :key="s.value"
          type="button"
          class="scale-btn"
          :class="{ active: currentScale === s.value }"
          @click="setScale(s.value)"
        >
          {{ s.label }}
        </button>
      </div>
    </div>

    <!-- 快捷视图辅助栏 -->
    <div class="view-control-bar">
      <div class="control-group">
        <span class="control-label">刻度步进:</span>
        <button type="button" class="btn" title="放大时间刻度" @click="handleZoomIn">
          🔍+ 放大
        </button>
        <button type="button" class="btn" title="缩小时间刻度" @click="handleZoomOut">
          🔍- 缩小
        </button>
      </div>

      <div class="control-group">
        <span class="control-label">日期定位:</span>
        <button type="button" class="btn" @click="handleScrollToMidYear">
          🎯 定位到年中 (7月)
        </button>
        <button type="button" class="btn" @click="handleScrollToToday">📅 定位到今天</button>
      </div>

      <div class="control-group">
        <span class="control-label">左表宽度:</span>
        <input
          v-model.number="splitWidth"
          type="range"
          min="200"
          max="500"
          step="20"
          class="range-slider"
        />
        <span class="range-val">{{ splitWidth }}px</span>
        <button type="button" class="btn btn--text" @click="handleResetSplit">重置</button>
      </div>
    </div>

    <!-- 甘特图挂载容器 -->
    <div class="gantt-wrapper">
      <AtengGantt
        ref="ganttRef"
        v-model:scale="currentScale"
        :tasks="tasks"
        :columns="columns"
        :split-width="splitWidth"
        :min-split-width="200"
        :max-split-width="600"
        :show-toolbar="false"
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

.scale-radio-group {
  display: flex;
  border: 1px solid var(--at-gantt-border-color, #e5e7eb);
  border-radius: 6px;
  overflow: hidden;
}

.scale-btn {
  padding: 6px 14px;
  font-size: 0.8125rem;
  background: var(--at-gantt-bg, #ffffff);
  color: var(--at-gantt-text-color, #374151);
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
}

.scale-btn:not(:last-child) {
  border-right: 1px solid var(--at-gantt-border-color, #e5e7eb);
}

.scale-btn:hover {
  background: var(--at-gantt-action-btn-hover-bg, rgba(0, 0, 0, 0.04));
}

.scale-btn.active {
  background: var(--at-gantt-bar-color, #3b82f6);
  color: #ffffff;
}

.view-control-bar {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 8px 16px;
  background-color: var(--at-gantt-header-bg, #f9fafb);
  border: 1px solid var(--at-gantt-border-color, #e5e7eb);
  border-radius: 6px;
  flex-wrap: wrap;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8125rem;
}

.control-label {
  color: var(--at-gantt-text-muted, #6b7280);
}

.btn {
  padding: 4px 10px;
  font-size: 0.8125rem;
  background-color: var(--at-gantt-bg, #ffffff);
  color: var(--at-gantt-text-color, #374151);
  border: 1px solid var(--at-gantt-border-color, #d1d5db);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn:hover {
  background-color: var(--at-gantt-action-btn-hover-bg, rgba(0, 0, 0, 0.04));
}

.btn--text {
  border: none;
  color: var(--at-gantt-bar-color, #3b82f6);
  background: transparent;
  padding: 0 4px;
}

.range-slider {
  width: 100px;
  cursor: pointer;
}

.range-val {
  min-width: 45px;
  font-family: monospace;
  color: var(--at-gantt-text-color, #374151);
}

.gantt-wrapper {
  flex: 1;
  min-height: 480px;
  border-radius: 8px;
  overflow: hidden;
}
</style>
