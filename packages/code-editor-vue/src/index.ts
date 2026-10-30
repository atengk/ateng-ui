/**
 * @atengk/code-editor-vue 顶级公共导出入口。
 *
 * 依据 ADR-0035 与成熟度防线：
 * 纯声明式导出，无隐式副作用，支持极致 Tree-Shaking。
 *
 * @author Ateng
 * @since 2026-10-29
 */

export { default as AtengCodeEditor } from './components/AtengCodeEditor.vue';
export type AtengCodeEditorInstance = InstanceType<
  typeof import('./components/AtengCodeEditor.vue').default
>;

export { default as AtengCodeDiffEditor } from './components/AtengCodeDiffEditor.vue';
export type AtengCodeDiffEditorInstance = InstanceType<
  typeof import('./components/AtengCodeDiffEditor.vue').default
>;

export { useCodeEditor } from './composables/useCodeEditor';
export type { UseCodeEditorReturn } from './composables/useCodeEditor';

export { useCodeDiff, useCodeDiffEditor } from './composables/useCodeDiff';
export type { UseCodeDiffReturn } from './composables/useCodeDiff';

export { useEditorTheme } from './composables/useEditorTheme';
export type { UseEditorThemeReturn } from './composables/useEditorTheme';

export { CompletionRegistry, registerCompletionProvider } from './completion/registry';

export { setupMonacoWorkers, setupViteMonacoWorkers } from './workers';
export type { ViteMonacoWorkerConstructors } from './workers';

export { formatSql } from './sql/formatter';
export type { SqlFormatProvider } from './sql/formatter';

export { computeDiffStats } from './diff/stats';

export type {
  CodeLanguage,
  EditorTheme,
  MonacoWorkerOptions,
  CodeEditorProps,
  CodeEditorEmits,
  CodeEditorExpose,
  UseCodeEditorOptions,
  CompletionProviderFn,
  DiffMode,
  DiffStats,
  CodeDiffEditorProps,
  CodeDiffEditorEmits,
  CodeDiffEditorExpose,
  UseCodeDiffOptions,
} from './types';
