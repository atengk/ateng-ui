<script setup lang="ts">
/**
 * @atengk/editor-vue 企业级沉浸式 Agent Editor 预设组件。
 *
 * 专为 AI-Native 智能辅助创作、公文与研报润色生成打造。
 * 内置双通道 AI 唤起机制（选区微气泡菜单与空白行沉浸式输入条）、
 * 纯前端打字机流式光标与原位增删对比审阅卡片 (AtengAiDiffCard)。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { ref, computed, shallowRef, watch } from 'vue';
import type { ShallowRef, ComputedRef } from 'vue';
import type { Editor } from '@tiptap/vue-3';
import AtengEditor from './AtengEditor.vue';
import AtengAiBubbleMenu from './AtengAiBubbleMenu.vue';
import AtengAiPromptBar from './AtengAiPromptBar.vue';
import AtengAiDiffCard from './AtengAiDiffCard.vue';
import { useAiStream } from '../composables/useAiStream';
import type {
  AgentEditorProps,
  AtengEditorEmits,
  AtengEditorExpose,
  AiPromptAction,
  FullHtmlOptions,
} from '../types';

defineOptions({
  name: 'AtengAgentEditor',
});

const props = withDefaults(defineProps<AgentEditorProps>(), {
  modelValue: undefined,
  markdown: undefined,
  json: undefined,
  outputFormat: 'html',
  placeholder: '请输入正文内容，或划选文字唤起 AI 智能润色...',
  editable: true,
  disabled: false,
  readOnly: false,
  autofocus: false,
  extensions: () => [],
  aiStreamHandler: undefined,
  aiBubbleMenu: true,
  aiPromptBar: true,
  showDiff: true,
  aiActions: undefined,
  showToolbar: true,
  showStatusBar: true,
  height: undefined,
  minHeight: undefined,
  maxHeight: undefined,
  maxLength: undefined,
  uploadHandler: undefined,
});

const emit = defineEmits<AtengEditorEmits>();

const editorRef = ref<InstanceType<typeof AtengEditor> | null>(null);

// 编辑器实例浅代理
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

// 记录当前触发 AI 动作时的选区快照
interface SelectionSnapshot {
  from: number;
  to: number;
  originalText: string;
}
const activeSelection = ref<SelectionSnapshot | null>(null);

// 行内 Diff 卡片展示开关
const isDiffCardVisible = ref<boolean>(false);
// 是否处于空白行 PromptBar 激活态
const isPromptBarActive = ref<boolean>(false);

// 接入无头 AI 流式通信状态机
const { isStreaming, streamingText, startStream, stopStream } = useAiStream({
  editor: () => editor.value,
  handler: () => props.aiStreamHandler,
  useDecoration: true,
  onFinish: () => {
    if (props.showDiff) {
      isDiffCardVisible.value = true;
    }
  },
  onError: () => {
    isDiffCardVisible.value = false;
  },
});

/**
 * 响应划选气泡动作点击
 */
const handleBubbleAction = (action: AiPromptAction, customPrompt?: string): void => {
  if (!editor.value || props.disabled || isStreaming.value) return;

  const { from, to } = editor.value.state.selection;
  const originalText = from !== to ? editor.value.state.doc.textBetween(from, to, ' ') : '';

  activeSelection.value = { from, to, originalText };
  isDiffCardVisible.value = false;

  startStream({
    prompt: customPrompt || action.defaultPrompt,
    selection: originalText,
    action: action.action,
    context: editor.value.getText(),
  }).catch(() => {
    // 异常已被 useAiStream 内部捕获
  });
};

/**
 * 响应空白行沉浸输入条提交
 */
const handlePromptSubmit = (prompt: string): void => {
  if (!editor.value || props.disabled || isStreaming.value) return;

  const { from, to } = editor.value.state.selection;
  activeSelection.value = { from, to, originalText: '' };
  isDiffCardVisible.value = false;
  isPromptBarActive.value = false;

  startStream({
    prompt,
    context: editor.value.getText(),
  }).catch(() => {
    // 异常处理
  });
};

