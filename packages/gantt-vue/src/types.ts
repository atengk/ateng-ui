/**
 * @atengk/gantt-vue 核心强类型契约。
 *
 * 依据 ADR-0050，确立任务实体、列定义、时间刻度、基线、依赖连线等领域规范。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import type { Ref, MaybeRefOrGetter } from 'vue';
import type { Gantt } from '@visactor/vtable-gantt';

/**
 * 甘特图时间轴刻度联合类型。
 */
export type GanttScale = 'day' | 'week' | 'month' | 'quarter' | 'year';

/**
 * 甘特图交互模式联合类型。
 */
export type GanttMode = 'interactive' | 'readonly';

/**
 * 任务前后置依赖连线类型联合类型。
 *
 * - `FS`: Finish-to-Start (完成-开始，默认最常用)
 * - `SS`: Start-to-Start (开始-开始)
 * - `FF`: Finish-to-Finish (完成-完成)
 * - `SF`: Start-to-Finish (开始-完成)
 */
export type GanttDependencyType = 'FS' | 'SS' | 'FF' | 'SF';

/**
 * 任务变更动作类型。
 */
export type GanttChangeType = 'move' | 'resize' | 'progress' | 'table_edit';

/**
 * 甘特图主题模式。
 */
export type GanttTheme = 'auto' | 'light' | 'dark';

/**
 * 任务前后置依赖契约。
 */
export interface GanttTaskDependency {
  /** 前置任务唯一标识 */
  id: string | number;
  /** 连线类型，缺省默认为 'FS' */
  type?: GanttDependencyType;
}

/**
 * 项目计划基准线契约。
 */
export interface GanttBaseline {
  /** 基准开始日期，格式 'YYYY-MM-DD' 或 Date */
  startDate: string | Date;
  /** 基准结束日期，格式 'YYYY-MM-DD' 或 Date */
  endDate: string | Date;
}

/**
 * 企业级任务实体标准化契约。
 */
export interface GanttTaskRecord {
  /** 任务唯一标识 */
  id: string | number;
  /** 任务显示名称 */
  name: string;
  /** 计划开始日期，格式 'YYYY-MM-DD' 或 Date */
  startDate: string | Date;
  /** 计划结束日期，格式 'YYYY-MM-DD' 或 Date */
  endDate: string | Date;
  /** 完成进度百分比 (0 ~ 100) */
  progress?: number;
  /** 父级任务唯一标识（扁平模式下用于构建树） */
  parentId?: string | number | null;
  /** 子任务列表（嵌套树模式下使用） */
  children?: GanttTaskRecord[];
  /** 前置依赖关系列表，支持字符串简写（如 '1:fs'）或结构体对象 */
  dependencies?: (string | GanttTaskDependency)[];
  /** 计划基准工期 */
  baseline?: GanttBaseline;
  /** 树形节点是否折叠 */
  collapsed?: boolean;
  /** 节点类型：普通任务、里程碑或汇总任务 */
  type?: 'task' | 'milestone' | 'summary';
  /** 允许携带任意业务私有扩展属性（回写时保全） */
  [key: string]: unknown;
}

/**
 * 左侧任务树表（TreeGrid）列配置契约。
 */
export interface GanttColumn {
  /** 字段键名 */
  field: string;
  /** 表头标题文本 */
  title: string;
  /** 列宽度（像素） */
  width?: number;
  /** 最小列宽度（像素） */
  minWidth?: number;
  /** 最大列宽度（像素） */
  maxWidth?: number;
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right';
  /** 是否允许排序 */
  sortable?: boolean;
  /** 单元格编辑器类型 */
  editor?: 'input' | 'date' | 'number' | boolean;
}

/**
 * 垂直时间标记线契约。
 */
export interface GanttMarkLine {
  /** 标线对应日期，格式 'YYYY-MM-DD' 或 Date */
  date: string | Date;
  /** 标线悬浮/标注文本 */
  label?: string;
  /** 标线颜色 */
  color?: string;
  /** 标线线型：实线或虚线 */
  style?: 'solid' | 'dashed';
}

/**
 * 甘特图全景/可视图片导出配置契约。
 */
export interface GanttExportOptions {
  /** 导出图片格式，默认 'png' */
  format?: 'png' | 'jpeg';
  /** 导出文件名，默认 'gantt-schedule' */
  fileName?: string;
  /** 导出分辨率缩放比，默认根据 window.devicePixelRatio 计算 */
  pixelRatio?: number;
  /** 导出范围：全量排程图或仅当前可视区域，默认 'all' */
  viewRange?: 'all' | 'visible';
  /** 是否包含左侧任务树表，默认 true */
  includeTable?: boolean;
}

/**
 * useGantt 状态机入参配置选项。
 */
