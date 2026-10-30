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

export { default as AtengSimpleEditor } from './components/AtengSimpleEditor.vue';
export type { AtengSimpleEditorInstance } from './components';

export { default as AtengNotionEditor } from './components/AtengNotionEditor.vue';
export type { AtengNotionEditorInstance } from './components';

export { default as AtengEditorToolbar } from './components/AtengEditorToolbar.vue';
export type { AtengEditorToolbarInstance } from './components';

export { default as AtengSimpleToolbar } from './components/AtengSimpleToolbar.vue';
export type { AtengSimpleToolbarInstance } from './components';

export { default as AtengTableBubbleMenu } from './components/AtengTableBubbleMenu.vue';
export type { AtengTableBubbleMenuInstance } from './components';

export { default as AtengImageBubbleMenu } from './components/AtengImageBubbleMenu.vue';
export type { AtengImageBubbleMenuInstance } from './components';

export { default as AtengLinkBubbleMenu } from './components/AtengLinkBubbleMenu.vue';
export type { AtengLinkBubbleMenuInstance } from './components';

export { default as AtengBubbleMenu } from './components/AtengBubbleMenu.vue';
export type { AtengBubbleMenuInstance } from './components';

export { default as AtengSlashCommand } from './components/AtengSlashCommand.vue';
export type { AtengSlashCommandInstance } from './components';

export { default as AtengDragHandle } from './components/AtengDragHandle.vue';
export type { AtengDragHandleInstance } from './components';

export { default as AtengStatusBar } from './components/AtengStatusBar.vue';
export type { AtengStatusBarInstance } from './components';

export { useEditor } from './composables/useEditor';
export type { UseEditorReturn } from './composables/useEditor';

export { useEditorDom } from './composables/useEditorDom';
export type { UseEditorDomOptions, UseEditorDomReturn } from './composables/useEditorDom';

export { useAiStream } from './composables/useAiStream';
export type { UseAiStreamOptions, UseAiStreamReturn } from './composables/useAiStream';

export { createDefaultExtensions } from './extensions/default-extensions';
export type { CreateDefaultExtensionsOptions } from './extensions/default-extensions';

export { FileUploadExtension } from './extensions/upload';
export type { FileUploadOptions } from './extensions/upload';

export { CalloutBlock } from './extensions/callout';
export type { CalloutType, CalloutBlockOptions } from './extensions/callout';

export { ToggleList } from './extensions/toggle';
export type { ToggleListOptions } from './extensions/toggle';

export { AiStreamingExtension, aiStreamingPluginKey } from './extensions/ai-streaming';

export { createMockAiStreamHandler, defaultMockAiStreamHandler } from './utils/ai-mock';

export {
  isContentEqual,
  applyContentPreservingSelection,
  defaultSlashCommandItems,
  clearTableContent,
  createTableActions,
  promptAndSetLink,
  unsetLinkSafe,
  getEditorCharacters,
  getEditorWords,
  getEditorParagraphs,
  generateFullHtml,
} from './utils';

export type {
  EditorOutputFormat,
  UseEditorOptions,
  EditorBaseProps,
  EditorPresetMode,
  AtengEditorProps,
  SimpleToolbarItem,
  SimpleEditorProps,
  NotionEditorProps,
  AtengSimpleToolbarProps,
  AtengEditorEmits,
  AtengEditorExpose,
  AtengTableBubbleMenuProps,
  AtengImageBubbleMenuProps,
  AtengLinkBubbleMenuProps,
  AtengBubbleMenuProps,
  AtengSlashCommandProps,
  DragHandleBlockActions,
  AtengDragHandleProps,
  AtengStatusBarProps,
  SlashCommandItem,
  UploadHandlerResult,
  UploadHandler,
  UploadSuccessPayload,
  FullHtmlOptions,
  AiStreamPayload,
  AiStreamHandler,
  MockAiStreamHandlerOptions,
  AiStreamingState,
  AiStreamingOptions,
} from './types';
