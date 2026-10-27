# @atengk/flow-vue

面向现代 Web 应用与企业级审批流、状态机的工业级流程设计与流转可视化扩展套件。

遵循纯原生强类型契约、零强依赖 UI 框架（L2 专用能力层）、深模块解耦设计，深度集成 LogicFlow 2.x 核心引擎，支持正交折线磁吸路由、开箱即用拓扑防呆守卫、三段式物料面板、属性配置抽屉与全量插槽接管。

---

## 维度零：特性与公共 API 全景速查矩阵

| 特性分类         | 特性名称               | 核心门面 / 组件 / Hook   | 关键参数 / Props / Emits                                                                                                                  | 核心行为说明                                                                                                                 | 锚定验证源头 (*Test / Sample)                                                                                               |
| :--------------- | :--------------------- | :----------------------- | :---------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| **画布核心**     | 流程画布组件           | `AtengFlowCanvas`        | `modelValue`, `options`, `disabled`, `@node:click`, `@edge:click`, `@blank:click`, `@change`                                              | 基础流程拓扑画布，集成 DOM 自适应 Resize、图元双向数据流与撤销重做历史栈                                                     | [AtengFlowCanvas.test.ts](./test/AtengFlowCanvas.test.ts) / [App.vue](../../apps/sample-flow-vue/src/App.vue)               |
| **无头状态机**   | 流程无头状态机         | `useFlow`                | `(options?) -> UseFlowReturn`                                                                                                             | 纯响应式状态机，提供 `init`, `render`, `getGraphData`, `zoomIn`, `fitView`, `undo`, `destroy` 等原子操作门面                 | [useFlow.test.ts](./test/useFlow.test.ts)                                                                                   |
| **设计器主容器** | 流程编排设计器         | `AtengFlowDesigner`      | `v-model`, `stencilGroups`, `beforeConnect`, `showPanel`, `panelWidth`, `#stencil`, `#panel`, `#toolbar`                                  | 工业级流程设计器容器，组装物料面板、画布、智能对齐线（Snapline）、四向磁吸与属性抽屉                                         | [AtengFlowDesigner.test.ts](./test/AtengFlowDesigner.test.ts) / [App.vue](../../apps/sample-flow-vue/src/App.vue)           |
| **物料面板**     | 三段式图元库           | `AtengFlowStencil`       | `groups`, `lf`, `title`, `@dragstart`, `@item:click`                                                                                      | 遵循事件/任务/网关三段式规范分类展示预设图元，支持关键词即时过滤与 LogicFlow DND 拖拽投递                                    | [presets.test.ts](./test/presets.test.ts) / [App.vue](../../apps/sample-flow-vue/src/App.vue)                               |
| **属性抽屉**     | 元素属性配置抽屉       | `AtengFlowPropertyPanel` | `element`, `disabled`, `title`, `@update:property`, `@update:properties`, `@close`, `#header`, `#footer`, `#extra`                        | 针对选中节点与连线提供纯原生无依赖表单（只读 ID、名称、流转条件表达式、审批人与会签模式）                                    | [AtengFlowPropertyPanel.test.ts](./test/AtengFlowPropertyPanel.test.ts) / [App.vue](../../apps/sample-flow-vue/src/App.vue) |
| **顶部工具栏**   | 控制栏动作矩阵         | `AtengFlowToolbar`       | `lf`, `canUndo`, `canRedo`, `disabled`, `@zoom-in`, `@fit-view`, `@undo`, `@redo`, `@clear`, `@layout`, `@toggle-grid`, `@toggle-minimap` | 集成缩放控制、Undo/Redo、网格切换、小地图开关、防误触清空弹层与自动排版动作触发                                              | [AtengFlowToolbar.test.ts](./test/AtengFlowToolbar.test.ts) / [App.vue](../../apps/sample-flow-vue/src/App.vue)             |
| **自动排版**     | DAG 分层排版引擎       | `AutoLayoutEngine`       | `layout(graph, options?: AutoLayoutOptions) -> FlowGraph`                                                                                 | 基于有向无环图分层拓扑算法，计算 Rank 与节点间距，支持水平 (LR) 与垂直 (TB) 规整重排与折点自适应更新                         | [AutoLayoutEngine.test.ts](./test/AutoLayoutEngine.test.ts) / [App.vue](../../apps/sample-flow-vue/src/App.vue)             |
| **预设与规则**   | 核心预设图元与拓扑防呆 | `registerPresetNodes`    | `(lf: LogicFlow, beforeConnect?: BeforeConnectHook) => void`                                                                              | 注册开始、结束、审批任务、服务任务、排他网关、并行网关，内置禁止自环/禁止连入开始/禁止结束流出/禁止重复连线                  | [presets.test.ts](./test/presets.test.ts) / [App.vue](../../apps/sample-flow-vue/src/App.vue)                               |
| **图元枚举**     | 预设节点类型常量       | `FlowNodeType`           | `START`, `END`, `USER_TASK`, `SERVICE_TASK`, `CC_TASK`, `EXCLUSIVE_GATEWAY`, `PARALLEL_GATEWAY`                                           | 标准化图元类型标识字典（如 `flow:start`, `flow:user-task`）                                                                  | [presets.test.ts](./test/presets.test.ts)                                                                                   |
| **物料常量**     | 默认三段式物料分组     | `DEFAULT_STENCIL_GROUPS` | `StencilGroup[]`                                                                                                                          | 默认物料预设分组配置（事件类、任务类、网关控制类）                                                                           | [presets.test.ts](./test/presets.test.ts)                                                                                   |
| **插件安装**     | 全局组件注册器         | `install`                | `(app: App) => void`                                                                                                                      | 批量向 Vue 应用注册 `AtengFlowCanvas`, `AtengFlowDesigner`, `AtengFlowStencil`, `AtengFlowPropertyPanel`, `AtengFlowToolbar` | [index.ts](./src/index.ts) / [main.ts](../../apps/sample-flow-vue/src/main.ts)                                              |

