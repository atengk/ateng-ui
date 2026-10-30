/**
 * CodeEditorVue 核心类型契约定义。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import type { ShallowRef } from 'vue';
import type * as monaco from 'monaco-editor';
import type { SqlFormatProvider } from '../sql/formatter';

export type { SqlFormatProvider };

/**
 * 代码 Diff 差异对比视图模式。
 * 'split': 双栏左右并排对比 (Side-by-side)
 * 'inline': 单栏上下行内对比 (Inline)
 */
export type DiffMode = 'split' | 'inline';

/**
 * 代码 Diff 增删改差异统计数据。
 */
export interface DiffStats {
  /** 新增行数统计 */
  additions: number;
  /** 删除行数统计 */
  deletions: number;
  /** 差异变更块总数 */
  changesCount: number;
}

/**
 * 自定义代码智能补全提供者函数契约。
 */
export type CompletionProviderFn = (
  model: monaco.editor.ITextModel,
  position: monaco.Position,
) =>
  | monaco.languages.CompletionItem[]
  | Promise<monaco.languages.CompletionItem[]>
  | monaco.languages.CompletionList
  | Promise<monaco.languages.CompletionList>;

/**
 * 常用支持的代码语言类型。
 */
export type CodeLanguage =
  | 'javascript'
  | 'typescript'
  | 'json'
  | 'sql'
  | 'html'
  | 'css'
  | 'scss'
  | 'less'
  | 'xml'
  | 'yaml'
  | 'markdown'
  | 'python'
  | 'java'
  | 'c'
  | 'cpp'
  | 'csharp'
  | 'go'
  | 'rust'
  | 'shell'
  | (string & {});

/**
 * 编辑器主题模式。
 * 'auto': 自动感知 <html> 类名（.dark）和系统 prefers-color-scheme
 * 'vs': 经典明亮模式
 * 'vs-dark': 经典暗黑模式
 * 'hc-black': 高对比度黑
 */
export type EditorTheme = 'auto' | 'vs' | 'vs-dark' | 'hc-black' | (string & {});

/**
 * 三级弹性 Worker 提供者配置选项。
 */
export interface MonacoWorkerOptions {
  /** 自定义 Worker 获取函数 */
  getWorker?: (workerId: string, label: string) => Worker;
  /** 自定义 Worker 脚本 URL 获取函数 */
  getWorkerUrl?: (workerId: string, label: string) => string;
  /** 静态 Worker 基础路径（如企业内网 CDN 镜像地址） */
  workerBaseUrl?: string;
  /** 是否强制回退至单线程主线程模式（禁用 Web Worker） */
  forceSingleThread?: boolean;
}

/**
 * AtengCodeEditor 组件属性定义。
 */
export interface CodeEditorProps {
  /** 代码文本内容（双向绑定） */
  modelValue?: string;
  /** 代码语言，默认为 typescript */
  language?: CodeLanguage;
  /** 主题，默认为 auto */
  theme?: EditorTheme;
  /** 是否只读，默认为 false */
  readOnly?: boolean;
  /** 容器高度，默认为 100% 或 400px */
  height?: string | number;
  /** 容器宽度，默认为 100% */
  width?: string | number;
  /** 字体大小，默认为 14 */
  fontSize?: number;
  /** Tab 缩进空格数，默认为 2 */
  tabSize?: number;
  /** 自动换行模式，默认为 on */
  wordWrap?: 'off' | 'on' | 'wordWrapColumn' | 'bounded';
  /** 行号显示模式，默认为 on */
  lineNumbers?: 'on' | 'off' | 'relative' | 'interval';
  /** 是否启用微地图 minimap，默认为 true */
  minimap?: boolean | { enabled?: boolean };
  /** 是否显示微操作栏，默认为 true */
  showToolbar?: boolean;
  /** 是否显示微状态栏，默认为 true */
  showStatusbar?: boolean;
  /** 是否显示外边框，默认为 true */
  bordered?: boolean;
  /** 透传 Monaco 原生配置对象 (Escape Hatch) */
  options?: monaco.editor.IStandaloneEditorConstructionOptions;
  /** 自定义 Worker 寻址选项 */
  workerOptions?: MonacoWorkerOptions;
  /** 大文件性能保护行数阈值（默认 50,000 行） */
  largeFileThreshold?: number;
  /** 是否启用 0x0 视口几何挂起与恢复可见自愈（默认 true） */
  autoLayoutHealing?: boolean;
  /** 自定义 SQL 格式化提供者 SPI (针对 sql 语言生效) */
  formatSqlProvider?: SqlFormatProvider;
  /** 自定义智能补全项提供者 (受管生命周期，自动卸载注销) */
  completionProvider?: CompletionProviderFn;
  /** 声明式 JSON Schema 校验规范对象 (针对 json 语言生效) */
  jsonSchema?: object;
  /** 只读审计高亮行号列表 (1-based 行号) */
  highlightLines?: number[];
}

