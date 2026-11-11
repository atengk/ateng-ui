<script setup lang="ts">
/**
 * AtengGantt 核心甘特图表现容器组件。
 *
 * 遵循 ADR-0002、ADR-0009、ADR-0021 与 ADR-0050，
 * 封装 VisActor Canvas 渲染管线、双栏像素级同步滚动、微工具栏与全套插槽反转。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { computed } from 'vue';
import type {
  GanttTaskRecord,
  GanttColumn,
  GanttScale,
  GanttMode,
  GanttTheme,
  GanttMarkLine,
  GanttChangeType,
  GanttDependencyLink,
} from '../types';
import { useGantt } from '../composables/use-gantt';

defineOptions({
  name: 'AtengGantt',
});

interface Props {
  /** 任务记录数据集 */
  tasks?: GanttTaskRecord[];
  /** 左侧任务树表列定义 */
  columns?: GanttColumn[];
  /** 时间轴刻度 */
  scale?: GanttScale;
  /** 交互模式 */
  mode?: GanttMode;
  /** 左侧表格宽度（像素） */
  splitWidth?: number;
  /** 最小左表分栏宽度 */
  minSplitWidth?: number;
  /** 最大左表分栏宽度 */
  maxSplitWidth?: number;
  /** 是否开启父任务自底向上工期/进度汇总 */
  rollup?: boolean;
  /** 主题模式 */
  theme?: GanttTheme;
  /** 是否展示顶部微工具栏 */
  showToolbar?: boolean;
  /** 是否展示今日指示垂线 */
  showTodayLine?: boolean;
  /** 是否高亮周末非工作日 */
  showWeekend?: boolean;
  /** 自定义时间标线列表 */
  markLines?: GanttMarkLine[];
  /** 任务前后置依赖连线列表 */
  dependencies?: GanttDependencyLink[];
  /** 底层 VTable-Gantt 原始逃生配置项 */
  vtableOptions?: Record<string, unknown>;
}

const props = withDefaults(defineProps<Props>(), {
  tasks: () => [],
  columns: undefined,
  scale: 'day',
  mode: 'interactive',
  splitWidth: 360,
  minSplitWidth: 200,
  maxSplitWidth: 600,
  rollup: true,
  theme: 'auto',
  showToolbar: true,
  showTodayLine: true,
  showWeekend: true,
  markLines: () => [],
  dependencies: () => [],
  vtableOptions: undefined,
});

const emit = defineEmits<{
  (e: 'update:tasks', tasks: GanttTaskRecord[]): void;
  (e: 'update:scale', scale: GanttScale): void;
  (e: 'taskChange', payload: { task: GanttTaskRecord; changeType: GanttChangeType }): void;
  (e: 'taskClick', task: GanttTaskRecord, event: MouseEvent): void;
  (
    e: 'dependencyCreate',
    payload: { sourceId: string | number; targetId: string | number; type: string },
  ): void;
  (e: 'dependencyDelete', payload: { sourceId: string | number; targetId: string | number }): void;
  (
    e: 'dependencyInvalid',
    payload: { sourceId: string | number; targetId: string | number; reason: string },
  ): void;
}>();

const {
  containerRef,
  ready,
  loading,
  taskCount,
  currentScale,
  currentMode,
  mount,
  dispose,
  resize,
  scrollToDate,
  scrollToToday,
  scrollToTask,
  zoomIn,
  zoomOut,
  expandAll,
  collapseAll,
  setScale: internalSetScale,
  setMode,
  setTasks,
  getTasks,
  getTask,
  getDependencies,
  addDependency,
  deleteDependency,
  getRawGanttInstance,
} = useGantt({
  tasks: () => props.tasks ?? [],
  columns: () => props.columns ?? [],
  dependencies: () => props.dependencies,
  scale: () => props.scale,
  mode: () => props.mode,
  splitWidth: () => props.splitWidth,
  minSplitWidth: props.minSplitWidth,
  maxSplitWidth: props.maxSplitWidth,
  rollup: props.rollup,
  showToolbar: props.showToolbar,
  showTodayLine: props.showTodayLine,
  showWeekend: props.showWeekend,
  markLines: props.markLines,
  vtableOptions: props.vtableOptions,
  onTaskChange: payload => {
    emit('taskChange', payload);
    emit('update:tasks', getTasks());
  },
  onDependencyCreate: payload => {
    emit('dependencyCreate', payload);
  },
  onDependencyDelete: payload => {
    emit('dependencyDelete', payload);
  },
  onDependencyInvalid: payload => {
    emit('dependencyInvalid', payload);
  },
});

const scaleOptions: Array<{ value: GanttScale; label: string }> = [
  { value: 'day', label: '日' },
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
  { value: 'quarter', label: '季' },
  { value: 'year', label: '年' },
];

