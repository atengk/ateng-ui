/**
 * @atengk/gantt-vue 核心强类型契约。
 *
 * 依据 ADR-0050，确立任务实体、列定义、时间刻度、基线、依赖连线等领域规范。
 *
 * @author Ateng
 * @since 2026-11-11
 */

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