/**
 * AtengCodeEditor 组件事件定义。
 */
export interface CodeEditorEmits {
  (e: 'update:modelValue', value: string): void;
  (e: 'change', value: string, event: monaco.editor.IModelContentChangedEvent): void;
  (e: 'mount', editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: typeof monaco): void;
  (e: 'focus'): void;
  (e: 'blur'): void;
}

/**
 * AtengCodeEditor 组件对外部暴露的 Ref 实例接口。
 */
export interface CodeEditorExpose {
  /** 获取 Monaco 实例 */
  getEditor: () => monaco.editor.IStandaloneCodeEditor | null;
  /** 获取当前 TextModel */
  getModel: () => monaco.editor.ITextModel | null;
  /** 聚焦编辑器 */
  focus: () => void;
  /** 手动触发格式化排版 */
  format: () => Promise<void>;
  /** 重新计算并自适应布局尺寸 */
  layout: () => void;
  /** 获取当前代码文本 */
  getValue: () => string;
  /** 设置代码文本（全量重置） */
  setValue: (value: string) => void;
  /** 增量应用代码文本变更（保持光标、选区与撤销历史） */
  applyIncrementalEdit: (
    newText: string,
    options?: { preserveCursor?: boolean; recordUndo?: boolean },
  ) => void;
  /** 撤销操作 (Undo) */
  undo: () => void;
  /** 重做操作 (Redo) */
  redo: () => void;
  /** 当前是否激活超大文件自适应保护模式 */
  isLargeFile: () => boolean;
  /** 当前视口是否处于 0x0 几何挂起状态（如处于未打开弹窗或隐藏 Tab 中） */
  isSuspended: () => boolean;
  /** 触发视口几何自愈布局（从 0x0 恢复可见时调用） */
  healLayout: () => void;
  /** 在模型池中创建受管 TextModel */
  createModel: (
    value: string,
    language?: CodeLanguage,
    uri?: string | monaco.Uri,
  ) => monaco.editor.ITextModel;
  /** 切换当前编辑器绑定的活动 TextModel 并平滑保持视口与光标状态 */
  setModel: (modelOrUri: monaco.editor.ITextModel | string) => void;
  /** 销毁模型池中的指定 TextModel */
  disposeModel: (modelOrUri: monaco.editor.ITextModel | string) => boolean;
  /** 获取当前活动的 TextModel */
  getActiveModel: () => monaco.editor.ITextModel | null;
  /** 获取模型池中所有受管的 TextModel 列表 */
  getModels: () => monaco.editor.ITextModel[];
  /** 保存指定模型或当前活动的视图状态 (光标与滚动位置) */
  saveViewState: (
    modelOrUri?: monaco.editor.ITextModel | string,
  ) => monaco.editor.ICodeEditorViewState | null;
  /** 恢复指定模型的视图状态 */
  restoreViewState: (
    modelOrUri: monaco.editor.ITextModel | string,
    state?: monaco.editor.ICodeEditorViewState | null,
  ) => void;
  /** 动态更新声明式 JSON Schema 校验规范 */
  setJsonSchema: (schema?: object) => void;
}