/**
 * 包装刻度切换并派发事件。
 */
const setScale = (scale: GanttScale): void => {
  internalSetScale(scale);
  emit('update:scale', scale);
};

const isEmpty = computed(() => {
  return !props.tasks || props.tasks.length === 0;
});

defineExpose({
  ready,
  loading,
  taskCount,
  currentScale,
  currentMode,
  scrollToDate,
  scrollToToday,
  scrollToTask,
  zoomIn,
  zoomOut,
  expandAll,
  collapseAll,
  setScale,
  setMode,
  setTasks,
  getTasks,
  getTask,
  getDependencies,
  addDependency,
  deleteDependency,
  getRawGanttInstance,
  resize,
  dispose,
  mount,
});
</script>

<template>
  <div class="at-gantt" :class="{ 'at-gantt--readonly': mode === 'readonly' }">
    <!-- 顶部微工具栏 -->
    <div v-if="showToolbar" class="at-gantt__toolbar">
      <slot
        name="toolbar"
        :scale="currentScale"
        :zoom-in="zoomIn"
        :zoom-out="zoomOut"
        :scroll-to-today="scrollToToday"
        :expand-all="expandAll"
        :collapse-all="collapseAll"
      >
        <div class="at-gantt__toolbar-left">
          <div class="at-gantt__scale-group">
            <button
              v-for="s in scaleOptions"
              :key="s.value"
              type="button"
              class="at-gantt__scale-btn"
              :class="{ 'at-gantt__scale-btn--active': currentScale === s.value }"
              @click="setScale(s.value)"
            >
              {{ s.label }}
            </button>
          </div>
          <button type="button" class="at-gantt__btn" @click="scrollToToday">今天</button>
          <button type="button" class="at-gantt__btn" title="放大时间刻度" @click="zoomIn">
            +
          </button>
          <button type="button" class="at-gantt__btn" title="缩小时间刻度" @click="zoomOut">
            -
          </button>
          <button type="button" class="at-gantt__btn" title="展开全部节点" @click="expandAll">
            展开全部
          </button>
          <button type="button" class="at-gantt__btn" title="折叠全部节点" @click="collapseAll">
            折叠全部
          </button>
        </div>
        <div class="at-gantt__toolbar-right">
          <slot name="toolbar-extra" />
        </div>
      </slot>
    </div>

    <!-- 甘特图核心 Canvas 挂载容器 -->
    <div ref="containerRef" class="at-gantt__canvas-container">
      <div v-if="isEmpty" class="at-gantt__empty">
        <slot name="empty">
          <div class="at-gantt__empty-content">
            <span class="at-gantt__empty-text">暂无排程任务</span>
          </div>
        </slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.at-gantt {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  font-family: var(
    --at-gantt-font-family,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    sans-serif
  );
  background-color: var(--at-gantt-bg, #ffffff);
  color: var(--at-gantt-text-color, #1f2937);
  border: 1px solid var(--at-gantt-border-color, #e5e7eb);
  overflow: hidden;
}

.at-gantt__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background-color: var(--at-gantt-toolbar-bg, #f9fafb);
  border-bottom: 1px solid var(--at-gantt-border-color, #e5e7eb);
  user-select: none;
}

.at-gantt__toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.at-gantt__toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.at-gantt__scale-group {
  display: flex;
  border: 1px solid var(--at-gantt-border-color, #e5e7eb);
  border-radius: 6px;
  overflow: hidden;
}

.at-gantt__scale-btn {
  padding: 4px 10px;
  font-size: 0.8125rem;
  background: var(--at-gantt-bg, #ffffff);
  color: var(--at-gantt-text-color, #1f2937);
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
}

.at-gantt__scale-btn:not(:last-child) {
  border-right: 1px solid var(--at-gantt-border-color, #e5e7eb);
}

.at-gantt__scale-btn:hover {
  background: rgba(0, 0, 0, 0.04);
}

.at-gantt__scale-btn--active {
  background: var(--at-gantt-bar-color, #3b82f6);
  color: #ffffff;
}

.at-gantt__btn {
  padding: 4px 10px;
  font-size: 0.8125rem;
  background: var(--at-gantt-bg, #ffffff);
  color: var(--at-gantt-text-color, #1f2937);
  border: 1px solid var(--at-gantt-border-color, #e5e7eb);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.at-gantt__btn:hover {
  background: rgba(0, 0, 0, 0.04);
}

.at-gantt__canvas-container {
  position: relative;
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 200px;
  overflow: hidden;
}

.at-gantt__empty {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.at-gantt__empty-text {
  font-size: 0.875rem;
  color: var(--at-gantt-text-muted, #6b7280);
}

.at-gantt--readonly {
  opacity: 0.96;
}
</style>
