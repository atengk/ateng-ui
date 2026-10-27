/**
 * BpmnAdapter BPMN 2.0 XML 协议转译器单元测试。
 *
 * 依据 ADR-0033 与工单 #167，验证 FlowGraph 与标准 BPMN 2.0 XML 双向保真互转。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { describe, it, expect } from 'vitest';
import { BpmnAdapter } from '../src/bpmn';
import { FlowNodeType } from '../src/presets';
import type { FlowGraph } from '../src/types';

describe('BpmnAdapter BPMN 2.0 XML 双向互转', () => {
  const sampleGraph: FlowGraph = {
    nodes: [
      {
        id: 'start-1',
        type: FlowNodeType.START,
        x: 100,
        y: 200,
        text: '发起报销',
        properties: { initiator: 'zhangsan' },
      },
      {
        id: 'task-1',
        type: FlowNodeType.USER_TASK,
        x: 300,
        y: 200,
        text: '主管初审',
        properties: {
          assignee: 'leader_01',
          description: '审批差旅明细',
          approvalMode: 'single',
        },
      },
      {
        id: 'gw-1',
        type: FlowNodeType.EXCLUSIVE_GATEWAY,
        x: 500,
        y: 200,
        text: '金额分流',
      },
      {
        id: 'task-2',
        type: FlowNodeType.SERVICE_TASK,
        x: 700,
        y: 120,
        text: '财务自动入账',
        properties: { serviceClass: 'com.ateng.FinanceService' },
      },
      {
        id: 'end-1',
        type: FlowNodeType.END,
        x: 900,
        y: 200,
        text: '流程归档',
      },
    ],
    edges: [
      {
        id: 'flow-1',
        type: 'polyline',
        sourceNodeId: 'start-1',
        targetNodeId: 'task-1',
        text: '提交',
      },
      {
        id: 'flow-2',
        type: 'polyline',
        sourceNodeId: 'task-1',
        targetNodeId: 'gw-1',
        text: '初审通过',
      },
      {
        id: 'flow-3',
        type: 'polyline',
        sourceNodeId: 'gw-1',
        targetNodeId: 'task-2',
        text: '小额直付',
        properties: {
          condition: '${amount < 1000}',
        },
      },
      {
        id: 'flow-4',
        type: 'polyline',
        sourceNodeId: 'gw-1',
        targetNodeId: 'end-1',
        text: '默认归档',
        properties: {
          isDefault: true,
        },
      },
      {
        id: 'flow-5',
        type: 'polyline',
        sourceNodeId: 'task-2',
        targetNodeId: 'end-1',
        text: '入账完成',
      },
    ],
  };

  describe('序列化：FlowGraph -> BPMN 2.0 XML', () => {
    it('应该正确生成标准 XML 声明与命名空间', () => {
      const xml = BpmnAdapter.toBpmnXml(sampleGraph, {
        processId: 'ExpenseProcess',
        processName: '差旅报销流程',
      });

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<bpmn:definitions');
      expect(xml).toContain('xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"');
      expect(xml).toContain('xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"');
      expect(xml).toContain('xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"');
      expect(xml).toContain('xmlns:di="http://www.omg.org/spec/DD/20100524/DI"');
      expect(xml).toContain('xmlns:flowable="http://flowable.org/bpmn"');
      expect(xml).toContain('xmlns:camunda="http://camunda.org/schema/1.0/bpmn"');
      expect(xml).toContain(
        '<bpmn:process id="ExpenseProcess" name="差旅报销流程" isExecutable="true">',
      );
    });

    it('应该正确表达各类核心流程节点与扩展属性', () => {
      const xml = BpmnAdapter.toBpmnXml(sampleGraph);

      expect(xml).toContain('<bpmn:startEvent id="start-1" name="发起报销"');
      expect(xml).toContain('<bpmn:userTask id="task-1" name="主管初审"');
      expect(xml).toContain('flowable:assignee="leader_01"');
      expect(xml).toContain('camunda:assignee="leader_01"');
      expect(xml).toContain('<bpmn:documentation>审批差旅明细</bpmn:documentation>');
      expect(xml).toContain('<bpmn:exclusiveGateway id="gw-1" name="金额分流"');
      expect(xml).toContain('<bpmn:serviceTask id="task-2" name="财务自动入账"');
      expect(xml).toContain('<bpmn:endEvent id="end-1" name="流程归档"');
    });

    it('应该正确表达连线 SequenceFlow 及流转条件表达式', () => {
      const xml = BpmnAdapter.toBpmnXml(sampleGraph);

      expect(xml).toContain(
        '<bpmn:sequenceFlow id="flow-1" sourceRef="start-1" targetRef="task-1" name="提交"',
      );
      expect(xml).toContain(
        '<bpmn:conditionExpression xsi:type="bpmn:tFormalExpression"><![CDATA[${amount < 1000}]]></bpmn:conditionExpression>',
      );
    });

    it('应该正确输出 BPMNDiagram 几何坐标与连线折点', () => {
      const xml = BpmnAdapter.toBpmnXml(sampleGraph);

      expect(xml).toContain('<bpmndi:BPMNDiagram id="BPMNDiagram_1">');
      expect(xml).toContain('<bpmndi:BPMNShape id="start-1_di" bpmnElement="start-1">');
      expect(xml).toContain('<dc:Bounds');
      expect(xml).toContain('<bpmndi:BPMNEdge id="flow-1_di" bpmnElement="flow-1">');
    });
  });

  describe('反序列化：BPMN 2.0 XML -> FlowGraph', () => {
    it('应该完整还原节点拓扑、名称与坐标几何', () => {
      const xml = BpmnAdapter.toBpmnXml(sampleGraph);
      const imported = BpmnAdapter.fromBpmnXml(xml);

      expect(imported.nodes.length).toBe(5);
      expect(imported.edges.length).toBe(5);

      const startNode = imported.nodes.find(n => n.id === 'start-1');
      expect(startNode).toBeDefined();
      expect(startNode?.type).toBe(FlowNodeType.START);
      expect(startNode?.text).toBe('发起报销');
      expect(startNode?.x).toBe(100);
      expect(startNode?.y).toBe(200);

      const userTask = imported.nodes.find(n => n.id === 'task-1');
      expect(userTask).toBeDefined();
      expect(userTask?.type).toBe(FlowNodeType.USER_TASK);
      expect(userTask?.text).toBe('主管初审');
      expect(userTask?.properties?.assignee).toBe('leader_01');
      expect(userTask?.properties?.description).toBe('审批差旅明细');

      const gw = imported.nodes.find(n => n.id === 'gw-1');
      expect(gw).toBeDefined();
      expect(gw?.type).toBe(FlowNodeType.EXCLUSIVE_GATEWAY);

      const condEdge = imported.edges.find(e => e.id === 'flow-3');
      expect(condEdge).toBeDefined();
      expect(condEdge?.properties?.condition).toBe('${amount < 1000}');
      expect(condEdge?.sourceNodeId).toBe('gw-1');
      expect(condEdge?.targetNodeId).toBe('task-2');
    });

    it('对外部标准 BPMN XML（无 flow: 命名空间）应兼容解析', () => {
      const externalXml = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
             xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
             xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
             xmlns:flowable="http://flowable.org/bpmn"
             id="Def_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="ExternalProcess" isExecutable="true">
    <startEvent id="start_ext" name="Start" />
    <userTask id="task_ext" name="Audit" flowable:assignee="admin" />
    <endEvent id="end_ext" name="End" />
    <sequenceFlow id="flow_1" sourceRef="start_ext" targetRef="task_ext" />
    <sequenceFlow id="flow_2" sourceRef="task_ext" targetRef="end_ext" />
  </process>
  <bpmndi:BPMNDiagram id="Diagram_1">
    <bpmndi:BPMNPlane id="Plane_1" bpmnElement="ExternalProcess">
      <bpmndi:BPMNShape id="start_shape" bpmnElement="start_ext">
        <dc:Bounds x="100" y="100" width="48" height="48" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="task_shape" bpmnElement="task_ext">
        <dc:Bounds x="200" y="90" width="120" height="60" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="end_shape" bpmnElement="end_ext">
        <dc:Bounds x="400" y="100" width="48" height="48" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="edge1_shape" bpmnElement="flow_1">
        <di:waypoint x="148" y="124" />
        <di:waypoint x="200" y="120" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`;

      const imported = BpmnAdapter.fromBpmnXml(externalXml);
      expect(imported.nodes.length).toBe(3);
      expect(imported.edges.length).toBe(2);

      const task = imported.nodes.find(n => n.id === 'task_ext');
      expect(task?.type).toBe(FlowNodeType.USER_TASK);
      expect(task?.properties?.assignee).toBe('admin');
      // 验证中心坐标计算：x = 200 + 120/2 = 260, y = 90 + 60/2 = 120
      expect(task?.x).toBe(260);
      expect(task?.y).toBe(120);
    });

    it('双向往返互转保真度测试 (Round-trip fidelity)', () => {
      const xml1 = BpmnAdapter.toBpmnXml(sampleGraph);
      const graph2 = BpmnAdapter.fromBpmnXml(xml1);
      const xml2 = BpmnAdapter.toBpmnXml(graph2);
      const graph3 = BpmnAdapter.fromBpmnXml(xml2);

      expect(graph3.nodes.length).toBe(sampleGraph.nodes.length);
      expect(graph3.edges.length).toBe(sampleGraph.edges.length);
      for (const node of sampleGraph.nodes) {
        const found = graph3.nodes.find(n => n.id === node.id);
        expect(found).toBeDefined();
        expect(found?.type).toBe(node.type);
        expect(found?.x).toBe(node.x);
        expect(found?.y).toBe(node.y);
      }
    });
  });
});
