<script setup lang="ts">
/**
 * @atengk/editor-vue 原生块级六点悬浮拖拽手柄组件。
 *
 * 遵循 L2 零 UI 依赖与插槽倒置规范，纯 SVG 与 CSS 驱动，
 * 贴合鼠标垂直位置精准跟随当前激活块，支持垂直拖拽位移重排与纯中文块级上下文菜单。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { ref, watch, onMounted, onUnmounted } from 'vue';
import type { Node as PMNode } from '@tiptap/pm/model';
import { NodeSelection } from '@tiptap/pm/state';
import type { AtengDragHandleProps, DragHandleBlockActions } from '../types';

defineOptions({
  name: 'AtengDragHandle',
});

const props = withDefaults(defineProps<AtengDragHandleProps>(), {
  editor: null,
  disabled: false,
  offsetX: -28,
});

defineSlots<{
  'drag-handle'?: (props: {
    node: PMNode | null;
    pos: number | null;
    isOpen: boolean;
    isVisible: boolean;
    toggleMenu: () => void;
    onDragStart: (e: DragEvent) => void;
    onDragEnd: () => void;
  }) => unknown;
  'block-menu'?: (props: {
    node: PMNode | null;
    pos: number | null;
    actions: DragHandleBlockActions;
    close: () => void;
  }) => unknown;
}>();

const containerRef = ref<HTMLElement | null>(null);
const isVisible = ref<boolean>(false);
const isMenuOpen = ref<boolean>(false);
const isHoveringHandle = ref<boolean>(false);

const handleTop = ref<number>(0);
const handleLeft = ref<number>(-28);

const currentPos = ref<number | null>(null);
const currentNode = ref<PMNode | null>(null);
const currentDom = ref<HTMLElement | null>(null);

// 绑定全局鼠标事件监听
const attachListeners = () => {
  if (!props.editor || props.disabled) return;
  const editorDom = props.editor.view?.dom;
  if (!editorDom) return;

  editorDom.addEventListener('mousemove', handleMouseMove);
  editorDom.addEventListener('mouseleave', handleMouseLeave);
  document.addEventListener('click', handleGlobalClick);
};

const detachListeners = () => {
  const editorDom = props.editor?.view?.dom;
  if (editorDom) {
    editorDom.removeEventListener('mousemove', handleMouseMove);
    editorDom.removeEventListener('mouseleave', handleMouseLeave);
  }
  document.removeEventListener('click', handleGlobalClick);
};

onMounted(() => {
  attachListeners();
});

onUnmounted(() => {
  detachListeners();
});

watch(
  () => [props.editor, props.disabled],
  () => {
    detachListeners();
    attachListeners();
  },
);

const handleGlobalClick = (event: MouseEvent) => {
  if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
    isMenuOpen.value = false;
    if (!isHoveringHandle.value) {
      isVisible.value = false;
    }
  }
};

const handleMouseMove = (event: MouseEvent) => {
  if (props.disabled || isMenuOpen.value || !props.editor) return;
  const view = props.editor.view;
  if (!view || !view.dom) return;

  const editorDom = view.dom;
  const children = editorDom.children;
  let targetChild: HTMLElement | null = null;

  for (let i = 0; i < children.length; i++) {
    const child = children[i] as HTMLElement;
    const rect = child.getBoundingClientRect();
    if (event.clientY >= rect.top - 2 && event.clientY <= rect.bottom + 2) {
      targetChild = child;
      break;
    }
  }

  if (targetChild && containerRef.value) {
    const targetRect = targetChild.getBoundingClientRect();
    const parentContainer = containerRef.value.offsetParent as HTMLElement | null;
    const parentRect =
      parentContainer?.getBoundingClientRect() ?? editorDom.getBoundingClientRect();

    handleTop.value = targetRect.top - parentRect.top;
    handleLeft.value = targetRect.left - parentRect.left + props.offsetX;

    try {
      const pos = view.posAtDOM(targetChild, 0);
      const $pos = view.state.doc.resolve(pos);
      const blockPos = $pos.depth >= 1 ? $pos.before(1) : pos;
      currentPos.value = blockPos;
      currentNode.value = view.state.doc.nodeAt(blockPos) ?? null;
      currentDom.value = targetChild;
      isVisible.value = true;
    } catch {
      // 容错降级：当鼠标移动至 ProseMirror 尚未就绪或非内容 DOM 节点（如装饰器、滚动条）时安全忽略
    }
  } else if (!isHoveringHandle.value) {
    isVisible.value = false;
  }
};

const handleMouseLeave = () => {
  if (!isHoveringHandle.value && !isMenuOpen.value) {
    isVisible.value = false;
  }
};

// 拖拽开始与结束逻辑
const handleDragStart = (e: DragEvent) => {
  if (props.disabled || !props.editor || currentPos.value === null) return;
  const view = props.editor.view;
  const doc = view.state.doc;

  try {
    const nodeSelection = NodeSelection.create(doc, currentPos.value);
    view.dispatch(view.state.tr.setSelection(nodeSelection));
  } catch {
    // 容错降级：目标块不可被 NodeSelection 选定时安全跳过选区调度
  }

  const slice = view.state.selection.content();
  // 注入 ProseMirror 内部拖拽协议
  (view as unknown as { dragging: unknown }).dragging = { slice, move: true };

  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', currentDom.value?.outerHTML ?? '');
    e.dataTransfer.setData('text/plain', currentDom.value?.textContent ?? '');
    if (currentDom.value) {
      e.dataTransfer.setDragImage(currentDom.value, 0, 0);
    }
  }
};

const handleDragEnd = () => {
  if (props.editor?.view) {
    (props.editor.view as unknown as { dragging: unknown }).dragging = null;
  }
};

const toggleMenu = () => {
  if (props.disabled) return;
  isMenuOpen.value = !isMenuOpen.value;
  if (isMenuOpen.value && props.editor && currentPos.value !== null) {
    try {
      const view = props.editor.view;
      const nodeSelection = NodeSelection.create(view.state.doc, currentPos.value);
      view.dispatch(view.state.tr.setSelection(nodeSelection));
    } catch {
      // 容错降级：当鼠标移动至 ProseMirror 尚未就绪或非内容 DOM 节点（如装饰器、滚动条）时安全忽略
    }
  }
};

const closeMenu = () => {
  isMenuOpen.value = false;
};

// 块级上下文操作集合
const actions: DragHandleBlockActions = {
  duplicate: () => {
    if (!props.editor || currentPos.value === null || !currentNode.value) return;
    const view = props.editor.view;
    const tr = view.state.tr.insert(
      currentPos.value + currentNode.value.nodeSize,
      currentNode.value,
    );
    view.dispatch(tr);
    closeMenu();
  },
  delete: () => {
    if (!props.editor || currentPos.value === null || !currentNode.value) return;
    const view = props.editor.view;
    const tr = view.state.tr.delete(
      currentPos.value,
      currentPos.value + currentNode.value.nodeSize,
    );
    view.dispatch(tr);
    closeMenu();
    isVisible.value = false;
  },
  clear: () => {
    if (!props.editor || currentPos.value === null || !currentNode.value) return;
    const view = props.editor.view;
    const schema = view.state.schema;
    const emptyNode = schema.nodes[currentNode.value.type.name]?.createAndFill();
    if (emptyNode) {
      const tr = view.state.tr.replaceWith(
        currentPos.value,
        currentPos.value + currentNode.value.nodeSize,
        emptyNode,
      );
      view.dispatch(tr);
    }
    closeMenu();
  },
  transformTo: type => {
    if (!props.editor || currentPos.value === null) return;
    const chain = props.editor.chain().focus();
    switch (type) {
      case 'paragraph':
        chain.setParagraph().run();
        break;
      case 'h1':
        chain.toggleHeading({ level: 1 }).run();
        break;
      case 'h2':
        chain.toggleHeading({ level: 2 }).run();
        break;
      case 'h3':
        chain.toggleHeading({ level: 3 }).run();
        break;
      case 'bulletList':
        chain.toggleBulletList().run();
        break;
      case 'orderedList':
        chain.toggleOrderedList().run();
        break;
      case 'taskList':
        chain.toggleTaskList().run();
        break;
      case 'blockquote':
        chain.toggleBlockquote().run();
        break;
      case 'codeBlock':
        chain.toggleCodeBlock().run();
        break;
    }
    closeMenu();
  },
};
</script>

<template>
  <div
    v-if="props.editor"
    ref="containerRef"
    class="at-drag-handle"
    :class="{ 'is-visible': isVisible || isMenuOpen }"
    :style="{ top: `${handleTop}px`, left: `${handleLeft}px` }"
    @mouseenter="isHoveringHandle = true"
    @mouseleave="isHoveringHandle = false"
  >
    <!-- 拖拽手柄插槽（倒置接管） -->
    <slot
      name="drag-handle"
      :node="currentNode"
      :pos="currentPos"
      :is-open="isMenuOpen"
      :is-visible="isVisible"
      :toggle-menu="toggleMenu"
      :on-drag-start="handleDragStart"
      :on-drag-end="handleDragEnd"
    >
      <button
        type="button"
        class="at-drag-handle__btn"
        draggable="true"
        title="拖拽移动块，点击展开块菜单"
        aria-label="块级拖拽手柄"
        :disabled="props.disabled"
        @click.stop="toggleMenu"
        @dragstart="handleDragStart"
        @dragend="handleDragEnd"
      >
        <svg viewBox="0 0 24 24" class="at-drag-handle__icon">
          <path
            d="M9 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm10-14a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"
          />
        </svg>
      </button>
    </slot>

    <!-- 块级上下文菜单插槽（倒置接管） -->
    <slot
      v-if="isMenuOpen"
      name="block-menu"
      :node="currentNode"
      :pos="currentPos"
      :actions="actions"
      :close="closeMenu"
    >
      <div class="at-drag-handle__menu" role="menu">
        <div class="at-drag-handle__menu-group-title">常用操作</div>
        <button type="button" class="at-drag-handle__menu-item" @click="actions.duplicate">
          <span>📋 复制当前块</span>
        </button>
        <button type="button" class="at-drag-handle__menu-item is-danger" @click="actions.delete">
          <span>🗑️ 删除当前块</span>
        </button>
        <button type="button" class="at-drag-handle__menu-item" @click="actions.clear">
          <span>🧹 清空块内容</span>
        </button>

        <div class="at-drag-handle__menu-divider" />
        <div class="at-drag-handle__menu-group-title">转换为...</div>
        <button
          type="button"
          class="at-drag-handle__menu-item"
          @click="actions.transformTo('paragraph')"
        >
          <span>¶ 正文段落</span>
        </button>
        <button type="button" class="at-drag-handle__menu-item" @click="actions.transformTo('h1')">
          <span>H1 一级标题</span>
        </button>
        <button type="button" class="at-drag-handle__menu-item" @click="actions.transformTo('h2')">
          <span>H2 二级标题</span>
        </button>
        <button type="button" class="at-drag-handle__menu-item" @click="actions.transformTo('h3')">
          <span>H3 三级标题</span>
        </button>
        <button
          type="button"
          class="at-drag-handle__menu-item"
          @click="actions.transformTo('bulletList')"
        >
          <span>• 无序列表</span>
        </button>
        <button
          type="button"
          class="at-drag-handle__menu-item"
          @click="actions.transformTo('orderedList')"
        >
          <span>1. 有序列表</span>
        </button>
        <button
          type="button"
          class="at-drag-handle__menu-item"
          @click="actions.transformTo('taskList')"
        >
          <span>☑ 待办清单</span>
        </button>
        <button
          type="button"
          class="at-drag-handle__menu-item"
          @click="actions.transformTo('blockquote')"
        >
          <span>❝ 引用块</span>
        </button>
        <button
          type="button"
          class="at-drag-handle__menu-item"
          @click="actions.transformTo('codeBlock')"
        >
          <span>&lt;/&gt; 代码块</span>
        </button>
      </div>
    </slot>
  </div>
</template>

<style scoped>
.at-drag-handle {
  position: absolute;
  z-index: 50;
  display: flex;
  align-items: center;
  opacity: 0;
  pointer-events: none;
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
  user-select: none;
}

.at-drag-handle.is-visible {
  opacity: 1;
  pointer-events: auto;
}

.at-drag-handle__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 24px;
  padding: 2px;
  border: none;
  border-radius: var(--at-editor-border-radius, 4px);
  background: transparent;
  color: var(--at-editor-statusbar-text, #909399);
  cursor: grab;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.at-drag-handle__btn:active {
  cursor: grabbing;
}

.at-drag-handle__btn:hover {
  background-color: var(--at-editor-btn-hover-bg, #e9ecef);
  color: var(--at-editor-text-color, #303133);
}

.at-drag-handle__icon {
  width: 14px;
  height: 14px;
  fill: currentColor;
}

.at-drag-handle__menu {
  position: absolute;
  top: 0;
  left: 24px;
  z-index: 120;
  min-width: 160px;
  max-height: 360px;
  overflow-y: auto;
  background-color: var(--at-editor-bg-color, #ffffff);
  border: 1px solid var(--at-editor-border-color, #dcdfe6);
  border-radius: var(--at-editor-border-radius, 4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.at-drag-handle__menu-group-title {
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--at-editor-statusbar-text, #909399);
}

.at-drag-handle__menu-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 6px 8px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--at-editor-text-color, #303133);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.at-drag-handle__menu-item:hover {
  background-color: var(--at-editor-btn-hover-bg, #f5f7fa);
}

.at-drag-handle__menu-item.is-danger {
  color: var(--el-color-danger, #f56c6c);
}

.at-drag-handle__menu-item.is-danger:hover {
  background-color: var(--el-color-danger-light-9, #fef0f0);
}

.at-drag-handle__menu-divider {
  height: 1px;
  background-color: var(--at-editor-toolbar-border, #e4e7ed);
  margin: 4px 0;
}
</style>
