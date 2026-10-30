/**
 * @atengk/editor-vue 顶级公共导出入口。
 *
 * 依据 ADR-0036 与成熟度防线：
 * 纯声明式导出，无隐式副作用，支持极致 Tree-Shaking。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import './styles/index.css';

export { default as AtengEditor } from './components/AtengEditor.vue';
export type { AtengEditorInstance } from './components';

export { default as AtengEditorToolbar } from './components/AtengEditorToolbar.vue';
export type { AtengEditorToolbarInstance } from './components';

export { useEditor } from './composables/useEditor';
export type { UseEditorReturn } from './composables/useEditor';

export { createDefaultExtensions } from './extensions/default-extensions';
export type { CreateDefaultExtensionsOptions } from './extensions/default-extensions';

export { isContentEqual, applyContentPreservingSelection } from './utils';

export type {
  EditorOutputFormat,
  UseEditorOptions,
  AtengEditorProps,
  AtengEditorEmits,
  AtengEditorExpose,
} from './types';
