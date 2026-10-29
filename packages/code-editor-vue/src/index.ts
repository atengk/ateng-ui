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

export { useCodeEditor } from './composables/useCodeEditor';
export type { UseCodeEditorReturn } from './composables/useCodeEditor';

export { setupMonacoWorkers } from './workers';

export type {
  CodeLanguage,
  EditorTheme,
  MonacoWorkerOptions,
  CodeEditorProps,
  CodeEditorEmits,
  CodeEditorExpose,
  UseCodeEditorOptions,
} from './types';
