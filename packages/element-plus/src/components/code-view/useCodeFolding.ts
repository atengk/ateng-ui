/**
 * AtengCodeView 代码折叠响应式状态管理 Composable。
 *
 * @author Ateng
 * @since 2026-10-22
 */

import { ref, computed, watch, type Ref, type ComputedRef } from 'vue';
import {
  computeFoldRanges,
  buildFoldRangeMap,
  computeVisibleLines,
  type FoldRange,
  type VisibleLineItem,
} from './folding';
import type { AtengCodeViewProps, AtengCodeViewEmits } from './types';

/**
 * useCodeFolding Composable 返回状态与操作方法接口。
 */
export interface UseCodeFoldingReturn {
  foldRanges: ComputedRef<FoldRange[]>;
  collapsedLines: Ref<Set<number>>;
  visibleLines: ComputedRef<VisibleLineItem[]>;
  isAllFolded: ComputedRef<boolean>;
  toggleFold: (lineIndex: number) => void;
  foldAll: () => void;
  unfoldAll: () => void;
  toggleAllFolds: () => void;
}

export function useCodeFolding(
  lines: Ref<string[]>,
  highlightedLines: Ref<string[]>,
  props: AtengCodeViewProps,
  emit: AtengCodeViewEmits,
): UseCodeFoldingReturn {
  // 1. 计算多行括号折叠区间
  const foldRanges = computed<FoldRange[]>(() => {
    if (!props.collapsible) {
      return [];
    }
    return computeFoldRanges(lines.value);
  });

  const foldRangeMap = computed(() => buildFoldRangeMap(foldRanges.value));

  // 2. 当前已折叠的起始行集合（Set<lineIndex>）
  const collapsedLines = ref<Set<number>>(new Set());

  // 3. 监听代码切分或折叠配置变更，确定性同步状态
  watch(
    [() => props.code, () => props.defaultCollapsed, foldRanges],
    () => {
      if (props.defaultCollapsed && props.collapsible) {
        collapsedLines.value = new Set(foldRanges.value.map(r => r.startLine));
      } else {
        collapsedLines.value = new Set();
      }
      emit('fold-change', Array.from(collapsedLines.value));
    },
    { immediate: true },
  );

  // 4. 单行折叠切换
  function toggleFold(lineIndex: number): void {
    const next = new Set(collapsedLines.value);
    if (next.has(lineIndex)) {
      next.delete(lineIndex);
    } else {
      next.add(lineIndex);
    }
    collapsedLines.value = next;
    emit('fold-change', Array.from(next));
  }

  // 5. 全部折叠
  function foldAll(): void {
    collapsedLines.value = new Set(foldRanges.value.map(r => r.startLine));
    emit('fold-change', Array.from(collapsedLines.value));
  }

  // 6. 全部展开
  function unfoldAll(): void {
    collapsedLines.value = new Set();
    emit('fold-change', []);
  }

  // 7. 是否全部处于折叠态
  const isAllFolded = computed<boolean>(() => {
    return (
      foldRanges.value.length > 0 &&
      foldRanges.value.every(r => collapsedLines.value.has(r.startLine))
    );
  });

  function toggleAllFolds(): void {
    if (isAllFolded.value) {
      unfoldAll();
    } else {
      foldAll();
    }
  }

  // 8. 视口可见行列表
  const visibleLines = computed<VisibleLineItem[]>(() => {
    return computeVisibleLines(
      lines.value,
      highlightedLines.value,
      foldRangeMap.value,
      collapsedLines.value,
    );
  });

  return {
    foldRanges,
    collapsedLines,
    visibleLines,
    isAllFolded,
    toggleFold,
    foldAll,
    unfoldAll,
    toggleAllFolds,
  };
}
