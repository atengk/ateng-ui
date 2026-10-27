/**
 * FlowValidator 流程拓扑静态校验引擎。
 *
 * 依据 ADR-0033 与工单 #166，纯原生 TypeScript 实现图论 5 大刚性拓扑规则：
 * 1. 起止节点存在性与唯一性（有且仅有 1 个开始节点，至少 1 个结束节点）；
 * 2. 节点度数与孤岛不可达连通性（非开始节点须有入度，非结束节点须有出度，从开始节点全图可达）；
 * 3. 排他网关分支数与条件配置（出度分支 ≥ 2，且所有连线须配置条件表达式 properties.condition 或标记为默认流）；
 * 4. 无出口死循环检测（准确识别无法到达结束节点的拓扑闭环死锁）；
 * 5. 连线防呆与图元完整性（悬空边、自环连线）。
 *
 * 恪守 L2 专用能力层规范：纯逻辑算法，零 UI 框架依赖，零 non-null 断言，跨平台安全。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { FlowNodeType } from '../presets';
import type { FlowGraph, FlowNode, FlowEdge } from '../types';

/**
 * 拓扑校验规则代号常量枚举。
 */
export const FlowValidationRuleCode = {
  /** 缺少开始节点 */
  START_NODE_MISSING: 'START_NODE_MISSING',
  /** 存在多个开始节点 */
  START_NODE_MULTIPLE: 'START_NODE_MULTIPLE',
  /** 缺少结束节点 */
  END_NODE_MISSING: 'END_NODE_MISSING',
  /** 节点缺少前驱入度 */
  NODE_NO_INCOMING: 'NODE_NO_INCOMING',
  /** 节点缺少后继出度 */
  NODE_NO_OUTGOING: 'NODE_NO_OUTGOING',
  /** 开始节点存在非法入度连线 */
  START_NODE_HAS_INCOMING: 'START_NODE_HAS_INCOMING',
  /** 结束节点存在非法出度连线 */
  END_NODE_HAS_OUTGOING: 'END_NODE_HAS_OUTGOING',
  /** 从开始节点不可达的孤岛节点 */
  NODE_UNREACHABLE_FROM_START: 'NODE_UNREACHABLE_FROM_START',
  /** 排他网关分支数不足（< 2） */
  GATEWAY_BRANCH_INSUFFICIENT: 'GATEWAY_BRANCH_INSUFFICIENT',
  /** 排他网关分支未配置条件且未标记为默认流 */
  GATEWAY_BRANCH_NO_CONDITION: 'GATEWAY_BRANCH_NO_CONDITION',
  /** 无出口死循环闭环死锁 */
  DEADLOCK_CYCLE: 'DEADLOCK_CYCLE',
  /** 悬空连线（源或目标节点不存在） */
  DANGLING_EDGE: 'DANGLING_EDGE',
  /** 自环连线（源与目标节点相同） */
  SELF_LOOP_EDGE: 'SELF_LOOP_EDGE',
} as const;

export type FlowValidationRuleCodeValue =
  (typeof FlowValidationRuleCode)[keyof typeof FlowValidationRuleCode];

/**
 * 校验诊断错误项实体契约。
 */
export interface FlowValidationError {
  /** 错误级别：'error' 阻塞发布/保存；'warning' 预警建议 */
  level: 'error' | 'warning';
  /** 规则代号 */
  code: string;
  /** 清晰人类可读的中文诊断错误描述 */
  message: string;
  /** 产生该校验异常的关联节点 ID 列表（用于在画布高亮该节点） */
  nodeIds?: string[];
  /** 产生该校验异常的关联连线 ID 列表（用于在画布高亮该连线） */
  edgeIds?: string[];
}

/**
 * 拓扑校验结果实体契约。
 */
export interface FlowValidationResult {
  /** 拓扑是否完全合法（当且仅当无 level: 'error' 时为 true） */
  valid: boolean;
  /** 错误与警告总清单 */
  errors: FlowValidationError[];
}

/**
 * 获取图元显示名称辅助函数。
 */
function getNodeName(node?: FlowNode): string {
  if (!node) return '';
  if (typeof node.text === 'string' && node.text.trim()) {
    return node.text;
  }
  if (node.text && typeof node.text === 'object' && node.text.value) {
    return node.text.value;
  }
  if (node.properties?.name && typeof node.properties.name === 'string') {
    return node.properties.name;
  }
  return node.id;
}

/**
 * 判断是否为开始节点。
 */
function isStartNode(node: FlowNode): boolean {
  return node.type === FlowNodeType.START || node.type === 'start' || node.type === 'flow:start';
}