/**
 * useCodeEditor Composable 的入参选项。
 */
export interface UseCodeEditorOptions {
  /** 初始代码文本内容 */
  value?: string;
  /** 语言 */
  language?: CodeLanguage;
  /** 主题 */
  theme?: EditorTheme;
  /** 是否只读 */
  readOnly?: boolean;
  /** 字体大小 */
  fontSize?: number;
  /** Tab 缩进空格数 */
  tabSize?: number;
  /** 自动换行 */
  wordWrap?: 'off' | 'on' | 'wordWrapColumn' | 'bounded';
  /** 行号显示 */
  lineNumbers?: 'on' | 'off' | 'relative' | 'interval';
  /** 微地图 minimap */
  minimap?: boolean | { enabled?: boolean };
  /** 透传 Monaco 原生配置对象 */
  options?: monaco.editor.IStandaloneEditorConstructionOptions;
  /** 自定义 Worker 寻址选项 */
  workerOptions?: MonacoWorkerOptions;
  /** 大文件性能保护行数阈值（默认 50,000 行） */
  largeFileThreshold?: number;
  /** 是否启用 0x0 视口几何挂起与恢复可见自愈（默认 true） */
  autoLayoutHealing?: boolean;
  /** 自定义 SQL 格式化提供者 SPI */
  formatSqlProvider?: SqlFormatProvider;
  /** 自定义智能补全项提供者 */
  completionProvider?: CompletionProviderFn;
  /** 声明式 JSON Schema 校验规范对象 */
  jsonSchema?: object;
  /** 内容变更回调 */
  onChange?: (value: string, event: monaco.editor.IModelContentChangedEvent) => void;
}

/**
 * useCodeEditor Composable 返回值接口定义。
 */
export interface UseCodeEditorReturn {
  /** Monaco 编辑器原生实例 (shallowRef) */
  editor: ShallowRef<monaco.editor.IStandaloneCodeEditor | null>;
  /** 当前活动的 TextModel 实例 (shallowRef) */
  model: ShallowRef<monaco.editor.ITextModel | null>;
  /** 是否已初始化就绪 */
  isReady: ShallowRef<boolean>;
  /** 是否处于超大文件自适应保护降级模式 */
  isLargeFile: ShallowRef<boolean>;
  /** 当前视口是否处于 0x0 几何挂起状态 */
  isSuspended: ShallowRef<boolean>;
  /** 手动初始化 */
  init: () => void;
  /** 手动触发格式化文档 */
  format: () => Promise<void>;
  /** 重新计算并自适应布局尺寸（如果处于 0x0 则自动挂起） */
  layout: () => void;
  /** 手动触发视口自愈布局（从 0x0 恢复可见时安全重算） */
  healLayout: () => void;
  /** 聚焦当前编辑器 */
  focus: () => void;
  /** 获取当前代码内容 */
  getValue: () => string;
  /** 设置当前代码内容（全量重置模式） */
  setValue: (value: string) => void;
  /** 增量应用代码文本变更（保持光标位置、选区与 Undo/Redo 历史栈） */
  applyIncrementalEdit: (
    newText: string,
    options?: { preserveCursor?: boolean; recordUndo?: boolean },
  ) => void;
  /** 撤销操作 (Undo) */
  undo: () => void;
  /** 重做操作 (Redo) */
  redo: () => void;
  /** 在模型池中创建受管 TextModel */
  createModel: (
    value: string,
    language?: CodeLanguage,
    uri?: string | monaco.Uri,
  ) => monaco.editor.ITextModel;
  /** 切换当前编辑器绑定的活动 TextModel 并平滑保持视口与光标状态 */
  setModel: (modelOrUri: monaco.editor.ITextModel | string) => void;
  /** 销毁模型池中的指定 TextModel */
  disposeModel: (modelOrUri: monaco.editor.ITextModel | string) => boolean;
  /** 获取当前活动的 TextModel */
  getActiveModel: () => monaco.editor.ITextModel | null;
  /** 获取模型池中所有受管的 TextModel 列表 */
  getModels: () => monaco.editor.ITextModel[];
  /** 保存指定模型或当前活动的视图状态 (光标与滚动位置) */
  saveViewState: (
    modelOrUri?: monaco.editor.ITextModel | string,
  ) => monaco.editor.ICodeEditorViewState | null;
  /** 恢复指定模型的视图状态 */
  restoreViewState: (
    modelOrUri: monaco.editor.ITextModel | string,
    state?: monaco.editor.ICodeEditorViewState | null,
  ) => void;
  /** 动态更新声明式 JSON Schema 校验规范 */
  setJsonSchema: (schema?: object) => void;
  /** 销毁当前实例与监听，并彻底注销池内所有 Model */
  dispose: () => void;
}

