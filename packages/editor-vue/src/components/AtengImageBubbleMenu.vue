<script setup lang="ts">
/**
 * @atengk/editor-vue 图片动态上下文气泡浮层菜单。
 *
 * 遵循 L2 零 UI 依赖规范，光标选中图片时自适应动态激活，
 * 提供全中文图片多向对齐（居左/居中/居右）与删除人体工学交互，
 * 默认开启插槽支持 100% 表现层反转。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { computed } from 'vue';
import type { Editor as CoreEditor } from '@tiptap/core';
import { BubbleMenu } from '@tiptap/vue-3';
import type { AtengImageBubbleMenuProps } from '../types';

defineOptions({
  name: 'AtengImageBubbleMenu',
});

const props = withDefaults(defineProps<AtengImageBubbleMenuProps>(), {
  editor: null,
  disabled: false,
  tippyOptions: () => ({}),
  shouldShow: undefined,
});

/**
 * 默认显示判定规则：当且仅当编辑器可编辑且当前选区选中图片时展示。
 */
const defaultShouldShow = ({ editor }: { editor: CoreEditor }): boolean => {
  if (!editor || !editor.isEditable || props.disabled) {
    return false;
  }
  return editor.isActive('image');
};

/**
 * 计算 Tippy 浮层定位与动画配置。
 */
const computedTippyOptions = computed(() => ({
  placement: 'top' as const,
  offset: [0, 8] as [number, number],
  duration: 150,
  theme: 'at-editor-menu',
  ...props.tippyOptions,
}));
</script>

<template>
  <BubbleMenu
    v-if="props.editor"
    plugin-key="imageBubbleMenu"
    :editor="props.editor"
    :should-show="props.shouldShow ?? defaultShouldShow"
    :tippy-options="computedTippyOptions"
  >
    <slot :editor="props.editor">
      <div
        class="at-editor-image-menu at-editor-table-menu"
        role="toolbar"
        aria-label="图片操作浮动菜单"
      >
        <!-- 对齐方式 -->
        <button
          type="button"
          class="at-editor-table-menu__btn at-editor__btn"
          title="居左对齐"
          aria-label="居左对齐"
          :class="{ 'is-active': props.editor.isActive({ textAlign: 'left' }) }"
          :disabled="props.disabled"
          @mousedown.prevent
          @click="props.editor.chain().focus().setTextAlign('left').run()"
        >
          <svg viewBox="0 0 24 24">
            <path
              d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z"
            />
          </svg>
        </button>
        <button
          type="button"
          class="at-editor-table-menu__btn at-editor__btn"
          title="居中对齐"
          aria-label="居中对齐"
          :class="{ 'is-active': props.editor.isActive({ textAlign: 'center' }) }"
          :disabled="props.disabled"
          @mousedown.prevent
          @click="props.editor.chain().focus().setTextAlign('center').run()"
        >
          <svg viewBox="0 0 24 24">
            <path d="M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z" />
          </svg>
        </button>
        <button
          type="button"
          class="at-editor-table-menu__btn at-editor__btn"
          title="居右对齐"
          aria-label="居右对齐"
          :class="{ 'is-active': props.editor.isActive({ textAlign: 'right' }) }"
          :disabled="props.disabled"
          @mousedown.prevent
          @click="props.editor.chain().focus().setTextAlign('right').run()"
        >
          <svg viewBox="0 0 24 24">
            <path d="M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z" />
          </svg>
        </button>

        <div class="at-editor__divider" />

        <!-- 删除图片 -->
        <button
          type="button"
          class="at-editor-table-menu__btn at-editor__btn is-danger"
          title="删除图片"
          aria-label="删除图片"
          :disabled="props.disabled"
          @mousedown.prevent
          @click="props.editor.chain().focus().deleteSelection().run()"
        >
          <svg viewBox="0 0 24 24">
            <path
              d="M15 4V3H9v1H4v2h1v13c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V6h1V4h-5zm2 15H7V6h10v13zM9 8h2v9H9V8zm4 0h2v9h-2V8z"
            />
          </svg>
        </button>
      </div>
    </slot>
  </BubbleMenu>
</template>
