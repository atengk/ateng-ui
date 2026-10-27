/**
 * FlowValidator 流程拓扑静态校验引擎单元测试。
 *
 * 依据 ADR-0033 与工单 #166，对 5 大图论规则及组合边界用例实施 100% 覆盖。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { describe, it, expect } from 'vitest';
import { FlowValidator, FlowValidationRuleCode } from '../src/validator';
import { FlowNodeType } from '../src/presets';
import type { FlowGraph } from '../src/types';

describe('FlowValidator 流程拓扑静态校验引擎', () => {
  // 规则 1：起止节点唯一性与存在性
  describe('规则 1：起止节点存在性与唯一性', () => {
    it('缺少开始节点时应该报错 START_NODE_MISSING', () => {
      const graph: FlowGraph = {
        nodes: [
          { id: 'task-1', type: FlowNodeType.USER_TASK, x: 200, y: 100, text: '审批' },
          { id: 'end-1', type: FlowNodeType.END, x: 400, y: 100, text: '结束' },
        ],
        edges: [{ id: 'e-1', type: 'polyline', sourceNodeId: 'task-1', targetNodeId: 'end-1' }],
      };

      const result = FlowValidator.validate(graph);
      expect(result.valid).toBe(false);
      const err = result.errors.find(e => e.code === FlowValidationRuleCode.START_NODE_MISSING);
      expect(err).toBeDefined();
      expect(err?.level).toBe('error');
      expect(err?.message).toContain('缺少开始节点');
    });

    it('存在多个开始节点时应该报错 START_NODE_MULTIPLE 并标记所有开始节点', () => {
      const graph: FlowGraph = {
        nodes: [
          { id: 'start-1', type: FlowNodeType.START, x: 100, y: 100, text: '开始1' },
          { id: 'start-2', type: 'start', x: 100, y: 200, text: '开始2' },
          { id: 'end-1', type: FlowNodeType.END, x: 400, y: 100, text: '结束' },
        ],
        edges: [],
      };

      const result = FlowValidator.validate(graph);
      expect(result.valid).toBe(false);
      const err = result.errors.find(e => e.code === FlowValidationRuleCode.START_NODE_MULTIPLE);
      expect(err).toBeDefined();
      expect(err?.nodeIds).toEqual(['start-1', 'start-2']);
    });

    it('缺少结束节点时应该报错 END_NODE_MISSING', () => {
      const graph: FlowGraph = {
        nodes: [
          { id: 'start-1', type: FlowNodeType.START, x: 100, y: 100, text: '开始' },
          { id: 'task-1', type: FlowNodeType.USER_TASK, x: 300, y: 100, text: '审批' },
        ],
        edges: [{ id: 'e-1', type: 'polyline', sourceNodeId: 'start-1', targetNodeId: 'task-1' }],
      };

      const result = FlowValidator.validate(graph);
      expect(result.valid).toBe(false);
      const err = result.errors.find(e => e.code === FlowValidationRuleCode.END_NODE_MISSING);
      expect(err).toBeDefined();
      expect(err?.message).toContain('缺少结束节点');
    });
  });

  // 规则 2：出入度与孤岛连通性
  describe('规则 2：出入度与孤岛连通性检测', () => {
    it('非开始节点没有入度时应该报错 NODE_NO_INCOMING', () => {
      const graph: FlowGraph = {
        nodes: [
          { id: 'start-1', type: FlowNodeType.START, x: 100, y: 100, text: '开始' },
          { id: 'task-1', type: FlowNodeType.USER_TASK, x: 300, y: 100, text: '悬空审批' },
          { id: 'end-1', type: FlowNodeType.END, x: 500, y: 100, text: '结束' },
        ],
        edges: [{ id: 'e-1', type: 'polyline', sourceNodeId: 'start-1', targetNodeId: 'end-1' }],
      };

      const result = FlowValidator.validate(graph);
      expect(result.valid).toBe(false);
      const err = result.errors.find(
        e => e.code === FlowValidationRuleCode.NODE_NO_INCOMING && e.nodeIds?.includes('task-1'),
      );
      expect(err).toBeDefined();
      expect(err?.message).toContain('没有前驱入度连线');
    });

    it('非结束节点没有出度时应该报错 NODE_NO_OUTGOING', () => {
      const graph: FlowGraph = {
        nodes: [
          { id: 'start-1', type: FlowNodeType.START, x: 100, y: 100, text: '开始' },
          { id: 'task-1', type: FlowNodeType.USER_TASK, x: 300, y: 100, text: '断头审批' },
          { id: 'end-1', type: FlowNodeType.END, x: 500, y: 100, text: '结束' },
        ],
        edges: [{ id: 'e-1', type: 'polyline', sourceNodeId: 'start-1', targetNodeId: 'task-1' }],
      };

      const result = FlowValidator.validate(graph);
      expect(result.valid).toBe(false);
      const err = result.errors.find(
        e => e.code === FlowValidationRuleCode.NODE_NO_OUTGOING && e.nodeIds?.includes('task-1'),
      );
      expect(err).toBeDefined();
      expect(err?.message).toContain('没有后继出度连线');
    });

    it('开始节点不能有前驱入度连线 START_NODE_HAS_INCOMING', () => {
      const graph: FlowGraph = {
        nodes: [
          { id: 'start-1', type: FlowNodeType.START, x: 100, y: 100, text: '开始' },
          { id: 'task-1', type: FlowNodeType.USER_TASK, x: 300, y: 100, text: '审批' },
          { id: 'end-1', type: FlowNodeType.END, x: 500, y: 100, text: '结束' },
        ],
        edges: [
          { id: 'e-1', type: 'polyline', sourceNodeId: 'start-1', targetNodeId: 'task-1' },
          { id: 'e-2', type: 'polyline', sourceNodeId: 'task-1', targetNodeId: 'end-1' },
          { id: 'e-err', type: 'polyline', sourceNodeId: 'task-1', targetNodeId: 'start-1' },
        ],
      };

      const result = FlowValidator.validate(graph);
      expect(result.valid).toBe(false);
      const err = result.errors.find(
        e => e.code === FlowValidationRuleCode.START_NODE_HAS_INCOMING,
      );
      expect(err).toBeDefined();
      expect(err?.nodeIds).toContain('start-1');
    });

    it('结束节点不能有后继出度连线 END_NODE_HAS_OUTGOING', () => {
      const graph: FlowGraph = {
        nodes: [
          { id: 'start-1', type: FlowNodeType.START, x: 100, y: 100, text: '开始' },
          { id: 'end-1', type: FlowNodeType.END, x: 300, y: 100, text: '结束' },
          { id: 'task-1', type: FlowNodeType.USER_TASK, x: 500, y: 100, text: '后续任务' },
        ],
        edges: [
          { id: 'e-1', type: 'polyline', sourceNodeId: 'start-1', targetNodeId: 'end-1' },
          { id: 'e-err', type: 'polyline', sourceNodeId: 'end-1', targetNodeId: 'task-1' },
        ],
      };

      const result = FlowValidator.validate(graph);
      expect(result.valid).toBe(false);
      const err = result.errors.find(e => e.code === FlowValidationRuleCode.END_NODE_HAS_OUTGOING);
      expect(err).toBeDefined();
      expect(err?.nodeIds).toContain('end-1');
    });

    it('检测孤岛不可达节点 NODE_UNREACHABLE_FROM_START', () => {
      // 孤岛互连子图（自身有出入度，但从 Start 无法到达）
      const graph: FlowGraph = {
        nodes: [
          { id: 'start-1', type: FlowNodeType.START, x: 100, y: 100, text: '开始' },
          { id: 'end-1', type: FlowNodeType.END, x: 300, y: 100, text: '结束' },
          { id: 'island-1', type: FlowNodeType.USER_TASK, x: 100, y: 300, text: '孤岛1' },
          { id: 'island-2', type: FlowNodeType.USER_TASK, x: 300, y: 300, text: '孤岛2' },
        ],
        edges: [
          { id: 'e-main', type: 'polyline', sourceNodeId: 'start-1', targetNodeId: 'end-1' },
          { id: 'e-iso1', type: 'polyline', sourceNodeId: 'island-1', targetNodeId: 'island-2' },
          { id: 'e-iso2', type: 'polyline', sourceNodeId: 'island-2', targetNodeId: 'island-1' },
        ],
      };

      const result = FlowValidator.validate(graph);
      expect(result.valid).toBe(false);
      const err = result.errors.find(
        e => e.code === FlowValidationRuleCode.NODE_UNREACHABLE_FROM_START,
      );
      expect(err).toBeDefined();
      expect(err?.nodeIds).toContain('island-1');
      expect(err?.nodeIds).toContain('island-2');
    });
  });

  // 规则 3：排他网关分支与条件配置
  describe('规则 3：排他网关分支数与条件配置', () => {
    it('排他网关出度分支小于 2 时应该报错 GATEWAY_BRANCH_INSUFFICIENT', () => {
      const graph: FlowGraph = {
        nodes: [
          { id: 'start-1', type: FlowNodeType.START, x: 100, y: 100, text: '开始' },
          { id: 'gw-1', type: FlowNodeType.EXCLUSIVE_GATEWAY, x: 300, y: 100, text: '单分支网关' },
          { id: 'end-1', type: FlowNodeType.END, x: 500, y: 100, text: '结束' },
        ],
        edges: [
          { id: 'e-1', type: 'polyline', sourceNodeId: 'start-1', targetNodeId: 'gw-1' },
          {
            id: 'e-2',
            type: 'polyline',
            sourceNodeId: 'gw-1',
            targetNodeId: 'end-1',
            properties: { isDefault: true },
          },
        ],
      };

      const result = FlowValidator.validate(graph);
      expect(result.valid).toBe(false);
      const err = result.errors.find(
        e => e.code === FlowValidationRuleCode.GATEWAY_BRANCH_INSUFFICIENT,
      );
      expect(err).toBeDefined();
      expect(err?.nodeIds).toContain('gw-1');
      expect(err?.message).toContain('出度分支数量必须 ≥ 2');
    });

    it('排他网关出度分支未配置条件且未标记为默认流时报错 GATEWAY_BRANCH_NO_CONDITION', () => {
      const graph: FlowGraph = {
        nodes: [
          { id: 'start-1', type: FlowNodeType.START, x: 100, y: 100, text: '开始' },
          { id: 'gw-1', type: FlowNodeType.EXCLUSIVE_GATEWAY, x: 300, y: 100, text: '条件网关' },
          { id: 'task-1', type: FlowNodeType.USER_TASK, x: 500, y: 50, text: '分支1' },
          { id: 'task-2', type: FlowNodeType.USER_TASK, x: 500, y: 150, text: '分支2' },
          { id: 'end-1', type: FlowNodeType.END, x: 700, y: 100, text: '结束' },
        ],
        edges: [
          { id: 'e-1', type: 'polyline', sourceNodeId: 'start-1', targetNodeId: 'gw-1' },
          // 分支1配置了条件
          {
            id: 'e-b1',
            type: 'polyline',
            sourceNodeId: 'gw-1',
            targetNodeId: 'task-1',
            properties: { condition: '${amount > 100}' },
          },
          // 分支2既没有条件也没有 isDefault
          {
            id: 'e-b2',
            type: 'polyline',
            sourceNodeId: 'gw-1',
            targetNodeId: 'task-2',
            properties: {},
          },
          { id: 'e-3', type: 'polyline', sourceNodeId: 'task-1', targetNodeId: 'end-1' },
          { id: 'e-4', type: 'polyline', sourceNodeId: 'task-2', targetNodeId: 'end-1' },
        ],
      };

      const result = FlowValidator.validate(graph);
      expect(result.valid).toBe(false);
      const err = result.errors.find(
        e => e.code === FlowValidationRuleCode.GATEWAY_BRANCH_NO_CONDITION,
      );
      expect(err).toBeDefined();
      expect(err?.nodeIds).toContain('gw-1');
      expect(err?.edgeIds).toContain('e-b2');
    });

    it('排他网关分支配置了 condition 或 isDefault 时校验通过', () => {
      const graph: FlowGraph = {
        nodes: [
          { id: 'start-1', type: FlowNodeType.START, x: 100, y: 100, text: '开始' },
          { id: 'gw-1', type: FlowNodeType.EXCLUSIVE_GATEWAY, x: 300, y: 100, text: '网关' },
          { id: 'task-1', type: FlowNodeType.USER_TASK, x: 500, y: 50, text: '分支1' },
          { id: 'task-2', type: FlowNodeType.USER_TASK, x: 500, y: 150, text: '分支2' },
          { id: 'end-1', type: FlowNodeType.END, x: 700, y: 100, text: '结束' },
        ],
        edges: [
          { id: 'e-1', type: 'polyline', sourceNodeId: 'start-1', targetNodeId: 'gw-1' },
          {
            id: 'e-b1',
            type: 'polyline',
            sourceNodeId: 'gw-1',
            targetNodeId: 'task-1',
            properties: { condition: '${amount > 100}' },
          },
          {
            id: 'e-b2',
            type: 'polyline',
            sourceNodeId: 'gw-1',
            targetNodeId: 'task-2',
            properties: { isDefault: true },
          },
          { id: 'e-3', type: 'polyline', sourceNodeId: 'task-1', targetNodeId: 'end-1' },
          { id: 'e-4', type: 'polyline', sourceNodeId: 'task-2', targetNodeId: 'end-1' },
        ],
      };

      const result = FlowValidator.validate(graph);
      const gwErrors = result.errors.filter(e => e.nodeIds?.includes('gw-1'));
      expect(gwErrors.length).toBe(0);
    });
  });

  // 规则 4：无出口死循环检测
  describe('规则 4：死循环检测算法（无出口闭环）', () => {
    it('纯闭环且无法流向结束节点时应准确报错 DEADLOCK_CYCLE', () => {
      const graph: FlowGraph = {
        nodes: [
          { id: 'start-1', type: FlowNodeType.START, x: 100, y: 100, text: '开始' },
          { id: 't1', type: FlowNodeType.USER_TASK, x: 250, y: 100, text: '任务1' },
          { id: 't2', type: FlowNodeType.USER_TASK, x: 400, y: 100, text: '任务2' },
          { id: 't3', type: FlowNodeType.USER_TASK, x: 325, y: 200, text: '任务3' },
          { id: 'end-1', type: FlowNodeType.END, x: 600, y: 100, text: '结束' },
        ],
        edges: [
          { id: 'e-start', type: 'polyline', sourceNodeId: 'start-1', targetNodeId: 't1' },
          // t1 -> t2 -> t3 -> t1 闭环，且闭环中没有任何边能流向 end-1
          { id: 'e-1', type: 'polyline', sourceNodeId: 't1', targetNodeId: 't2' },
          { id: 'e-2', type: 'polyline', sourceNodeId: 't2', targetNodeId: 't3' },
          { id: 'e-3', type: 'polyline', sourceNodeId: 't3', targetNodeId: 't1' },
        ],
      };

      const result = FlowValidator.validate(graph);
      expect(result.valid).toBe(false);
      const err = result.errors.find(e => e.code === FlowValidationRuleCode.DEADLOCK_CYCLE);
      expect(err).toBeDefined();
      expect(err?.message).toContain('死循环');
      expect(err?.nodeIds).toContain('t1');
      expect(err?.nodeIds).toContain('t2');
      expect(err?.nodeIds).toContain('t3');
    });

    it('合法的驳回/退回循环（有分支流向结束节点）不应该误判为死循环', () => {
      const graph: FlowGraph = {
        nodes: [
          { id: 'start-1', type: FlowNodeType.START, x: 100, y: 100, text: '开始' },
          { id: 't1', type: FlowNodeType.USER_TASK, x: 250, y: 100, text: '任务1' },
          { id: 't2', type: FlowNodeType.USER_TASK, x: 400, y: 100, text: '任务2' },
          { id: 'end-1', type: FlowNodeType.END, x: 600, y: 100, text: '结束' },
        ],
        edges: [
          { id: 'e-s', type: 'polyline', sourceNodeId: 'start-1', targetNodeId: 't1' },
          { id: 'e-1', type: 'polyline', sourceNodeId: 't1', targetNodeId: 't2' },
          // t2 有两条出路：一条退回 t1，一条流向 end-1
          { id: 'e-reject', type: 'polyline', sourceNodeId: 't2', targetNodeId: 't1' },
          { id: 'e-pass', type: 'polyline', sourceNodeId: 't2', targetNodeId: 'end-1' },
        ],
      };

      const result = FlowValidator.validate(graph);
      const deadlockErrors = result.errors.filter(
        e => e.code === FlowValidationRuleCode.DEADLOCK_CYCLE,
      );
      expect(deadlockErrors.length).toBe(0);
    });
  });

  // 规则 5：连线防呆与图元完整性
  describe('规则 5：连线防呆与图元完整性', () => {
    it('连线引用不存在的节点时应该报错 DANGLING_EDGE', () => {
      const graph: FlowGraph = {
        nodes: [
          { id: 'start-1', type: FlowNodeType.START, x: 100, y: 100, text: '开始' },
          { id: 'end-1', type: FlowNodeType.END, x: 300, y: 100, text: '结束' },
        ],
        edges: [
          { id: 'e-ghost', type: 'polyline', sourceNodeId: 'ghost-1', targetNodeId: 'end-1' },
        ],
      };

      const result = FlowValidator.validate(graph);
      expect(result.valid).toBe(false);
      const err = result.errors.find(e => e.code === FlowValidationRuleCode.DANGLING_EDGE);
      expect(err).toBeDefined();
      expect(err?.edgeIds).toContain('e-ghost');
    });

    it('检测节点自环连线 SELF_LOOP_EDGE', () => {
      const graph: FlowGraph = {
        nodes: [
          { id: 'start-1', type: FlowNodeType.START, x: 100, y: 100, text: '开始' },
          { id: 't1', type: FlowNodeType.USER_TASK, x: 300, y: 100, text: '任务' },
          { id: 'end-1', type: FlowNodeType.END, x: 500, y: 100, text: '结束' },
        ],
        edges: [
          { id: 'e-1', type: 'polyline', sourceNodeId: 'start-1', targetNodeId: 't1' },
          { id: 'e-self', type: 'polyline', sourceNodeId: 't1', targetNodeId: 't1' },
          { id: 'e-2', type: 'polyline', sourceNodeId: 't1', targetNodeId: 'end-1' },
        ],
      };

      const result = FlowValidator.validate(graph);
      expect(result.valid).toBe(false);
      const err = result.errors.find(e => e.code === FlowValidationRuleCode.SELF_LOOP_EDGE);
      expect(err).toBeDefined();
      expect(err?.edgeIds).toContain('e-self');
    });
  });

  // 综合全合法拓扑通过用例
  describe('全合法拓扑校验', () => {
    it('标准审批流拓扑应该 100% 校验通过', () => {
      const graph: FlowGraph = {
        nodes: [
          { id: 'start-1', type: FlowNodeType.START, x: 100, y: 100, text: '开始' },
          { id: 'task-1', type: FlowNodeType.USER_TASK, x: 250, y: 100, text: '初审' },
          { id: 'gw-1', type: FlowNodeType.EXCLUSIVE_GATEWAY, x: 400, y: 100, text: '网关' },
          { id: 'task-2', type: FlowNodeType.USER_TASK, x: 550, y: 50, text: '复审' },
          { id: 'end-1', type: FlowNodeType.END, x: 700, y: 100, text: '结束' },
        ],
        edges: [
          { id: 'e-1', type: 'polyline', sourceNodeId: 'start-1', targetNodeId: 'task-1' },
          { id: 'e-2', type: 'polyline', sourceNodeId: 'task-1', targetNodeId: 'gw-1' },
          {
            id: 'e-3',
            type: 'polyline',
            sourceNodeId: 'gw-1',
            targetNodeId: 'task-2',
            properties: { condition: '${approved == true}' },
          },
          {
            id: 'e-4',
            type: 'polyline',
            sourceNodeId: 'gw-1',
            targetNodeId: 'end-1',
            properties: { isDefault: true },
          },
          { id: 'e-5', type: 'polyline', sourceNodeId: 'task-2', targetNodeId: 'end-1' },
        ],
      };

      const result = FlowValidator.validate(graph);
      expect(result.valid).toBe(true);
      expect(result.errors.filter(e => e.level === 'error').length).toBe(0);
    });
  });
});
