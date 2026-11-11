/**
 * 甘特图依赖防呆、DAG 拓扑判环快速失败与计划基线校验引擎 (GanttValidator)。
 *
 * 遵循 ADR-0050 规约第 4 节与第 5 节：
 * 1. 实时拦截自环（source === target）与回路（A ➔ B ➔ A）连线，杜绝排程死锁；
 * 2. 基于有向图轻量 DFS 遍历，毫秒级快速失败（Fail-Fast）拦截并保留回路诊断路径；
 * 3. 精准比对实际工期与计划基准工期，判断实际交付是否滞后延误。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import type {
  GanttDependencyLink,
  GanttValidationResult,
  GanttDelayStatus,
  GanttTaskRecord,
} from '../types';

export class GanttValidator {
  /**
   * 校验新增依赖连线是否合法（无自环、无回路）。
   *
   * @param existingLinks 当前已存在的依赖连线列表
   * @param newLink 拟新增的依赖连线
   * @returns 校验结果对象
   */
  static validateNewLink(
    existingLinks: GanttDependencyLink[],
    newLink: GanttDependencyLink,
  ): GanttValidationResult {
    const { sourceId, targetId } = newLink;

    // 1. 自环拦截
    if (sourceId === undefined || targetId === undefined) {
      return { valid: false, reason: 'invalid_id' };
    }

    if (String(sourceId) === String(targetId)) {
      return {
        valid: false,
        reason: 'self_dependency',
      };
    }

    // 2. 构建现有连线邻接表
    const adjMap = new Map<string | number, (string | number)[]>();
    for (const link of existingLinks) {
      if (!adjMap.has(link.sourceId)) {
        adjMap.set(link.sourceId, []);
      }
      adjMap.get(link.sourceId)!.push(link.targetId);
    }

    // 3. 从 newLink.targetId 出发进行 DFS 检索，检查是否能反向到达 newLink.sourceId
    // 若 targetId 能够到达 sourceId，则加入 sourceId -> targetId 边后必然形成环
    const visited = new Set<string | number>();
    const path: (string | number)[] = [targetId];

    const findPathToSource = (curr: string | number): boolean => {
      if (String(curr) === String(sourceId)) {
        return true;
      }

      visited.add(curr);
      const neighbors = adjMap.get(curr) ?? [];

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          path.push(neighbor);
          if (findPathToSource(neighbor)) {
            return true;
          }
          path.pop();
        }
      }

      return false;
    };

    if (findPathToSource(targetId)) {
      return {
        valid: false,
        reason: 'circular_dependency',
        cyclePath: [sourceId, ...path],
      };
    }

    return { valid: true };
  }

  /**
   * 对全量依赖连线数据集执行全局 DAG 判环检测（三色标记法）。
   *
   * @param links 全量依赖连线列表
   * @returns 校验结果
   */
  static validateAll(links: GanttDependencyLink[]): GanttValidationResult {
    if (!Array.isArray(links) || links.length === 0) {
      return { valid: true };
    }

    const adjMap = new Map<string | number, (string | number)[]>();
    const allNodes = new Set<string | number>();

    for (const link of links) {
      if (String(link.sourceId) === String(link.targetId)) {
        return { valid: false, reason: 'self_dependency' };
      }
      allNodes.add(link.sourceId);
      allNodes.add(link.targetId);

      if (!adjMap.has(link.sourceId)) {
        adjMap.set(link.sourceId, []);
      }
      adjMap.get(link.sourceId)!.push(link.targetId);
    }

    // 状态标记：0 = 未访问 (WHITE), 1 = 访问中 (GRAY), 2 = 已完成 (BLACK)
    const color = new Map<string | number, number>();
    for (const node of allNodes) {
      color.set(node, 0);
    }

    const dfs = (u: string | number): boolean => {
      color.set(u, 1);
      const neighbors = adjMap.get(u) ?? [];

      for (const v of neighbors) {
        const vColor = color.get(v) ?? 0;
        if (vColor === 1) {
          // 遇到回边，存在环
          return true;
        }
        if (vColor === 0) {
          if (dfs(v)) {
            return true;
          }
        }
      }

      color.set(u, 2);
      return false;
    };

    for (const node of allNodes) {
      if (color.get(node) === 0) {
        if (dfs(node)) {
          return { valid: false, reason: 'circular_dependency' };
        }
      }
    }

    return { valid: true };
  }

  /**
   * 校验任务实际工期相较于基准计划是否发生延误。
   *
   * @param task 待检测的任务实体
   * @returns 延误状态及延误自然日天数
   */
  static isTaskDelayed(task: GanttTaskRecord): GanttDelayStatus {
    const rawBaselineEnd =
      task.baseline?.endDate ?? (task.baselineEndDate as string | Date | undefined);

    if (!rawBaselineEnd || !task.endDate) {
      return { delayed: false, delayDays: 0 };
    }

    try {
      const bDate =
        typeof rawBaselineEnd === 'string'
          ? new Date(rawBaselineEnd.replace(/-/g, '/'))
          : rawBaselineEnd;
      const aDate =
        typeof task.endDate === 'string' ? new Date(task.endDate.replace(/-/g, '/')) : task.endDate;

      const bTime = new Date(bDate.getFullYear(), bDate.getMonth(), bDate.getDate()).getTime();
      const aTime = new Date(aDate.getFullYear(), aDate.getMonth(), aDate.getDate()).getTime();

      if (isNaN(bTime) || isNaN(aTime)) {
        return { delayed: false, delayDays: 0 };
      }

      if (aTime > bTime) {
        const diffDays = Math.round((aTime - bTime) / 86400000);
        return { delayed: true, delayDays: Math.max(1, diffDays) };
      }

      return { delayed: false, delayDays: 0 };
    } catch {
      return { delayed: false, delayDays: 0 };
    }
  }
}
