/**
 * BpmnAdapter BPMN 2.0 XML 协议转译器。
 *
 * 依据 ADR-0033 与工单 #167，纯原生 TypeScript 实现 FlowGraph 与标准 BPMN 2.0 XML 双向保真转译：
 * 1. 序列化 (toBpmnXml)：将 FlowGraph 输出为符合 Flowable / Camunda 工业级规范的标准 BPMN 2.0 XML；
 * 2. 反序列化 (fromBpmnXml)：解析标准 BPMN 2.0 XML，还原节点、连线、条件表达式与几何拓扑；
 * 3. 几何坐标保真：精准转换 LogicFlow 中心坐标与 BPMNDiagram (Bounds / Waypoint) 坐标；
 * 4. 扩展元数据保留：保留办理人、审批模式、流转条件及自定义业务属性。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { FlowNodeType } from '../presets';
import type { FlowGraph, FlowNode, FlowEdge } from '../types';

/**
 * BPMN 导出选项配置。
 */
export interface BpmnExportOptions {
  /** 流程定义唯一标识 ID（默认 'Process_1'） */
  processId?: string;
  /** 流程定义可读名称（默认 '业务审批流程'） */
  processName?: string;
  /** 目标命名空间（默认 'http://bpmn.io/schema/bpmn'） */
  targetNamespace?: string;
}

/**
 * XML 特殊字符转义。
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 获取节点显示名称。
 */
function getNodeLabel(node: FlowNode): string {
  if (typeof node.text === 'string' && node.text.trim()) {
    return node.text;
  }
  if (node.text && typeof node.text === 'object' && node.text.value) {
    return node.text.value;
  }
  if (node.properties?.name && typeof node.properties.name === 'string') {
    return node.properties.name;
  }
  return '';
}

/**
 * 获取连线显示文本。
 */
function getEdgeLabel(edge: FlowEdge): string {
  if (typeof edge.text === 'string' && edge.text.trim()) {
    return edge.text;
  }
  if (edge.text && typeof edge.text === 'object' && edge.text.value) {
    return edge.text.value;
  }
  return '';
}

/**
 * 计算默认图元几何尺寸（宽与高）。
 */
function getNodeDimensions(node: FlowNode): { width: number; height: number } {
  if (node.width && node.height) {
    return { width: node.width, height: node.height };
  }
  const type = node.type;
  if (type === FlowNodeType.START || type === 'start' || type === 'flow:start') {
    return { width: 48, height: 48 };
  }
  if (type === FlowNodeType.END || type === 'end' || type === 'flow:end') {
    return { width: 48, height: 48 };
  }
  if (
    type === FlowNodeType.EXCLUSIVE_GATEWAY ||
    type === 'exclusive-gateway' ||
    type === FlowNodeType.PARALLEL_GATEWAY ||
    type === 'parallel-gateway'
  ) {
    return { width: 50, height: 50 };
  }
  return { width: 120, height: 60 };
}

/**
 * 安全提取元素内的纯文本内容（兼容 CDATASection、Happy-DOM 注释化 CDATA 及普通文本）。
 */
function extractTextContent(el: Element): string {
  for (let i = 0; i < el.childNodes.length; i++) {
    const node = el.childNodes[i];
    if (node && (node.nodeType === 4 || node.nodeType === 8 || node.nodeType === 3)) {
      const val = node.nodeValue || '';
      const match = val.match(/\[CDATA\[([\s\S]*?)\]\]/);
      if (match && match[1] !== undefined) {
        return match[1].trim();
      }
      if (node.nodeType === 3 || node.nodeType === 4) {
        if (val.trim()) return val.trim();
      }
    }
  }
  const raw = el.textContent || el.innerHTML || '';
  const match = raw.match(/(?:<!\[CDATA\[|<!--\[CDATA\[)([\s\S]*?)(?:\]\]>|\]\]-->)/);
  if (match && match[1] !== undefined) {
    return match[1].trim();
  }
  return raw.trim();
}

