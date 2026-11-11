/**
 * 纯无状态甘特图无头状态机 (useGantt)。
 *
 * 遵循 ADR-0002、ADR-0013 与 ADR-0050 规范，以非响应式浅引用持有 VTable-Gantt 底层实例，
 * 100% 杜绝 Vue 深度 Proxy 代理导致的性能损耗，暴露完备对称命令式 API、生命周期与视口几何自愈。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import {
  ref,
  readonly,
  toValue,
  watch,
  onMounted,
  onBeforeUnmount,
  onScopeDispose,
  getCurrentScope,
  getCurrentInstance,
} from 'vue';
import {
  Gantt,
  TYPES,
  type GanttConstructorOptions,
  type ColumnsDefine,
} from '@visactor/vtable-gantt';
import {
  GANTT_EVENTS,
  type UseGanttOptions,
  type UseGanttReturn,
  type GanttTaskRecord,
  type GanttColumn,
  type GanttScale,
  type GanttMode,
  type GanttChangeType,
  type GanttDependencyType,
  type GanttDependencyLink,
  type GanttValidationResult,
} from '../types';
import { GanttResizeGuard } from '../guards/gantt-resize-guard';
import { GanttDataMapper } from '../engines/gantt-data-mapper';
import { GanttRollup } from '../engines/gantt-rollup';
import { GanttValidator } from '../engines/gantt-validator';

/**
 * 默认左侧任务树列表列定义。
 */
const DEFAULT_COLUMNS: ColumnsDefine = [
  { field: 'id', title: '序号', width: 70, sort: true },
  { field: 'name', title: '任务名称', width: 200, tree: true },
  { field: 'startDate', title: '开始时间', width: 110 },
  { field: 'endDate', title: '结束时间', width: 110 },
  { field: 'progress', title: '进度', width: 80 },
];

/**
 * 时间刻度次序列表（从微观到宏观）。
 */
const SCALE_HIERARCHY: GanttScale[] = ['day', 'week', 'month', 'quarter', 'year'];

/**
 * 计算 ISO 周序号。
 */
function getIsoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * 格式化 Date 为 'YYYY-MM-DD' 字符串。
 */
function formatDateToYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 根据任务集合推导时间轴起止范围。
 */
function resolveDateBounds(tasks: GanttTaskRecord[]): { minDate: string; maxDate: string } {
  if (!tasks.length) {
    const now = new Date();
    const min = new Date(now.getTime() - 7 * 86400000);
    const max = new Date(now.getTime() + 30 * 86400000);
    return {
      minDate: formatDateToYmd(min),
      maxDate: formatDateToYmd(max),
    };
  }

  let minTime = Infinity;
  let maxTime = -Infinity;

  for (const t of tasks) {
    const s = new Date(t.startDate).getTime();
    const e = new Date(t.endDate).getTime();
    if (!isNaN(s) && s < minTime) minTime = s;
    if (!isNaN(e) && e > maxTime) maxTime = e;
  }

  if (!isFinite(minTime) || !isFinite(maxTime)) {
    const now = new Date();
    return {
      minDate: formatDateToYmd(new Date(now.getTime() - 7 * 86400000)),
      maxDate: formatDateToYmd(new Date(now.getTime() + 30 * 86400000)),
    };
  }

  // 前后留出适当时间缓冲余量
  return {
    minDate: formatDateToYmd(new Date(minTime - 3 * 86400000)),
    maxDate: formatDateToYmd(new Date(maxTime + 7 * 86400000)),
  };
}

/**
 * 将业务列配置映射为 VTable 列定义。
 */
function mapColumnsToVTable(columns?: GanttColumn[]): ColumnsDefine {
  if (!columns || columns.length === 0) {
    return DEFAULT_COLUMNS;
  }

  return columns.map(col => ({
    field: col.field,
    title: col.title,
    width: col.width,
    minWidth: col.minWidth,
    maxWidth: col.maxWidth,
    align: col.align,
    sort: col.sortable,
    tree: col.field === 'name',
    editor: col.editor ? (typeof col.editor === 'string' ? col.editor : 'input') : undefined,
  }));
}

