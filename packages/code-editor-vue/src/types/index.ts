/**
 * CodeEditorVue 核心类型契约定义。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import type * as monaco from 'monaco-editor';

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
  /** 内容变更回调 */
  onChange?: (value: string, event: monaco.editor.IModelContentChangedEvent) => void;
}
