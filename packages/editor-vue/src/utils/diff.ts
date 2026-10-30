/**
 * @atengk/editor-vue 纯原生精炼文本增删 Diff 比对算法。
 *
 * 遵循 L2 专用扩展层规范，零外部第三方全量工具库依赖（无 jsdiff / lodash），
 * 基于字符与分词级别的动态规划最长公共子序列 (LCS) 算法，
 * 纯内存毫秒级生成结构化增删比对分块 (DiffChangeChunk)。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import type { DiffChangeChunk } from '../types';

/**
 * 将文本切分为比对单元（保留空白符与换行符作为独立词元）。
 */
function tokenize(text: string): string[] {
  if (!text) return [];
  // 正则按单词、中文字符、空白字符及标点符号切分
  const matches = text.match(/[\u4e00-\u9fa5]|[a-zA-Z0-9_]+|\s+|[^\s\w\u4e00-\u9fa5]/g);
  return matches || Array.from(text);
}

/**
 * 计算两个词元序列之间的增删比对分块。
 *
 * @param originalText 变更前的原始文本
 * @param newText 变更后的新文本
 * @returns 结构化增删比对分块列表
 */
export function computeTextDiff(originalText = '', newText = ''): DiffChangeChunk[] {
  if (originalText === newText) {
    return originalText ? [{ type: 'unchanged', value: originalText }] : [];
  }

  if (!originalText && newText) {
    return [{ type: 'added', value: newText }];
  }

  if (originalText && !newText) {
    return [{ type: 'removed', value: originalText }];
  }

  const tokensA = tokenize(originalText);
  const tokensB = tokenize(newText);

  const m = tokensA.length;
  const n = tokensB.length;

  // 针对超长文本设置快速对齐防御，防止 O(m*n) 矩阵内存过大
  if (m * n > 250000) {
    return [
      { type: 'removed', value: originalText },
      { type: 'added', value: newText },
    ];
  }

  // 构建 LCS 动态规划矩阵
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));

  const getDP = (r: number, c: number): number => {
    return dp[r]?.[c] ?? 0;
  };

  for (let i = 1; i <= m; i++) {
    const row = dp[i];
    if (!row) continue;
    const tokenA = tokensA[i - 1];

    for (let j = 1; j <= n; j++) {
      const tokenB = tokensB[j - 1];
      if (tokenA !== undefined && tokenA === tokenB) {
        row[j] = getDP(i - 1, j - 1) + 1;
      } else {
        row[j] = Math.max(getDP(i - 1, j), getDP(i, j - 1));
      }
    }
  }

  // 回溯还原 diff 路径
  const rawChunks: DiffChangeChunk[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    const tokenA = tokensA[i - 1];
    const tokenB = tokensB[j - 1];

    if (i > 0 && j > 0 && tokenA !== undefined && tokenA === tokenB) {
      rawChunks.unshift({ type: 'unchanged', value: tokenA });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || getDP(i, j - 1) >= getDP(i - 1, j))) {
      rawChunks.unshift({ type: 'added', value: tokenB ?? '' });
      j--;
    } else if (i > 0 && (j === 0 || getDP(i, j - 1) < getDP(i - 1, j))) {
      rawChunks.unshift({ type: 'removed', value: tokenA ?? '' });
      i--;
    }
  }

  // 合并相邻相同类型的碎片分块以优化 DOM 渲染开销
  const mergedChunks: DiffChangeChunk[] = [];
  for (const chunk of rawChunks) {
    const last = mergedChunks[mergedChunks.length - 1];
    if (last && last.type === chunk.type) {
      last.value += chunk.value;
    } else {
      mergedChunks.push({ ...chunk });
    }
  }

  return mergedChunks;
}
