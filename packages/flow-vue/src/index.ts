/**
 * @atengk/flow-vue 核心入口。
 *
 * 导出 AtengFlowCanvas 表现容器、useFlow 组合式 Hook 与完整强类型契约。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import type { App } from 'vue';
import AtengFlowCanvas from './components/AtengFlowCanvas.vue';

export { AtengFlowCanvas };
export { useFlow } from './composables/useFlow';

/**
 * Vue 插件安装器，支持 app.use(install)。
 */
export function install(app: App): void {
  app.component('AtengFlowCanvas', AtengFlowCanvas);
}

export type AtengFlowCanvasInstance = InstanceType<typeof AtengFlowCanvas>;

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
} from './types';