export interface UseGanttOptions {
  /** 挂载的目标 DOM 容器元素或其 Ref/Getter */
  container?: MaybeRefOrGetter<HTMLElement | null>;
  /** 任务数据集 */
  tasks?: MaybeRefOrGetter<GanttTaskRecord[] | undefined>;
  /** 任务树表列配置 */
  columns?: MaybeRefOrGetter<GanttColumn[] | undefined>;
  /** 时间轴刻度 */
  scale?: MaybeRefOrGetter<GanttScale | undefined>;
  /** 交互模式 */
  mode?: MaybeRefOrGetter<GanttMode | undefined>;
  /** 左侧表格宽度 */
  splitWidth?: MaybeRefOrGetter<number | undefined>;
  /** 最小左表分栏宽度 */
  minSplitWidth?: number;
  /** 最大左表分栏宽度 */
  maxSplitWidth?: number;
  /** 是否开启父任务自动汇总 */
  rollup?: boolean;
  /** 是否展示微工具栏 */
  showToolbar?: boolean;
  /** 是否展示今日指示红线 */
  showTodayLine?: boolean;
  /** 是否高亮周末非工作日 */
  showWeekend?: boolean;
  /** 自定义时间标线列表 */
  markLines?: GanttMarkLine[];
  /** 底层 VTable-Gantt 原始逃生配置项 */
  vtableOptions?: Record<string, unknown>;
  /** 任务变动回调 */
  onTaskChange?: (payload: { task: GanttTaskRecord; changeType: GanttChangeType }) => void;
  /** 依赖连线创建回调 */
  onDependencyCreate?: (payload: {
    sourceId: string | number;
    targetId: string | number;
    type: string;
  }) => void;
  /** 依赖连线删除回调 */
  onDependencyDelete?: (payload: { sourceId: string | number; targetId: string | number }) => void;
  /** 依赖连线无效回调 */
  onDependencyInvalid?: (payload: {
    sourceId: string | number;
    targetId: string | number;
    reason: string;
  }) => void;
}

/**
 * useGantt 状态机返回方法与只读度量门面。
 */
export interface UseGanttReturn {
  /** 挂载的 DOM 容器引用 */
  containerRef: Ref<HTMLElement | null>;
  /** 甘特图引擎是否已初始化就绪 */
  ready: Readonly<Ref<boolean>>;
  /** 当前数据加载/渲染中状态 */
  loading: Readonly<Ref<boolean>>;
  /** 当前任务总数 */
  taskCount: Readonly<Ref<number>>;
  /** 当前激活的时间轴刻度 */
  currentScale: Readonly<Ref<GanttScale>>;
  /** 当前交互模式 */
  currentMode: Readonly<Ref<GanttMode>>;
  /** 挂载并初始化甘特图实例 */
  mount: (targetContainer?: HTMLElement) => void;
  /** 销毁并释放甘特图实例与事件监听 */
  dispose: () => void;
  /** 手动触发尺寸计算自愈重绘 */
  resize: () => void;
  /** 时间轴滚动至目标日期居中 */
  scrollToDate: (date: string | Date) => void;
  /** 时间轴快速居中定位至今天 */
  scrollToToday: () => void;
  /** 视口滚动定位至指定任务行 */
  scrollToTask: (taskId: string | number) => void;
  /** 步进放大时间轴刻度 */
  zoomIn: () => void;
  /** 步进缩小时间轴刻度 */
  zoomOut: () => void;
  /** 展开所有任务树节点 */
  expandAll: () => void;
  /** 折叠所有任务树节点 */
  collapseAll: () => void;
  /** 切换时间轴刻度粒度 */
  setScale: (scale: GanttScale) => void;
  /** 切换交互模式 (interactive / readonly) */
  setMode: (mode: GanttMode) => void;
  /** 更新/重设任务数据集 */
  setTasks: (tasks: GanttTaskRecord[]) => void;
  /** 获取当前标准化任务列表 */
  getTasks: () => GanttTaskRecord[];
  /** 根据 ID 获取指定任务实体 */
  getTask: (taskId: string | number) => GanttTaskRecord | null;
  /** 获取底层的 VTable-Gantt 原生实例（逃生门） */
  getRawGanttInstance: () => Gantt | null;
}

/**
 * VTable-Gantt 内部核心交互事件枚举常量。
 */
export const GANTT_EVENTS = {
  SCROLL: 'scroll',
  CHANGE_DATE_RANGE: 'change_date_range',
  CLICK_TASK_BAR: 'click_task_bar',
  CONTEXTMENU_TASK_BAR: 'contextmenu_task_bar',
  MOUSEENTER_TASK_BAR: 'mouseenter_task_bar',
  MOUSELEAVE_TASK_BAR: 'mouseleave_task_bar',
  CREATE_TASK_SCHEDULE: 'create_task_schedule',
  CREATE_DEPENDENCY_LINK: 'create_dependency_link',
  DELETE_DEPENDENCY_LINK: 'delete_dependency_link',
  CLICK_DEPENDENCY_LINK_POINT: 'click_dependency_link_point',
  CONTEXTMENU_DEPENDENCY_LINK: 'contextmenu_dependency_link',
  CLICK_MARKLINE_CREATE: 'click_markline_create',
  CLICK_MARKLINE_CONTENT: 'click_markline_content',
  MOVE_END_TASK_BAR: 'move_end_task_bar',
  PROGRESS_UPDATE: 'progress_update',
  ZOOM: 'zoom',
} as const;

export type GanttEventType = (typeof GANTT_EVENTS)[keyof typeof GANTT_EVENTS];
