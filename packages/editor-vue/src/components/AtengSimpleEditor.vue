<script setup lang="ts">
/**
 * @atengk/editor-vue 企业级经典轻量 Simple Editor 预设组件。
 *
 * 专为常规表单、博客、CRM 备注与轻量后台内容录入场景打造。
 * 标配自适应单行折叠微工具栏与紧凑模式，严格隔离拖拽手柄与斜杠面板以杜绝输入干扰。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { ref, computed, shallowRef, watch } from 'vue';
import type { ShallowRef, ComputedRef } from 'vue';
import type { Editor } from '@tiptap/vue-3';
import AtengEditor from './AtengEditor.vue';
import AtengSimpleToolbar from './AtengSimpleToolbar.vue';
import type {
  SimpleEditorProps,
  AtengEditorEmits,
  AtengEditorExpose,
  FullHtmlOptions,
} from '../types';

defineOptions({
  name: 'AtengSimpleEditor',
});

const props = withDefaults(defineProps<SimpleEditorProps>(), {
  modelValue: undefined,
  markdown: undefined,
  json: undefined,
  outputFormat: 'html',
  placeholder: '请输入正文内容...',
  editable: true,
  disabled: false,
  readOnly: false,
  autofocus: false,
  extensions: () => [],
  showToolbar: true,
  stickyToolbar: false,
  showTableMenu: true,
  showLinkMenu: true,
  showImageMenu: true,
  showBubbleMenu: false,
  showSlashCommand: false,
  maxLength: undefined,
  showStatusBar: true,
  showWordCount: true,
  showParagraphCount: true,
  uploadHandler: undefined,
  height: undefined,
  minHeight: undefined,
  maxHeight: undefined,
  tools: undefined,
  dense: false,
});

const emit = defineEmits<AtengEditorEmits>();

const editorRef = ref<InstanceType<typeof AtengEditor> | null>(null);

// 状态代理转发
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
    :show-toolbar="props.showToolbar"
    :sticky-toolbar="props.stickyToolbar"
    :show-table-menu="props.showTableMenu"
    :show-link-menu="props.showLinkMenu"
    :show-image-menu="props.showImageMenu"
    :show-bubble-menu="props.showBubbleMenu"
    :show-slash-command="false"
    :max-length="props.maxLength"
    :show-status-bar="props.showStatusBar"
    :show-word-count="props.showWordCount"
    :show-paragraph-count="props.showParagraphCount"
    :upload-handler="props.uploadHandler"
    :height="props.height"
    :min-height="props.minHeight"
    :max-height="props.maxHeight"
    class="at-simple-editor"
    :class="{ 'is-dense': props.dense }"
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
    <!-- 工具栏插槽：默认渲染 AtengSimpleToolbar，同时允许调用方使用 #toolbar 自定义 -->
    <template #toolbar="{ editor: currentEditor }">
      <slot name="toolbar" :editor="currentEditor">
        <AtengSimpleToolbar
          :editor="currentEditor"
          :tools="props.tools"
          :dense="props.dense"
          :disabled="props.disabled"
          :is-fullscreen="isFullscreen"
          @toggle-fullscreen="() => editorRef?.toggleFullscreen()"
        />
      </slot>
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
.at-simple-editor {
  display: flex;
  flex-direction: column;
}

.at-simple-editor.is-dense :deep(.at-editor__content) {
  padding: 10px 14px;
}
</style>
