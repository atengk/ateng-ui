<script setup lang="ts">
/**
 * @atengk/editor-vue 超链接动态上下文气泡浮层菜单。
 *
 * 遵循 L2 零 UI 依赖规范，光标置于超链接内时自适应动态激活，
 * 提供全中文外链跳转、编辑链接地址与取消链接人体工学交互，
 * 默认开启插槽支持 100% 表现层反转。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { computed } from 'vue';
import type { Editor as CoreEditor } from '@tiptap/core';
import { BubbleMenu } from '@tiptap/vue-3';
import type { AtengLinkBubbleMenuProps } from '../types';
import { unsetLinkSafe } from '../utils';

defineOptions({
  name: 'AtengLinkBubbleMenu',
});

const props = withDefaults(defineProps<AtengLinkBubbleMenuProps>(), {
  editor: null,
  disabled: false,
  tippyOptions: () => ({}),
  shouldShow: undefined,
});

/**
 * 默认显示判定规则：当且仅当编辑器可编辑且当前选区处于超链接内时展示。
 */
const defaultShouldShow = ({ editor }: { editor: CoreEditor }): boolean => {
  if (!editor || !editor.isEditable || props.disabled) {
    return false;
  }
  return editor.isActive('link');
};

/**
 * 获取当前激活的超链接 URL。
 */
const currentHref = computed(() => {
  if (!props.editor) return '';
  const attrs = props.editor.getAttributes('link');
  return (attrs?.href as string) || '';
});

/**
 * 计算超链接截断展示文本。
 */
const displayHref = computed(() => {
  const href = currentHref.value;
  if (!href) return '';
  return href.length > 28 ? `${href.substring(0, 25)}...` : href;
});

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
 * 外部新标签页安全打开链接。
 */
const handleOpenLink = () => {
  if (currentHref.value) {
    window.open(currentHref.value, '_blank', 'noopener,noreferrer');
  }
};

/**
 * 修改当前超链接地址。
 */
const handleEditLink = () => {
  if (!props.editor) return;
  const newHref = window.prompt('请输入新的超链接地址 (URL):', currentHref.value);
  if (newHref !== null && newHref.trim() !== '') {
    props.editor.chain().focus().extendMarkRange('link').setLink({ href: newHref.trim() }).run();
  }
};

/**
 * 取消当前超链接（安全前置扩选整段链接文本范围）。
 */
const handleUnlink = () => {
  unsetLinkSafe(props.editor);
};
</script>

<template>
  <BubbleMenu
    v-if="props.editor"
    plugin-key="linkBubbleMenu"
    :editor="props.editor"
    :should-show="props.shouldShow ?? defaultShouldShow"
    :tippy-options="computedTippyOptions"
  >
    <slot :editor="props.editor" :href="currentHref">
      <div
        class="at-editor-link-menu at-editor-table-menu"
        role="toolbar"
        aria-label="超链接操作浮动菜单"
      >
        <!-- 链接展示与外链打开 -->
        <button
          type="button"
          class="at-editor-link-menu__link"
          title="在新窗口打开超链接"
          aria-label="打开链接"
          @mousedown.prevent
          @click="handleOpenLink"
        >
          <svg viewBox="0 0 24 24" class="at-editor-link-menu__icon">
            <path
              d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"
            />
          </svg>
          <span class="at-editor-link-menu__text">{{ displayHref }}</span>
        </button>

        <div class="at-editor__divider" />

        <!-- 修改链接 -->
        <button
          type="button"
          class="at-editor-table-menu__btn at-editor__btn"
          title="修改超链接地址"
          aria-label="修改超链接地址"
          :disabled="props.disabled"
          @mousedown.prevent
          @click="handleEditLink"
        >
          <svg viewBox="0 0 24 24">
            <path
              d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
            />
          </svg>
        </button>

        <!-- 取消超链接 -->
        <button
          type="button"
          class="at-editor-table-menu__btn at-editor__btn is-danger"
          title="移除超链接"
          aria-label="移除超链接"
          :disabled="props.disabled"
          @mousedown.prevent
          @click="handleUnlink"
        >
          <svg viewBox="0 0 24 24">
            <path
              d="M17 7h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1 0 1.43-.98 2.63-2.31 2.98l1.46 1.46C20.88 15.61 22 13.95 22 12c0-2.76-2.24-5-5-5zm-1 4h-2.19l2 2H16v-2zm-6.19.81L11.81 13H8v-1.19zm11.41 9.38L3.27 3 2 4.27l3.18 3.18C4.1 8.23 3.32 9.5 3.1 10.9L5 11c.14-.85.66-1.57 1.39-1.99l2.79 2.79c-.06.07-.12.13-.18.2H7c-1.71 0-3.1-1.39-3.1-3.1 0-.6.18-1.16.48-1.63L2.61 5.5A4.975 4.975 0 0 0 2 12c0 2.76 2.24 5 5 5h4v-1.9H7c-.83 0-1.5-.67-1.5-1.5 0-.25.07-.48.18-.68l9.64 9.64 1.27-1.27z"
            />
          </svg>
        </button>
      </div>
    </slot>
  </BubbleMenu>
</template>

<style scoped>
.at-editor-link-menu {
  display: flex;
  align-items: center;
  user-select: none;
}
</style>
