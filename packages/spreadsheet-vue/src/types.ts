/**
 * 电子表格与批量填报领域强类型契约与接口定义。
 *
 * 遵循 ADR-0049 确立的双轨数据契约、场景模式与无头状态机规范。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import type { Ref } from 'vue';

/**
 * 电子表格交互模式。
 *
 * - `full`: 全功能模式（显示 Ribbon 菜单栏、公式栏、Sheet 标签页栏与状态栏）
 * - `compact`: 紧凑批量填报模式（隐藏 Ribbon，仅保留公式栏与网格区域）
 * - `readonly`: 只读审阅模式（禁用一切编辑修改，仅允许选区查看、复制与导出）
 */
export type SpreadsheetMode = 'full' | 'compact' | 'readonly';

/**
 * 电子表格支持的国际化语言标识。
 */
export type SpreadsheetLocale = 'zh-CN' | 'en-US' | (string & {});

/**
 * 电子表格主题模式。
 */
export type SpreadsheetTheme = 'auto' | 'light' | 'dark';

/**
 * 电子表格单元格样式定义。
 */
export interface SpreadsheetCellStyle {
  fontSize?: number;
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  color?: string;
  backgroundColor?: string;
  horizontalAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  wrapStrategy?: number;
}

/**
 * 电子表格单元格数据定义。
 */
export interface SpreadsheetCellData {
  v?: string | number | boolean;
  m?: string;
  f?: string;
  s?: SpreadsheetCellStyle | string;
  t?: number;
}

/**
 * 工作表维度与单元格矩阵。
 */
export interface SpreadsheetWorksheetData {
  id: string;
  name: string;
  rowCount?: number;
  columnCount?: number;
  cellData?: Record<number, Record<number, SpreadsheetCellData>>;
  rowData?: Record<number, { h?: number; hd?: boolean }>;
  columnData?: Record<number, { w?: number; hd?: boolean }>;
  mergeData?: Array<{ startRow: number; endRow: number; startColumn: number; endColumn: number }>;
}

/**
 * Univer 完整工作簿 JSON 快照契约。
 *
 * 对应 Univer 底层 IWorkbookData，包含全部工作表元数据。
 */
export interface SpreadsheetSnapshot {
  id?: string;
  name?: string;
  appVersion?: string;
  locale?: string;
  sheets?: Record<string, SpreadsheetWorksheetData>;
  sheetOrder?: string[];
  styles?: Record<string, SpreadsheetCellStyle>;
  [key: string]: unknown;
}

/**
 * 扁平轻量行对象记录契约。
 *
 * 适用于中后台业务 CRUD 与批量填报。
 */
export type SpreadsheetRecord = Record<string, unknown>;

/**
 * 下拉数据验证规则契约。
 */
export interface SpreadsheetDataValidation {
  type: 'list' | 'checkbox' | 'number' | 'text' | 'date';
  formula?: string;
  allowBlank?: boolean;
  prompt?: string;
  error?: string;
}

/**
 * 扁平填报模式下的列配置契约。
 */
export interface SpreadsheetColumn {
  /** 字段键名，对应 SpreadsheetRecord 中的属性名 */
  key: string;
  /** 列标题显示文本 */
  title: string;
  /** 列宽（像素） */
  width?: number;
  /** 是否必填 */
  required?: boolean;
  /** 水平对齐方式 */
  align?: 'left' | 'center' | 'right';
  /** 数据校验规则 */
  dataValidation?: SpreadsheetDataValidation;
  /** 数字格式化表达式（如 '0.00%', '¥#,##0.00', 'yyyy-mm-dd'） */
  numfmt?: string;
  /** 默认单元格样式 */
  style?: SpreadsheetCellStyle;
}

/**
 * 活动选区几何度量契约。
 */
export interface SpreadsheetRange {
  /** 起始行索引（从 0 开始） */
  startRow: number;
  /** 结束行索引 */
  endRow: number;
  /** 起始列索引（从 0 开始） */
  startColumn: number;
  /** 结束列索引 */
  endColumn: number;
  /** 选区所属工作表 ID */
  sheetId?: string;
}

/**
 * 数据导出配置契约。
 */