/**
 * 采纳并全部替换原选区内容（增量单次原子事务提交，保全撤销历史）
 */
const handleAcceptReplace = (newText: string): void => {
  if (!editor.value || !newText) return;

  const sel = activeSelection.value;
  if (sel) {
    const { from, to } = sel;
    // 使用 TipTap 事务链原子替换，并保全焦点
    editor.value.chain().focus().setTextSelection({ from, to }).insertContent(newText).run();
  } else {
    editor.value.chain().focus().insertContent(newText).run();
  }

  isDiffCardVisible.value = false;
  activeSelection.value = null;
};

/**
 * 采纳并在下方插入新内容
 */
const handleAcceptAppend = (newText: string): void => {
  if (!editor.value || !newText) return;

  const sel = activeSelection.value;
  const insertPos = sel ? sel.to : editor.value.state.selection.to;

  editor.value
    .chain()
    .focus()
    .setTextSelection(insertPos)
    .insertContent('\n' + newText)
    .run();

  isDiffCardVisible.value = false;
  activeSelection.value = null;
};

/**
 * 放弃并清理 Diff 状态
 */
const handleDiscard = (): void => {
  stopStream();
  isDiffCardVisible.value = false;
  activeSelection.value = null;
  editor.value?.commands.focus();
};

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
  <div class="at-agent-editor-container">
    <AtengEditor
      ref="editorRef"
      v-bind="$attrs"
      mode="agent"
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
      :show-status-bar="props.showStatusBar"
      :height="props.height"
      :min-height="props.minHeight"
      :max-height="props.maxHeight"
      :max-length="props.maxLength"
      :upload-handler="props.uploadHandler"
      class="at-agent-editor"
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
      <!-- 工具栏插槽透传 -->
      <template v-if="$slots.toolbar" #toolbar="slotProps">
        <slot name="toolbar" v-bind="slotProps" />
      </template>

      <!-- 状态栏插槽透传 -->
      <template v-if="$slots.statusbar" #statusbar="slotProps">
        <slot name="statusbar" v-bind="slotProps" />
      </template>
    </AtengEditor>

    <!-- 选区跟随 AI 气泡菜单 -->
    <template v-if="props.aiBubbleMenu && !props.readOnly && !props.disabled">
      <slot name="ai-bubble-menu" :editor="editor" :select-action="handleBubbleAction">
        <AtengAiBubbleMenu
          :editor="editor"
          :disabled="props.disabled || isStreaming"
          :actions="props.aiActions"
          @select-action="handleBubbleAction"
        />
      </slot>
    </template>

    <!-- 空白行沉浸式 AI 输入条插槽 -->
    <template v-if="props.aiPromptBar && isPromptBarActive && !props.readOnly">
      <slot
        name="ai-prompt-bar"
        :submit-prompt="handlePromptSubmit"
        :close="() => (isPromptBarActive = false)"
      >
        <AtengAiPromptBar
          :editor="editor"
          :is-streaming="isStreaming"
          @submit-prompt="handlePromptSubmit"
          @close="isPromptBarActive = false"
        />
      </slot>
    </template>

    <!-- 行内原位增删 Diff 审阅卡片 -->
    <template v-if="props.showDiff && (isDiffCardVisible || isStreaming) && !props.readOnly">
      <slot
        name="diff-card"
        :original-text="activeSelection?.originalText ?? ''"
        :new-text="streamingText"
        :is-streaming="isStreaming"
        :accept-replace="handleAcceptReplace"
        :accept-append="handleAcceptAppend"
        :discard="handleDiscard"
      >
        <AtengAiDiffCard
          :original-text="activeSelection?.originalText ?? ''"
          :new-text="streamingText"
          :is-streaming="isStreaming"
          :visible="isDiffCardVisible || isStreaming"
          @accept-replace="handleAcceptReplace"
          @accept-append="handleAcceptAppend"
          @discard="handleDiscard"
        />
      </slot>
    </template>
  </div>
</template>

<style scoped>
.at-agent-editor-container {
  display: flex;
  flex-direction: column;
  position: relative;
  width: 100%;
}
</style>
