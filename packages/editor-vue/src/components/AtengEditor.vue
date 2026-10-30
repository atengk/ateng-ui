<script setup lang="ts">
/**
 * @atengk/editor-vue 企业级现代富文本与内容创作高阶表现容器。
 *
 * 遵循四层洋葱拓扑之 L2 专用扩展层规范，纯 Vue 3 驱动，零外部 UI 框架依赖，支持全中文微工具栏与全插槽反转。
 * 内置多轨数据双向绑定（HTML/Markdown/JSON）、增量事务光标防丢与 Undo/Redo 历史栈保全。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { computed, watch, ref } from 'vue';
import { EditorContent } from '@tiptap/vue-3';
import { useEditor } from '../composables/useEditor';
import { isContentEqual, applyContentPreservingSelection } from '../utils/sync';
import AtengEditorToolbar from './AtengEditorToolbar.vue';
import type { AtengEditorProps, AtengEditorEmits, AtengEditorExpose } from '../types';

defineOptions({
  name: 'AtengEditor',
});

const props = withDefaults(defineProps<AtengEditorProps>(), {
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
  height: undefined,
  minHeight: undefined,
  maxHeight: undefined,
});

const emit = defineEmits<AtengEditorEmits>();

const rootRef = ref<HTMLElement | null>(null);

// 缓存最近一次由内部编辑触发并向外发射的值，用于阻断外部反弹引起的自循环与光标跳动
const lastEmittedValue = ref<string>('');
const lastEmittedMarkdown = ref<string>('');
const lastEmittedJson = ref<string>('');

// 计算初始内容入参
const initialContent = computed(() => {
  if (props.modelValue !== undefined && props.modelValue !== '') {
    return props.modelValue;
  }
  if (props.markdown !== undefined && props.markdown !== '') {
    return props.markdown;
  }
  if (props.json !== undefined && Object.keys(props.json).length > 0) {
    return props.json;
  }
  return '';
});

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
  content: initialContent.value,
  placeholder: props.placeholder,
  editable: isEditable.value,
  autofocus: props.autofocus,
  extensions: props.extensions,
  onUpdate: () => {
    const html = getHTML();
    const md = getMarkdown();
    const jsonTree = getJSON();

    // 更新发射缓存
    lastEmittedValue.value = html;
    lastEmittedMarkdown.value = md;
    try {
      lastEmittedJson.value = JSON.stringify(jsonTree);
    } catch {
      lastEmittedJson.value = '';
    }

    // 根据 outputFormat 派发 modelValue
    if (props.outputFormat === 'markdown') {
      emit('update:modelValue', md);
    } else if (props.outputFormat === 'json') {
      emit('update:modelValue', JSON.stringify(jsonTree));
    } else {
      emit('update:modelValue', html);
    }

    // 多轨独立事件同步
    emit('update:markdown', md);
    emit('update:json', jsonTree);
    emit('change', html);
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
    if (!editor.value || newValue === undefined) return;
    if (isContentEqual(newValue, lastEmittedValue.value)) return;

    lastEmittedValue.value = newValue;
    applyContentPreservingSelection(editor.value, newValue, props.outputFormat, true);
  },
);

// 监听外部 markdown 变更
watch(
  () => props.markdown,
  newMarkdown => {
    if (!editor.value || newMarkdown === undefined) return;
    if (isContentEqual(newMarkdown, lastEmittedMarkdown.value)) return;

    lastEmittedMarkdown.value = newMarkdown;
    applyContentPreservingSelection(editor.value, newMarkdown, 'markdown', true);
  },
);

// 监听外部 json 变更
watch(
  () => props.json,
  newJson => {
    if (!editor.value || newJson === undefined) return;
    try {
      const serialized = JSON.stringify(newJson);
      if (serialized === lastEmittedJson.value) return;
      lastEmittedJson.value = serialized;
    } catch {
      // 容错处理
    }

    applyContentPreservingSelection(editor.value, newJson, 'json', true);
  },
  { deep: true },
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
  setContent,
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
