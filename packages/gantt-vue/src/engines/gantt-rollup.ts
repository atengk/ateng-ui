/**
 * WBS 父子任务联动与自底向上工期/进度推断汇总算法引擎 (GanttRollup)。
 *
 * 遵循 ADR-0050 规约第 3 节：
 * 1. 工期范围自底向上聚合：父任务 startDate 取子任务 min(startDate)，endDate 取 max(endDate)；
 * 2. 进度依据工期加权计算：Progress = ∑(Duration_i * Progress_i) / ∑(Duration_i)；
 * 3. 递归后序遍历，支持无限层级 WBS 树多级逐层精确汇总；
 * 4. 支持 enabled: false 快速逃生。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import type { GanttTaskRecord } from '../types';

export interface GanttRollupOptions {
  /** 是否启用 rollup 自动推算，默认 true */
  enabled?: boolean;
  /** 嵌套子任务列表字段名，默认 'children' */
  childrenField?: string;
}

export class GanttRollup {
  private readonly enabled: boolean;
  private readonly childrenField: string;

  constructor(options: GanttRollupOptions = {}) {
    this.enabled = options.enabled !== false;
    this.childrenField = options.childrenField ?? 'children';
  }

  /**
   * 计算两日期之间的有效工期天数。
   * 同一天算 1 天；若结束日期早于开始日期则保底为 1。
   *
   * @param startDate 开始日期（格式 'YYYY-MM-DD' 或 Date）
   * @param endDate 结束日期（格式 'YYYY-MM-DD' 或 Date）
   * @returns 工期自然日天数（>= 1）
   */
  static calculateDuration(startDate?: string | Date, endDate?: string | Date): number {
    if (!startDate || !endDate) {
      return 1;
    }

    try {
      const s = typeof startDate === 'string' ? new Date(startDate.replace(/-/g, '/')) : startDate;
      const e = typeof endDate === 'string' ? new Date(endDate.replace(/-/g, '/')) : endDate;

      const sTime = new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime();
      const eTime = new Date(e.getFullYear(), e.getMonth(), e.getDate()).getTime();

      if (isNaN(sTime) || isNaN(eTime)) {
        return 1;
      }

      if (eTime < sTime) {
        return 1;
      }

      const diffMs = eTime - sTime;
      const days = Math.round(diffMs / 86400000) + 1;
      return Math.max(1, days);
    } catch {
      return 1;
    }
  }

  /**
   * 将 Date 或日期字符串统一格式化为 'YYYY-MM-DD'。
   */
  static formatDate(date: string | Date): string {
    if (typeof date === 'string') {
      // 若已经是 YYYY-MM-DD 形式直接返回
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
      }
    }
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) {
      return '';
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /**
   * 递归自底向上汇总整棵树节点的工期范围与加权完成进度。
   *
   * @param tree 任务树形数组
   * @returns 汇总更新后的全新任务树形数组
   */
  rollupTree<T extends GanttTaskRecord = GanttTaskRecord>(tree: T[]): T[] {
    if (!Array.isArray(tree) || tree.length === 0) {
      return [];
    }

    // 若禁用 rollup，执行纯浅克隆并保留原始数据
    if (!this.enabled) {
      return this.cloneTree(tree);
    }

    const childrenField = this.childrenField;

    // 后序递归遍历计算函数
    const processNode = (node: T): T => {
      const children = (node as Record<string, unknown>)[childrenField] as T[] | undefined;

      // 叶子节点无子项，原样返回（标准化日期）
      if (!Array.isArray(children) || children.length === 0) {
        return { ...node };
      }

      // 1. 先递归处理所有子任务（自底向上）
      const processedChildren = children.map(child => processNode(child));

      // 2. 聚合子任务的工期与加权进度
      let minStartTime = Infinity;
      let maxEndTime = -Infinity;
      let minStartDateStr = '';
      let maxEndDateStr = '';

      let totalWeightedProgress = 0;
      let totalDurationWeight = 0;
      let validChildCount = 0;
      let simpleProgressSum = 0;

      for (const child of processedChildren) {
        if (!child.startDate || !child.endDate) {
          continue;
        }

        const sTime = new Date(String(child.startDate).replace(/-/g, '/')).getTime();
        const eTime = new Date(String(child.endDate).replace(/-/g, '/')).getTime();

        if (isNaN(sTime) || isNaN(eTime)) {
          continue;
        }

        if (sTime < minStartTime) {
          minStartTime = sTime;
          minStartDateStr = GanttRollup.formatDate(child.startDate);
        }

        if (eTime > maxEndTime) {
          maxEndTime = eTime;
          maxEndDateStr = GanttRollup.formatDate(child.endDate);
        }

        const childDuration = GanttRollup.calculateDuration(child.startDate, child.endDate);
        const childProgress =
          typeof child.progress === 'number' ? Math.max(0, Math.min(100, child.progress)) : 0;

        totalWeightedProgress += childDuration * childProgress;
        totalDurationWeight += childDuration;
        simpleProgressSum += childProgress;
        validChildCount++;
      }

      // 3. 计算父节点的汇总指标
      let calculatedProgress = node.progress ?? 0;
      if (totalDurationWeight > 0) {
        calculatedProgress = Math.round(totalWeightedProgress / totalDurationWeight);
      } else if (validChildCount > 0) {
        calculatedProgress = Math.round(simpleProgressSum / validChildCount);
      }

      const mergedNode = {
        ...node,
        startDate: minStartDateStr || node.startDate,
        endDate: maxEndDateStr || node.endDate,
        progress: calculatedProgress,
        [childrenField]: processedChildren,
      };

      return mergedNode;
    };

    return tree.map(rootNode => processNode(rootNode));
  }

  /**
   * 纯克隆树结构。
   */
  private cloneTree<T extends GanttTaskRecord = GanttTaskRecord>(tree: T[]): T[] {
    return tree.map(node => {
      const clone = { ...node };
      const children = (clone as Record<string, unknown>)[this.childrenField] as T[] | undefined;
      if (Array.isArray(children) && children.length > 0) {
        (clone as Record<string, unknown>)[this.childrenField] = this.cloneTree(children);
      }
      return clone;
    });
  }
}