/**
 * 判断是否为结束节点。
 */
function isEndNode(node: FlowNode): boolean {
  return node.type === FlowNodeType.END || node.type === 'end' || node.type === 'flow:end';
}

/**
 * 判断是否为排他条件网关。
 */
function isExclusiveGateway(node: FlowNode): boolean {
  return (
    node.type === FlowNodeType.EXCLUSIVE_GATEWAY ||
    node.type === 'exclusive-gateway' ||
    node.type === 'flow:exclusive-gateway'
  );
}

/**
 * FlowValidator 流程拓扑静态校验器实现。
 */
export class FlowValidator {
  /**
   * 对流程图执行全维图论静态拓扑校验。
   *
   * @param graph 待校验的流程图全量数据
   * @returns 校验结果实体 FlowValidationResult
   */
  static validate(graph: FlowGraph): FlowValidationResult {
    const errors: FlowValidationError[] = [];
    const nodes = graph?.nodes ?? [];
    const edges = graph?.edges ?? [];

    const nodeMap = new Map<string, FlowNode>();
    for (const node of nodes) {
      nodeMap.set(node.id, node);
    }

    // 1. 过滤悬空边与自环连线（规则 5）
    const validEdges = this.checkDanglingAndSelfLoops(edges, nodeMap, errors);

    // 2. 起止节点存在性与唯一性校验（规则 1）
    const { startNodes, endNodes } = this.checkStartAndEndNodes(nodes, errors);

    // 构建出入度邻接表
    const incomingEdges = new Map<string, FlowEdge[]>();
    const outgoingEdges = new Map<string, FlowEdge[]>();
    for (const node of nodes) {
      incomingEdges.set(node.id, []);
      outgoingEdges.set(node.id, []);
    }
    for (const edge of validEdges) {
      outgoingEdges.get(edge.sourceNodeId)?.push(edge);
      incomingEdges.get(edge.targetNodeId)?.push(edge);
    }

    // 3. 节点出入度与前向孤岛可达性校验（规则 2）
    this.checkNodeDegreesAndReachability(
      nodes,
      startNodes,
      endNodes,
      incomingEdges,
      outgoingEdges,
      errors,
    );

    // 4. 排他网关分支与条件表达式校验（规则 3）
    this.checkExclusiveGateways(nodes, outgoingEdges, errors);

    // 5. 无出口死循环闭环死锁检测（规则 4）
    this.checkDeadlockCycles(nodes, endNodes, nodeMap, incomingEdges, outgoingEdges, errors);

    const hasBlockingError = errors.some(e => e.level === 'error');
    return {
      valid: !hasBlockingError,
      errors,
    };
  }

  /**
   * 判断校验结果是否存在阻断性错误。
   */
  static hasErrors(result: FlowValidationResult): boolean {
    return result.errors.some(e => e.level === 'error');
  }

  /**
   * 规则 5：检查悬空边与自环连线。
   */
  private static checkDanglingAndSelfLoops(
    edges: FlowEdge[],
    nodeMap: Map<string, FlowNode>,
    errors: FlowValidationError[],
  ): FlowEdge[] {
    const validEdges: FlowEdge[] = [];

    for (const edge of edges) {
      const srcNode = nodeMap.get(edge.sourceNodeId);
      const targetNode = nodeMap.get(edge.targetNodeId);

      if (!srcNode || !targetNode) {
        errors.push({
          level: 'error',
          code: FlowValidationRuleCode.DANGLING_EDGE,
          message: `连线 [${edge.id}] 关联的源节点或目标节点在图中不存在`,
          edgeIds: [edge.id],
        });
        continue;
      }

      if (edge.sourceNodeId === edge.targetNodeId) {
        errors.push({
          level: 'error',
          code: FlowValidationRuleCode.SELF_LOOP_EDGE,
          message: `节点 [${getNodeName(srcNode)}] 存在指向自身的自环连线 [${edge.id}]`,
          nodeIds: [edge.sourceNodeId],
          edgeIds: [edge.id],
        });
        continue;
      }

      validEdges.push(edge);
    }

    return validEdges;
  }