export interface SpreadsheetExportOptions {
  /** 导出格式 */
  format?: 'csv' | 'json';
  /** 导出文件名（不含或含扩展名均可） */
  filename?: string;
  /** 指定导出工作表 ID，未传则为当前激活工作表 */
  sheetId?: string;
  /** CSV 字段分隔符，默认为逗号 ',' */
  separator?: string;
}

/**
 * 公式计算引擎 Web Worker 弹性扩展配置契约。
 */
export interface SpreadsheetWorkerOptions {
  /** 是否开启 Worker 计算，或指定 Worker 脚本 URL */
  worker?: boolean | string;
}

/**
 * 外部 Excel 文件交换驱动器接口 (ExcelExchangeSPI)。
 */
export interface ExcelExchangeDriver {
  /** 将二进制 Excel 文件解析转换为结构化快照 */
  import(file: File | Blob): Promise<SpreadsheetSnapshot>;
  /** 将快照生成二进制 Excel 文件 Blob */
  export(snapshot: SpreadsheetSnapshot, filename?: string): Promise<Blob>;
}

/**
 * useSpreadsheet 无头状态机构建选项。
 */
export interface UseSpreadsheetOptions {
  /** 挂载的 DOM 容器引用 */
  container?: HTMLElement | null;
  /** 初始工作簿全量快照 */
  snapshot?: SpreadsheetSnapshot;
  /** 初始扁平行记录数组 */
  data?: SpreadsheetRecord[];
  /** 扁平数据列配置契约 */
  columns?: SpreadsheetColumn[];
  /** 交互模式 */
  mode?: SpreadsheetMode;
  /** 是否显示顶部 Ribbon 工具栏 */
  showToolbar?: boolean;
  /** 是否显示公式编辑栏 */
  showFormulaBar?: boolean;
  /** 是否显示底部工作表标签栏 */
  showSheetBar?: boolean;
  /** 是否只读 */
  readOnly?: boolean;
  /** 主题模式 */
  theme?: SpreadsheetTheme;
  /** 国际化语言标识 */
  locale?: SpreadsheetLocale;
  /** 公式 Worker 扩展配置 */
  worker?: boolean | string;
  /** 单元格编辑后向外同步的防抖等待时间（毫秒，默认 200） */
  debounceWait?: number;
  /** 数据记录变化防抖回调 */
  onDataChange?: (data: SpreadsheetRecord[]) => void;
  /** 快照变化防抖回调 */
  onSnapshotChange?: (snapshot: SpreadsheetSnapshot) => void;
  /** 单元格编辑变更回调 */
  onCellChange?: (payload: { row: number; col: number; value: unknown; oldValue: unknown }) => void;
}

/**
 * useSpreadsheet 无头状态机返回值契约。
 */
export interface UseSpreadsheetReturn {
  /** 挂载容器 Ref */
  containerRef: Ref<HTMLElement | null>;
  /** 实例是否就绪 */
  ready: Readonly<Ref<boolean>>;
  /** 加载状态 */
  loading: Readonly<Ref<boolean>>;
  /** 当前激活工作表 ID */
  activeSheetId: Readonly<Ref<string | null>>;
  /** 全部工作表列表 */
  sheetList: Readonly<Ref<Array<{ id: string; name: string }>>>;
  /** 当前选中单元格选区 */
  selection: Readonly<Ref<SpreadsheetRange | null>>;
  /** 是否包含未保存的脏数据修改 */
  isDirty: Readonly<Ref<boolean>>;
  /** 手动初始化 Univer 容器 */
  init: (targetEl?: HTMLElement | null) => void;
  /** 获取当前工作簿完整 JSON 快照 */
  getSnapshot: () => SpreadsheetSnapshot | null;
  /** 设置/替换当前工作簿全量快照 */
  setSnapshot: (snapshot: SpreadsheetSnapshot) => void;
  /** 获取当前工作表的扁平对象记录数组 */
  getData: () => SpreadsheetRecord[];
  /** 设置当前工作表的扁平对象记录数组 */
  setData: (records: SpreadsheetRecord[], columns?: SpreadsheetColumn[]) => void;
  /** 导出当前表格为 CSV 文本并触发下载 */
  exportCsv: (filename?: string) => void;
  /** 导出当前工作簿全量快照为 JSON 文件并触发下载 */
  exportJson: (filename?: string) => void;
  /** 新增工作表 */
  addSheet: (name?: string) => string | null;
  /** 删除指定工作表 */
  removeSheet: (sheetId: string) => void;
  /** 激活指定工作表 */
  activateSheet: (sheetId: string) => void;
  /** 设置只读状态 */
  setReadOnly: (readOnly: boolean) => void;
  /** 设置主题 */
  setTheme: (theme: 'light' | 'dark') => void;
  /** 撤销一步 */
  undo: () => void;
  /** 重做一步 */
  redo: () => void;
  /** 清空当前表格内容 */
  clear: () => void;
  /** 重新计算并自愈视口几何尺寸 */
  resize: () => void;
  /** 销毁当前实例与资源清理 */
  destroy: () => void;
  /** 获取底层 UniverAPI Facade 门面实例（逃生门） */
  getUniverAPI: () => unknown | null;
  /** 获取底层 Univer Core 实例（逃生门） */
  getUniver: () => unknown | null;
}

