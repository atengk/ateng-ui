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

import { computed, watch, ref, onMounted, onBeforeUnmount } from 'vue';
import { EditorContent } from '@tiptap/vue-3';
import { useEditor } from '../composables/useEditor';
import {
  isContentEqual,
  applyContentPreservingSelection,
  defaultSlashCommandItems,
} from '../utils';
import AtengEditorToolbar from './AtengEditorToolbar.vue';
import AtengTableBubbleMenu from './AtengTableBubbleMenu.vue';
import AtengImageBubbleMenu from './AtengImageBubbleMenu.vue';
import AtengLinkBubbleMenu from './AtengLinkBubbleMenu.vue';
import AtengBubbleMenu from './AtengBubbleMenu.vue';
import AtengSlashCommand from './AtengSlashCommand.vue';
import AtengStatusBar from './AtengStatusBar.vue';
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
  showTableMenu: true,
  showLinkMenu: true,
  showImageMenu: true,
  showBubbleMenu: true,
  showSlashCommand: true,
  maxLength: undefined,
  showStatusBar: true,
  showWordCount: true,
  showParagraphCount: true,
  uploadHandler: undefined,
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
  uploadImage,
  getCharacters,
  getWords,
  getParagraphs,
} = useEditor({
  content: initialContent.value,
  placeholder: props.placeholder,
  editable: isEditable.value,
  autofocus: props.autofocus,
  extensions: props.extensions,
  uploadHandler: props.uploadHandler,
  maxLength: props.maxLength,
  onUploadSuccess: payload => {
    emit('uploadSuccess', payload);
  },
  onUploadError: (error, file) => {
    emit('uploadError', error, file);
  },
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

// 脱壳全屏状态机
const isFullscreen = ref<boolean>(false);
let originalParent: Node | null = null;
let originalNextSibling: Node | null = null;

const toggleFullscreen = (): void => {
  isFullscreen.value = !isFullscreen.value;
  emit('update:fullscreen', isFullscreen.value);
};

// 监听全屏状态，脱壳提升至 document.body 顶层突破局部弹窗裁剪
watch(isFullscreen, fullscreen => {
  if (typeof document === 'undefined' || !rootRef.value) return;
  if (fullscreen) {
    originalParent = rootRef.value.parentNode;
    originalNextSibling = rootRef.value.nextSibling;
    document.body.appendChild(rootRef.value);
  } else if (originalParent && rootRef.value) {
    if (originalNextSibling && originalParent.contains(originalNextSibling)) {
      originalParent.insertBefore(rootRef.value, originalNextSibling);
    } else {
      originalParent.appendChild(rootRef.value);
    }
  }
});

const handleEscKeyDown = (e: KeyboardEvent): void => {
  if (e.key === 'Escape' && isFullscreen.value) {
    e.preventDefault();
    isFullscreen.value = false;
    emit('update:fullscreen', false);
  }
};

// ResizeObserver 弹窗隐藏唤起 0x0 几何自愈
let resizeObserver: ResizeObserver | null = null;
let previousWidth = 0;
let previousHeight = 0;

const initResizeObserver = (): void => {
  if (typeof ResizeObserver === 'undefined' || !rootRef.value) return;
  resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      // 当容器从 0x0 展开时触发重新派发事务与几何自愈
      if ((previousWidth === 0 || previousHeight === 0) && width > 0 && height > 0) {
        if (editor.value && editor.value.view) {
          editor.value.view.dispatch(editor.value.state.tr);
        }
      }
      previousWidth = width;
      previousHeight = height;
    }
  });
  resizeObserver.observe(rootRef.value);
};

// MutationObserver 监听 html.dark 无损热跟随
let mutationObserver: MutationObserver | null = null;

const initMutationObserver = (): void => {
  if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;
  const checkTheme = (): void => {
    const isDark = document.documentElement.classList.contains('dark');
    emit('themeChange', isDark);
  };
  checkTheme();

  mutationObserver = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        checkTheme();
      }
    }
  });

  mutationObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
};

onMounted(() => {
  initResizeObserver();
  initMutationObserver();
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleEscKeyDown);
  }
});

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleEscKeyDown);
  }
  if (isFullscreen.value && rootRef.value?.parentNode === document.body) {
    document.body.removeChild(rootRef.value);
  }
});

// 显式暴露受管实例与核心方法
defineExpose<AtengEditorExpose>({
  editor,
  focus,
  blur,
  clearContent,
  setContent,
  uploadImage,
  getHTML,
  getJSON,
  getMarkdown,
  getText,
  isEmpty,
  isFullscreen,
  toggleFullscreen,
  getCharacters,
  getWords,
  getParagraphs,
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
      'is-fullscreen': isFullscreen,
    }"
    :style="isFullscreen ? undefined : containerStyle"
  >
    <!-- 工具栏插槽 (readOnly 下不展示) -->
    <template v-if="props.showToolbar && !props.readOnly">
      <slot name="toolbar" :editor="editor">
        <AtengEditorToolbar
          :editor="editor"
          :disabled="props.disabled"
          :is-fullscreen="isFullscreen"
          @toggle-fullscreen="toggleFullscreen"
        />
      </slot>
    </template>

    <!-- 正文内容编辑区域 -->
    <div class="at-editor__body">
      <EditorContent class="at-editor__content" :editor="editor ?? undefined" />
    </div>

    <!-- 吸底状态栏 (readOnly 下不展示) -->
    <template v-if="props.showStatusBar && !props.readOnly">
      <slot name="statusbar" :editor="editor" :max-length="props.maxLength">
        <AtengStatusBar
          v-if="editor"
          :editor="editor"
          :max-length="props.maxLength"
          :show-word-count="props.showWordCount"
          :show-paragraph-count="props.showParagraphCount"
        />
      </slot>
    </template>

    <!-- 表格动态上下文气泡菜单 (readOnly 下不展示) -->
    <template v-if="props.showTableMenu && !props.readOnly">
      <slot name="table-menu" :editor="editor">
        <AtengTableBubbleMenu v-if="editor" :editor="editor" :disabled="props.disabled" />
      </slot>
    </template>

    <!-- 超链接动态上下文气泡菜单 (readOnly 下不展示) -->
    <template v-if="props.showLinkMenu && !props.readOnly">
      <slot name="link-menu" :editor="editor">
        <AtengLinkBubbleMenu v-if="editor" :editor="editor" :disabled="props.disabled" />
      </slot>
    </template>

    <!-- 图片动态上下文气泡菜单 (readOnly 下不展示) -->
    <template v-if="props.showImageMenu && !props.readOnly">
      <slot name="image-menu" :editor="editor">
        <AtengImageBubbleMenu v-if="editor" :editor="editor" :disabled="props.disabled" />
      </slot>
    </template>

    <!-- 选区文本高频排版气泡菜单 (readOnly 下不展示) -->
    <template v-if="props.showBubbleMenu && !props.readOnly">
      <slot name="bubble-menu" :editor="editor">
        <AtengBubbleMenu v-if="editor" :editor="editor" :disabled="props.disabled" />
      </slot>
    </template>

    <!-- 块级斜杠命令快速唤起面板 (readOnly 下不展示) -->
    <template v-if="props.showSlashCommand && !props.readOnly">
      <slot name="slash-command" :editor="editor" :items="defaultSlashCommandItems">
        <AtengSlashCommand v-if="editor" :editor="editor" :disabled="props.disabled" />
      </slot>
    </template>
  </div>
</template>