---

## 维度一：最小起步体验 (Happy Path)

### 1. 安装依赖

```bash
pnpm add @atengk/flow-vue @logicflow/core
```

### 2. 开箱即用流程设计器

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { AtengFlowDesigner, type FlowGraph } from '@atengk/flow-vue';
import '@atengk/flow-vue/style.css';

const flowGraph = ref<FlowGraph>({
  nodes: [
    { id: 'start-1', type: 'flow:start', x: 100, y: 150, text: '开始' },
    { id: 'task-1', type: 'flow:user-task', x: 280, y: 150, text: '部门主管审批' },
    { id: 'end-1', type: 'flow:end', x: 460, y: 150, text: '结束' },
  ],
  edges: [
    { id: 'edge-1', type: 'polyline', sourceNodeId: 'start-1', targetNodeId: 'task-1' },
    { id: 'edge-2', type: 'polyline', sourceNodeId: 'task-1', targetNodeId: 'end-1' },
  ],
});
</script>

<template>
  <div style="width: 100vw; height: 100vh;">
    <!-- 开箱即用：内置物料面板、Snapline 对齐线、四向磁吸与属性配置抽屉 -->
    <AtengFlowDesigner v-model="flowGraph" />
  </div>
</template>
```

---

## 维度二：生产扩展接管 (Customization & Extensibility)

### 1. 使用 Element Plus 表单接管属性抽屉 (`#panel` 插槽)

`@atengk/flow-vue` 作为 L2 专用能力层保持纯原生中立，业务工程（如配合 `@atengk/element-plus` 或 Element Plus）可通过具名插槽 `#panel` 无缝接管右侧配置面板：

```vue
<template>
  <AtengFlowDesigner v-model="flowGraph">
    <template #panel="{ element, updateProperty, close }">
      <div class="custom-property-panel">
        <header class="panel-header">
          <span>业务属性配置 ({{ element.type }})</span>
          <el-button link @click="close">关闭</el-button>
        </header>

        <el-form label-position="top">
          <el-form-item label="名称">
            <el-input :model-value="element.name" @input="val => updateProperty('name', val)" />
          </el-form-item>

          <!-- 审批人配置 -->
          <el-form-item v-if="element.type.includes('task')" label="审批办理人">
            <el-input
              :model-value="element.properties.assignee"
              placeholder="请输入审批人工号或角色"
              @input="val => updateProperty('assignee', val)"
            />
          </el-form-item>

          <!-- 条件表达式配置 -->
          <el-form-item v-if="element.elementType === 'edge'" label="流转条件表达式">
            <el-input
              :model-value="element.properties.condition"
              placeholder="${amount > 10000}"
              @input="val => updateProperty('condition', val)"
            />
          </el-form-item>
        </el-form>
      </div>
    </template>
  </AtengFlowDesigner>
</template>
```

### 2. 注入业务级连线拦截守卫 (`beforeConnect`)

```ts
import type { BeforeConnectHook } from '@atengk/flow-vue';

const customBeforeConnect: BeforeConnectHook = (source, target) => {
  // 禁止从开始节点直接跨越直连结束节点
  if (source.type.includes('start') && target.type.includes('end')) {
    return '业务规则拦截：流程不可从【开始节点】直接跳过审批流转至【结束节点】！';
  }
  return true;
};
```

---

## 维度三：核心生产边界与非功能语义 (Production Boundary & Failure Modes)

1. **响应式双向回写与撤销重做（Undo/Redo）历史栈联动**：
   - 当调用 `updateProperty(key, value)` 或 `updateProperties(patch)` 时，内部自动调用 LogicFlow 底层 `setProperties` 与 `updateText`；
   - 属性与文本更新自动推入 LogicFlow 的 MobX 操作历史队列，用户在顶部工具栏点击 `undo()` 或 `redo()` 时，属性表单内容与画布文本同步撤销回退，彻底杜绝数据模型与历史栈脱节。
2. **开箱即用四向正交磁吸与拓扑防呆守卫**：
   - 节点仅暴露标准四向正交锚点（上、右、下、左）；
   - 默认开启拓扑守卫（`createCommonTargetRules`）：
     - 🛑 **禁止自环连线**：节点不可连接自身；
     - 🛑 **开始节点守卫**：开始节点不允许任何连线流入（Target 拦截）；
     - 🛑 **结束节点守卫**：结束节点不允许向外流出连线（Source 拦截）；
     - 🛑 **禁止重复连线**：相同源与目标节点之间禁止建立重复有向边；
     - 🛡️ 拦截触发时向外派发 `connection:not-allowed` 事件供业务层弹出警告提示。
3. **架构分层中立与零 UI 污染不变量**：
   - `@atengk/flow-vue` 归属四层单向拓扑的 **L2 专用能力层**，只依赖 `@atengk/core`、`@atengk/vue` 与 `@logicflow/core`；
   - 严禁在 `@atengk/flow-vue` 源码中直接 import Element Plus，默认面板采用自研 BEM 与原生 CSS 变量（`--at-flow-*`），实现对不同设计系统的完全透明接管。

---

## 维度四：物理排版与代码全真验证 (Evergreen & Zero-Glitch)

- 本包所有公开组件与方法均具备 100% 离线自洽的单元测试覆盖；
- 真实端到端场景在自验工程 [`apps/sample-flow-vue`](../../apps/sample-flow-vue/src/App.vue) 中完整呈现；
- 运行测试与构建：
  ```bash
  pnpm --filter @atengk/flow-vue test
  pnpm --filter @atengk/flow-vue build
  ```
