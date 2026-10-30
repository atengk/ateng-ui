<script setup lang="ts">
/**
 * @atengk/editor-vue 企业级现代富文本与内容创作高阶表现容器。
 *
 * 遵循四层洋葱拓扑之 L2 专用扩展层规范，纯 Vue 3 驱动，零外部 UI 框架依赖，支持全中文微工具栏与全插槽反转。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { computed, watch, ref } from 'vue';
import { EditorContent } from '@tiptap/vue-3';
import { useEditor } from '../composables/useEditor';
import AtengEditorToolbar from './AtengEditorToolbar.vue';
import type { AtengEditorProps, AtengEditorEmits, AtengEditorExpose } from '../types';

defineOptions({
  name: 'AtengEditor',
});

const props = withDefaults(defineProps<AtengEditorProps>(), {
  modelValue: '',
  markdown: '',
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
  height: undefined,
  minHeight: undefined,
  maxHeight: undefined,
});

const emit = defineEmits<AtengEditorEmits>();

const rootRef = ref<HTMLElement | null>(null);

// 计算实际可编辑状态
const isEditable = computed(() => {
  if (props.disabled || props.readOnly) return false;
  return props.editable;
});

// 计算容器内联尺寸样式
const containerStyle = computed(() => {
  const styleObj: Record<string, string> = {};
  if (props.height !== undefined) {
    styleObj.height = typeof props.height === 'number' ? `${props.height}px` : props.height;
  }
  if (props.minHeight !== undefined) {
    styleObj.minHeight =
      typeof props.minHeight === 'number' ? `${props.minHeight}px` : props.minHeight;
  }
  if (props.maxHeight !== undefined) {
    styleObj.maxHeight =
      typeof props.maxHeight === 'number' ? `${props.maxHeight}px` : props.maxHeight;
  }
  return styleObj;
});

// 初始化无头状态机
const {
  editor,
  isEmpty,
  getHTML,
  getJSON,
  getMarkdown,
  getText,
  setContent,
  clearContent,
  focus,
  blur,
} = useEditor({
  content: props.modelValue,
  placeholder: props.placeholder,
  editable: isEditable.value,
  autofocus: props.autofocus,
  extensions: props.extensions,
  onUpdate: () => {
    const html = getHTML();
    emit('update:modelValue', html);
    emit('change', html);

    // 同步 Markdown 与 JSON 事件
    const md = getMarkdown();
    emit('update:markdown', md);
    const jsonTree = getJSON();
    emit('update:json', jsonTree);
  },
  onFocus: () => {
    emit('focus');
  },
  onBlur: () => {
    emit('blur');
  },
});

// 监听外部 modelValue 变更（等价性比对，防止自循环与冲垮光标）
watch(
  () => props.modelValue,
  newValue => {
    if (!editor.value) return;
    const currentHTML = getHTML();
    if (newValue !== undefined && newValue !== currentHTML) {
      setContent(newValue, false);
    }
  },
);

// 响应式同步 editable / disabled / readOnly 状态
watch(isEditable, newEditable => {
  if (editor.value) {
    editor.value.setEditable(newEditable);
  }
});

// 显式暴露受管实例与核心方法
defineExpose<AtengEditorExpose>({
  editor,
  focus,
  blur,
  clearContent,
  getHTML,
  getJSON,
  getMarkdown,
  getText,
  isEmpty,
});
</script>

<template>
  <div
    ref="rootRef"
    class="at-editor"
    :class="{
      'is-disabled': props.disabled,
      'is-readonly': props.readOnly,
      'is-sticky-toolbar': props.stickyToolbar,
    }"
    :style="containerStyle"
  >
    <!-- 工具栏插槽 (readOnly 下不展示) -->
    <template v-if="props.showToolbar && !props.readOnly">
      <slot name="toolbar" :editor="editor">
        <AtengEditorToolbar :editor="editor" :disabled="props.disabled" />
      </slot>
    </template>

    <!-- 正文内容编辑区域 -->
    <div class="at-editor__body">
      <EditorContent class="at-editor__content" :editor="editor ?? undefined" />
    </div>
  </div>
</template>
