<script setup lang="ts">
/**
 * @atengk/editor-vue 选区文本高频排版动态上下文气泡浮层菜单。
 *
 * 遵循 L2 零 UI 依赖规范，光标划选任意文本时平滑跟随呼出，
 * 内置粗体、斜体、下划线、删除线、行内代码、文本高亮与超链接按钮，
 * 默认开放插槽支持 100% 表现层反转定制。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { computed } from 'vue';
import type { Editor as CoreEditor } from '@tiptap/core';
import { BubbleMenu } from '@tiptap/vue-3';
import type { AtengBubbleMenuProps } from '../types';
import { promptAndSetLink } from '../utils';

defineOptions({
  name: 'AtengBubbleMenu',
});

const props = withDefaults(defineProps<AtengBubbleMenuProps>(), {
  editor: null,
  disabled: false,
  tippyOptions: () => ({}),
  shouldShow: undefined,
});

/**
 * 默认显示判定规则：当且仅当编辑器可编辑且当前选区选中非空白文本时展示。
 */
const defaultShouldShow = ({ editor }: { editor: CoreEditor }): boolean => {
  if (!editor || !editor.isEditable || props.disabled) {
    return false;
  }
  const { selection, doc } = editor.state;
  if (selection.empty) {
    return false;
  }
  // 排除图片选中（避免和图片浮层冲突）
  if (editor.isActive('image')) {
    return false;
  }
  const text = doc.textBetween(selection.from, selection.to);
  return text.trim().length > 0;
};

/**
 * 计算 Tippy 浮层定位与动画配置。
 */
const computedTippyOptions = computed(() => ({
  placement: 'top' as const,
  offset: [0, 8] as [number, number],
  duration: 150,
  theme: 'at-editor-menu',
  appendTo: (ref: Element) => (typeof document !== 'undefined' ? document.body : ref),
  ...props.tippyOptions,
}));

/**
 * 超链接快捷设置与切换逻辑。
 */
const handleLinkClick = (): void => {
  promptAndSetLink(props.editor);
};
</script>

<template>
  <BubbleMenu
    v-if="props.editor"
    plugin-key="atengSelectionBubbleMenu"
    :editor="props.editor"
    :should-show="props.shouldShow ?? defaultShouldShow"
    :tippy-options="computedTippyOptions"
  >
    <slot :editor="props.editor">
      <div
        class="at-editor-bubble-menu at-editor-table-menu"
        role="toolbar"
        aria-label="选区文本格式操作浮层"
      >
        <!-- 粗体 -->
        <button
          type="button"
          class="at-editor-table-menu__btn at-editor__btn"
          title="粗体 (Ctrl+B)"
          aria-label="粗体"
          :class="{ 'is-active': props.editor.isActive('bold') }"
          :disabled="props.disabled || !props.editor.can().toggleBold()"
          @mousedown.prevent
          @click="props.editor.chain().focus().toggleBold().run()"
        >
          <svg viewBox="0 0 24 24">
            <path
              d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"
            />
          </svg>
        </button>

        <!-- 斜体 -->
        <button
          type="button"
          class="at-editor-table-menu__btn at-editor__btn"
          title="斜体 (Ctrl+I)"
          aria-label="斜体"
          :class="{ 'is-active': props.editor.isActive('italic') }"
          :disabled="props.disabled || !props.editor.can().toggleItalic()"
          @mousedown.prevent
          @click="props.editor.chain().focus().toggleItalic().run()"
        >
          <svg viewBox="0 0 24 24">
            <path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z" />
          </svg>
        </button>

        <!-- 下划线 -->
        <button
          type="button"
          class="at-editor-table-menu__btn at-editor__btn"
          title="下划线 (Ctrl+U)"
          aria-label="下划线"
          :class="{ 'is-active': props.editor.isActive('underline') }"
          :disabled="props.disabled || !props.editor.can().toggleUnderline()"
          @mousedown.prevent
          @click="props.editor.chain().focus().toggleUnderline().run()"
        >
          <svg viewBox="0 0 24 24">
            <path
              d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"
            />
          </svg>
        </button>

        <!-- 删除线 -->
        <button
          type="button"
          class="at-editor-table-menu__btn at-editor__btn"
          title="删除线 (Ctrl+Shift+X)"
          aria-label="删除线"
          :class="{ 'is-active': props.editor.isActive('strike') }"
          :disabled="props.disabled || !props.editor.can().toggleStrike()"
          @mousedown.prevent
          @click="props.editor.chain().focus().toggleStrike().run()"
        >
          <svg viewBox="0 0 24 24">
            <path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z" />
          </svg>
        </button>

        <!-- 行内代码 -->
        <button
          type="button"
          class="at-editor-table-menu__btn at-editor__btn"
          title="行内代码 (Ctrl+E)"
          aria-label="行内代码"
          :class="{ 'is-active': props.editor.isActive('code') }"
          :disabled="props.disabled || !props.editor.can().toggleCode()"
          @mousedown.prevent
          @click="props.editor.chain().focus().toggleCode().run()"
        >
          <svg viewBox="0 0 24 24">
            <path
              d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"
            />
          </svg>
        </button>

        <!-- 文本高亮 -->
        <button
          type="button"
          class="at-editor-table-menu__btn at-editor__btn"
          title="文本高亮"
          aria-label="文本高亮"
          :class="{ 'is-active': props.editor.isActive('highlight') }"
          :disabled="props.disabled || !props.editor.can().toggleHighlight()"
          @mousedown.prevent
          @click="props.editor.chain().focus().toggleHighlight().run()"
        >
          <svg viewBox="0 0 24 24">
            <path
              d="M6 14l3 3v5h6v-5l3-3V9H6v5zm2-3h8v2.17l-2 2V20h-4v-4.83l-2-2V11zm7-7H9V2h6v2z"
            />
          </svg>
        </button>

        <div class="at-editor__divider" />

        <!-- 超链接 -->
        <button
          type="button"
          class="at-editor-table-menu__btn at-editor__btn"
          title="超链接"
          aria-label="超链接"
          :class="{ 'is-active': props.editor.isActive('link') }"
          :disabled="props.disabled"
          @mousedown.prevent
          @click="handleLinkClick"
        >
          <svg viewBox="0 0 24 24">
            <path
              d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"
            />
          </svg>
        </button>
      </div>
    </slot>
  </BubbleMenu>
</template>

<style scoped>
.at-editor-bubble-menu {
  display: flex;
  align-items: center;
  user-select: none;
}
</style>
