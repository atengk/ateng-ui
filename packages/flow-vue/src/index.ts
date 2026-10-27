/**
 * @atengk/flow-vue 核心入口。
 *
 * 导出 AtengFlowCanvas、AtengFlowDesigner、AtengFlowStencil、预设图元、连线规则与完整强类型契约。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import type { App } from 'vue';
import AtengFlowCanvas from './components/AtengFlowCanvas.vue';
import AtengFlowDesigner from './components/AtengFlowDesigner.vue';
import AtengFlowStencil from './components/AtengFlowStencil.vue';

export { AtengFlowCanvas, AtengFlowDesigner, AtengFlowStencil };
export { useFlow } from './composables/useFlow';
export { registerPresetNodes, FlowNodeType, DEFAULT_STENCIL_GROUPS } from './presets';

/**
 * Vue 插件安装器，支持 app.use(install)。
 */
export function install(app: App): void {
  app.component('AtengFlowCanvas', AtengFlowCanvas);
  app.component('AtengFlowDesigner', AtengFlowDesigner);
  app.component('AtengFlowStencil', AtengFlowStencil);
}

export type AtengFlowCanvasInstance = InstanceType<typeof AtengFlowCanvas>;
export type AtengFlowDesignerInstance = InstanceType<typeof AtengFlowDesigner>;
export type AtengFlowStencilInstance = InstanceType<typeof AtengFlowStencil>;

export type {
  FlowNode,
  FlowEdge,
  FlowGraph,
  FlowTextConfig,
  FlowOptions,
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
} from './types';

export type { FlowNodeTypeValue, BeforeConnectHook, StencilItem, StencilGroup } from './presets';