  /**
   * 规则 1：检查起止节点的唯一性与存在性。
   */
  private static checkStartAndEndNodes(
    nodes: FlowNode[],
    errors: FlowValidationError[],
  ): { startNodes: FlowNode[]; endNodes: FlowNode[] } {
    const startNodes = nodes.filter(isStartNode);
    const endNodes = nodes.filter(isEndNode);

    if (startNodes.length === 0) {
      errors.push({
        level: 'error',
        code: FlowValidationRuleCode.START_NODE_MISSING,
        message: '流程中缺少开始节点，必须有且仅有 1 个开始节点',
        nodeIds: [],
      });
    } else if (startNodes.length > 1) {
      errors.push({
        level: 'error',
        code: FlowValidationRuleCode.START_NODE_MULTIPLE,
        message: `流程中存在多个开始节点（当前为 ${startNodes.length} 个），必须有且仅有 1 个开始节点`,
        nodeIds: startNodes.map(n => n.id),
      });
    }

    if (endNodes.length === 0) {
      errors.push({
        level: 'error',
        code: FlowValidationRuleCode.END_NODE_MISSING,
        message: '流程中缺少结束节点，至少需要 1 个结束节点',
        nodeIds: [],
      });
    }

    return { startNodes, endNodes };
  }

  /**
   * 规则 2：检查节点出入度及孤岛可达性。
   */
  private static checkNodeDegreesAndReachability(
    nodes: FlowNode[],
    startNodes: FlowNode[],
    endNodes: FlowNode[],
    incomingEdges: Map<string, FlowEdge[]>,
    outgoingEdges: Map<string, FlowEdge[]>,
    errors: FlowValidationError[],
  ): void {
    // 2.1 开始节点禁止入度
    for (const startNode of startNodes) {
      const inEdges = incomingEdges.get(startNode.id) ?? [];
      if (inEdges.length > 0) {
        errors.push({
          level: 'error',
          code: FlowValidationRuleCode.START_NODE_HAS_INCOMING,
          message: `开始节点 [${getNodeName(startNode)}] 不能有前驱入度连线`,
          nodeIds: [startNode.id],
          edgeIds: inEdges.map(e => e.id),
        });
      }
    }

    // 2.2 结束节点禁止出度
    for (const endNode of endNodes) {
      const outEdges = outgoingEdges.get(endNode.id) ?? [];
      if (outEdges.length > 0) {
        errors.push({
          level: 'error',
          code: FlowValidationRuleCode.END_NODE_HAS_OUTGOING,
          message: `结束节点 [${getNodeName(endNode)}] 不能有后继出度连线`,
          nodeIds: [endNode.id],
          edgeIds: outEdges.map(e => e.id),
        });
      }
    }

    // 2.3 非开始节点必须有前驱入度
    for (const node of nodes) {
      if (isStartNode(node)) continue;
      const inEdges = incomingEdges.get(node.id) ?? [];
      if (inEdges.length === 0) {
        errors.push({
          level: 'error',
          code: FlowValidationRuleCode.NODE_NO_INCOMING,
          message: `节点 [${getNodeName(node)}] 没有前驱入度连线，无法触发执行`,
          nodeIds: [node.id],
        });
      }
    }

    // 2.4 非结束节点必须有后继出度
    for (const node of nodes) {
      if (isEndNode(node)) continue;
      const outEdges = outgoingEdges.get(node.id) ?? [];
      if (outEdges.length === 0) {
        errors.push({
          level: 'error',
          code: FlowValidationRuleCode.NODE_NO_OUTGOING,
          message: `节点 [${getNodeName(node)}] 没有后继出度连线，流程在此悬空中断`,
          nodeIds: [node.id],
        });
      }
    }

    // 2.5 从开始节点前向 BFS 可达性检测
    if (startNodes.length === 1) {
      const singleStart = startNodes[0];
      if (!singleStart) return;

      const reachableFromStart = new Set<string>();
      const queue: string[] = [singleStart.id];
      reachableFromStart.add(singleStart.id);

      while (queue.length > 0) {
        const currId = queue.shift();
        if (!currId) continue;

        const outEdges = outgoingEdges.get(currId) ?? [];
        for (const edge of outEdges) {
          if (!reachableFromStart.has(edge.targetNodeId)) {
            reachableFromStart.add(edge.targetNodeId);
            queue.push(edge.targetNodeId);
          }
        }
      }

      // 仅标记有连线但整体从开始节点不可达的孤岛子图（避免与入度为0重复报错）
      const islandNodes = nodes.filter(
        n => !reachableFromStart.has(n.id) && (incomingEdges.get(n.id)?.length ?? 0) > 0,
      );
      if (islandNodes.length > 0) {
        errors.push({
          level: 'error',
          code: FlowValidationRuleCode.NODE_UNREACHABLE_FROM_START,
          message: `检测到 ${islandNodes.length} 个孤岛节点无法从开始节点到达: [${islandNodes.map(getNodeName).join(', ')}]`,
          nodeIds: islandNodes.map(n => n.id),
        });
      }
    }
  }

