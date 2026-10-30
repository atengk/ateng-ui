<script setup lang="ts">
/**
 * @atengk/editor-vue 划选选区 AI 快捷气泡微菜单组件。
 *
 * 遵循 L2 专用扩展层与纯原生设计规范：
 * 在用户选中文本时自适应跟随浮现，提供润色、扩写、精简、翻译、摘要等快捷动作，
 * 并支持自由扩展指令输入框。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { ref, computed } from 'vue';
import { BubbleMenu } from '@tiptap/vue-3';
import type { Editor } from '@tiptap/vue-3';
import type { Editor as CoreEditor } from '@tiptap/core';
import type { EditorState } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import type { AtengAiBubbleMenuProps, AiPromptAction } from '../types';

defineOptions({
  name: 'AtengAiBubbleMenu',
});

const props = withDefaults(defineProps<AtengAiBubbleMenuProps>(), {
  editor: null,
  disabled: false,
  actions: undefined,
});

const emit = defineEmits<{
  (e: 'selectAction', action: AiPromptAction, customPrompt?: string): void;
}>();

const defaultAiActions: AiPromptAction[] = [
  {
    key: 'polish',
    label: '润色语句',
    action: 'polish',
    icon: '✨',
    defaultPrompt: '润色并优化所选文本，提升语言流畅度与专业表达',
  },
  {
    key: 'expand',
    label: '扩写丰富',
    action: 'expand',
    icon: '🚀',
    defaultPrompt: '围绕所选文本的核心论点进行扩展，丰富论据与实施细节',
  },
  {
    key: 'shorten',
    label: '精简提炼',
    action: 'shorten',
    icon: '📝',
    defaultPrompt: '精简所选文本，提炼核心结论，剔除多余赘述',
  },
  {
    key: 'translate',
    label: '转译英文',
    action: 'translate',
    icon: '🌐',
    defaultPrompt: '将所选文本精准转译为自然流畅的专业英文表达',
  },
  {
    key: 'summarize',
    label: '提炼摘要',
    action: 'summarize',
    icon: '📑',
    defaultPrompt: '提炼所选文本的关键要点，生成结构化总结',
  },
];

const effectiveActions = computed<AiPromptAction[]>(() => props.actions ?? defaultAiActions);

// 是否处于自定义指令输入模式
const isCustomPromptOpen = ref<boolean>(false);
const customPromptInput = ref<string>('');

const shouldShow = ({
  editor: coreEditor,
  state,
}: {
  editor: CoreEditor;
  state: EditorState;
  element: HTMLElement;
  view: EditorView;
  oldState?: EditorState;
}): boolean => {
  if (props.disabled) return false;
  if (!coreEditor || !coreEditor.isEditable) return false;

  const { from, to } = state.selection;
  // 仅在真实选区（非折叠光标）且选区内有文字时展示
  if (from === to) return false;

  const text = state.doc.textBetween(from, to, ' ').trim();
  return text.length > 0;
};

const handleActionClick = (action: AiPromptAction): void => {
  emit('selectAction', action);
  isCustomPromptOpen.value = false;
  customPromptInput.value = '';
};

const handleCustomSubmit = (): void => {
  const prompt = customPromptInput.value.trim();
  if (!prompt) return;

  const customAction: AiPromptAction = {
    key: 'custom',
    label: '自定义指令',
    action: 'custom',
    icon: '🤖',
    defaultPrompt: prompt,
  };

  emit('selectAction', customAction, prompt);
  isCustomPromptOpen.value = false;
  customPromptInput.value = '';
};
</script>

<template>
  <BubbleMenu
    v-if="props.editor"
    plugin-key="atengAiBubbleMenu"
    :editor="props.editor as Editor"
    :should-show="shouldShow"
    :tippy-options="{ duration: 150, placement: 'top-start' }"
  >
    <slot
      :actions="effectiveActions"
      :select-action="handleActionClick"
      :is-custom-open="isCustomPromptOpen"
    >
      <div class="at-ai-bubble-menu" role="toolbar" aria-label="AI 智能创作气泡菜单">
        <!-- 动作按钮栏 -->
        <div v-if="!isCustomPromptOpen" class="at-ai-bubble-menu__actions">
          <span class="at-ai-bubble-menu__brand">
            <span class="at-ai-bubble-menu__logo">🤖 AI</span>
          </span>

          <button
            v-for="act in effectiveActions"
            :key="act.key"
            type="button"
            class="at-ai-bubble-menu__btn"
            :title="act.defaultPrompt"
            @click="handleActionClick(act)"
          >
            <span class="btn-icon">{{ act.icon }}</span>
            <span class="btn-label">{{ act.label }}</span>
          </button>

          <div class="at-ai-bubble-menu__divider" />

          <button
            type="button"
            class="at-ai-bubble-menu__btn at-ai-bubble-menu__btn--more"
            title="输入自定义指令"
            @click="isCustomPromptOpen = true"
          >
            <span>💬 自由提问</span>
          </button>
        </div>

        <!-- 自定义指令输入框 -->
        <div v-else class="at-ai-bubble-menu__custom">
          <input
            v-model="customPromptInput"
            type="text"
            class="at-ai-bubble-menu__input"
            placeholder="输入针对选中文字的创作指令（Enter 发送）..."
            autofocus
            @keydown.enter.prevent="handleCustomSubmit"
            @keydown.esc="isCustomPromptOpen = false"
          />
          <button
            type="button"
            class="at-ai-bubble-menu__submit-btn"
            :disabled="!customPromptInput.trim()"
            @click="handleCustomSubmit"
          >
            发送
          </button>
          <button
            type="button"
            class="at-ai-bubble-menu__close-btn"
            @click="isCustomPromptOpen = false"
          >
            ✕
          </button>
        </div>
      </div>
    </slot>
  </BubbleMenu>
</template>

<style scoped>
.at-ai-bubble-menu {
  display: flex;
  align-items: center;
  background-color: var(--at-editor-toolbar-bg, #ffffff);
  border: 1px solid var(--at-editor-border-color, #dcdfe6);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: 4px;
  gap: 4px;
  user-select: none;
}

.at-ai-bubble-menu__actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.at-ai-bubble-menu__brand {
  padding: 0 6px 0 4px;
  display: flex;
  align-items: center;
}

.at-ai-bubble-menu__logo {
  font-size: 12px;
  font-weight: 700;
  color: var(--at-editor-primary, #409eff);
  background: rgba(64, 158, 255, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

.at-ai-bubble-menu__btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: none;
  background: transparent;
  color: var(--at-editor-text-color, #303133);
  font-size: 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.at-ai-bubble-menu__btn:hover {
  background-color: var(--at-editor-hover-bg, #f2f3f5);
  color: var(--at-editor-primary, #409eff);
}

.btn-icon {
  font-size: 12px;
}

.btn-label {
  font-size: 12px;
  white-space: nowrap;
}

.at-ai-bubble-menu__divider {
  width: 1px;
  height: 16px;
  background-color: var(--at-editor-border-color, #dcdfe6);
  margin: 0 4px;
}

.at-ai-bubble-menu__custom {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px;
}

.at-ai-bubble-menu__input {
  width: 240px;
  border: 1px solid var(--at-editor-border-color, #dcdfe6);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  outline: none;
  color: var(--at-editor-text-color, #303133);
  background-color: var(--at-editor-bg-color, #ffffff);
}

.at-ai-bubble-menu__input:focus {
  border-color: var(--at-editor-primary, #409eff);
}

.at-ai-bubble-menu__submit-btn {
  border: none;
  background-color: var(--at-editor-primary, #409eff);
  color: #ffffff;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.at-ai-bubble-menu__submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.at-ai-bubble-menu__close-btn {
  border: none;
  background: transparent;
  color: var(--at-editor-text-color-secondary, #909399);
  padding: 4px 6px;
  cursor: pointer;
  border-radius: 4px;
}

.at-ai-bubble-menu__close-btn:hover {
  color: var(--at-editor-text-color, #303133);
}
</style>
