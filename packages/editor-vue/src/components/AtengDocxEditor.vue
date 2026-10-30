<script setup lang="ts">
/**
 * AtengDocxEditor: DOCX A4 物理分页排版与公文合同预设编辑器。
 *
 * 遵循四层洋葱拓扑之 L2 专用扩展层规范，装配：
 * 1. AtengPageCanvas A4 仿真纸张容器与动态断页槽；
 * 2. 纵横向物理规格（portrait/landscape）与多预设页边距切换；
 * 3. 顶部可选毫米刻度标尺 AtengPageRuler；
 * 4. 双击交互式页眉与页脚编辑，动态总页数计算与页码展示；
 * 5. 全中文轻量微工具栏、表格人体工学、底栏字数统计与 @media print A4 打印优化。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { ref, computed, toRef } from 'vue';
import { EditorContent } from '@tiptap/vue-3';
import type { DocxEditorProps, DocxEditorEmits, PageOrientation } from '../types/docx';
import { useEditor } from '../composables/useEditor';
import { useEditorDom } from '../composables/useEditorDom';
import AtengEditorToolbar from './AtengEditorToolbar.vue';
import AtengPageCanvas from './AtengPageCanvas.vue';
import AtengTableBubbleMenu from './AtengTableBubbleMenu.vue';
import AtengLinkBubbleMenu from './AtengLinkBubbleMenu.vue';
import AtengImageBubbleMenu from './AtengImageBubbleMenu.vue';
import AtengBubbleMenu from './AtengBubbleMenu.vue';
import AtengStatusBar from './AtengStatusBar.vue';

const props = withDefaults(defineProps<DocxEditorProps>(), {
  modelValue: '',
  markdown: '',
  json: () => ({}),
  placeholder: '请输入公文或合同正文内容...',
  editable: true,
  disabled: false,
  readOnly: false,
  autofocus: false,
  orientation: 'portrait',
  pageMargin: 'standard',
  showRuler: true,
  header: '关于加快推进数字化基础设施转型的指导意见',
  footer: '机密公文 · 内部流通',
  showPageNumber: true,
  headerAlign: 'center',
  footerAlign: 'center',
  showToolbar: true,
  showStatusBar: true,
  showTableMenu: true,
  showLinkMenu: true,
  showImageMenu: true,
  showBubbleMenu: true,
});

const emit = defineEmits<DocxEditorEmits>();

// 根 DOM 引用
const rootContainerRef = ref<HTMLElement | null>(null);
const pageCanvasRef = ref<InstanceType<typeof AtengPageCanvas> | null>(null);

// 计算是否可编辑
const isEditable = computed(() => {
  if (props.disabled || props.readOnly) return false;
  return props.editable;
});

// 计算当前排版方向
const currentOrientation = computed<PageOrientation>(() => props.orientation);

// 提取初始内容（优先 HTML，其次 Markdown）
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

// 装配核心 useEditor 状态机
const { editor, clearContent, getHTML, getMarkdown, getJSON } = useEditor({
  content: initialContent,
  editable: isEditable,
  autofocus: toRef(props, 'autofocus'),
  placeholder: toRef(props, 'placeholder'),
  maxLength: toRef(props, 'maxLength'),
  extensions: props.extensions,
  uploadHandler: props.uploadHandler,
  onUpdate: () => {
    emit('update:modelValue', getHTML());
    emit('update:markdown', getMarkdown());
    emit('update:json', getJSON());
  },
});

// 装配 DOM 几何与全屏自愈状态机
const { isFullscreen, toggleFullscreen } = useEditorDom({
  editor,
  rootRef: rootContainerRef,
});

// 监听画布页数变动并向外透传
const handlePageCountChange = (count: number): void => {
  emit('pageCountChange', count);
};

// 调起原生打印
const handlePrint = (): void => {
  if (typeof window !== 'undefined') {
    window.print();
  }
};

// 聚焦
const handleFocus = (): void => {
  editor.value?.commands.focus();
};

// 暴露对外方法与状态
defineExpose({
  editor,
  totalPages: computed(() => pageCanvasRef.value?.totalPages ?? 1),
  orientation: currentOrientation,
  print: handlePrint,
  focus: handleFocus,
  clear: () => clearContent(),
  clearContent,
  toggleFullscreen,
});
</script>

<template>
  <div
    ref="rootContainerRef"
    class="at-docx-editor"
    :class="[
      `at-docx-editor--${orientation}`,
      {
        'at-docx-editor--disabled': disabled,
        'at-docx-editor--readonly': readOnly,
        'at-docx-editor--fullscreen': isFullscreen,
      },
    ]"
    data-test="docx-editor"
  >
    <!-- 顶部操作工具栏 -->
    <AtengEditorToolbar
      v-if="showToolbar && !readOnly"
      :editor="editor"
      :disabled="disabled"
      :is-fullscreen="isFullscreen"
      data-test="docx-toolbar"
      @toggle-fullscreen="toggleFullscreen"
    />

    <!-- A4 物理仿真容器 PageCanvas -->
    <AtengPageCanvas
      ref="pageCanvasRef"
      :orientation="orientation"
      :page-margin="pageMargin"
      :show-ruler="showRuler"
      :header="header"
      :footer="footer"
      :show-page-number="showPageNumber"
      :header-align="headerAlign"
      :footer-align="footerAlign"
      :editable-header-footer="!disabled && !readOnly"
      @update:header="val => emit('update:header', val)"
      @update:footer="val => emit('update:footer', val)"
      @page-count-change="handlePageCountChange"
    >
      <!-- TipTap 正文编辑区 -->
      <EditorContent v-if="editor" :editor="editor" class="at-docx-editor__editor-content" />
    </AtengPageCanvas>

    <!-- 底部状态指示栏 -->
    <AtengStatusBar
      v-if="showStatusBar && editor"
      :editor="editor"
      :max-length="maxLength"
      :show-word-count="true"
      :show-paragraph-count="true"
    />

    <!-- 动态上下文微浮层集合 -->
    <template v-if="editor && !readOnly && !disabled">
      <AtengTableBubbleMenu v-if="showTableMenu" :editor="editor" />
      <AtengLinkBubbleMenu v-if="showLinkMenu" :editor="editor" />
      <AtengImageBubbleMenu v-if="showImageMenu" :editor="editor" />
      <AtengBubbleMenu v-if="showBubbleMenu" :editor="editor" />
    </template>
  </div>
</template>

<style scoped>
.at-docx-editor {
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 1px solid var(--at-editor-border, #e2e8f0);
  border-radius: 8px;
  background-color: var(--at-editor-docx-bg, #eaedf1);
  overflow: hidden;
  box-sizing: border-box;
  position: relative;
}

.at-docx-editor--disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.at-docx-editor--fullscreen {
  position: fixed !important;
  inset: 0 !important;
  z-index: 9999 !important;
  border-radius: 0 !important;
  border: none !important;
  width: 100vw !important;
  height: 100vh !important;
}

/* TipTap 正文样式与微调 */
.at-docx-editor__editor-content {
  width: 100%;
  height: 100%;
  outline: none;
}

