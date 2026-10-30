<script setup lang="ts">
/**
 * @atengk/editor-vue 吸底状态栏与统计指示器组件。
 *
 * 遵循 L2 零 UI 依赖规范，集成纯文本字符数、词数与段落数统计，
 * 支持在达到字符上限 (maxLength) 时呈现告警警告色，
 * 默认暴露具名插槽支持业务层 100% 定制反转。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import type { AtengStatusBarProps } from '../types';

defineOptions({
  name: 'AtengStatusBar',
});

const props = withDefaults(defineProps<AtengStatusBarProps>(), {
  editor: null,
  maxLength: undefined,
  showWordCount: true,
  showParagraphCount: true,
});

const characters = ref<number>(0);
const words = ref<number>(0);
const paragraphs = ref<number>(0);

/**
 * 重新计算当前文档的统计指标。
 */
const updateStats = (): void => {
  if (!props.editor) {
    characters.value = 0;
    words.value = 0;
    paragraphs.value = 0;
    return;
  }

  // 1. 提取字符数与词数 (优先从 CharacterCount storage 获取，过滤 HTML 标签)
  const storage = props.editor.storage as Record<string, unknown>;
  const charStorage = storage.characterCount as
    { characters?: () => number; words?: () => number } | undefined;

  characters.value =
    typeof charStorage?.characters === 'function'
      ? charStorage.characters()
      : props.editor.getText().length;

  words.value = typeof charStorage?.words === 'function' ? charStorage.words() : 0;

  // 2. 统计段落与标题块级数量
  let pCount = 0;
  props.editor.state.doc.descendants(node => {
    if (node.type.name === 'paragraph' || node.type.name === 'heading') {
      pCount++;
    }
  });
  paragraphs.value = pCount;
};

/**
 * 当前是否已达到或超出最大字符数限制。
 */
const isLimitReached = computed<boolean>(() => {
  if (props.maxLength === undefined || props.maxLength <= 0) {
    return false;
  }
  return characters.value >= props.maxLength;
});

// 监听编辑器生命周期与内容变更
onMounted(() => {
  updateStats();
  if (props.editor) {
    props.editor.on('update', updateStats);
    props.editor.on('selectionUpdate', updateStats);
  }
});

watch(
  () => props.editor,
  (newEditor, oldEditor) => {
    if (oldEditor) {
      oldEditor.off('update', updateStats);
      oldEditor.off('selectionUpdate', updateStats);
    }
    if (newEditor) {
      newEditor.on('update', updateStats);
      newEditor.on('selectionUpdate', updateStats);
    }
    updateStats();
  },
);

onBeforeUnmount(() => {
  if (props.editor) {
    props.editor.off('update', updateStats);
    props.editor.off('selectionUpdate', updateStats);
  }
});
</script>

<template>
  <slot
    :editor="props.editor"
    :characters="characters"
    :words="words"
    :paragraphs="paragraphs"
    :max-length="props.maxLength"
    :is-limit-reached="isLimitReached"
  >
    <div
      class="at-editor-statusbar"
      :class="{ 'is-limit-reached': isLimitReached }"
      role="status"
      aria-label="编辑器状态栏"
    >
      <div class="at-editor-statusbar__left">
        <span class="at-editor-statusbar__tag">TipTap 富文本引擎</span>
      </div>
      <div class="at-editor-statusbar__right">
        <span v-if="props.showParagraphCount" class="at-editor-statusbar__item">
          段落: {{ paragraphs }}
        </span>
        <span v-if="props.showWordCount" class="at-editor-statusbar__item">
          词数: {{ words }}
        </span>
        <span
          class="at-editor-statusbar__item at-editor-statusbar__char-count"
          :class="{ 'is-limit-reached': isLimitReached }"
        >
          <template v-if="props.maxLength !== undefined">
            字符: {{ characters }} / {{ props.maxLength }}
          </template>
          <template v-else> 字符: {{ characters }} </template>
        </span>
      </div>
    </div>
  </slot>
</template>
