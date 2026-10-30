<script setup lang="ts">
/**
 * @atengk/editor-vue 块级斜杠命令快速唤起面板。
 *
 * 遵循 L2 零 UI 依赖与键盘人体工学原则，
 * 在空行或键入 '/' 时呼出纯中文块级物料选择器，
 * 支持 ArrowUp/ArrowDown 切换物料、Enter 极速插入、Esc 随时关闭，
 * 并暴露具名插槽支持业务端 100% 全量定制反转。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import type { Editor as CoreEditor } from '@tiptap/core';
import { BubbleMenu } from '@tiptap/vue-3';
import type { AtengSlashCommandProps, SlashCommandItem } from '../types';
import { defaultSlashCommandItems } from '../utils';

defineOptions({
  name: 'AtengSlashCommand',
});

const props = withDefaults(defineProps<AtengSlashCommandProps>(), {
  editor: null,
  disabled: false,
  triggerOnEmpty: true,
  items: undefined,
  tippyOptions: () => ({}),
  shouldShow: undefined,
});

const listRef = ref<HTMLElement | null>(null);
const selectedIndex = ref<number>(0);
const query = ref<string>('');
const isDismissed = ref<boolean>(false);
const lastDismissedPos = ref<number>(-1);
const isMenuVisible = ref<boolean>(false);

/**
 * 实际生效的物料列表集合。
 */
const allItems = computed<SlashCommandItem[]>(() => props.items ?? defaultSlashCommandItems);

/**
 * 根据搜索关键字动态过滤物料列表。
 */
const filteredItems = computed<SlashCommandItem[]>(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) {
    return allItems.value;
  }
  return allItems.value.filter(
    item =>
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q),
  );
});

/**
 * 计算 Tippy 浮层定位与动画配置。
 */
const computedTippyOptions = computed(() => ({
  placement: 'bottom-start' as const,
  offset: [0, 8] as [number, number],
  duration: 150,
  theme: 'at-editor-menu',
  interactive: true,
  ...props.tippyOptions,
}));

/**
 * 默认显示判定规则：在空行或输入 '/' 时激活展示。
 */
const defaultShouldShow = ({ editor }: { editor: CoreEditor }): boolean => {
  if (!editor || !editor.isEditable || props.disabled || isDismissed.value) {
    isMenuVisible.value = false;
    return false;
  }

  const { selection } = editor.state;
  if (!selection.empty) {
    isMenuVisible.value = false;
    return false;
  }

  // 代码块或表格内不触发斜杠命令
  if (editor.isActive('codeBlock') || editor.isActive('table')) {
    isMenuVisible.value = false;
    return false;
  }

  const { $from } = selection;
  const parentNode = $from.parent;
  if (parentNode.type.name !== 'paragraph') {
    isMenuVisible.value = false;
    return false;
  }

  const textBefore = parentNode.textBetween(0, $from.parentOffset);
  const slashIndex = textBefore.lastIndexOf('/');

  // 1. 如果检测到 '/' 触发前缀
  if (slashIndex !== -1) {
    const isTriggerPrefix = slashIndex === 0 || /\s/.test(textBefore.charAt(slashIndex - 1));
    const queryPart = textBefore.slice(slashIndex + 1);
    if (isTriggerPrefix && !queryPart.includes(' ')) {
      query.value = queryPart;
      isMenuVisible.value = true;
      return true;
    }
  }

  // 2. 如果在空行且允许空行唤起
  if (props.triggerOnEmpty && parentNode.content.size === 0) {
    query.value = '';
    isMenuVisible.value = true;
    return true;
  }

  isMenuVisible.value = false;
  return false;
};

/**
 * 滚动保证高亮项处于视野内。
 */
const scrollSelectedIntoView = (): void => {
  nextTick(() => {
    if (!listRef.value) return;
    const selectedEl = listRef.value.querySelector<HTMLElement>(
      `.at-editor-slash-menu__item:nth-child(${selectedIndex.value + 1})`,
    );
    selectedEl?.scrollIntoView({ block: 'nearest' });
  });
};

/**
 * 执行物料插入动作并清理前置斜杠字符。
 */