/**
 * AtengCodeDiffEditor 组件属性定义。
 */
export interface CodeDiffEditorProps {
  /** 原始代码文本 (Original，支持 v-model:original) */
  original?: string;
  /** 修改后代码文本 (Modified，支持 v-model:modified 或 v-model) */
  modified?: string;
  /** modelValue 别名（映射为 modified） */
  modelValue?: string;
  /** 对比模式：'split' (双栏左右并排) 或 'inline' (单栏上下行内) */
  diffMode?: DiffMode;
  /** 代码语言，默认为 typescript */
  language?: CodeLanguage;
  /** 主题，默认为 auto */
  theme?: EditorTheme;
  /** 修改侧代码是否只读，默认为 false */
  readOnly?: boolean;
  /** 原始侧代码是否只读，默认为 true */
  originalReadOnly?: boolean;
  /** 容器高度，默认为 400px */
  height?: string | number;
  /** 容器宽度，默认为 100% */
  width?: string | number;
  /** 字体大小，默认为 14 */
  fontSize?: number;
  /** Tab 缩进空格数，默认为 2 */
  tabSize?: number;
  /** 自动换行模式，默认为 on */
  wordWrap?: 'off' | 'on' | 'wordWrapColumn' | 'bounded';
  /** 行号显示模式，默认为 on */
  lineNumbers?: 'on' | 'off' | 'relative' | 'interval';
  /** 是否启用微地图 minimap，默认为 true */
  minimap?: boolean | { enabled?: boolean };
  /** 是否显示微操作栏，默认为 true */
  showToolbar?: boolean;
  /** 是否显示微状态栏，默认为 true */
  showStatusbar?: boolean;
  /** 是否显示外边框，默认为 true */
  bordered?: boolean;
  /** 是否启用 0x0 视口几何挂起与恢复可见自愈（默认 true） */
  autoLayoutHealing?: boolean;
  /** 透传 Monaco Diff Editor 原生配置对象 (Escape Hatch) */
  options?: monaco.editor.IDiffEditorConstructionOptions;
  /** 自定义 Worker 寻址选项 */
  workerOptions?: MonacoWorkerOptions;
}

/**
 * AtengCodeDiffEditor 组件事件定义。
 */
export interface CodeDiffEditorEmits {
  (e: 'update:original', value: string): void;
  (e: 'update:modified', value: string): void;
  (e: 'update:modelValue', value: string): void;
  (e: 'update:diffMode', mode: DiffMode): void;
  (e: 'change', payload: { original: string; modified: string }): void;
  (e: 'diffUpdated', stats: DiffStats): void;
  (e: 'diffModeChange', mode: DiffMode): void;
  (e: 'mount', editor: monaco.editor.IStandaloneDiffEditor, monacoInstance: typeof monaco): void;
  (e: 'focus'): void;
  (e: 'blur'): void;
}

