/**
 * AutoLayoutEngine 流程图 DAG 自动分层排版引擎。
 *
 * 基于有向无环图（DAG）分层算法，自动计算节点拓扑层级（Rank）与坐标间距，
 * 支持从左到右（LR）与从上到下（TB）规整排版，连线折点自适应更新。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import type LogicFlow from '@logicflow/core';
import type { FlowGraph, FlowNode, FlowEdge } from '../types';

/**
 * 自动排版方向：'LR' 为从左到右水平流动，'TB' 为从上到下垂直流动。
 */
export type LayoutDirection = 'LR' | 'TB';

/**
 * AutoLayoutEngine 排版配置选项。
 */
export interface AutoLayoutOptions {
  /** 排版流动方向（默认 'LR'） */
  direction?: LayoutDirection;
  /** 同层级（兄弟节点）之间的间距像素值（默认 110） */
  nodeSep?: number;
  /** 跨层级（父子节点）之间的间距像素值（默认 200） */
  rankSep?: number;
  /** 根节点的起始 X 坐标（默认 120） */
  startX?: number;
  /** 根节点的起始 Y 坐标（默认 200） */
  startY?: number;
}

/**
 * AutoLayoutEngine 流程图自动排版算法实现。
 */
export class AutoLayoutEngine {
  /**
   * 对指定的 FlowGraph 拓扑图执行 DAG 分层自动排版。
   *
   * @param graph 原始流程图数据
   * @param options 排版选项
   * @returns 重新规整排版后的全新 FlowGraph 副本
   */
  public static layout(graph: FlowGraph, options: AutoLayoutOptions = {}): FlowGraph {
    const { direction = 'LR', nodeSep = 110, rankSep = 200, startX = 120, startY = 200 } = options;

    if (!graph.nodes || graph.nodes.length === 0) {
      return { nodes: [], edges: graph.edges ? [...graph.edges] : [] };
    }

    // 1. 深拷贝节点与连线，确保纯函数无副作用
    const clonedNodes: FlowNode[] = graph.nodes.map(node => ({
      ...node,
      properties: { ...(node.properties ?? {}) },
      text: typeof node.text === 'object' && node.text !== null ? { ...node.text } : node.text,
    }));

    const clonedEdges: FlowEdge[] = (graph.edges ?? []).map(edge => ({
      ...edge,
      // 清空旧折点与锚点，由 LogicFlow 正交路由自适应重算
      startPoint: undefined,
      endPoint: undefined,
      pointsList: undefined,
      properties: { ...(edge.properties ?? {}) },
      text: typeof edge.text === 'object' && edge.text !== null ? { ...edge.text } : edge.text,
    }));

    const nodeMap = new Map<string, FlowNode>();
    for (const node of clonedNodes) {
      nodeMap.set(node.id, node);
    }

    // 2. 构建邻接表与入度表
    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    for (const node of clonedNodes) {
      adj.set(node.id, []);
      inDegree.set(node.id, 0);
    }

    for (const edge of clonedEdges) {
      if (nodeMap.has(edge.sourceNodeId) && nodeMap.has(edge.targetNodeId)) {
        adj.get(edge.sourceNodeId)?.push(edge.targetNodeId);
        inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) || 0) + 1);
      }
    }

    // 3. 循环环路检测与破环（DFS 染色法：0 未访问，1 访问中，2 已完成）
    const visited = new Map<string, number>();
    for (const node of clonedNodes) {
      visited.set(node.id, 0);
    }

    const dagAdj = new Map<string, string[]>();
    for (const node of clonedNodes) {
      dagAdj.set(node.id, []);
    }

    const dfs = (u: string) => {
      visited.set(u, 1);
      const neighbors = adj.get(u) || [];
      for (const v of neighbors) {
        if (visited.get(v) === 1) {
          // 发现回边（Back-edge），破环以避免死循环
          continue;
        }
        dagAdj.get(u)?.push(v);
        if (visited.get(v) === 0) {
          dfs(v);
        }
      }
      visited.set(u, 2);
    };

    for (const node of clonedNodes) {
      if (visited.get(node.id) === 0) {
        dfs(node.id);
      }
    }

    // 4. 重算破环后的入度并寻找根节点集合
    const dagInDegree = new Map<string, number>();
    for (const node of clonedNodes) {
      dagInDegree.set(node.id, 0);
    }

    for (const [, targets] of dagAdj.entries()) {
      for (const v of targets) {
        dagInDegree.set(v, (dagInDegree.get(v) || 0) + 1);
      }
    }

    const roots: string[] = [];
    for (const node of clonedNodes) {
      if (dagInDegree.get(node.id) === 0) {
        roots.push(node.id);
      }
    }

    // 若无明确入度为 0 的节点（如全孤岛或全环退化），保底以首节点为根
    const fallbackNode = clonedNodes[0];
    if (roots.length === 0 && fallbackNode) {
      roots.push(fallbackNode.id);
    }

    // 5. 最长路径分层（Longest Path Layering）计算每个节点的 Rank
    const ranks = new Map<string, number>();
    const queue: Array<{ id: string; rank: number }> = roots.map(id => ({ id, rank: 0 }));

    for (const r of roots) {
      ranks.set(r, 0);
    }

    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      const { id, rank } = item;
      const nextRank = rank + 1;
      const targets = dagAdj.get(id) || [];

      for (const targetId of targets) {
        const curTargetRank = ranks.get(targetId) ?? -1;
        if (nextRank > curTargetRank) {
          ranks.set(targetId, nextRank);
          queue.push({ id: targetId, rank: nextRank });
        }
      }
    }

    // 对未被连通遍历到的孤岛节点兜底赋予 rank 0
    for (const node of clonedNodes) {
      if (!ranks.has(node.id)) {
        ranks.set(node.id, 0);
      }
    }

    // 6. 按 Rank 分组
    const levels = new Map<number, FlowNode[]>();
    for (const node of clonedNodes) {
      const rank = ranks.get(node.id) ?? 0;
      if (!levels.has(rank)) {
        levels.set(rank, []);
      }
      levels.get(rank)?.push(node);
    }

    // 7. 同层节点排序（保持相对初始几何顺序，最大程度减少连线交叉）
    const sortedRanks = Array.from(levels.keys()).sort((a, b) => a - b);
    for (const rank of sortedRanks) {
      const nodeList = levels.get(rank) ?? [];
      nodeList.sort((a, b) => {
        if (direction === 'LR') {
          return a.y - b.y;
        }
        return a.x - b.x;
      });
    }

    // 8. 坐标几何赋值计算
    for (const rank of sortedRanks) {
      const nodeList = levels.get(rank) ?? [];
      const count = nodeList.length;

      nodeList.forEach((node, index) => {
        const centerOffset = (index - (count - 1) / 2) * nodeSep;

        if (direction === 'LR') {
          node.x = Math.round(startX + rank * rankSep);
          node.y = Math.round(startY + centerOffset);
        } else {
          node.x = Math.round(startX + centerOffset);
          node.y = Math.round(startY + rank * rankSep);
        }

        // 同步更新 text 坐标对象（若存在）
        if (typeof node.text === 'object' && node.text !== null) {
          node.text.x = node.x;
          node.text.y = node.y;
        }
      });
    }

    return {
      nodes: clonedNodes,
      edges: clonedEdges,
    };
  }
}