/**
 * 根据时间刻度生成 VTable-Gantt 标尺配置。
 */
function createTimelineScales(scale: GanttScale): TYPES.ITimelineScale[] {
  switch (scale) {
    case 'day':
      return [
        {
          unit: 'month',
          step: 1,
          format: (date: { startDate: Date }) =>
            `${date.startDate.getFullYear()}年${date.startDate.getMonth() + 1}月`,
        },
        {
          unit: 'day',
          step: 1,
          format: (date: { startDate: Date }) => String(date.startDate.getDate()),
        },
      ];
    case 'week':
      return [
        {
          unit: 'month',
          step: 1,
          format: (date: { startDate: Date }) =>
            `${date.startDate.getFullYear()}年${date.startDate.getMonth() + 1}月`,
        },
        {
          unit: 'week',
          step: 1,
          startOfWeek: 'monday',
          format: (date: { startDate: Date }) => `第${getIsoWeek(date.startDate)}周`,
        },
      ];
    case 'month':
      return [
        {
          unit: 'year',
          step: 1,
          format: (date: { startDate: Date }) => `${date.startDate.getFullYear()}年`,
        },
        {
          unit: 'month',
          step: 1,
          format: (date: { startDate: Date }) => `${date.startDate.getMonth() + 1}月`,
        },
      ];
    case 'quarter':
      return [
        {
          unit: 'year',
          step: 1,
          format: (date: { startDate: Date }) => `${date.startDate.getFullYear()}年`,
        },
        {
          unit: 'quarter',
          step: 1,
          format: (date: { startDate: Date }) =>
            `Q${Math.floor(date.startDate.getMonth() / 3) + 1}`,
        },
      ];
    case 'year':
      return [
        {
          unit: 'year',
          step: 1,
          format: (date: { startDate: Date }) => `${date.startDate.getFullYear()}年`,
        },
      ];
  }
}

/**
 * 获取不同尺度下的标尺列宽。
 */
function getTimelineColWidth(scale: GanttScale): number {
  switch (scale) {
    case 'day':
      return 40;
    case 'week':
      return 60;
    case 'month':
      return 70;
    case 'quarter':
      return 90;
    case 'year':
      return 120;
  }
}

/**
 * 将业务前后置依赖类型转换为 VTable 原生枚举类型。
 */
function toVTableDependencyType(type?: GanttDependencyType): TYPES.DependencyType {
  switch (type) {
    case 'SS':
      return TYPES.DependencyType?.StartToStart ?? ('start_to_start' as TYPES.DependencyType);
    case 'FF':
      return TYPES.DependencyType?.FinishToFinish ?? ('finish_to_finish' as TYPES.DependencyType);
    case 'SF':
      return TYPES.DependencyType?.StartToFinish ?? ('start_to_finish' as TYPES.DependencyType);
    case 'FS':
    default:
      return TYPES.DependencyType?.FinishToStart ?? ('finish_to_start' as TYPES.DependencyType);
  }
}

/**
 * 将 VTable 原生依赖类型安全转译为业务标准类型。
 */
function fromVTableDependencyType(type?: unknown): GanttDependencyType {
  switch (type) {
    case 'start_to_start':
    case 'SS':
      return 'SS';
    case 'finish_to_finish':
    case 'FF':
      return 'FF';
    case 'start_to_finish':
    case 'SF':
      return 'SF';
    case 'finish_to_start':
    case 'FS':
    default:
      return 'FS';
  }
}

