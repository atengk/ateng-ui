/**
 * AtengTabsNav 原生拖拽调序防呆 Composable。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { ref, type Ref } from 'vue';
import type { TabItem } from './types';

export interface UseTabsDragOptions {
  tabs: () => TabItem[];
  emit: (e: 'update:tabs' | 'tabOrderChange', tabs: TabItem[]) => void;
}

export interface UseTabsDragReturn {
  dragIndex: Ref<number | null>;
  dragTargetIndex: Ref<number | null>;
  onDragStart: (event: DragEvent, index: number, tab: TabItem) => void;
  onDragOver: (event: DragEvent, index: number, tab: TabItem) => void;
  onDragLeave: (index: number) => void;
  onDrop: (event: DragEvent, toIndex: number, targetTab: TabItem) => void;
  onDragEnd: () => void;
}

export function useTabsDrag(options: UseTabsDragOptions): UseTabsDragReturn {
  const { tabs, emit } = options;
  const dragIndex = ref<number | null>(null);
  const dragTargetIndex = ref<number | null>(null);

  const onDragStart = (event: DragEvent, index: number, tab: TabItem): void => {
    if (tab.affix) {
      event.preventDefault();
      return;
    }
    dragIndex.value = index;
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', String(index));
      event.dataTransfer.effectAllowed = 'move';
    }
  };

  const onDragOver = (event: DragEvent, index: number, tab: TabItem): void => {
    event.preventDefault();
    if (tab.affix) {
      return;
    }
    dragTargetIndex.value = index;
  };

  const onDragLeave = (index: number): void => {
    if (dragTargetIndex.value === index) {
      dragTargetIndex.value = null;
    }
  };

  const onDrop = (event: DragEvent, toIndex: number, targetTab: TabItem): void => {
    event.preventDefault();
    const fromIndex = dragIndex.value;
    dragIndex.value = null;
    dragTargetIndex.value = null;

    const currentTabs = tabs();
    if (
      fromIndex === null ||
      fromIndex === toIndex ||
      targetTab.affix ||
      fromIndex < 0 ||
      fromIndex >= currentTabs.length
    ) {
      return;
    }

    const movingTab = currentTabs[fromIndex];
    if (!movingTab || movingTab.affix) {
      return;
    }

    // 保证不能被拖到固定标签之前
    const firstUnpinnedIndex = currentTabs.findIndex(t => !t.affix);
    const validToIndex = Math.max(firstUnpinnedIndex >= 0 ? firstUnpinnedIndex : 0, toIndex);

    const newTabs = [...currentTabs];
    const [removed] = newTabs.splice(fromIndex, 1);
    if (removed) {
      newTabs.splice(validToIndex, 0, removed);
      emit('update:tabs', newTabs);
      emit('tabOrderChange', newTabs);
    }
  };

  const onDragEnd = (): void => {
    dragIndex.value = null;
    dragTargetIndex.value = null;
  };

  return {
    dragIndex,
    dragTargetIndex,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
    onDragEnd,
  };
}