/**
 * AtengSpreadsheet 容器组件 Props 契约。
 */
export interface SpreadsheetProps {
  /** 工作簿完整快照（支持 v-model:snapshot） */
  snapshot?: SpreadsheetSnapshot;
  /** 扁平业务行记录数组（支持 v-model:data） */
  data?: SpreadsheetRecord[];
  /** 扁平数据列配置契约 */
  columns?: SpreadsheetColumn[];
  /** 场景交互模式 */
  mode?: SpreadsheetMode;
  /** 是否显示顶部 Ribbon 工具栏 */
  showToolbar?: boolean;
  /** 是否显示公式编辑栏 */
  showFormulaBar?: boolean;
  /** 是否显示底部工作表标签栏 */
  showSheetBar?: boolean;
  /** 是否只读 */
  readOnly?: boolean;
  /** 主题模式 */
  theme?: SpreadsheetTheme;
  /** 国际化语言标识 */
  locale?: SpreadsheetLocale;
  /** 公式 Worker 扩展配置 */
  worker?: boolean | string;
  /** 容器高度 */
  height?: string | number;
  /** 容器宽度 */
  width?: string | number;
  /** 单元格编辑后向外同步的防抖等待时间（毫秒，默认 200） */
  debounceWait?: number;
}

/**
 * AtengSpreadsheet 容器组件 Emits 契约。
 */
export interface SpreadsheetEmits {
  (e: 'update:snapshot', val: SpreadsheetSnapshot): void;
  (e: 'update:data', val: SpreadsheetRecord[]): void;
  (e: 'ready', api: unknown): void;
  (e: 'change', snapshot: SpreadsheetSnapshot): void;
  (e: 'selection-change', range: SpreadsheetRange | null): void;
  (e: 'sheet-activate', sheetId: string): void;
  (
    e: 'cell-change',
    payload: { row: number; col: number; value: unknown; oldValue: unknown },
  ): void;
}

/**
 * AtengSpreadsheetModal 模态弹窗组件 Props 契约。
 */
export interface SpreadsheetModalProps extends SpreadsheetProps {
  /** 弹窗是否可见（支持 v-model:visible） */
  visible?: boolean;
  /** 弹窗标题 */
  title?: string;
  /** 弹窗宽度（非全屏时） */
  modalWidth?: string | number;
  /** 弹窗高度（非全屏时） */
  modalHeight?: string | number;
  /** 是否默认全屏 */
  fullscreen?: boolean;
  /** 是否显示全屏切换按钮 */
  showFullscreenToggle?: boolean;
  /** 确认按钮文本 */
  confirmText?: string;
  /** 取消按钮文本 */
  cancelText?: string;
}

/**
 * AtengSpreadsheetModal 模态弹窗组件 Emits 契约。
 */
export interface SpreadsheetModalEmits extends SpreadsheetEmits {
  (e: 'update:visible', val: boolean): void;
  (e: 'confirm', payload: { snapshot: SpreadsheetSnapshot; data: SpreadsheetRecord[] }): void;
  (e: 'cancel'): void;
}
