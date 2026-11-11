<script setup lang="ts">
/**
 * 看板一 · 敏捷研发与多级 WBS 任务排程场景看板。
 *
 * 验证多层树形折叠、FS/SS 依赖连线交互、里程碑菱形标记、
 * 工具栏操作与任务悬浮 Tooltip 状态机插槽。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { ref } from 'vue';
import {
  AtengGantt,
  type GanttTaskRecord,
  type GanttScale,
  type GanttMode,
} from '@atengk/gantt-vue';
import { agileWbsTasks, agileColumns, agileDependencies } from '../data/mock-gantt-data';

const tasks = ref<GanttTaskRecord[]>(JSON.parse(JSON.stringify(agileWbsTasks)));
const scale = ref<GanttScale>('day');
const mode = ref<GanttMode>('interactive');
const ganttRef = ref<InstanceType<typeof AtengGantt> | null>(null);

const lastChangedInfo = ref<string>('等待任务变动操作...');

const onTaskChange = (payload: { task: GanttTaskRecord; changeType: string }): void => {
  lastChangedInfo.value = `任务 [${payload.task.name}] 触发 ${payload.changeType} 动作，起止: ${payload.task.startDate} ~ ${payload.task.endDate}`;
};

const handleExpandAll = (): void => {
  ganttRef.value?.expandAll();
};

const handleCollapseAll = (): void => {
  ganttRef.value?.collapseAll();
};

const handleScrollToday = (): void => {
  ganttRef.value?.scrollToToday();
};

const handleAddSprintTask = (): void => {
  const newTask: GanttTaskRecord = {
    id: Date.now(),
    name: '新增敏捷刺探任务 (Spike)',
    startDate: '2026-11-18',
    endDate: '2026-11-22',
    progress: 0.2,
    owner: '技术攻坚组',
    priority: 'P1',
  };
  tasks.value = [...tasks.value, newTask];
};
</script>

<template>
  <div class="scenario-panel">
    <div class="panel-header">
      <div class="header-info">
        <h3 class="panel-title">看板一 · 敏捷研发与多级 WBS 任务排程</h3>
        <p class="panel-desc">
          支持多层任务树折叠/展开、自底向上工期 Rollup 汇总、FS/SS 依赖连线拉伸与里程碑标记。
        </p>
      </div>
      <div class="header-controls">
        <button type="button" class="ctrl-btn" @click="handleExpandAll">展开全部</button>
        <button type="button" class="ctrl-btn" @click="handleCollapseAll">折叠全部</button>
        <button type="button" class="ctrl-btn" @click="handleScrollToday">定位今天</button>
        <button type="button" class="ctrl-btn ctrl-btn--primary" @click="handleAddSprintTask">
          + 插入敏捷任务
        </button>
      </div>
    </div>

    <!-- 交互变动反馈条 -->
    <div class="action-banner">
      <span class="banner-badge">数据变更感知</span>
      <span class="banner-text">{{ lastChangedInfo }}</span>
    </div>

    <!-- 核心甘特图容器 -->
    <div class="gantt-wrapper">
      <AtengGantt
        ref="ganttRef"
        v-model:tasks="tasks"
        v-model:scale="scale"
        v-model:mode="mode"
        :columns="agileColumns"
        :dependencies="agileDependencies"
        :rollup="true"
        @task-change="onTaskChange"
      >
        <!-- 任务条自定义卡片插槽 -->
        <template #tooltip="{ task, delayed, delayDays }">
          <div class="custom-tooltip">
            <div class="tooltip-header">
              <span class="tooltip-title">{{ task.name }}</span>
              <span v-if="task.priority" class="tooltip-priority">{{ task.priority }}</span>
            </div>
            <div class="tooltip-row">
              <span>起止工期:</span>
              <span>{{ task.startDate }} 至 {{ task.endDate }}</span>
            </div>
            <div class="tooltip-row">
              <span>当前进度:</span>
              <span>{{ Math.round((task.progress ?? 0) * 100) }}%</span>
            </div>
            <div v-if="task.owner" class="tooltip-row">
              <span>执行负责人:</span>
              <span>{{ task.owner }}</span>
            </div>
            <div v-if="delayed" class="tooltip-delay">⚠️ 偏离基线滞后 {{ delayDays }} 天</div>
          </div>
        </template>
      </AtengGantt>
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

.ctrl-btn--primary {
  background-color: var(--at-gantt-bar-color, #3b82f6);
  color: #ffffff;
  border-color: var(--at-gantt-bar-color, #3b82f6);
}

.ctrl-btn--primary:hover {
  background-color: var(--at-gantt-bar-progress-color, #1d4ed8);
}

.action-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px;
  font-size: 0.8125rem;
  background-color: var(--at-gantt-header-bg, #f9fafb);
  border: 1px solid var(--at-gantt-border-color, #e5e7eb);
  border-radius: 6px;
}

.banner-badge {
  padding: 2px 8px;
  font-size: 0.75rem;
  font-weight: 600;
  background-color: var(--at-gantt-bar-color, #3b82f6);
  color: #ffffff;
  border-radius: 4px;
}

.banner-text {
  color: var(--at-gantt-text-color, #374151);
  font-family: monospace;
}

.gantt-wrapper {
  flex: 1;
  min-height: 480px;
  border-radius: 8px;
  overflow: hidden;
}

.custom-tooltip {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 14px;
  font-size: 0.75rem;
  background: var(--at-gantt-tooltip-bg, rgba(31, 41, 55, 0.95));
  color: var(--at-gantt-tooltip-color, #ffffff);
  border-radius: 6px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
  white-space: nowrap;
}

.tooltip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-weight: 600;
  font-size: 0.8125rem;
  margin-bottom: 4px;
}

.tooltip-priority {
  padding: 1px 6px;
  font-size: 0.6875rem;
  background: rgba(59, 130, 246, 0.3);
  border-radius: 4px;
}

.tooltip-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  color: rgba(255, 255, 255, 0.85);
}

.tooltip-delay {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px dashed rgba(255, 255, 255, 0.2);
  color: var(--at-gantt-delay-color, #f87171);
  font-weight: 600;
}
</style>
