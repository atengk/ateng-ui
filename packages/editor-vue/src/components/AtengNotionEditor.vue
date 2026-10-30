<script setup lang="ts">
/**
 * @atengk/editor-vue 企业级沉浸式 Notion-like Editor 预设组件。
 *
 * 专为知识库、产品需求文档 (PRD)、团队 Wiki 与现代在线协作创作场景打造。
 * 纯净无顶栏无界白板流式布局，由左侧六点悬浮手柄 (AtengDragHandle)、斜杠命令 (/) 与微选区气泡驱动。
 * 内置重点高亮卡片 (CalloutBlock) 与交互式折叠列表 (ToggleList) 物料支持。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { ref, computed, shallowRef, watch } from 'vue';
import type { ShallowRef, ComputedRef } from 'vue';
import type { Editor } from '@tiptap/vue-3';
import AtengEditor from './AtengEditor.vue';
import type {
  NotionEditorProps,
  AtengEditorEmits,
  AtengEditorExpose,
  FullHtmlOptions,
} from '../types';

defineOptions({
  name: 'AtengNotionEditor',
});

const props = withDefaults(defineProps<NotionEditorProps>(), {
  modelValue: undefined,
  markdown: undefined,
  json: undefined,
  outputFormat: 'html',
  placeholder: '输入正文内容，或键入 "/" 快速插入块...',
  editable: true,
  disabled: false,
  readOnly: false,
  autofocus: false,
  extensions: () => [],
  dragHandle: true,
  slashCommand: true,
  callout: true,
  toggle: true,
  bubbleMenu: true,
  tableMenu: true,
  showStatusBar: false,
  maxWidth: '860px',
  height: undefined,
  minHeight: '400px',
  maxHeight: undefined,
  maxLength: undefined,
  uploadHandler: undefined,
});

const emit = defineEmits<AtengEditorEmits>();

const editorRef = ref<InstanceType<typeof AtengEditor> | null>(null);

// 移除重复注入以避免 TipTap 同名扩展警告
const editor = shallowRef<Editor | null>(null);
watch(
  () => editorRef.value?.editor,
  newEditor => {
    if (newEditor) {
      editor.value = newEditor;
    }
  },
  { immediate: true },
);

const isEmpty: ComputedRef<boolean> = computed(() => editorRef.value?.isEmpty ?? true);
const isFullscreen: ComputedRef<boolean> = computed(() => editorRef.value?.isFullscreen ?? false);

// 显式对外暴露全部核心门面
defineExpose<AtengEditorExpose>({
  editor: editor as ShallowRef<Editor | null>,
  focus: (...args) => editorRef.value?.focus(...args),
  blur: () => editorRef.value?.blur(),
  clearContent: (...args) => editorRef.value?.clearContent(...args),
  setContent: (...args) => editorRef.value?.setContent(...args),
  uploadImage: (...args) => editorRef.value?.uploadImage(...args),
  getHTML: () => editorRef.value?.getHTML() ?? '',
  getFullHTML: (options?: FullHtmlOptions) => editorRef.value?.getFullHTML(options) ?? '',
  getJSON: () => editorRef.value?.getJSON() ?? {},
  getMarkdown: () => editorRef.value?.getMarkdown() ?? '',
  getText: () => editorRef.value?.getText() ?? '',
  isEmpty,
  isFullscreen,
  toggleFullscreen: () => editorRef.value?.toggleFullscreen(),
  getCharacters: () => editorRef.value?.getCharacters() ?? 0,
  getWords: () => editorRef.value?.getWords() ?? 0,
  getParagraphs: () => editorRef.value?.getParagraphs() ?? 0,
  insertTable: (...args) => editorRef.value?.insertTable(...args),
  addColumnBefore: () => editorRef.value?.addColumnBefore(),
  addColumnAfter: () => editorRef.value?.addColumnAfter(),
  deleteColumn: () => editorRef.value?.deleteColumn(),
  addRowBefore: () => editorRef.value?.addRowBefore(),
  addRowAfter: () => editorRef.value?.addRowAfter(),
  deleteRow: () => editorRef.value?.deleteRow(),
  mergeCells: () => editorRef.value?.mergeCells(),
  splitCell: () => editorRef.value?.splitCell(),
  toggleHeaderRow: () => editorRef.value?.toggleHeaderRow(),
  deleteTable: () => editorRef.value?.deleteTable(),
  clearTable: () => editorRef.value?.clearTable() ?? false,
});
</script>

<template>
  <AtengEditor
    ref="editorRef"
    v-bind="$attrs"
    :model-value="props.modelValue"
    :markdown="props.markdown"
    :json="props.json"
    :output-format="props.outputFormat"
    :placeholder="props.placeholder"
    :editable="props.editable"
    :disabled="props.disabled"
    :read-only="props.readOnly"
    :autofocus="props.autofocus"
    :extensions="props.extensions"
    :show-toolbar="false"
    :show-drag-handle="props.dragHandle"
    :show-slash-command="props.slashCommand"
    :show-bubble-menu="props.bubbleMenu"
    :show-table-menu="props.tableMenu"
    :show-status-bar="props.showStatusBar"
    :max-length="props.maxLength"
    :upload-handler="props.uploadHandler"
    :height="props.height"
    :min-height="props.minHeight"
    :max-height="props.maxHeight"
    class="at-notion-editor"
    :style="{ '--at-notion-max-width': props.maxWidth }"
    @update:model-value="emit('update:modelValue', $event)"
    @update:markdown="emit('update:markdown', $event)"
    @update:json="emit('update:json', $event)"
    @change="emit('change', $event)"
    @focus="emit('focus')"
    @blur="emit('blur')"
    @upload-success="emit('uploadSuccess', $event)"
    @upload-error="(err, file) => emit('uploadError', err, file)"
    @update:fullscreen="emit('update:fullscreen', $event)"
    @theme-change="emit('themeChange', $event)"
  >
    <!-- 手柄插槽透传 -->
    <template v-if="$slots['drag-handle']" #drag-handle="slotProps">
      <slot name="drag-handle" v-bind="slotProps" />
    </template>

    <!-- 块级菜单插槽透传 -->
    <template v-if="$slots['block-menu']" #block-menu="slotProps">
      <slot name="block-menu" v-bind="slotProps" />
    </template>

    <!-- 划词气泡插槽透传 -->
    <template v-if="$slots['bubble-menu']" #bubble-menu="slotProps">
      <slot name="bubble-menu" v-bind="slotProps" />
    </template>

    <!-- 斜杠命令插槽透传 -->
    <template v-if="$slots['slash-command']" #slash-command="slotProps">
      <slot name="slash-command" v-bind="slotProps" />
    </template>

    <!-- 状态栏插槽透传 -->
    <template v-if="$slots.statusbar" #statusbar="slotProps">
      <slot name="statusbar" v-bind="slotProps" />
    </template>

    <!-- 表格菜单插槽透传 -->
    <template v-if="$slots['table-menu']" #table-menu="slotProps">
      <slot name="table-menu" v-bind="slotProps" />
    </template>

    <!-- 链接菜单插槽透传 -->
    <template v-if="$slots['link-menu']" #link-menu="slotProps">
      <slot name="link-menu" v-bind="slotProps" />
    </template>

    <!-- 图片菜单插槽透传 -->
    <template v-if="$slots['image-menu']" #image-menu="slotProps">
      <slot name="image-menu" v-bind="slotProps" />
    </template>
  </AtengEditor>
</template>

<style scoped>
.at-notion-editor {
  display: flex;
  flex-direction: column;
}
</style>
