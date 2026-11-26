/**
 * AtengTabsNav 共享虚拟右键菜单与 WAI-ARIA 键盘导航组合式状态机。
 *
 * @author Ateng
 * @since 2026-11-26
 */

import { computed, nextTick, ref, type ComputedRef, type Ref } from 'vue';
import { isTabClosable } from './tabsCommands';
import type { TabCommand, TabItem } from './types';

export interface ContextDropdownHandle {
  handleOpen?: () => void;
  handleClose?: () => void;
}

export interface UseTabsAccessibilityOptions {
  trackRef: Ref<HTMLDivElement | null>;
  tabs: () => TabItem[];
  activeTab: ComputedRef<TabItem | undefined>;
  activeIndex: ComputedRef<number>;
  closable: () => boolean;
  contextMenu: () => boolean;
  onActivateTab: (tab: TabItem) => void;
  onCloseTab: (tab: TabItem) => void;
  onExecuteCommand: (command: TabCommand | string, tab: TabItem, index: number) => void;
}

export interface UseTabsAccessibilityReturn {
  focusableIndex: ComputedRef<number>;
  contextDropdownRef: Ref<ContextDropdownHandle | null>;
  isContextMenuVisible: Ref<boolean>;
  contextVirtualRef: { getBoundingClientRect: () => DOMRect };
  resolvedContextEntry: ComputedRef<{ tab?: TabItem; index: number }>;
  onTabContextMenu: (event: MouseEvent, tab: TabItem, index: number) => void;
  handleContextMenuCommand: (command: TabCommand | string) => void;
  onTabItemKeydown: (event: KeyboardEvent, tab: TabItem, index: number) => void;
}

function createVirtualRect(x: number, y: number, width = 0, height = 0): DOMRect {
  if (typeof DOMRect !== 'undefined' && typeof DOMRect.fromRect === 'function') {
    return DOMRect.fromRect({ x, y, width, height });
  }
  return {
    x,
    y,
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    toJSON: () => ({
      x,
      y,
      width,
      height,
      top: y,
      left: x,
      right: x + width,
      bottom: y + height,
    }),
  } as DOMRect;
}

function isEditableOrInteractiveDescendant(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null;
  const currentTarget = event.currentTarget as HTMLElement | null;
  if (!target || !currentTarget || target === currentTarget) {
    return false;
  }
  return (
    target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(target.tagName)
  );
}

/**
 * 提供 AtengTabsNav 的 Roving Tabindex、WAI-ARIA 方向键/快捷键导航及轨道外共享右键菜单状态管理。
 */
export function useTabsAccessibility(
  options: UseTabsAccessibilityOptions,
): UseTabsAccessibilityReturn {
  const {
    trackRef,
    tabs,
    activeTab,
    activeIndex,
    closable,
    contextMenu,
    onActivateTab,
    onCloseTab,
    onExecuteCommand,
  } = options;

  const focusableIndex = computed(() => {
    if (activeIndex.value >= 0) return activeIndex.value;
    return tabs().length > 0 ? 0 : -1;
  });

  const contextDropdownRef = ref<ContextDropdownHandle | null>(null);
  const contextMenuTarget = ref<{ tab: TabItem; index: number } | null>(null);
  const isContextMenuVisible = ref(false);
  const contextVirtualRect = ref<DOMRect>(createVirtualRect(0, 0));

  // 非 Element 位置代理对象：避免 ElPopperTrigger 识别为可聚焦 DOM 并向 tab 写入 aria-haspopup/aria-controls
  const contextVirtualRef = {
    getBoundingClientRect: () => contextVirtualRect.value,
  };

  const resolvedContextEntry = computed<{ tab?: TabItem; index: number }>(() => {
    const currentTabs = tabs();
    const current = contextMenuTarget.value;
    if (current) {
      const idx = currentTabs.findIndex(t => t.key === current.tab.key);
      if (idx >= 0) {
        return { tab: currentTabs[idx], index: idx };
      }
    }
    if (activeTab.value && activeIndex.value >= 0) {
      return { tab: activeTab.value, index: activeIndex.value };
    }
    return { tab: currentTabs[0], index: currentTabs.length > 0 ? 0 : -1 };
  });

  const openContextMenuAt = (
    x: number,
    y: number,
    tab: TabItem,
    index: number,
    width = 0,
    height = 0,
  ): void => {
    contextMenuTarget.value = { tab, index };
    contextVirtualRect.value = createVirtualRect(x, y, width, height);
    if (isContextMenuVisible.value) {
      contextDropdownRef.value?.handleClose?.();
    }
    nextTick(() => {
      contextDropdownRef.value?.handleOpen?.();
    });
  };

  const onTabContextMenu = (event: MouseEvent, tab: TabItem, index: number): void => {
    if (!contextMenu()) {
      return;
    }
    event.preventDefault();
    const targetEl = event.currentTarget as HTMLElement | null;
    if (event.clientX === 0 && event.clientY === 0 && targetEl) {
      const rect = targetEl.getBoundingClientRect();
      openContextMenuAt(rect.left, rect.bottom, tab, index, rect.width, 0);
      return;
    }
    openContextMenuAt(event.clientX, event.clientY, tab, index);
  };

  const handleContextMenuCommand = (command: TabCommand | string): void => {
    const { tab, index } = resolvedContextEntry.value;
    if (!tab || index < 0) {
      return;
    }
    onExecuteCommand(command, tab, index);
  };

  const onTabItemKeydown = (event: KeyboardEvent, tab: TabItem, index: number): void => {
    if (isEditableOrInteractiveDescendant(event)) {
      return;
    }

    const currentTabs = tabs();
    if (
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowRight' ||
      event.key === 'Home' ||
      event.key === 'End'
    ) {
      const total = currentTabs.length;
      if (total === 0) return;

      let nextIndex = index;
      if (event.key === 'ArrowLeft') nextIndex = (index - 1 + total) % total;
      else if (event.key === 'ArrowRight') nextIndex = (index + 1) % total;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = total - 1;

      const nextTab = currentTabs[nextIndex];
      if (!nextTab) return;

      event.preventDefault();
      const tabElements = trackRef.value?.querySelectorAll<HTMLElement>('[role="tab"]');
      tabElements?.[nextIndex]?.focus();
      onActivateTab(nextTab);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onActivateTab(tab);
      return;
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (isTabClosable(tab, closable())) {
        event.preventDefault();
        onCloseTab(tab);
      }
      return;
    }

    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
      if (!contextMenu()) return;
      event.preventDefault();
      const anchor = (event.currentTarget ?? event.target) as HTMLElement | null;
      if (anchor) {
        const rect = anchor.getBoundingClientRect();
        openContextMenuAt(rect.left, rect.bottom, tab, index, rect.width, 0);
      }
    }
  };

  return {
    focusableIndex,
    contextDropdownRef,
    isContextMenuVisible,
    contextVirtualRef,
    resolvedContextEntry,
    onTabContextMenu,
    handleContextMenuCommand,
    onTabItemKeydown,
  };
}
