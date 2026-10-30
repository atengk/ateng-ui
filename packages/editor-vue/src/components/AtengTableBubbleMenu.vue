<script setup lang="ts">
/**
 * @atengk/editor-vue 表格动态上下文气泡浮层菜单。
 *
 * 遵循 L2 零 UI 依赖规范，光标进入表格单元格时自适应动态激活，
 * 提供全中文行列增删、单元格合并拆分、表头切换与整表删除人体工学交互，
 * 默认开启插槽支持 100% 表现层反转。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { computed } from 'vue';
import type { Editor as CoreEditor } from '@tiptap/core';
import { BubbleMenu } from '@tiptap/vue-3';
import type { AtengTableBubbleMenuProps } from '../types';

defineOptions({
  name: 'AtengTableBubbleMenu',
});

const props = withDefaults(defineProps<AtengTableBubbleMenuProps>(), {
  editor: null,
  disabled: false,
  tippyOptions: () => ({}),
  shouldShow: undefined,
});

/**
 * 默认显示判定规则：当且仅当编辑器可编辑且当前选区处于表格节点内时展示。
 */
const defaultShouldShow = ({ editor }: { editor: CoreEditor }): boolean => {
  if (!editor || !editor.isEditable || props.disabled) {
    return false;
  }
  return editor.isActive('table');
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
    plugin-key="tableBubbleMenu"
    :editor="props.editor"
    :should-show="props.shouldShow ?? defaultShouldShow"
    :tippy-options="computedTippyOptions"
  >
    <slot :editor="props.editor">
      <div class="at-editor-table-menu" role="toolbar" aria-label="表格操作浮动菜单">
        <!-- 行操作 -->
        <button
          type="button"
          class="at-editor-table-menu__btn at-editor__btn"
          title="在上方插入行"
          aria-label="在上方插入行"
          :disabled="props.disabled || !props.editor.can().addRowBefore()"
          @mousedown.prevent
          @click="props.editor.chain().focus().addRowBefore().run()"
        >
          <svg viewBox="0 0 24 24">
            <path d="M2 4h20v4H2V4zm0 6h20v10H2V10zm2 2v6h16v-6H4zm7-11h2v3h-2V1z" />
          </svg>
        </button>
        <button
          type="button"
          class="at-editor-table-menu__btn at-editor__btn"
          title="在下方插入行"
          aria-label="在下方插入行"
          :disabled="props.disabled || !props.editor.can().addRowAfter()"
          @mousedown.prevent
          @click="props.editor.chain().focus().addRowAfter().run()"
        >
          <svg viewBox="0 0 24 24">
            <path d="M2 4h20v10H2V4zm2 2v6h16V6H4zm-2 10h20v4H2v-4zm9 5h2v3h-2v-3z" />
          </svg>
        </button>

        <!-- 列操作 -->
        <button
          type="button"
          class="at-editor-table-menu__btn at-editor__btn"
          title="在左侧插入列"
          aria-label="在左侧插入列"
          :disabled="props.disabled || !props.editor.can().addColumnBefore()"
          @mousedown.prevent
          @click="props.editor.chain().focus().addColumnBefore().run()"
        >
          <svg viewBox="0 0 24 24">
            <path d="M4 2v20h4V2H4zm6 0v20h10V2H10zm2 2h6v16h-6V4zM1 11h3v2H1v-2z" />
          </svg>
        </button>
        <button
          type="button"
          class="at-editor-table-menu__btn at-editor__btn"
          title="在右侧插入列"
          aria-label="在右侧插入列"
          :disabled="props.disabled || !props.editor.can().addColumnAfter()"
          @mousedown.prevent
          @click="props.editor.chain().focus().addColumnAfter().run()"
        >
          <svg viewBox="0 0 24 24">
            <path d="M4 2v20h10V2H4zm2 2h6v16H6V4zm10-2v20h4V2h-4zm5 9h3v2h-3v-2z" />
          </svg>
        </button>

        <div class="at-editor__divider" />

        <!-- 单元格与表头操作 -->
        <button
          type="button"
          class="at-editor-table-menu__btn at-editor__btn"
          title="切换表头行"
          aria-label="切换表头行"
          :disabled="props.disabled || !props.editor.can().toggleHeaderRow()"
          @mousedown.prevent
          @click="props.editor.chain().focus().toggleHeaderRow().run()"
        >
          <svg viewBox="0 0 24 24">
            <path d="M3 4h18v16H3V4zm2 2v3h14V6H5zm0 5v7h14v-7H5z" />
          </svg>
        </button>
        <button
          type="button"
          class="at-editor-table-menu__btn at-editor__btn"
          title="合并单元格"
          aria-label="合并单元格"
          :disabled="props.disabled || !props.editor.can().mergeCells()"
          @mousedown.prevent
          @click="props.editor.chain().focus().mergeCells().run()"
        >
          <svg viewBox="0 0 24 24">
            <path d="M3 5h18v14H3V5zm2 2v10h14V7H5zm4 4h6v2H9v-2z" />
          </svg>
        </button>
        <button
          type="button"
          class="at-editor-table-menu__btn at-editor__btn"
          title="拆分单元格"
          aria-label="拆分单元格"
          :disabled="props.disabled || !props.editor.can().splitCell()"
          @mousedown.prevent
          @click="props.editor.chain().focus().splitCell().run()"
        >
          <svg viewBox="0 0 24 24">
            <path d="M3 5h18v14H3V5zm2 2v10h14V7H5zm6 1h2v8h-2V8z" />
          </svg>
        </button>

        <div class="at-editor__divider" />

        <!-- 删除操作 -->
        <button
          type="button"
          class="at-editor-table-menu__btn at-editor__btn is-danger"
          title="删除当前行"
          aria-label="删除当前行"
          :disabled="props.disabled || !props.editor.can().deleteRow()"
          @mousedown.prevent
          @click="props.editor.chain().focus().deleteRow().run()"
        >
          <svg viewBox="0 0 24 24">
            <path d="M2 9h20v6H2V9zm2 2v2h16v-2H4zm5-7h6v2H9V4zm0 16h6v2H9v-2z" />
          </svg>
        </button>
        <button
          type="button"
          class="at-editor-table-menu__btn at-editor__btn is-danger"
          title="删除当前列"
          aria-label="删除当前列"
          :disabled="props.disabled || !props.editor.can().deleteColumn()"
          @mousedown.prevent
          @click="props.editor.chain().focus().deleteColumn().run()"
        >
          <svg viewBox="0 0 24 24">
            <path d="M9 2h6v20H9V2zm2 2v16h2V4h-2zM4 9v6h2V9H4zm14 0v6h2V9h-2z" />
          </svg>
        </button>
        <button
          type="button"
          class="at-editor-table-menu__btn at-editor__btn is-danger"
          title="删除表格"
          aria-label="删除表格"
          :disabled="props.disabled || !props.editor.can().deleteTable()"
          @mousedown.prevent
          @click="props.editor.chain().focus().deleteTable().run()"
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