export function useGantt(options: UseGanttOptions = {}): UseGanttReturn {
  const initialContainer = toValue(options.container);
  const containerRef = ref<HTMLElement | null>(initialContainer ?? null);
  const ready = ref(false);
  const loading = ref(false);
  const taskCount = ref(0);

  const initialScale = toValue(options.scale) ?? 'day';
  const currentScale = ref<GanttScale>(initialScale);

  const initialMode = toValue(options.mode) ?? 'interactive';
  const currentMode = ref<GanttMode>(initialMode);

  // 原始闭包持有，严禁被 Vue ref / reactive 深层代理
  let ganttInstance: Gantt | null = null;
  let resizeGuard: GanttResizeGuard | null = null;

  // 数据适配与汇总引擎
  const mapper = new GanttDataMapper();
  const rollupEngine = new GanttRollup({ enabled: options.rollup !== false });

  let rawTasks: GanttTaskRecord[] = toValue(options.tasks)
    ? [...(toValue(options.tasks) ?? [])]
    : [];
  let isInputFlat = GanttDataMapper.isFlatStructure(rawTasks);

  let dependencyLinks: GanttDependencyLink[] = toValue(options.dependencies)
    ? [...(toValue(options.dependencies) ?? [])]
    : [];

  /**
   * 将任务中的 baseline 嵌套对象归一化为 baselineStartDate / baselineEndDate，
   * 并识别里程碑节点 (type: 'milestone')。
   */
  const normalizeBaselineAndMilestone = (nodes: GanttTaskRecord[]): GanttTaskRecord[] => {
    return nodes.map(task => {
      const bStart = task.baseline?.startDate ?? task.baselineStartDate;
      const bEnd = task.baseline?.endDate ?? task.baselineEndDate;

      const isMilestone =
        task.type === 'milestone' ||
        (Boolean(task.startDate) &&
          Boolean(task.endDate) &&
          String(task.startDate) === String(task.endDate) &&
          task.type !== 'summary');

      const normalized: GanttTaskRecord = {
        ...task,
        baselineStartDate: bStart ? GanttRollup.formatDate(bStart as string | Date) : undefined,
        baselineEndDate: bEnd ? GanttRollup.formatDate(bEnd as string | Date) : undefined,
        type: isMilestone ? 'milestone' : task.type,
      };

      if (Array.isArray(task.children) && task.children.length > 0) {
        normalized.children = normalizeBaselineAndMilestone(task.children);
      }

      return normalized;
    });
  };

  /**
   * 将原始任务数据集映射归一化并执行自底向上 Rollup 汇总。
   */
  const processTasksForRendering = (tasks: GanttTaskRecord[]): GanttTaskRecord[] => {
    const tree = mapper.normalize(tasks);
    const rolledTree = rollupEngine.rollupTree(tree);
    return normalizeBaselineAndMilestone(rolledTree);
  };

  let renderedTasks: GanttTaskRecord[] = processTasksForRendering(rawTasks);
  taskCount.value = renderedTasks.length;

  /**
   * 构建 VTable-Gantt 构造配置对象。
   */
  const buildGanttOptions = (tasks: GanttTaskRecord[]): GanttConstructorOptions => {
    const scale = currentScale.value;
    const mode = currentMode.value;
    const isReadonly = mode === 'readonly';
    const bounds = resolveDateBounds(tasks);
    const splitWidth = toValue(options.splitWidth) ?? 360;
    const columns = toValue(options.columns);

    const markLines: TYPES.IMarkLine[] = [];
    if (options.showTodayLine !== false) {
      markLines.push({
        date: formatDateToYmd(new Date()),
        content: '今天',
        contentStyle: {
          color: '#ffffff',
          backgroundColor: '#ef4444',
          cornerRadius: 4,
          fontSize: 11,
        },
        style: {
          lineColor: '#ef4444',
          lineWidth: 2,
        },
        position: 'middle',
      });
    }

    if (options.markLines && options.markLines.length > 0) {
      for (const m of options.markLines) {
        markLines.push({
          date: typeof m.date === 'string' ? m.date : formatDateToYmd(m.date),
          content: m.label,
          contentStyle: m.color
            ? {
                color: '#ffffff',
                backgroundColor: m.color,
                cornerRadius: 4,
                fontSize: 11,
              }
            : undefined,
          style: {
            lineColor: m.color ?? '#3b82f6',
            lineWidth: 1.5,
            lineDash: m.style === 'dashed' ? [4, 4] : undefined,
          },
        });
      }
    }

    const baseOptions: GanttConstructorOptions = {
      records: tasks,
      taskListTable: {
        tableWidth: splitWidth,
        minTableWidth: options.minSplitWidth ?? 200,
        maxTableWidth: options.maxSplitWidth ?? 600,
        columns: mapColumnsToVTable(columns),
      },
      timelineHeader: {
        colWidth: getTimelineColWidth(scale),
        scales: createTimelineScales(scale),
        verticalLine: { lineColor: '#e5e7eb', lineWidth: 1 },
        horizontalLine: { lineColor: '#e5e7eb', lineWidth: 1 },
      },
      taskBar: {
        startDateField: 'startDate',
        endDateField: 'endDate',
        progressField: 'progress',
        baselineStartDateField: 'baselineStartDate',
        baselineEndDateField: 'baselineEndDate',
        baselinePosition: 'bottom',
        moveable: !isReadonly,
        resizable: !isReadonly,
        progressAdjustable: !isReadonly,
        barStyle: (interactionArgs: unknown) => {
          const rec = (interactionArgs as { taskRecord?: GanttTaskRecord })?.taskRecord;
          if (rec && GanttValidator.isTaskDelayed(rec).delayed) {
            return {
              barColor: '#ef4444',
              completedBarColor: '#dc2626',
              cornerRadius: 4,
            };
          }
          return {
            barColor: '#3b82f6',
            completedBarColor: '#1d4ed8',
            cornerRadius: 4,
          };
        },
        baselineStyle: {
          barColor: 'rgba(156, 163, 175, 0.45)',
          cornerRadius: 2,
        },
        milestoneStyle: {
          fillColor: '#f59e0b',
        },
      },
      dependency: {
        links: dependencyLinks.map(l => ({
          type: toVTableDependencyType(l.type),
          linkedFromTaskKey: l.sourceId,
          linkedToTaskKey: l.targetId,
        })),
        linkCreatable: !isReadonly,
        linkDeletable: !isReadonly,
        linkLineStyle: { lineColor: '#60a5fa', lineWidth: 1.5 },
      },
      grid: {
        weekendBackgroundColor:
          options.showWeekend !== false ? 'rgba(243, 244, 246, 0.6)' : undefined,
        horizontalLine: { lineColor: '#f3f4f6', lineWidth: 1 },
        verticalLine: { lineColor: '#f3f4f6', lineWidth: 1 },
      },
      markLine: markLines.length > 0 ? markLines : undefined,
      minDate: bounds.minDate,
      maxDate: bounds.maxDate,
      taskKeyField: 'id',
      tasksShowMode: TYPES.TasksShowMode?.Tasks_Separate ?? (0 as unknown as TYPES.TasksShowMode),
      pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
    };

    if (options.vtableOptions) {
      Object.assign(baseOptions, options.vtableOptions);
    }

    return baseOptions;
  };

  /**
   * 响应并分发任务变更，触发增量回写、Rollup 推算与外部回调。
   */
  const notifyTaskChange = (changedTask: GanttTaskRecord, changeType: GanttChangeType): void => {
    // 1. 增量更新原始输入数据（100% 保全未在列展示的扩展字段）
    rawTasks = mapper.updateTaskInList(rawTasks, changedTask);

    // 2. 重新进行自底向上 Rollup 汇总计算
    renderedTasks = processTasksForRendering(rawTasks);
    taskCount.value = renderedTasks.length;

    // 3. 动态刷新甘特图底层绘制记录
    if (ganttInstance) {
      ganttInstance.setRecords(renderedTasks);
    }

    // 4. 派发回调给外部（如 <AtengGantt /> 进行 v-model:tasks 与 @taskChange 同步）
    options.onTaskChange?.({
      task: changedTask,
      changeType,
    });
  };

  /**
   * 挂载并初始化甘特图。
   */
  const mount = (targetContainer?: HTMLElement): void => {
    const target = targetContainer ?? containerRef.value;
    if (!target) return;

    if (ganttInstance) {
      ganttInstance.release();
      ganttInstance = null;
    }

    loading.value = true;

    try {
      const vtableOpts = buildGanttOptions(renderedTasks);
      ganttInstance = new Gantt(target, vtableOpts);

      // 绑定核心交互事件
      ganttInstance.on(GANTT_EVENTS.CLICK_TASK_BAR, (args: unknown) => {
        const payload = args as { taskRecord?: GanttTaskRecord };
        if (payload?.taskRecord) {
          notifyTaskChange(payload.taskRecord, 'table_edit');
        }
      });

      ganttInstance.on(GANTT_EVENTS.MOVE_END_TASK_BAR, (args: unknown) => {
        const payload = args as { taskRecord?: GanttTaskRecord };
        if (payload?.taskRecord) {
          notifyTaskChange(payload.taskRecord, 'move');
        }
      });

      ganttInstance.on(GANTT_EVENTS.PROGRESS_UPDATE, (args: unknown) => {
        const payload = args as { taskRecord?: GanttTaskRecord };
        if (payload?.taskRecord) {
          notifyTaskChange(payload.taskRecord, 'progress');
        }
      });

      ganttInstance.on(GANTT_EVENTS.CREATE_DEPENDENCY_LINK, (args: unknown) => {
        const payload = args as {
          sourceKey?: string | number;
          sourceId?: string | number;
          targetKey?: string | number;
          targetId?: string | number;
          type?: 'FS' | 'FF' | 'SS' | 'SF';
        };
        if (!payload) return;
        const sourceId = payload.sourceKey ?? payload.sourceId;
        const targetId = payload.targetKey ?? payload.targetId;
        if (sourceId === undefined || targetId === undefined) return;

        const newLink: GanttDependencyLink = {
          sourceId,
          targetId,
          type: fromVTableDependencyType(payload.type),
        };

        // 前置有向无环图 (DAG) 快速失败校验
        const valResult = GanttValidator.validateNewLink(dependencyLinks, newLink);
        if (!valResult.valid) {
          // 拦截并从画布中移除无效连线
          if (ganttInstance) {
            try {
              (ganttInstance as unknown as { deleteLink: (arg: unknown) => void }).deleteLink({
                sourceKey: sourceId,
                targetKey: targetId,
              });
            } catch {
              // 容灾忽略
            }
          }
          options.onDependencyInvalid?.({
            sourceId,
            targetId,
            reason: valResult.reason ?? 'circular_dependency',
          });
          return;
        }

        dependencyLinks.push(newLink);
        options.onDependencyCreate?.({
          sourceId: newLink.sourceId,
          targetId: newLink.targetId,
          type: newLink.type ?? 'FS',
        });
      });

      ganttInstance.on(GANTT_EVENTS.DELETE_DEPENDENCY_LINK, (args: unknown) => {
        const payload = args as {
          sourceKey?: string | number;
          sourceId?: string | number;
          targetKey?: string | number;
          targetId?: string | number;
        };
        if (!payload) return;
        const sourceId = payload.sourceKey ?? payload.sourceId;
        const targetId = payload.targetKey ?? payload.targetId;
        if (sourceId === undefined || targetId === undefined) return;

        dependencyLinks = dependencyLinks.filter(
          l =>
            !(String(l.sourceId) === String(sourceId) && String(l.targetId) === String(targetId)),
        );
        options.onDependencyDelete?.({
          sourceId,
          targetId,
        });
      });

      // 挂载尺寸自愈守卫
      if (!resizeGuard) {
        resizeGuard = new GanttResizeGuard(target, () => {
          resize();
        });
      }

      ready.value = true;
    } finally {
      loading.value = false;
    }
  };

  /**
   * 销毁并释放实例资源。
   */
  const dispose = (): void => {
    if (resizeGuard) {
      resizeGuard.disconnect();
      resizeGuard = null;
    }

    if (ganttInstance) {
      try {
        ganttInstance.release();
      } catch {
        // 静默捕获宿主清理异常
      }
      ganttInstance = null;
    }

    ready.value = false;
    loading.value = false;
  };

  /**
   * 手动触发视口重算与 Canvas 自愈。
   */
  const resize = (): void => {
    if (!ganttInstance) return;
    try {
      const inst = ganttInstance as unknown as {
        _resize?: () => void;
        resize?: () => void;
      };
      if (typeof inst._resize === 'function') {
        inst._resize();
      } else if (typeof inst.resize === 'function') {
        inst.resize();
      }
    } catch {
      // 容灾忽略尺寸更新计算异常
    }
  };

  /**
   * 时间轴平滑定位至目标日期。
   */
  const scrollToDate = (date: string | Date): void => {
    if (!ganttInstance) return;
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      ganttInstance.scrollToMarkLine(d);
    } catch {
      // 容错处理
    }
  };

  /**
   * 一键居中定位至今天。
   */
  const scrollToToday = (): void => {
    scrollToDate(new Date());
  };

  /**
   * 定位至指定任务行。
   */
  const scrollToTask = (taskId: string | number): void => {
    if (!ganttInstance) return;
    const task = getTask(taskId);
    if (task && task.startDate) {
      scrollToDate(task.startDate);
    }
  };

  /**
   * 放大时间轴刻度（向微观步进）。
   */
  const zoomIn = (): void => {
    const idx = SCALE_HIERARCHY.indexOf(currentScale.value);
    const nextScale = SCALE_HIERARCHY[idx - 1];
    if (idx > 0 && nextScale) {
      setScale(nextScale);
    }
  };

  /**
   * 缩小时间轴刻度（向宏观步进）。
   */
  const zoomOut = (): void => {
    const idx = SCALE_HIERARCHY.indexOf(currentScale.value);
    const nextScale = SCALE_HIERARCHY[idx + 1];
    if (idx < SCALE_HIERARCHY.length - 1 && nextScale) {
      setScale(nextScale);
    }
  };

  /**
   * 递归更新树形节点展开/折叠状态。
   */
  const updateCollapseState = (nodes: GanttTaskRecord[], collapsed: boolean): GanttTaskRecord[] => {
    return nodes.map(item => ({
      ...item,
      collapsed,
      children: Array.isArray(item.children)
        ? updateCollapseState(item.children, collapsed)
        : undefined,
    }));
  };

  /**
   * 展开全部树形任务节点。
   */
  const expandAll = (): void => {
    if (!ganttInstance) return;
    renderedTasks = updateCollapseState(renderedTasks, false);
    ganttInstance.setRecords(renderedTasks);
  };

  /**
   * 折叠全部树形任务节点。
   */
  const collapseAll = (): void => {
    if (!ganttInstance) return;
    renderedTasks = updateCollapseState(renderedTasks, true);
    ganttInstance.setRecords(renderedTasks);
  };

  /**
   * 切换时间轴刻度。
   */
  const setScale = (scale: GanttScale): void => {
    currentScale.value = scale;
    if (!ganttInstance) return;
    const scales = createTimelineScales(scale);
    ganttInstance.updateScales(scales);
    resize();
  };

  /**
   * 切换交互模式。
   */
  const setMode = (mode: GanttMode): void => {
    currentMode.value = mode;
    if (!ganttInstance) return;
    ganttInstance.updateOption(buildGanttOptions(renderedTasks));
    resize();
  };

  /**
   * 重新设置任务数据集。
   */
  const setTasks = (tasks: GanttTaskRecord[]): void => {
    rawTasks = [...tasks];
    isInputFlat = GanttDataMapper.isFlatStructure(rawTasks);
    renderedTasks = processTasksForRendering(rawTasks);
    taskCount.value = renderedTasks.length;
    if (!ganttInstance) return;
    ganttInstance.setRecords(renderedTasks);
  };

  /**
   * 获取当前全部任务（自适应保持原始输入形态：扁平 vs 树形）。
   */
  const getTasks = (): GanttTaskRecord[] => {
    return isInputFlat ? mapper.toFlat(renderedTasks) : [...renderedTasks];
  };

  /**
   * 递归在多层树形数据中按 ID 检索任务。
   */
  const getTask = (taskId: string | number): GanttTaskRecord | null => {
    const findNode = (nodes: GanttTaskRecord[]): GanttTaskRecord | null => {
      for (const node of nodes) {
        if (String(node.id) === String(taskId)) {
          return node;
        }
        if (Array.isArray(node.children) && node.children.length > 0) {
          const found = findNode(node.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findNode(renderedTasks);
  };

  /**
   * 暴露底层原生 VTable-Gantt 实例（逃生门）。
   */
  const getRawGanttInstance = (): Gantt | null => {
    return ganttInstance;
  };

  /**
   * 获取当前全部依赖连线列表。
   */
  const getDependencies = (): GanttDependencyLink[] => {
    return [...dependencyLinks];
  };

  /**
   * 动态添加一条依赖连线（内置有向无环图 DAG 快速失败拦截）。
   */
  const addDependency = (link: GanttDependencyLink): GanttValidationResult => {
    const valResult = GanttValidator.validateNewLink(dependencyLinks, link);
    if (!valResult.valid) {
      options.onDependencyInvalid?.({
        sourceId: link.sourceId,
        targetId: link.targetId,
        reason: valResult.reason ?? 'circular_dependency',
      });
      return valResult;
    }

    dependencyLinks.push({ ...link });
    if (ganttInstance) {
      try {
        (ganttInstance as unknown as { addLink: (arg: unknown) => void }).addLink({
          type: toVTableDependencyType(link.type),
          linkedFromTaskKey: link.sourceId,
          linkedToTaskKey: link.targetId,
        });
      } catch {
        // 容错
      }
    }
    options.onDependencyCreate?.({
      sourceId: link.sourceId,
      targetId: link.targetId,
      type: link.type ?? 'FS',
    });
    return { valid: true };
  };

  /**
   * 动态删除一条依赖连线。
   */
  const deleteDependency = (sourceId: string | number, targetId: string | number): void => {
    dependencyLinks = dependencyLinks.filter(
      l => !(String(l.sourceId) === String(sourceId) && String(l.targetId) === String(targetId)),
    );
    if (ganttInstance) {
      try {
        (ganttInstance as unknown as { deleteLink: (arg: unknown) => void }).deleteLink({
          sourceKey: sourceId,
          targetKey: targetId,
        });
      } catch {
        // 容错
      }
    }
    options.onDependencyDelete?.({ sourceId, targetId });
  };

  // 监听动态 Props 变化
  watch(
    () => toValue(options.tasks),
    newTasks => {
      if (newTasks) {
        setTasks(newTasks);
      }
    },
    { deep: true },
  );

  watch(
    () => toValue(options.scale),
    newScale => {
      if (newScale && newScale !== currentScale.value) {
        setScale(newScale);
      }
    },
  );

  watch(
    () => toValue(options.mode),
    newMode => {
      if (newMode && newMode !== currentMode.value) {
        setMode(newMode);
      }
    },
  );

  if (getCurrentInstance()) {
    onMounted(() => {
      if (containerRef.value && !ganttInstance) {
        mount(containerRef.value);
      }
    });

    onBeforeUnmount(() => {
      dispose();
    });
  }

  if (getCurrentScope()) {
    onScopeDispose(() => {
      dispose();
    });
  }

  return {
    containerRef,
    ready: readonly(ready),
    loading: readonly(loading),
    taskCount: readonly(taskCount),
    currentScale: readonly(currentScale),
    currentMode: readonly(currentMode),
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
    setScale,
    setMode,
    setTasks,
    getTasks,
    getTask,
    getDependencies,
    addDependency,
    deleteDependency,
    getRawGanttInstance,
  };
}