  /**
   * 规则 3：排他网关分支数与流转条件校验。
   */
  private static checkExclusiveGateways(
    nodes: FlowNode[],
    outgoingEdges: Map<string, FlowEdge[]>,
    errors: FlowValidationError[],
  ): void {
    for (const node of nodes) {
      if (!isExclusiveGateway(node)) continue;
      const outEdges = outgoingEdges.get(node.id) ?? [];

      if (outEdges.length < 2) {
        errors.push({
          level: 'error',
          code: FlowValidationRuleCode.GATEWAY_BRANCH_INSUFFICIENT,
          message: `排他网关 [${getNodeName(node)}] 出度分支数量必须 ≥ 2（当前为 ${outEdges.length} 条）`,
          nodeIds: [node.id],
        });
      }

      for (const edge of outEdges) {
        const hasCondition = Boolean(
          edge.properties?.condition && String(edge.properties.condition).trim() !== '',
        );
        const isDefault = Boolean(edge.properties?.isDefault || edge.properties?.default);

        if (!hasCondition && !isDefault) {
          errors.push({
            level: 'error',
            code: FlowValidationRuleCode.GATEWAY_BRANCH_NO_CONDITION,
            message: `排他网关 [${getNodeName(node)}] 的连线分支 [${edge.id}] 未配置流转条件表达式，也未标记为默认流`,
            nodeIds: [node.id],
            edgeIds: [edge.id],
          });
        }
      }
    }
  }

  /**
   * 规则 4：无出口死循环检测。
   */
  private static checkDeadlockCycles(
    nodes: FlowNode[],
    endNodes: FlowNode[],
    nodeMap: Map<string, FlowNode>,
    incomingEdges: Map<string, FlowEdge[]>,
    outgoingEdges: Map<string, FlowEdge[]>,
    errors: FlowValidationError[],
  ): void {
    // 4.1 反向 BFS：找出全图中能够到达至少一个结束节点的所有节点集合
    const canReachEnd = new Set<string>();
    if (endNodes.length > 0) {
      const revQueue: string[] = [];
      for (const endNode of endNodes) {
        canReachEnd.add(endNode.id);
        revQueue.push(endNode.id);
      }
      while (revQueue.length > 0) {
        const currId = revQueue.shift();
        if (!currId) continue;

        const inEdges = incomingEdges.get(currId) ?? [];
        for (const inEdge of inEdges) {
          if (!canReachEnd.has(inEdge.sourceNodeId)) {
            canReachEnd.add(inEdge.sourceNodeId);
            revQueue.push(inEdge.sourceNodeId);
          }
        }
      }
    }

    // 4.2 在无法到达结束节点的节点集合中，通过 DFS 检测闭环（死锁环）
    const cannotReachSet = new Set(nodes.filter(n => !canReachEnd.has(n.id)).map(n => n.id));
    const visitedState = new Map<string, number>(); // 0: unvisited, 1: visiting (in stack), 2: finished
    const deadlockCycles: string[][] = [];

    const dfsFindCycle = (currId: string, path: string[]) => {
      visitedState.set(currId, 1);
      path.push(currId);

      const outEdges = outgoingEdges.get(currId) ?? [];
      for (const edge of outEdges) {
        const targetId = edge.targetNodeId;
        if (!cannotReachSet.has(targetId)) continue;

        const state = visitedState.get(targetId) ?? 0;
        if (state === 1) {
          const cycleStartIndex = path.indexOf(targetId);
          if (cycleStartIndex !== -1) {
            deadlockCycles.push(path.slice(cycleStartIndex));
          }
        } else if (state === 0) {
          dfsFindCycle(targetId, path);
        }
      }

      path.pop();
      visitedState.set(currId, 2);
    };

    for (const nodeId of cannotReachSet) {
      if ((visitedState.get(nodeId) ?? 0) === 0) {
        dfsFindCycle(nodeId, []);
      }
    }

    // 闭环结果去重合并并报错（精准比对集合完全一致的死循环）
    const reportedSets: Array<Set<string>> = [];
    for (const cycle of deadlockCycles) {
      const cycleSet = new Set(cycle);
      const isDuplicate = reportedSets.some(
        set => set.size === cycleSet.size && cycle.every(id => set.has(id)),
      );
      if (isDuplicate) continue;
      reportedSets.push(cycleSet);

      const cycleNames = cycle.map(id => {
        const node = nodeMap.get(id);
        return node ? getNodeName(node) : id;
      });

      errors.push({
        level: 'error',
        code: FlowValidationRuleCode.DEADLOCK_CYCLE,
        message: `检测到流程拓扑存在无出口死循环闭环: [${cycleNames.join(' -> ')} -> ${cycleNames[0]}]`,
        nodeIds: cycle,
      });
    }
  }
}
