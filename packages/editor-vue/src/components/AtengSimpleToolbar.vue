<script setup lang="ts">
/**
 * @atengk/editor-vue Simple 场景预设紧凑自适应单行工具栏。
 *
 * 遵循 L2 零 UI 依赖原则，支持单行自适应响应式折叠、声明式 tools 筛选与紧凑 dense 模式。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { ref, computed, onMounted, onUnmounted } from 'vue';
import { promptAndSetLink } from '../utils';
import type { SimpleToolbarItem, AtengSimpleToolbarProps } from '../types';

defineOptions({
  name: 'AtengSimpleToolbar',
});

const props = withDefaults(defineProps<AtengSimpleToolbarProps>(), {
  editor: null,
  tools: undefined,
  dense: false,
  disabled: false,
  isFullscreen: false,
});

const emit = defineEmits<{
  (e: 'toggleFullscreen'): void;
}>();

const toolbarRef = ref<HTMLElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const toolbarWidth = ref<number>(1000);
const isMoreOpen = ref<boolean>(false);

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (toolbarRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        toolbarWidth.value = entry.contentRect.width;
      }
    });
    resizeObserver.observe(toolbarRef.value);
  }
  document.addEventListener('click', handleGlobalClick);
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  document.removeEventListener('click', handleGlobalClick);
});

const handleGlobalClick = (event: MouseEvent) => {
  if (toolbarRef.value && !toolbarRef.value.contains(event.target as Node)) {
    isMoreOpen.value = false;
  }
};

const isToolEnabled = (tool: SimpleToolbarItem): boolean => {
  if (!props.tools || props.tools.length === 0) return true;
  return props.tools.includes(tool);
};

// 次要工具集：在容器宽度较小时优先收纳至“更多”下拉菜单
const secondaryTools: SimpleToolbarItem[] = [
  'strike',
  'highlight',
  'align',
  'taskList',
  'blockquote',
  'code',
  'codeBlock',
  'table',
  'clear',
];

// 三级工具集：在极窄视口下进一步折叠
const tertiaryTools: SimpleToolbarItem[] = ['redo', 'image', 'list'];

const isToolCollapsed = (tool: SimpleToolbarItem): boolean => {
  if (toolbarWidth.value < 520) {
    return secondaryTools.includes(tool) || tertiaryTools.includes(tool);
  }
  if (toolbarWidth.value < 780) {
    return secondaryTools.includes(tool);
  }
  return false;
};

// 是否在主工具栏展示某工具
const showInMain = (tool: SimpleToolbarItem): boolean => {
  return isToolEnabled(tool) && !isToolCollapsed(tool);
};

// 是否在“更多”折叠下拉菜单中展示某工具
const showInMore = (tool: SimpleToolbarItem): boolean => {
  return isToolEnabled(tool) && isToolCollapsed(tool);
};

// 是否需要展示“更多 (•••)”菜单按钮
const hasCollapsedTools = computed(() => {
  return secondaryTools.some(t => showInMore(t)) || tertiaryTools.some(t => showInMore(t));
});

const handleImageClick = () => {
  fileInputRef.value?.click();
};

const handleImageFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (!files || files.length === 0 || !props.editor) return;
  Array.from(files).forEach(file => {
    props.editor?.commands.uploadImage(file);
  });
  target.value = '';
};

const runMoreAction = (action: () => void) => {
  action();
  isMoreOpen.value = false;
};
</script>

<template>
  <div
    v-if="props.editor"
    ref="toolbarRef"
    class="at-editor__toolbar at-simple-toolbar"
    :class="{ 'is-dense': props.dense }"
    role="toolbar"
    aria-label="Simple 编辑器快捷工具栏"
  >
    <!-- 撤销 / 重做 -->
    <button
      v-if="showInMain('undo')"
      type="button"
      class="at-editor__btn"
      title="撤销 (Ctrl+Z)"
      aria-label="撤销"
      :disabled="props.disabled || !props.editor.can().undo()"
      @click="props.editor.chain().focus().undo().run()"
    >
      <svg viewBox="0 0 24 24">
        <path
          d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"
        />
      </svg>
    </button>
    <button
      v-if="showInMain('redo')"
      type="button"
      class="at-editor__btn"
      title="重做 (Ctrl+Y)"
      aria-label="重做"
      :disabled="props.disabled || !props.editor.can().redo()"
      @click="props.editor.chain().focus().redo().run()"
    >
      <svg viewBox="0 0 24 24">
        <path
          d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"
        />
      </svg>
    </button>

    <div v-if="showInMain('undo') || showInMain('redo')" class="at-editor__divider" />

    <!-- 标题分级 -->
    <template v-if="showInMain('heading')">
      <button
        v-for="level in [1, 2, 3] as const"
        :key="level"
        type="button"
        class="at-editor__btn"
        :title="`${level} 级标题`"
        :aria-label="`${level} 级标题`"
        :class="{ 'is-active': props.editor.isActive('heading', { level }) }"
        :disabled="props.disabled"
        @click="props.editor.chain().focus().toggleHeading({ level }).run()"
      >
        <span style="font-weight: 700">H{{ level }}</span>
      </button>
      <button
        type="button"
        class="at-editor__btn"
        title="正文段落"
        aria-label="正文段落"
        :class="{ 'is-active': props.editor.isActive('paragraph') }"
        :disabled="props.disabled"
        @click="props.editor.chain().focus().setParagraph().run()"
      >
        <span style="font-weight: 500">P</span>
      </button>
      <div class="at-editor__divider" />
    </template>

    <!-- 基础样式 -->
    <button
      v-if="showInMain('bold')"
      type="button"
      class="at-editor__btn"
      title="粗体 (Ctrl+B)"
      aria-label="粗体"
      :class="{ 'is-active': props.editor.isActive('bold') }"
      :disabled="props.disabled"
      @click="props.editor.chain().focus().toggleBold().run()"
    >
      <svg viewBox="0 0 24 24">
        <path
          d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"
        />
      </svg>
    </button>
    <button
      v-if="showInMain('italic')"
      type="button"
      class="at-editor__btn"
      title="斜体 (Ctrl+I)"
      aria-label="斜体"
      :class="{ 'is-active': props.editor.isActive('italic') }"
      :disabled="props.disabled"
      @click="props.editor.chain().focus().toggleItalic().run()"
    >
      <svg viewBox="0 0 24 24"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z" /></svg>
    </button>
    <button
      v-if="showInMain('underline')"
      type="button"
      class="at-editor__btn"
      title="下划线 (Ctrl+U)"
      aria-label="下划线"
      :class="{ 'is-active': props.editor.isActive('underline') }"
      :disabled="props.disabled"
      @click="props.editor.chain().focus().toggleUnderline().run()"
    >
      <svg viewBox="0 0 24 24">
        <path
          d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"
        />
      </svg>
    </button>
    <button
      v-if="showInMain('strike')"
      type="button"
      class="at-editor__btn"
      title="删除线"
      aria-label="删除线"
      :class="{ 'is-active': props.editor.isActive('strike') }"
      :disabled="props.disabled"
      @click="props.editor.chain().focus().toggleStrike().run()"
    >
      <svg viewBox="0 0 24 24">
        <path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z" />
      </svg>
    </button>
    <button
      v-if="showInMain('highlight')"
      type="button"
      class="at-editor__btn"
      title="文本高亮"
      aria-label="文本高亮"
      :class="{ 'is-active': props.editor.isActive('highlight') }"
      :disabled="props.disabled"
      @click="props.editor.chain().focus().toggleHighlight().run()"
    >
      <svg viewBox="0 0 24 24">
        <path
          d="M15.24 3.76a2 2 0 0 1 2.83 0l2.17 2.17a2 2 0 0 1 0 2.83L11.5 17.5 7 19l1.5-4.5L15.24 3.76zM4 21h16v2H4v-2z"
        />
      </svg>
    </button>

    <div
      v-if="showInMain('bold') || showInMain('italic') || showInMain('underline')"
      class="at-editor__divider"
    />

    <!-- 列表体系 -->
    <template v-if="showInMain('list')">
      <button
        type="button"
        class="at-editor__btn"
        title="无序列表"
        aria-label="无序列表"
        :class="{ 'is-active': props.editor.isActive('bulletList') }"
        :disabled="props.disabled"
        @click="props.editor.chain().focus().toggleBulletList().run()"
      >
        <svg viewBox="0 0 24 24">
          <path
            d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"
          />
        </svg>
      </button>
      <button
        type="button"
        class="at-editor__btn"
        title="有序列表"
        aria-label="有序列表"
        :class="{ 'is-active': props.editor.isActive('orderedList') }"
        :disabled="props.disabled"
        @click="props.editor.chain().focus().toggleOrderedList().run()"
      >
        <svg viewBox="0 0 24 24">
          <path
            d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"
          />
        </svg>
      </button>
    </template>
    <button
      v-if="showInMain('taskList')"
      type="button"
      class="at-editor__btn"
      title="任务待办列表"
      aria-label="任务待办列表"
      :class="{ 'is-active': props.editor.isActive('taskList') }"
      :disabled="props.disabled"
      @click="props.editor.chain().focus().toggleTaskList().run()"
    >
      <svg viewBox="0 0 24 24">
        <path
          d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM17.99 9l-1.41-1.42-6.59 6.59-2.58-2.57-1.42 1.41 4 4z"
        />
      </svg>
    </button>

    <!-- 对齐方式 -->
    <template v-if="showInMain('align')">
      <button
        v-for="al in ['left', 'center', 'right'] as const"
        :key="al"
        type="button"
        class="at-editor__btn"
        :title="`${al === 'left' ? '居左' : al === 'center' ? '居中' : '居右'}对齐`"
        :aria-label="`${al === 'left' ? '居左' : al === 'center' ? '居中' : '居右'}对齐`"
        :class="{ 'is-active': props.editor.isActive({ textAlign: al }) }"
        :disabled="props.disabled"
        @click="props.editor.chain().focus().setTextAlign(al).run()"
      >
        <svg v-if="al === 'left'" viewBox="0 0 24 24">
          <path d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z" />
        </svg>
        <svg v-else-if="al === 'center'" viewBox="0 0 24 24">
          <path d="M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z" />
        </svg>
        <svg v-else viewBox="0 0 24 24">
          <path d="M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z" />
        </svg>
      </button>
      <div class="at-editor__divider" />
    </template>

    <!-- 引用与代码 -->
    <button
      v-if="showInMain('blockquote')"
      type="button"
      class="at-editor__btn"
      title="引用块"
      aria-label="引用块"
      :class="{ 'is-active': props.editor.isActive('blockquote') }"
      :disabled="props.disabled"
      @click="props.editor.chain().focus().toggleBlockquote().run()"
    >
      <svg viewBox="0 0 24 24"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" /></svg>
    </button>
    <button
      v-if="showInMain('codeBlock')"
      type="button"
      class="at-editor__btn"
      title="代码块"
      aria-label="代码块"
      :class="{ 'is-active': props.editor.isActive('codeBlock') }"
      :disabled="props.disabled"
      @click="props.editor.chain().focus().toggleCodeBlock().run()"
    >
      <svg viewBox="0 0 24 24">
        <path
          d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"
        />
      </svg>
    </button>

    <!-- 插入物料：链接、图片、表格 -->
    <button
      v-if="showInMain('link')"
      type="button"
      class="at-editor__btn"
      title="插入超链接"
      aria-label="插入超链接"
      :class="{ 'is-active': props.editor.isActive('link') }"
      :disabled="props.disabled"
      @click="promptAndSetLink(props.editor)"
    >
      <svg viewBox="0 0 24 24">
        <path
          d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"
        />
      </svg>
    </button>
    <button
      v-if="showInMain('image')"
      type="button"
      class="at-editor__btn"
      title="插入图片"
      aria-label="插入图片"
      :class="{ 'is-active': props.editor.isActive('image') }"
      :disabled="props.disabled"
      @click="handleImageClick"
    >
      <svg viewBox="0 0 24 24">
        <path
          d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"
        />
      </svg>
    </button>
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      multiple
      style="display: none"
      @change="handleImageFileChange"
    />
    <button
      v-if="showInMain('table')"
      type="button"
      class="at-editor__btn"
      title="插入表格"
      aria-label="插入表格"
      :class="{ 'is-active': props.editor.isActive('table') }"
      :disabled="props.disabled"
      @click="
        props.editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
      "
    >
      <svg viewBox="0 0 24 24">
        <path
          d="M4 3h16c1.1 0 2 .9 2 2v14c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2zm0 4h4v3H4V7zm6 0h4v3h-4V7zm6 0h4v3h-4V7zM4 12h4v3H4v-3zm6 0h4v3h-4v-3zm6 0h4v3h-4v-3zM4 17h4v2H4v-2zm6 0h4v2h-4v-2zm6 0h4v2h-4v-2z"
        />
      </svg>
    </button>

    <div v-if="showInMain('clear')" class="at-editor__divider" />

    <!-- 清理样式 -->
    <button
      v-if="showInMain('clear')"
      type="button"
      class="at-editor__btn"
      title="清除格式"
      aria-label="清除格式"
      :disabled="props.disabled"
      @click="props.editor.chain().focus().unsetAllMarks().clearNodes().run()"
    >
      <svg viewBox="0 0 24 24">
        <path
          d="M3.27 5L2 6.27l6.97 6.97L6.5 19h3l1.57-3.66L16.73 21 18 19.73 3.27 5zM6 5v.18L8.82 8h2.4l-.72 1.68 2.1 2.1L14.21 8H20V5H6z"
        />
      </svg>
    </button>

    <!-- “更多操作”下拉弹出菜单 -->
    <div v-if="hasCollapsedTools" class="at-simple-toolbar__more-container">
      <button
        type="button"
        class="at-editor__btn"
        :class="{ 'is-active': isMoreOpen }"
        title="更多操作"
        aria-label="更多操作"
        :disabled="props.disabled"
        @click.stop="isMoreOpen = !isMoreOpen"
      >
        <svg viewBox="0 0 24 24">
          <path
            d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"
          />
        </svg>
      </button>

      <div v-if="isMoreOpen" class="at-simple-toolbar__more-menu">
        <button
          v-if="showInMore('strike')"
          type="button"
          class="at-editor__btn"
          title="删除线"
          :class="{ 'is-active': props.editor.isActive('strike') }"
          @click="runMoreAction(() => props.editor?.chain().focus().toggleStrike().run())"
        >
          <svg viewBox="0 0 24 24">
            <path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z" />
          </svg>
        </button>
        <button
          v-if="showInMore('highlight')"
          type="button"
          class="at-editor__btn"
          title="文本高亮"
          :class="{ 'is-active': props.editor.isActive('highlight') }"
          @click="runMoreAction(() => props.editor?.chain().focus().toggleHighlight().run())"
        >
          <svg viewBox="0 0 24 24">
            <path
              d="M15.24 3.76a2 2 0 0 1 2.83 0l2.17 2.17a2 2 0 0 1 0 2.83L11.5 17.5 7 19l1.5-4.5L15.24 3.76zM4 21h16v2H4v-2z"
            />
          </svg>
        </button>
        <button
          v-if="showInMore('taskList')"
          type="button"
          class="at-editor__btn"
          title="任务列表"
          :class="{ 'is-active': props.editor.isActive('taskList') }"
          @click="runMoreAction(() => props.editor?.chain().focus().toggleTaskList().run())"
        >
          <svg viewBox="0 0 24 24">
            <path
              d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM17.99 9l-1.41-1.42-6.59 6.59-2.58-2.57-1.42 1.41 4 4z"
            />
          </svg>
        </button>
        <button
          v-if="showInMore('blockquote')"
          type="button"
          class="at-editor__btn"
          title="引用块"
          :class="{ 'is-active': props.editor.isActive('blockquote') }"
          @click="runMoreAction(() => props.editor?.chain().focus().toggleBlockquote().run())"
        >
          <svg viewBox="0 0 24 24"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" /></svg>
        </button>
        <button
          v-if="showInMore('codeBlock')"
          type="button"
          class="at-editor__btn"
          title="代码块"
          :class="{ 'is-active': props.editor.isActive('codeBlock') }"
          @click="runMoreAction(() => props.editor?.chain().focus().toggleCodeBlock().run())"
        >
          <svg viewBox="0 0 24 24">
            <path
              d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"
            />
          </svg>
        </button>
        <button
          v-if="showInMore('table')"
          type="button"
          class="at-editor__btn"
          title="插入表格"
          :class="{ 'is-active': props.editor.isActive('table') }"
          @click="
            runMoreAction(() =>
              props.editor
                ?.chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run(),
            )
          "
        >
          <svg viewBox="0 0 24 24">
            <path
              d="M4 3h16c1.1 0 2 .9 2 2v14c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2zm0 4h4v3H4V7zm6 0h4v3h-4V7zm6 0h4v3h-4V7zM4 12h4v3H4v-3zm6 0h4v3h-4v-3zm6 0h4v3h-4v-3zM4 17h4v2H4v-2zm6 0h4v2h-4v-2zm6 0h4v2h-4v-2z"
            />
          </svg>
        </button>
        <button
          v-if="showInMore('clear')"
          type="button"
          class="at-editor__btn"
          title="清除格式"
          @click="
            runMoreAction(() => props.editor?.chain().focus().unsetAllMarks().clearNodes().run())
          "
        >
          <svg viewBox="0 0 24 24">
            <path
              d="M3.27 5L2 6.27l6.97 6.97L6.5 19h3l1.57-3.66L16.73 21 18 19.73 3.27 5zM6 5v.18L8.82 8h2.4l-.72 1.68 2.1 2.1L14.21 8H20V5H6z"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- 全屏模式切换 -->
    <template v-if="showInMain('fullscreen')">
      <div class="at-editor__divider" />
      <button
        type="button"
        class="at-editor__btn"
        :title="props.isFullscreen ? '退出全屏 (Esc)' : '全屏模式'"
        :aria-label="props.isFullscreen ? '退出全屏' : '全屏模式'"
        :class="{ 'is-active': props.isFullscreen }"
        :disabled="props.disabled"
        @click="emit('toggleFullscreen')"
      >
        <svg v-if="props.isFullscreen" viewBox="0 0 24 24">
          <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
        </svg>
        <svg v-else viewBox="0 0 24 24">
          <path
            d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"
          />
        </svg>
      </button>
    </template>
  </div>
</template>

<style scoped>
.at-simple-toolbar {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  position: relative;
  overflow: visible;
}

.at-simple-toolbar.is-dense {
  padding: 4px 6px;
  gap: 1px;
}

.at-simple-toolbar.is-dense .at-editor__btn {
  width: 24px;
  height: 24px;
  padding: 2px;
  font-size: 11px;
}

.at-simple-toolbar.is-dense .at-editor__btn svg {
  width: 14px;
  height: 14px;
}

.at-simple-toolbar.is-dense .at-editor__divider {
  height: 14px;
  margin: 0 2px;
}

.at-simple-toolbar__more-container {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.at-simple-toolbar__more-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 100;
  background-color: var(--at-editor-bg-color);
  border: 1px solid var(--at-editor-border-color);
  border-radius: var(--at-editor-border-radius);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 6px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}
</style>