/**
 * 提取元素的局部标签名（剥离命名空间前缀并转换为全小写）。
 */
function getLocalName(el: { localName?: string; tagName?: string; name?: string }): string {
  const raw = el.localName || el.tagName || el.name || '';
  const idx = raw.indexOf(':');
  return (idx >= 0 ? raw.substring(idx + 1) : raw).toLowerCase();
}

/**
 * 安全获取元素属性值（支持备用属性名及命名空间容错）。
 */
function getAttr(el: Element, ...attrNames: string[]): string | null {
  for (const name of attrNames) {
    const val = el.getAttribute(name);
    if (val !== null && val !== undefined) return val;
  }
  const targetNames = attrNames.map(n => {
    const idx = n.indexOf(':');
    return (idx >= 0 ? n.substring(idx + 1) : n).toLowerCase();
  });
  if (el.attributes) {
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      if (!attr) continue;
      const attrLocal = getLocalName(attr);
      if (targetNames.includes(attrLocal)) {
        return attr.value;
      }
    }
  }
  return null;
}

/**
 * 递归深度优先查找指定局部标签名的后代元素。
 */
function findDescendant(parent: Element, targetName: string): Element | null {
  const target = targetName.toLowerCase();
  const queue: Element[] = Array.from(parent.children);
  while (queue.length > 0) {
    const curr = queue.shift();
    if (!curr) continue;
    if (getLocalName(curr) === target) return curr;
    for (let i = 0; i < curr.children.length; i++) {
      const child = curr.children[i];
      if (child) queue.push(child);
    }
  }
  return null;
}

/**
 * 查找指定局部标签名的所有后代元素。
 */
function findDescendants(parent: Element, targetName: string): Element[] {
  const target = targetName.toLowerCase();
  const results: Element[] = [];
  const queue: Element[] = Array.from(parent.children);
  while (queue.length > 0) {
    const curr = queue.shift();
    if (!curr) continue;
    if (getLocalName(curr) === target) {
      results.push(curr);
    }
    for (let i = 0; i < curr.children.length; i++) {
      const child = curr.children[i];
      if (child) queue.push(child);
    }
  }
  return results;
}

/**
 * BpmnAdapter 双向转译器实现。
 */
