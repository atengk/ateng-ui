/**
 * @atengk/flow-vue 核心入口。
 *
 * 导出 AtengFlowCanvas、AtengFlowDesigner、AtengFlowStencil、AtengFlowPropertyPanel、
 * 预设图元、连线规则与完整强类型契约。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import type { App } from 'vue';
import AtengFlowCanvas from './components/AtengFlowCanvas.vue';
import AtengFlowDesigner from './components/AtengFlowDesigner.vue';
import AtengFlowStencil from './components/AtengFlowStencil.vue';
import AtengFlowPropertyPanel from './components/AtengFlowPropertyPanel.vue';

export { AtengFlowCanvas, AtengFlowDesigner, AtengFlowStencil, AtengFlowPropertyPanel };
export { useFlow } from './composables/useFlow';
export { registerPresetNodes, FlowNodeType, DEFAULT_STENCIL_GROUPS } from './presets';

/**
 * Vue 插件安装器，支持 app.use(install)。
 */
export function install(app: App): void {
  app.component('AtengFlowCanvas', AtengFlowCanvas);
  app.component('AtengFlowDesigner', AtengFlowDesigner);
  app.component('AtengFlowStencil', AtengFlowStencil);
  app.component('AtengFlowPropertyPanel', AtengFlowPropertyPanel);
}

export type AtengFlowCanvasInstance = InstanceType<typeof AtengFlowCanvas>;
export type AtengFlowDesignerInstance = InstanceType<typeof AtengFlowDesigner>;
export type AtengFlowStencilInstance = InstanceType<typeof AtengFlowStencil>;
export type AtengFlowPropertyPanelInstance = InstanceType<typeof AtengFlowPropertyPanel>;

export type {
  FlowNode,
  FlowEdge,
  FlowGraph,
  FlowTextConfig,
  FlowOptions,
  FlowElementType,
  FlowElementData,
  FlowPanelSlotProps,
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
} from './types';

export type { FlowNodeTypeValue, BeforeConnectHook, StencilItem, StencilGroup } from './presets';
