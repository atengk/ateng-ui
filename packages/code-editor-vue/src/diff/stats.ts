/**
 * Diff 差异统计与行数计算工具。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import type * as monaco from 'monaco-editor';
import type { DiffStats } from '../types';

/**
 * 依据 Monaco Editor 的 ILineChange 数组计算新增、删除与差异总块数。
 *
 * @param lineChanges Monaco getLineChanges 返回的行差异数组
 * @returns 规范化的 DiffStats 对象
 */
export function computeDiffStats(
  lineChanges: monaco.editor.ILineChange[] | null | undefined,
): DiffStats {
  if (!lineChanges || lineChanges.length === 0) {
    return { additions: 0, deletions: 0, changesCount: 0 };
  }

  let additions = 0;
  let deletions = 0;

  for (const change of lineChanges) {
    if (change.originalEndLineNumber === 0) {
      // 纯新增行（Original 侧无对应行）
      additions += change.modifiedEndLineNumber - change.modifiedStartLineNumber + 1;
    } else if (change.modifiedEndLineNumber === 0) {
      // 纯删除行（Modified 侧无对应行）
      deletions += change.originalEndLineNumber - change.originalStartLineNumber + 1;
    } else {
      // 修改行（视为原始行被删除并替换为新增行）
      deletions += change.originalEndLineNumber - change.originalStartLineNumber + 1;
      additions += change.modifiedEndLineNumber - change.modifiedStartLineNumber + 1;
    }
  }

  return {
    additions,
    deletions,
    changesCount: lineChanges.length,
  };
}
