/**
 * @atengk/flow-vue 核心入口。
 *
 * 导出 AtengFlowCanvas、AtengFlowDesigner、AtengFlowStencil、AtengFlowPropertyPanel、AtengFlowToolbar、
 * AutoLayoutEngine 自动排版引擎、预设图元、连线规则与完整强类型契约。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import type { App } from 'vue';
import AtengFlowCanvas from './components/AtengFlowCanvas.vue';
import AtengFlowDesigner from './components/AtengFlowDesigner.vue';
import AtengFlowStencil from './components/AtengFlowStencil.vue';
import AtengFlowPropertyPanel from './components/AtengFlowPropertyPanel.vue';
import AtengFlowToolbar from './components/AtengFlowToolbar.vue';
import ApprovalCardNode from './components/ApprovalCardNode.vue';
import AtengFlowViewer from './components/AtengFlowViewer.vue';

export {
  AtengFlowCanvas,
  AtengFlowDesigner,
  AtengFlowStencil,
  AtengFlowPropertyPanel,
  AtengFlowToolbar,
  ApprovalCardNode,
  AtengFlowViewer,
};
export { useFlow } from './composables/useFlow';
export { registerPresetNodes, FlowNodeType, DEFAULT_STENCIL_GROUPS } from './presets';
export { AutoLayoutEngine } from './layout';
export { FlowValidator, FlowValidationRuleCode } from './validator';
export { BpmnAdapter } from './bpmn';
export { FlowSnapshot } from './snapshot';
export { VueNodeRegistry, registerVueNode } from './registry';

/**
 * Vue 插件安装器，支持 app.use(install)。
 */
export function install(app: App): void {
  app.component('AtengFlowCanvas', AtengFlowCanvas);
  app.component('AtengFlowDesigner', AtengFlowDesigner);
  app.component('AtengFlowViewer', AtengFlowViewer);
  app.component('AtengFlowStencil', AtengFlowStencil);
  app.component('AtengFlowPropertyPanel', AtengFlowPropertyPanel);
  app.component('AtengFlowToolbar', AtengFlowToolbar);
  app.component('ApprovalCardNode', ApprovalCardNode);
}

export type AtengFlowCanvasInstance = InstanceType<typeof AtengFlowCanvas>;
export type AtengFlowDesignerInstance = InstanceType<typeof AtengFlowDesigner>;
export type AtengFlowViewerInstance = InstanceType<typeof AtengFlowViewer>;
export type AtengFlowStencilInstance = InstanceType<typeof AtengFlowStencil>;
export type AtengFlowPropertyPanelInstance = InstanceType<typeof AtengFlowPropertyPanel>;
export type AtengFlowToolbarInstance = InstanceType<typeof AtengFlowToolbar>;
export type ApprovalCardNodeInstance = InstanceType<typeof ApprovalCardNode>;

export type {
  FlowNode,
  FlowEdge,
  FlowGraph,
  FlowTextConfig,
  FlowOptions,
  FlowElementType,
  FlowElementData,
  FlowPanelSlotProps,
  LayoutDirection,
  AutoLayoutOptions,
  UseFlowOptions,
  UseFlowReturn,
  AtengFlowCanvasProps,
  AtengFlowCanvasEmits,
  AtengFlowCanvasSlots,
  AtengFlowCanvasExpose,
  AtengFlowDesignerProps,
  AtengFlowDesignerEmits,
  AtengFlowDesignerSlots,
  AtengFlowDesignerExpose,
  AtengFlowStencilProps,
  AtengFlowStencilEmits,
  AtengFlowPropertyPanelProps,
  AtengFlowPropertyPanelEmits,
  AtengFlowPropertyPanelSlots,
  AtengFlowPropertyPanelExpose,
  AtengFlowToolbarProps,
  AtengFlowToolbarEmits,
  AtengFlowToolbarSlots,
  AtengFlowToolbarExpose,
  ApprovalCardNodeProps,
  CustomVueNodeConfig,
  AtengFlowViewerProps,
  AtengFlowViewerEmits,
  AtengFlowViewerSlots,
  AtengFlowViewerExpose,
  ExecutionStatus,
  AuditRecord,
  FlowExecutionItem,
  FlowStatusMap,
} from './types';
export { FlowExecutionStatus, STATUS_TEXT_MAP, STATUS_BADGE_CLASS_MAP } from './types';

export type { FlowNodeTypeValue, BeforeConnectHook, StencilItem, StencilGroup } from './presets';
export type {
  FlowValidationError,
  FlowValidationResult,
  FlowValidationRuleCodeValue,
} from './validator';
export type { BpmnExportOptions } from './bpmn';
export type { FlowWatermarkOptions, FlowSnapshotOptions, FlowBoundingBox } from './snapshot';
export type { FlowVueNodeProps, VueNodeOptions, FlowAnchorConfig } from './registry';
