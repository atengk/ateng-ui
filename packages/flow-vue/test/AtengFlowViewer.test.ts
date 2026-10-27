/**
 * AtengFlowViewer 运行态只读流转追踪器组件单元测试。
 *
 * 依据 ADR-0033 与工单 #169，验证只读锁定、五态样式渲染、SmartFocus、悬停审计浮层与 WheelZoomGuard。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import AtengFlowViewer from '../src/components/AtengFlowViewer.vue';
import { FlowNodeType } from '../src/presets';
import type {
  FlowGraph,
  FlowNode,
  AuditRecord,
  FlowStatusMap,
  AtengFlowViewerExpose,
} from '../src/types';

interface TestLfInstance {
  getEditConfig: () => Record<string, unknown>;
  focusOn: (args: unknown) => void;
  emit: (event: string, payload: unknown) => void;
  zoom: (direction: boolean) => void;
  resetZoom: () => void;
  fitView: () => void;
}

describe('AtengFlowViewer 运行态流转追踪器', () => {
  let wrapper: VueWrapper | null = null;

  const testGraph: FlowGraph = {
    nodes: [
      { id: 'start-1', type: FlowNodeType.START, x: 100, y: 150, text: '提交申请' },
      { id: 'task-leader', type: FlowNodeType.USER_TASK, x: 280, y: 150, text: '部门主管审批' },
      { id: 'task-cfo', type: FlowNodeType.USER_TASK, x: 480, y: 150, text: '财务总监审核' },
      { id: 'end-1', type: FlowNodeType.END, x: 680, y: 150, text: '归档完成' },
    ],
    edges: [
      { id: 'edge-1', type: 'polyline', sourceNodeId: 'start-1', targetNodeId: 'task-leader' },
      { id: 'edge-2', type: 'polyline', sourceNodeId: 'task-leader', targetNodeId: 'task-cfo' },
      { id: 'edge-3', type: 'polyline', sourceNodeId: 'task-cfo', targetNodeId: 'end-1' },
    ],
  };

  const testStatusMap: FlowStatusMap = {
    'start-1': 'completed',
    'edge-1': 'completed',
    'task-leader': {
      status: 'completed',
      audit: [
        {
          id: 'audit-1',
          operator: '李主管',
          status: 'completed',
          time: '2026-10-27 10:00:00',
          duration: '10分钟',
          comment: '同意立项，请财务核准预算',
        },
      ],
    },
    'edge-2': 'processing',
    'task-cfo': {
      status: 'processing',
      audit: [
        {
          id: 'audit-2',
          operator: '王财务',
          status: 'processing',
          time: '2026-10-27 10:30:00',
          comment: '正在核对项目采购清单与报销发票',
        },
      ],
    },
    'edge-3': 'pending',
    'end-1': 'pending',
  };

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
  });

  it('应该在严格只读模式下初始化画布，禁止连线编辑与拖拽', async () => {
    wrapper = mount(AtengFlowViewer, {
      props: {
        modelValue: testGraph,
        statusMap: testStatusMap,
      },
      attachTo: document.body,
    });

    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 50));
    const expose = wrapper.vm as unknown as AtengFlowViewerExpose;
    const lf = expose.getLf();
    expect(lf).not.toBeNull();

    // 验证只读配置 (isSilentMode: true, 禁用拖拽与锚点)
    const testLf = lf as unknown as TestLfInstance;
    const editConfig = testLf.getEditConfig();
    expect(editConfig.isSilentMode).toBe(true);
    expect(editConfig.adjustNodePosition).toBe(false);
    expect(editConfig.hideAnchors).toBe(true);
    expect(editConfig.nodeTextEdit).toBe(false);
    expect(editConfig.stopMoveGraph).toBe(false); // 允许平移视口
  });

  it('应该正确将五态流转映射渲染至节点与连线模型', async () => {
    wrapper = mount(AtengFlowViewer, {
      props: {
        modelValue: testGraph,
        statusMap: testStatusMap,
      },
      attachTo: document.body,
    });

    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 50));
    const expose = wrapper.vm as unknown as AtengFlowViewerExpose;
    const lf = expose.getLf();

    // 检查 task-leader 属性被注入 completed 状态
    const leaderModel = lf?.getNodeModelById('task-leader');
    expect(leaderModel?.getProperties()?.status).toBe('completed');

    // 检查 task-cfo 属性被注入 processing 状态
    const cfoModel = lf?.getNodeModelById('task-cfo');
    expect(cfoModel?.getProperties()?.status).toBe('processing');

    // 检查 DOM/SVG 渲染了对应的五态 CSS 类名
    expect(wrapper.html()).toContain('at-flow-status--completed');
    expect(wrapper.html()).toContain('at-flow-status--processing');

    // 检查 edge-1 为 completed，edge-2 为 processing
    const edge1Model = lf?.getEdgeModelById('edge-1');
    expect(edge1Model?.getProperties()?.status).toBe('completed');
    const edge2Model = lf?.getEdgeModelById('edge-2');
    expect(edge2Model?.getProperties()?.status).toBe('processing');

    // 动态调用 setStatusMap 进行状态热更新
    expose.setStatusMap({
      ...testStatusMap,
      'task-cfo': 'rejected',
    });
    await nextTick();
    expect(lf?.getNodeModelById('task-cfo')?.getProperties()?.status).toBe('rejected');
  });

  it('应该在 focusActiveNode=true 时自动调用 focusOn 聚焦首个 processing 节点', async () => {
    wrapper = mount(AtengFlowViewer, {
      props: {
        modelValue: testGraph,
        statusMap: testStatusMap,
        focusActiveNode: true,
      },
      attachTo: document.body,
    });

    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 50));
    const expose = wrapper.vm as unknown as AtengFlowViewerExpose;
    const lf = expose.getLf();
    expect(lf).not.toBeNull();

    const testLf = lf as unknown as TestLfInstance;
    const focusSpy = vi.spyOn(testLf, 'focusOn');

    // 手动触发智能聚焦
    expose.focusActiveNode();
    expect(focusSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'task-cfo' }));

    // 手动聚焦指定节点
    expose.focusNode('start-1');
    expect(focusSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'start-1' }));

    // 回退场景：statusMap 为空，但图元自身 properties.status 预置为 processing 时正常识别
    const graphWithPropStatus: FlowGraph = {
      nodes: [
        {
          id: 'task-prop-processing',
          type: FlowNodeType.USER_TASK,
          x: 200,
          y: 150,
          properties: { status: 'processing' },
        },
      ],
      edges: [],
    };
    const fallbackWrapper = mount(AtengFlowViewer, {
      props: {
        modelValue: graphWithPropStatus,
        statusMap: {},
      },
      attachTo: document.body,
    });
    await nextTick();
    const fallbackExpose = fallbackWrapper.vm as unknown as AtengFlowViewerExpose;
    const fallbackLf = fallbackExpose.getLf() as unknown as TestLfInstance;
    const fallbackSpy = vi.spyOn(fallbackLf, 'focusOn');
    fallbackExpose.focusActiveNode();
    expect(fallbackSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'task-prop-processing' }),
    );
    fallbackWrapper.unmount();
  });

  it('应该支持鼠标悬停节点触发审计浮层与事件派发', async () => {
    wrapper = mount(AtengFlowViewer, {
      props: {
        modelValue: testGraph,
        statusMap: testStatusMap,
      },
      attachTo: document.body,
    });

    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 50));
    const expose = wrapper.vm as unknown as AtengFlowViewerExpose;
    const lf = expose.getLf();
    const testLf = lf as unknown as TestLfInstance;

    // 模拟 node:mouseenter 事件
    testLf.emit('node:mouseenter', {
      data: testGraph.nodes[1], // task-leader
      e: new MouseEvent('mouseenter', { clientX: 280, clientY: 150 }),
    });
    await nextTick();

    // 验证事件派发
    expect(wrapper.emitted('node:hover')).toBeTruthy();
    const hoverEvents = (wrapper.emitted('node:hover') ?? []) as unknown as Array<
      [FlowNode | null, AuditRecord[] | undefined]
    >;
    expect(hoverEvents[0][0]?.id).toBe('task-leader');
    expect(hoverEvents[0][1]?.[0]?.operator).toBe('李主管');

    // 验证弹出的默认审计浮层 DOM
    const popover = wrapper.find('.at-flow-audit-popover');
    expect(popover.exists()).toBe(true);
    expect(popover.text()).toContain('部门主管审批');
    expect(popover.text()).toContain('李主管');
    expect(popover.text()).toContain('同意立项');

    // 模拟 node:mouseleave 事件
    testLf.emit('node:mouseleave', {
      data: testGraph.nodes[1],
      e: new MouseEvent('mouseleave'),
    });
    // 等待防抖延迟关闭
    await new Promise(resolve => setTimeout(resolve, 200));
    await nextTick();

    // 浮层关闭
    const lastHoverEvent = hoverEvents[hoverEvents.length - 1];
    expect(lastHoverEvent[0]).toBeNull();
  });

  it('应该在悬停无状态且无审计记录的未流转节点时忽略浮层弹出', async () => {
    wrapper = mount(AtengFlowViewer, {
      props: {
        modelValue: testGraph,
        statusMap: {}, // 无状态字典
      },
      attachTo: document.body,
    });

    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 50));
    const expose = wrapper.vm as unknown as AtengFlowViewerExpose;
    const lf = expose.getLf();
    const testLf = lf as unknown as TestLfInstance;

    // 模拟悬停普通未配置状态且无审计意见的节点
    testLf.emit('node:mouseenter', {
      data: testGraph.nodes[0],
      e: new MouseEvent('mouseenter', { clientX: 100, clientY: 150 }),
    });
    await nextTick();

    // 验证未弹出浮层且无 hover 事件
    expect(wrapper.find('.at-flow-audit-popover').exists()).toBe(false);
    expect(wrapper.emitted('node:hover')).toBeFalsy();
  });

  it('应该支持自定义 #audit-popover 插槽接管浮层渲染', async () => {
    wrapper = mount(AtengFlowViewer, {
      props: {
        modelValue: testGraph,
        statusMap: testStatusMap,
      },
      slots: {
        'audit-popover': `
          <template #audit-popover="{ node, auditList }">
            <div class="custom-audit-card">
              <span class="custom-node-name">{{ node.text }}</span>
              <span class="custom-operator">{{ auditList[0]?.operator }}</span>
            </div>
          </template>
        `,
      },
      attachTo: document.body,
    });

    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 50));
    const expose = wrapper.vm as unknown as AtengFlowViewerExpose;
    const lf = expose.getLf();
    const testLf = lf as unknown as TestLfInstance;

    testLf.emit('node:mouseenter', {
      data: testGraph.nodes[1],
      e: new MouseEvent('mouseenter', { clientX: 280, clientY: 150 }),
    });
    await nextTick();

    const customCard = wrapper.find('.custom-audit-card');
    expect(customCard.exists()).toBe(true);
    expect(customCard.find('.custom-node-name').text()).toBe('部门主管审批');
    expect(customCard.find('.custom-operator').text()).toBe('李主管');
  });

  it('应该支持 WheelZoomGuard：普通滚轮展示提示，Ctrl+滚轮缩放画布', async () => {
    wrapper = mount(AtengFlowViewer, {
      props: {
        modelValue: testGraph,
        statusMap: testStatusMap,
        wheelZoomGuard: true,
      },
      attachTo: document.body,
    });

    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 50));
    const expose = wrapper.vm as unknown as AtengFlowViewerExpose;
    const lf = expose.getLf();
    const testLf = lf as unknown as TestLfInstance;
    const zoomSpy = vi.spyOn(testLf, 'zoom');

    const rootEl = wrapper.find('.at-flow-viewer');

    // 1. 普通滚轮（无 Ctrl）
    await rootEl.trigger('wheel', { deltaY: -100, ctrlKey: false });
    await nextTick();

    // 不触发 LogicFlow 缩放，出现浮动提示条
    expect(zoomSpy).not.toHaveBeenCalled();
    const hint = wrapper.find('.at-flow-wheel-hint');
    expect(hint.exists()).toBe(true);
    expect(hint.text()).toContain('Ctrl');

    // 2. Ctrl + 滚轮
    await rootEl.trigger('wheel', { deltaY: -100, ctrlKey: true });
    await nextTick();

    // 触发画布放大
    expect(zoomSpy).toHaveBeenCalledWith(true);
  });

  it('应该渲染微型控制条并支持缩放、居中与重置动作', async () => {
    wrapper = mount(AtengFlowViewer, {
      props: {
        modelValue: testGraph,
        statusMap: testStatusMap,
        showMiniToolbar: true,
      },
      attachTo: document.body,
    });

    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 50));
    const expose = wrapper.vm as unknown as AtengFlowViewerExpose;
    const lf = expose.getLf();
    const testLf = lf as unknown as TestLfInstance;
    const zoomSpy = vi.spyOn(testLf, 'zoom');
    const resetZoomSpy = vi.spyOn(testLf, 'resetZoom');
    const fitViewSpy = vi.spyOn(testLf, 'fitView');

    const miniToolbar = wrapper.find('.at-flow-mini-toolbar');
    expect(miniToolbar.exists()).toBe(true);

    // 点击放大按钮
    const zoomInBtn = miniToolbar.find('button[title="放大"]');
    await zoomInBtn.trigger('click');
    expect(zoomSpy).toHaveBeenCalledWith(true);

    // 点击缩小按钮
    const zoomOutBtn = miniToolbar.find('button[title="缩小"]');
    await zoomOutBtn.trigger('click');
    expect(zoomSpy).toHaveBeenCalledWith(false);

    // 点击自适应按钮
    const fitViewBtn = miniToolbar.find('button[title="适应画布"]');
    await fitViewBtn.trigger('click');
    expect(fitViewSpy).toHaveBeenCalled();

    // 点击还原 1:1 按钮
    const resetBtn = miniToolbar.find('button[title="还原 1:1"]');
    await resetBtn.trigger('click');
    expect(resetZoomSpy).toHaveBeenCalled();
  });
});