.at-docx-editor__editor-content :deep(.tiptap) {
  min-height: 480px;
  outline: none;
  font-family:
    -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei',
    'WenQuanYi Micro Hei', sans-serif;
  font-size: 14.5px;
  line-height: 1.8;
  color: #1e293b;
}

.at-docx-editor__editor-content :deep(.tiptap p) {
  margin: 0.6em 0;
}

.at-docx-editor__editor-content :deep(.tiptap h1) {
  font-size: 22px;
  margin: 0.8em 0 0.4em 0;
  font-weight: 700;
}

.at-docx-editor__editor-content :deep(.tiptap h2) {
  font-size: 18px;
  margin: 0.8em 0 0.4em 0;
  font-weight: 600;
}

.at-docx-editor__editor-content :deep(.tiptap h3) {
  font-size: 16px;
  margin: 0.6em 0 0.3em 0;
  font-weight: 600;
}

.at-docx-editor__editor-content :deep(.tiptap table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
}

.at-docx-editor__editor-content :deep(.tiptap th),
.at-docx-editor__editor-content :deep(.tiptap td) {
  border: 1px solid #cbd5e1;
  padding: 8px 12px;
  text-align: left;
}

.at-docx-editor__editor-content :deep(.tiptap th) {
  background-color: #f8fafc;
  font-weight: 600;
}

/* 打印介质下隐藏边框与外部工具条 */
@media print {
  .at-docx-editor {
    border: none !important;
    background: transparent !important;
  }

  .at-docx-editor :deep(.at-editor__toolbar),
  .at-docx-editor :deep(.at-editor-statusbar) {
    display: none !important;
  }
}
</style>