/**
 * 自动排版平滑过渡动画选项。
 */
export interface LayoutAnimationOptions {
  /** 动画持续毫秒数（默认 250ms） */
  duration?: number;
  /** 动画完成回调 */
  onComplete?: () => void;
}

/**
 * 平滑过渡动画驱动节点移动至自动排版后的目标坐标。
 *
 * @param lf LogicFlow 画布实例
 * @param targetGraph 目标排版图数据
 * @param options 动画配置
 */
export function animateLayout(
  lf: LogicFlow,
  targetGraph: FlowGraph,
  options?: LayoutAnimationOptions,
): void {
  const duration = options?.duration ?? 250;
  if (
    duration <= 0 ||
    typeof requestAnimationFrame === 'undefined' ||
    typeof performance === 'undefined'
  ) {
    lf.render(targetGraph as unknown as LogicFlow.GraphConfigData);
    options?.onComplete?.();
    return;
  }

  const startPositions = new Map<string, { x: number; y: number }>();
  for (const node of targetGraph.nodes) {
    const model = lf.graphModel?.getNodeModelById(node.id);
    if (model) {
      startPositions.set(node.id, { x: model.x, y: model.y });
    }
  }

  const startTime = performance.now();

  const step = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // 三次缓动曲线 easeInOutCubic
    const ease =
      progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    for (const node of targetGraph.nodes) {
      const start = startPositions.get(node.id);
      if (start && lf.graphModel?.moveNode2Coordinate) {
        const curX = start.x + (node.x - start.x) * ease;
        const curY = start.y + (node.y - start.y) * ease;
        lf.graphModel.moveNode2Coordinate(node.id, Math.round(curX), Math.round(curY));
      }
    }

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      // 动画结束最终渲染同步，保障连线折点与文本 100% 精确
      lf.render(targetGraph as unknown as LogicFlow.GraphConfigData);
      options?.onComplete?.();
    }
  };

  requestAnimationFrame(step);
}
