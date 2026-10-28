/**
 * VueNodeRegistry Vue 3 SFC 自定义节点适配系统单元测试。
 *
 * 依据 ADR-0033 与工单 #168，验证 Vue 3 SFC 注册、数据流注入、属性双向回写与销毁生命周期。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { defineComponent, h, onUnmounted } from 'vue';
import LogicFlow from '@logicflow/core';
import { VueNodeRegistry, registerVueNode, type FlowVueNodeProps } from '../src/registry';
import ApprovalCardNode from '../src/components/ApprovalCardNode.vue';
import type { FlowGraph } from '../src/types';

describe('VueNodeRegistry Vue 3 SFC 自定义节点机制', () => {
  let container: HTMLDivElement;
  let lf: LogicFlow;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '1000px';
    container.style.height = '700px';
    document.body.appendChild(container);
    lf = new LogicFlow({ container });
  });

  afterEach(() => {
    lf.destroy();
    container.remove();
    document.body.innerHTML = '';
  });

  it('应该支持通过 registerVueNode 注册自定义 Vue 组件并正常挂载 DOM', async () => {
    const unmountSpy = vi.fn();

    // 定义一个简单的测试用 Vue 3 SFC 组件
    const TestCardComponent = defineComponent({
      name: 'TestCardComponent',
      props: {
        node: { type: Object, required: true },
        lf: { type: Object, required: true },
        model: { type: Object, required: true },
        updateProperty: { type: Function, required: true },
        updateProperties: { type: Function, required: true },
        disabled: { type: Boolean, default: false },
      },
      setup(props: FlowVueNodeProps) {
        onUnmounted(() => {
          unmountSpy();
        });

        return () =>
          h(
            'div',
            {
              class: 'test-card-node',
              'data-node-id': props.node.id,
            },
            [
              h('span', { class: 'card-title' }, props.node.text || '默认卡片'),
              h('span', { class: 'card-assignee' }, String(props.node.properties?.assignee ?? '')),
            ],
          );
      },
    });

    // 1. 注册自定义 Vue 节点
    VueNodeRegistry.register(lf, 'vue-test-card', TestCardComponent, {
      width: 220,
      height: 90,
    });

    // 2. 渲染流程图
    const graph: FlowGraph = {
      nodes: [
        {
          id: 'card-1',
          type: 'vue-test-card',
          x: 200,
          y: 200,
          text: '人事初审卡片',
          properties: {
            assignee: 'hr_manager',
          },
        },
      ],
      edges: [],
    };

    lf.render(graph);

    // 3. 验证 DOM 是否成功挂载了 Vue 组件
    const cardEl = container.querySelector('.test-card-node');
    expect(cardEl).not.toBeNull();
    expect(cardEl?.getAttribute('data-node-id')).toBe('card-1');

    const titleEl = cardEl?.querySelector('.card-title');
    expect(titleEl?.textContent).toBe('人事初审卡片');

    const assigneeEl = cardEl?.querySelector('.card-assignee');
    expect(assigneeEl?.textContent).toBe('hr_manager');

    // 4. 验证删除节点时的确定性销毁与 onUnmounted 触发
    lf.deleteNode('card-1');
    expect(unmountSpy).toHaveBeenCalledTimes(1);
    expect(container.querySelector('.test-card-node')).toBeNull();
  });

  it('应该支持在 Vue 组件内部调用 updateProperty 安全回写属性并同步底层模型', () => {
    let capturedUpdateProperty: ((key: string, value: unknown) => void) | null = null;

    const InteractiveComponent = defineComponent({
      name: 'InteractiveComponent',
      props: {
        node: { type: Object, required: true },
        lf: { type: Object, required: true },
        model: { type: Object, required: true },
        updateProperty: { type: Function, required: true },
        updateProperties: { type: Function, required: true },
      },
      setup(props: FlowVueNodeProps) {
        capturedUpdateProperty = props.updateProperty;
        return () =>
          h('div', { class: 'interactive-node' }, [
            h('span', { class: 'status-tag' }, String(props.node.properties?.status ?? 'pending')),
          ]);
      },
    });

    registerVueNode(lf, 'interactive-card', InteractiveComponent, {
      width: 240,
      height: 100,
    });

    lf.render({
      nodes: [
        {
          id: 'inter-1',
          type: 'interactive-card',
          x: 250,
          y: 250,
          text: '交互节点',
          properties: { status: 'pending' },
        },
      ],
      edges: [],
    });

    expect(capturedUpdateProperty).not.toBeNull();

    // 模拟组件内部触发属性回写
    if (capturedUpdateProperty) {
      (capturedUpdateProperty as (key: string, value: unknown) => void)('status', 'approved');
    }

    // 验证 LogicFlow 节点模型属性已同步更新
    const model = lf.getNodeModelById('inter-1');
    expect(model?.getProperties()?.status).toBe('approved');
  });

  it('应该准确计算正交四向吸附锚点坐标，拖拽连线无偏移', () => {
    const DummyComponent = defineComponent({
      name: 'DummyComponent',
      setup() {
        return () => h('div', 'Dummy');
      },
    });

    registerVueNode(lf, 'anchor-test-card', DummyComponent, {
      width: 200,
      height: 100,
    });

    lf.render({
      nodes: [
        {
          id: 'node-anchor',
          type: 'anchor-test-card',
          x: 400,
          y: 300,
          text: '锚点测试',
        },
      ],
      edges: [],
    });

    const model = lf.getNodeModelById('node-anchor');
    expect(model).toBeDefined();

    // 节点中心为 (400, 300)，宽 200，高 100
    // 上锚点: (400, 250)
    // 右锚点: (500, 300)
    // 下锚点: (400, 350)
    // 左锚点: (300, 300)
    const anchors = model?.getDefaultAnchor();
    expect(anchors?.length).toBe(4);

    const topAnchor = anchors?.find(a => a.id.includes('top'));
    expect(topAnchor?.x).toBe(400);
    expect(topAnchor?.y).toBe(250);

    const rightAnchor = anchors?.find(a => a.id.includes('right'));
    expect(rightAnchor?.x).toBe(500);
    expect(rightAnchor?.y).toBe(300);

    const bottomAnchor = anchors?.find(a => a.id.includes('bottom'));
    expect(bottomAnchor?.x).toBe(400);
    expect(bottomAnchor?.y).toBe(350);

    const leftAnchor = anchors?.find(a => a.id.includes('left'));
    expect(leftAnchor?.x).toBe(300);
    expect(leftAnchor?.y).toBe(300);
  });

  it('应该支持预设 ApprovalCardNode 渲染并在点击通过按钮时回写 status 和 progress', () => {
    registerVueNode(lf, 'approval-card', ApprovalCardNode, {
      width: 220,
      height: 126,
    });

    lf.render({
      nodes: [
        {
          id: 'card-approval',
          type: 'approval-card',
          x: 300,
          y: 200,
          text: '财务终审',
          properties: {
            assignee: 'caiwu_leader',
            status: 'pending',
            progress: 30,
          },
        },
      ],
      edges: [],
    });

    const cardEl = container.querySelector('.at-flow-approval-card');
    expect(cardEl).not.toBeNull();

    const titleEl = cardEl?.querySelector('.at-flow-card__title');
    expect(titleEl?.textContent).toBe('财务终审');

    const metaValEl = cardEl?.querySelector('.at-flow-card__meta-value');
    expect(metaValEl?.textContent).toBe('caiwu_leader');

    const badgeEl = cardEl?.querySelector('.at-flow-card__badge');
    expect(badgeEl?.textContent).toBe('待处理');

    // 点击通过按钮
    const approveBtn = cardEl?.querySelector('.at-flow-card__btn--approve') as HTMLButtonElement;
    expect(approveBtn).not.toBeNull();
    approveBtn.click();

    const model = lf.getNodeModelById('card-approval');
    expect(model?.getProperties()?.status).toBe('approved');
    expect(model?.getProperties()?.progress).toBe(100);
  });

  it('应该向自定义 Vue 节点注入全量 graph 流程图上下文', () => {
    let capturedGraph: FlowGraph | undefined;

    const GraphConsumerComponent = defineComponent({
      name: 'GraphConsumerComponent',
      props: {
        node: { type: Object, required: true },
        lf: { type: Object, required: true },
        model: { type: Object, required: true },
        graph: { type: Object, default: undefined },
        updateProperty: { type: Function, required: true },
        updateProperties: { type: Function, required: true },
      },
      setup(props: FlowVueNodeProps) {
        capturedGraph = props.graph;
        return () => h('div', { class: 'graph-consumer-node' });
      },
    });

    VueNodeRegistry.register(lf, 'vue-graph-consumer', GraphConsumerComponent);

    lf.render({
      nodes: [
        { id: 'n-consumer', type: 'vue-graph-consumer', x: 100, y: 100 },
        { id: 'n-other', type: 'rect', x: 300, y: 100 },
      ],
      edges: [],
    });

    expect(capturedGraph).toBeDefined();
    expect(capturedGraph?.nodes.length).toBe(2);
  });
});