const selectItem = (item: SlashCommandItem): void => {
  if (!props.editor) return;

  const { state } = props.editor;
  const { $from } = state.selection;
  const parentNode = $from.parent;
  const textBefore = parentNode.textBetween(0, $from.parentOffset);
  const slashIndex = textBefore.lastIndexOf('/');

  // 1. 若存在斜杠及搜索关键字，则先删除斜杠内容
  if (slashIndex !== -1) {
    const isTriggerPrefix = slashIndex === 0 || /\s/.test(textBefore.charAt(slashIndex - 1));
    const queryPart = textBefore.slice(slashIndex + 1);
    if (isTriggerPrefix && !queryPart.includes(' ')) {
      const fromPos = $from.start() + slashIndex;
      const toPos = $from.pos;
      props.editor.chain().focus().deleteRange({ from: fromPos, to: toPos }).run();
    }
  }

  // 2. 执行目标物料创建指令
  item.action(props.editor);

  // 3. 标记浮层关闭
  isDismissed.value = true;
  if (props.editor) {
    lastDismissedPos.value = props.editor.state.selection.from;
  }
  isMenuVisible.value = false;
};

/**
 * 键盘导航拦截处理器。
 */
const handleKeyDown = (event: KeyboardEvent): void => {
  if (props.disabled || !props.editor) {
    return;
  }

  // 动态评估当前是否满足呼出条件
  const isVisible = defaultShouldShow({ editor: props.editor });
  if (!isVisible) {
    return;
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    event.stopPropagation();
    if (filteredItems.value.length > 0) {
      selectedIndex.value = (selectedIndex.value + 1) % filteredItems.value.length;
      scrollSelectedIntoView();
    }
    return;
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    event.stopPropagation();
    if (filteredItems.value.length > 0) {
      selectedIndex.value =
        (selectedIndex.value - 1 + filteredItems.value.length) % filteredItems.value.length;
      scrollSelectedIntoView();
    }
    return;
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    event.stopPropagation();
    const item = filteredItems.value[selectedIndex.value];
    if (item) {
      selectItem(item);
    }
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    isDismissed.value = true;
    isMenuVisible.value = false;
    if (props.editor) {
      lastDismissedPos.value = props.editor.state.selection.from;
    }
  }
};

/**
 * 监听光标或内容变更，重置关闭标记与当前选中索引。
 */
const handleEditorUpdate = (): void => {
  if (!props.editor) return;
  const currentPos = props.editor.state.selection.from;
  if (currentPos !== lastDismissedPos.value) {
    isDismissed.value = false;
  }
  // 重新评估显示状态
  defaultShouldShow({ editor: props.editor });
};

// 监听 filteredItems 长度变化，防索引溢出
watch(
  () => filteredItems.value.length,
  newLen => {
    if (selectedIndex.value >= newLen) {
      selectedIndex.value = Math.max(0, newLen - 1);
    }
  },
);

// 注册键盘与编辑器监听
onMounted(() => {
  if (props.editor) {
    isMenuVisible.value = defaultShouldShow({ editor: props.editor });
  }
  if (props.editor?.view?.dom) {
    props.editor.view.dom.addEventListener('keydown', handleKeyDown, true);
    props.editor.on('selectionUpdate', handleEditorUpdate);
    props.editor.on('update', handleEditorUpdate);
  }
});

watch(
  () => props.editor,
  (newEditor, oldEditor) => {
    if (oldEditor?.view?.dom) {
      oldEditor.view.dom.removeEventListener('keydown', handleKeyDown, true);
      oldEditor.off('selectionUpdate', handleEditorUpdate);
      oldEditor.off('update', handleEditorUpdate);
    }
    if (newEditor?.view?.dom) {
      newEditor.view.dom.addEventListener('keydown', handleKeyDown, true);
      newEditor.on('selectionUpdate', handleEditorUpdate);
      newEditor.on('update', handleEditorUpdate);
    }
  },
);

onBeforeUnmount(() => {
  if (props.editor?.view?.dom) {
    props.editor.view.dom.removeEventListener('keydown', handleKeyDown, true);
    props.editor.off('selectionUpdate', handleEditorUpdate);
    props.editor.off('update', handleEditorUpdate);
  }
});
</script>