/**
 * AtengCodeDiffEditor 组件对外部暴露的 Ref 实例接口。
 */
export interface CodeDiffEditorExpose {
  /** 获取 Monaco 原生 DiffEditor 实例 */
  getDiffEditor: () => monaco.editor.IStandaloneDiffEditor | null;
  /** 获取原始侧 CodeEditor 实例 */
  getOriginalEditor: () => monaco.editor.IStandaloneCodeEditor | null;
  /** 获取修改侧 CodeEditor 实例 */
  getModifiedEditor: () => monaco.editor.IStandaloneCodeEditor | null;
  /** 获取原始侧 TextModel */
  getOriginalModel: () => monaco.editor.ITextModel | null;
  /** 获取修改侧 TextModel */
  getModifiedModel: () => monaco.editor.ITextModel | null;
  /** 获取原始侧代码文本 */
  getOriginalValue: () => string;
  /** 设置原始侧代码文本 */
  setOriginalValue: (value: string) => void;
  /** 获取修改侧代码文本 */
  getModifiedValue: () => string;
  /** 设置修改侧代码文本 */
  setModifiedValue: (value: string) => void;
  /** 获取当前 Diff 增删改差异统计数据 */
  getDiffStats: () => DiffStats;
  /** 当前对比视图模式 ('split' | 'inline') */
  getDiffMode: () => DiffMode;
  /** 动态切换对比视图模式 */
  setDiffMode: (mode: DiffMode) => void;
  /** 动态更新原始侧只读状态 */
  setOriginalReadOnly: (readOnly: boolean) => void;
  /** 跳转至上一处差异 */
  goToPreviousDiff: () => void;
  /** 跳转至下一处差异 */
  goToNextDiff: () => void;
  /** 重新计算并自适应布局尺寸 */
  layout: () => void;
  /** 触发视口几何自愈布局（从 0x0 恢复可见时安全重算） */
  healLayout: () => void;
  /** 当前视口是否处于 0x0 几何挂起状态 */
  isSuspended: () => boolean;
  /** 聚焦当前编辑器 */
  focus: () => void;
}

/**
 * useCodeDiff Composable 的入参配置选项。
 */
export interface UseCodeDiffOptions {
  /** 初始原始侧代码文本 */
  original?: string;
  /** 初始修改侧代码文本 */
  modified?: string;
  /** 对比模式，默认为 'split' */
  diffMode?: DiffMode;
  /** 语言，默认为 'typescript' */
  language?: CodeLanguage;
  /** 主题，默认为 'auto' */
  theme?: EditorTheme;
  /** 修改侧是否只读，默认为 false */
  readOnly?: boolean;
  /** 原始侧是否只读，默认为 true */
  originalReadOnly?: boolean;
  /** 字体大小 */
  fontSize?: number;
  /** Tab 缩进空格数 */
  tabSize?: number;
  /** 自动换行 */
  wordWrap?: 'off' | 'on' | 'wordWrapColumn' | 'bounded';
  /** 行号显示 */
  lineNumbers?: 'on' | 'off' | 'relative' | 'interval';
  /** 微地图 minimap */
  minimap?: boolean | { enabled?: boolean };
  /** 是否启用 0x0 视口几何挂起与恢复可见自愈（默认 true） */
  autoLayoutHealing?: boolean;
  /** 透传 Monaco Diff Editor 原生配置对象 */
  options?: monaco.editor.IDiffEditorConstructionOptions;
  /** 自定义 Worker 寻址选项 */
  workerOptions?: MonacoWorkerOptions;
  /** 原始侧代码变更回调 */
  onOriginalChange?: (value: string, event: monaco.editor.IModelContentChangedEvent) => void;
  /** 修改侧代码变更回调 */
  onModifiedChange?: (value: string, event: monaco.editor.IModelContentChangedEvent) => void;
  /** Diff 计算更新完成回调 */
  onDiffUpdated?: (stats: DiffStats) => void;
}