export class BpmnAdapter {
  /**
   * 将 FlowGraph 数据模型序列化为标准 BPMN 2.0 XML 字符串。
   *
   * @param graph 流程图全景数据
   * @param options 导出选项
   * @returns 标准 BPMN 2.0 XML 字符串
   */
  static toBpmnXml(graph: FlowGraph, options: BpmnExportOptions = {}): string {
    const processId = options.processId || 'Process_1';
    const processName = options.processName || '业务审批流程';
    const targetNamespace = options.targetNamespace || 'http://bpmn.io/schema/bpmn';

    const nodes = graph?.nodes ?? [];
    const edges = graph?.edges ?? [];
    const nodeMap = new Map<string, FlowNode>();
    for (const n of nodes) {
      nodeMap.set(n.id, n);
    }

    const processElements: string[] = [];
    const diagramElements: string[] = [];

    // 1. 序列化流程图节点 (Nodes)
    for (const node of nodes) {
      const label = getNodeLabel(node);
      const nameAttr = label ? ` name="${escapeXml(label)}"` : '';
      const { width, height } = getNodeDimensions(node);
      const boundsX = Math.round(node.x - width / 2);
      const boundsY = Math.round(node.y - height / 2);

      const type = node.type;
      const props = node.properties ?? {};

      let bpmnTag = 'task';
      if (type === FlowNodeType.START || type === 'start' || type === 'flow:start') {
        bpmnTag = 'startEvent';
      } else if (type === FlowNodeType.END || type === 'end' || type === 'flow:end') {
        bpmnTag = 'endEvent';
      } else if (
        type === FlowNodeType.USER_TASK ||
        type === 'user-task' ||
        type === 'flow:user-task'
      ) {
        bpmnTag = 'userTask';
      } else if (
        type === FlowNodeType.SERVICE_TASK ||
        type === 'service-task' ||
        type === 'flow:service-task'
      ) {
        bpmnTag = 'serviceTask';
      } else if (type === FlowNodeType.CC_TASK || type === 'cc-task' || type === 'flow:cc-task') {
        bpmnTag = 'sendTask';
      } else if (
        type === FlowNodeType.EXCLUSIVE_GATEWAY ||
        type === 'exclusive-gateway' ||
        type === 'flow:exclusive-gateway'
      ) {
        bpmnTag = 'exclusiveGateway';
      } else if (
        type === FlowNodeType.PARALLEL_GATEWAY ||
        type === 'parallel-gateway' ||
        type === 'flow:parallel-gateway'
      ) {
        bpmnTag = 'parallelGateway';
      }

      // 提取常用业务扩展属性
      let extraAttrs = '';
      if (props.assignee) {
        extraAttrs += ` flowable:assignee="${escapeXml(String(props.assignee))}" camunda:assignee="${escapeXml(String(props.assignee))}"`;
      }
      if (props.candidateUsers) {
        extraAttrs += ` flowable:candidateUsers="${escapeXml(String(props.candidateUsers))}" camunda:candidateUsers="${escapeXml(String(props.candidateUsers))}"`;
      }
      if (props.candidateGroups) {
        extraAttrs += ` flowable:candidateGroups="${escapeXml(String(props.candidateGroups))}" camunda:candidateGroups="${escapeXml(String(props.candidateGroups))}"`;
      }

      // 内部子标签：文档注释与自定义扩展字段
      const innerTags: string[] = [];
      if (props.description) {
        innerTags.push(
          `      <bpmn:documentation>${escapeXml(String(props.description))}</bpmn:documentation>`,
        );
      }

      // 序列化其余自定义扩展属性（保证 100% 保真）
      const customPropsJson = JSON.stringify(props);
      innerTags.push(
        `      <bpmn:extensionElements>\n        <flowable:customProperties><![CDATA[${customPropsJson}]]></flowable:customProperties>\n      </bpmn:extensionElements>`,
      );

      if (innerTags.length > 0) {
        processElements.push(
          `    <bpmn:${bpmnTag} id="${node.id}"${nameAttr}${extraAttrs}>\n${innerTags.join('\n')}\n    </bpmn:${bpmnTag}>`,
        );
      } else {
        processElements.push(`    <bpmn:${bpmnTag} id="${node.id}"${nameAttr}${extraAttrs} />`);
      }

      // 对应 BPMNDiagram 坐标图形
      diagramElements.push(
        `      <bpmndi:BPMNShape id="${node.id}_di" bpmnElement="${node.id}">\n        <dc:Bounds x="${boundsX}" y="${boundsY}" width="${width}" height="${height}" />\n      </bpmndi:BPMNShape>`,
      );
    }

    // 2. 序列化流程连线 (Edges)
    for (const edge of edges) {
      const label = getEdgeLabel(edge);
      const nameAttr = label ? ` name="${escapeXml(label)}"` : '';
      const condition = edge.properties?.condition || edge.properties?.conditionExpression;

      const innerElements: string[] = [];
      if (condition) {
        innerElements.push(
          `      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression"><![CDATA[${condition}]]></bpmn:conditionExpression>`,
        );
      }

      if (innerElements.length > 0) {
        processElements.push(
          `    <bpmn:sequenceFlow id="${edge.id}" sourceRef="${edge.sourceNodeId}" targetRef="${edge.targetNodeId}"${nameAttr}>\n${innerElements.join('\n')}\n    </bpmn:sequenceFlow>`,
        );
      } else {
        processElements.push(
          `    <bpmn:sequenceFlow id="${edge.id}" sourceRef="${edge.sourceNodeId}" targetRef="${edge.targetNodeId}"${nameAttr} />`,
        );
      }

      // 计算连线折点
      const waypoints: Array<{ x: number; y: number }> = [];
      if (edge.pointsList && edge.pointsList.length > 0) {
        for (const pt of edge.pointsList) {
          waypoints.push({ x: Math.round(pt.x), y: Math.round(pt.y) });
        }
      } else {
        const sNode = nodeMap.get(edge.sourceNodeId);
        const tNode = nodeMap.get(edge.targetNodeId);
        if (sNode && tNode) {
          const sDim = getNodeDimensions(sNode);
          const tDim = getNodeDimensions(tNode);
          waypoints.push({ x: Math.round(sNode.x + sDim.width / 2), y: Math.round(sNode.y) });
          waypoints.push({ x: Math.round(tNode.x - tDim.width / 2), y: Math.round(tNode.y) });
        }
      }

      const waypointTags = waypoints
        .map(pt => `        <di:waypoint x="${pt.x}" y="${pt.y}" />`)
        .join('\n');

      diagramElements.push(
        `      <bpmndi:BPMNEdge id="${edge.id}_di" bpmnElement="${edge.id}">\n${waypointTags}\n      </bpmndi:BPMNEdge>`,
      );
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  xmlns:flowable="http://flowable.org/bpmn"
  xmlns:camunda="http://camunda.org/schema/1.0/bpmn"
  id="Definitions_1"
  targetNamespace="${targetNamespace}"
>
  <bpmn:process id="${processId}" name="${escapeXml(processName)}" isExecutable="true">
${processElements.join('\n')}
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${processId}">
${diagramElements.join('\n')}
  </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
  }

  /**
   * 将 BPMN 2.0 XML 字符串反序列化解析为 FlowGraph 数据模型。
   *
   * @param xml BPMN 2.0 XML 字符串
   * @returns 还原后的 FlowGraph 数据模型
   */
  static fromBpmnXml(xml: string): FlowGraph {
    if (!xml || typeof xml !== 'string' || !xml.trim()) {
      return { nodes: [], edges: [] };
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');

    // 检查 XML 解析错误
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      throw new Error(`BPMN XML 解析失败: ${parseError.textContent || '格式非法'}`);
    }

    // 1. 建立 BPMNDiagram 图形坐标与折点缓存映射
    const shapeBoundsMap = new Map<
      string,
      { x: number; y: number; width: number; height: number }
    >();
    const edgeWaypointsMap = new Map<string, Array<{ x: number; y: number }>>();

    const allElements = doc.getElementsByTagName('*');
    for (let i = 0; i < allElements.length; i++) {
      const el = allElements[i];
      if (!el) continue;
      const tag = getLocalName(el);

      if (tag === 'bpmnshape') {
        const bpmnElement = getAttr(el, 'bpmnElement', 'id');
        if (bpmnElement) {
          const bounds = findDescendant(el, 'bounds');
          if (bounds) {
            const x = parseFloat(getAttr(bounds, 'x') || '0');
            const y = parseFloat(getAttr(bounds, 'y') || '0');
            const width = parseFloat(getAttr(bounds, 'width') || '100');
            const height = parseFloat(getAttr(bounds, 'height') || '60');
            shapeBoundsMap.set(bpmnElement, { x, y, width, height });
          }
        }
      } else if (tag === 'bpmnedge') {
        const bpmnElement = getAttr(el, 'bpmnElement', 'id');
        if (bpmnElement) {
          const waypoints: Array<{ x: number; y: number }> = [];
          const waypointEls = findDescendants(el, 'waypoint');
          for (const wp of waypointEls) {
            const x = parseFloat(getAttr(wp, 'x') || '0');
            const y = parseFloat(getAttr(wp, 'y') || '0');
            waypoints.push({ x, y });
          }
          if (waypoints.length > 0) {
            edgeWaypointsMap.set(bpmnElement, waypoints);
          }
        }
      }
    }

    // 2. 遍历解析节点
    const nodes: FlowNode[] = [];
    const tagToTypeMap: Record<string, string> = {
      startevent: FlowNodeType.START,
      endevent: FlowNodeType.END,
      usertask: FlowNodeType.USER_TASK,
      servicetask: FlowNodeType.SERVICE_TASK,
      sendtask: FlowNodeType.CC_TASK,
      task: FlowNodeType.USER_TASK,
      exclusivegateway: FlowNodeType.EXCLUSIVE_GATEWAY,
      parallelgateway: FlowNodeType.PARALLEL_GATEWAY,
    };

    const edges: FlowEdge[] = [];

    for (let i = 0; i < allElements.length; i++) {
      const el = allElements[i];
      if (!el) continue;
      const tag = getLocalName(el);

      if (tag in tagToTypeMap) {
        const id = getAttr(el, 'id');
        if (!id) continue;

        const name = getAttr(el, 'name') || '';
        const type = tagToTypeMap[tag] || FlowNodeType.USER_TASK;

        // 提取属性字典
        const properties: Record<string, unknown> = {};

        // 优先从 customproperties 还原全量自定义属性
        const customPropsEl = findDescendant(el, 'customproperties');
        if (customPropsEl) {
          const text = extractTextContent(customPropsEl);
          if (text) {
            try {
              const parsed = JSON.parse(text);
              if (parsed && typeof parsed === 'object') {
                Object.assign(properties, parsed);
              }
            } catch {
              // 降级使用普通属性
            }
          }
        }

        // 提取常规元数据
        const assignee = getAttr(el, 'flowable:assignee', 'camunda:assignee', 'assignee');
        if (assignee && !properties.assignee) {
          properties.assignee = assignee;
        }

        const candidateUsers = getAttr(
          el,
          'flowable:candidateUsers',
          'camunda:candidateUsers',
          'candidateUsers',
        );
        if (candidateUsers && !properties.candidateUsers) {
          properties.candidateUsers = candidateUsers;
        }

        const candidateGroups = getAttr(
          el,
          'flowable:candidateGroups',
          'camunda:candidateGroups',
          'candidateGroups',
        );
        if (candidateGroups && !properties.candidateGroups) {
          properties.candidateGroups = candidateGroups;
        }

        const docEl = findDescendant(el, 'documentation');
        if (docEl && docEl.textContent && !properties.description) {
          properties.description = docEl.textContent.trim();
        }

        // 计算中心点坐标
        const bounds = shapeBoundsMap.get(id);
        let x = 100;
        let y = 100;
        let width: number | undefined;
        let height: number | undefined;

        if (bounds) {
          width = bounds.width;
          height = bounds.height;
          x = Math.round(bounds.x + bounds.width / 2);
          y = Math.round(bounds.y + bounds.height / 2);
        }

        nodes.push({
          id,
          type,
          x,
          y,
          text: name,
          width,
          height,
          properties,
        });
      } else if (tag === 'sequenceflow') {
        const id = getAttr(el, 'id');
        const sourceRef = getAttr(el, 'sourceRef');
        const targetRef = getAttr(el, 'targetRef');
        if (!id || !sourceRef || !targetRef) continue;

        const name = getAttr(el, 'name') || '';
        const properties: Record<string, unknown> = {};

        // 提取流转条件表达式
        const condEl = findDescendant(el, 'conditionexpression');
        if (condEl) {
          const conditionText = extractTextContent(condEl);
          if (conditionText) {
            properties.condition = conditionText;
          }
        }

        const waypoints = edgeWaypointsMap.get(id);
        const edgeItem: FlowEdge = {
          id,
          type: 'polyline',
          sourceNodeId: sourceRef,
          targetNodeId: targetRef,
          text: name,
          properties,
        };

        if (waypoints && waypoints.length > 0) {
          edgeItem.pointsList = waypoints;
          const first = waypoints[0];
          const last = waypoints[waypoints.length - 1];
          if (first) {
            edgeItem.startPoint = { x: first.x, y: first.y };
          }
          if (last) {
            edgeItem.endPoint = { x: last.x, y: last.y };
          }
        }

        edges.push(edgeItem);
      }
    }

    return { nodes, edges };
  }
}