<template>
  <BubbleMenu
    v-if="props.editor"
    plugin-key="atengSlashCommandMenu"
    :editor="props.editor"
    :should-show="props.shouldShow ?? defaultShouldShow"
    :tippy-options="computedTippyOptions"
  >
    <slot
      :editor="props.editor"
      :items="filteredItems"
      :selected-index="selectedIndex"
      :select-item="selectItem"
    >
      <div class="at-editor-slash-menu" role="menu" aria-label="块级物料选择面板">
        <div class="at-editor-slash-menu__header">
          {{ query ? `物料搜索：“${query}”` : '常用块级物料' }}
        </div>

        <div
          v-if="filteredItems.length > 0"
          ref="listRef"
          class="at-editor-slash-menu__list"
          role="listbox"
        >
          <button
            v-for="(item, index) in filteredItems"
            :key="item.id"
            type="button"
            class="at-editor-slash-menu__item"
            :class="{ 'is-selected': index === selectedIndex }"
            role="option"
            :aria-selected="index === selectedIndex"
            :disabled="props.disabled"
            @mouseenter="selectedIndex = index"
            @mousedown.prevent
            @click="selectItem(item)"
          >
            <!-- 统一 SVG 图标展示区 -->
            <span class="at-editor-slash-menu__item-icon">
              <!-- H1 -->
              <svg v-if="item.id === 'heading-1'" viewBox="0 0 24 24">
                <path
                  d="M5 4v3h5.5v12h3V7H19V4H5zm14 7h-1.5v1.5H16v1.5h1.5V17H19v-3h1.5v-1.5H19V11z"
                />
              </svg>
              <!-- H2 -->
              <svg v-else-if="item.id === 'heading-2'" viewBox="0 0 24 24">
                <path
                  d="M5 4v3h5.5v12h3V7H19V4H5zm11 9h3v1.5h-3v1.5h3V19h-4.5v-4.5h3v-1.5H16V13z"
                />
              </svg>
              <!-- H3 -->
              <svg v-else-if="item.id === 'heading-3'" viewBox="0 0 24 24">
                <path
                  d="M5 4v3h5.5v12h3V7H19V4H5zm11 7h4v1.5h-2.5v1.5H19v1.5h-1.5v1.5H20V19h-4v-1.5h2.5V16H16v-1.5h2.5V13H16v-2z"
                />
              </svg>
              <!-- 段落 -->
              <svg v-else-if="item.id === 'paragraph'" viewBox="0 0 24 24">
                <path d="M13 4v16h-2V6H9V4h4zm7 0v16h-2V4h2zM4 9h7v2H4V9zm0 4h7v2H4v-2z" />
              </svg>
              <!-- 无序列表 -->
              <svg v-else-if="item.id === 'bullet-list'" viewBox="0 0 24 24">
                <path
                  d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"
                />
              </svg>
              <!-- 有序列表 -->
              <svg v-else-if="item.id === 'ordered-list'" viewBox="0 0 24 24">
                <path
                  d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"
                />
              </svg>
              <!-- 任务清单 -->
              <svg v-else-if="item.id === 'task-list'" viewBox="0 0 24 24">
                <path
                  d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM17.99 9l-1.41-1.42-6.59 6.59-2.58-2.57-1.42 1.41 4 4z"
                />
              </svg>
              <!-- 引用 -->
              <svg v-else-if="item.id === 'blockquote'" viewBox="0 0 24 24">
                <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" />
              </svg>
              <!-- 代码块 -->
              <svg v-else-if="item.id === 'code-block'" viewBox="0 0 24 24">
                <path
                  d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"
                />
              </svg>
              <!-- 表格 -->
              <svg v-else-if="item.id === 'table'" viewBox="0 0 24 24">
                <path
                  d="M20 3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 2v3H4V5h16zm-9 5v4H4v-4h7zm0 6v5H4v-5h7zm2-6h7v4h-7v-4zm0 6h7v5h-7v-5z"
                />
              </svg>
              <!-- 分割线 -->
              <svg v-else-if="item.id === 'horizontal-rule'" viewBox="0 0 24 24">
                <path d="M4 11h16v2H4z" />
              </svg>
              <!-- 默认通用图标 -->
              <svg v-else viewBox="0 0 24 24">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
            </span>

            <!-- 文字说明区 -->
            <span class="at-editor-slash-menu__item-info">
              <span class="at-editor-slash-menu__item-title">{{ item.title }}</span>
              <span class="at-editor-slash-menu__item-desc">{{ item.description }}</span>
            </span>
          </button>
        </div>

        <div v-else class="at-editor-slash-menu__empty">无匹配的块级物料</div>
      </div>
    </slot>
  </BubbleMenu>
</template>
