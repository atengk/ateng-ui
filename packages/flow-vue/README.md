# @atengk/flow-vue

面向现代 Web 应用与企业级审批流、状态机的工业级流程设计与流转可视化扩展套件。

遵循纯原生强类型契约、零强依赖 UI 框架（L2 专用能力层）、深模块解耦设计，深度集成 LogicFlow 2.x 核心引擎，支持正交折线磁吸路由、开箱即用拓扑防呆守卫、三段式物料面板、属性配置抽屉与全量插槽接管。

---

## 维度零：特性与公共 API 全景速查矩阵

| 特性分类             | 特性名称               | 核心门面 / 组件 / Hook                                               | 关键参数 / Props / Emits                                                                                                                               | 核心行为说明                                                                                                                                                        | 锚定验证源头 (*Test / Sample)                                                                                               |
| :------------------- | :--------------------- | :------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------- |
| **画布核心**         | 流程画布组件           | `AtengFlowCanvas`                                                    | `modelValue`, `options`, `disabled`, `@node:click`, `@edge:click`, `@blank:click`, `@change`                                                           | 基础流程拓扑画布，集成 DOM 自适应 Resize、图元双向数据流与撤销重做历史栈                                                                                            | [AtengFlowCanvas.test.ts](./test/AtengFlowCanvas.test.ts) / [App.vue](../../apps/sample-flow-vue/src/App.vue)               |
| **无头状态机**       | 流程无头状态机         | `useFlow`                                                            | `(options?) -> UseFlowReturn`                                                                                                                          | 纯响应式状态机，提供 `init`, `render`, `getGraphData`, `zoomIn`, `fitView`, `undo`, `destroy` 等原子操作门面                                                        | [useFlow.test.ts](./test/useFlow.test.ts)                                                                                   |
| **设计器主容器**     | 流程编排设计器         | `AtengFlowDesigner`                                                  | `v-model`, `stencilGroups`, `beforeConnect`, `showPanel`, `panelWidth`, `#stencil`, `#panel`, `#toolbar`, `@validate`                                  | 工业级流程设计器容器，组装物料面板、画布、智能对齐线（Snapline）、四向磁吸、属性抽屉与静态拓扑校验引擎                                                              | [AtengFlowDesigner.test.ts](./test/AtengFlowDesigner.test.ts) / [App.vue](../../apps/sample-flow-vue/src/App.vue)           |
| **流转追踪器**       | 运行态只读流转容器     | `AtengFlowViewer`                                                    | `modelValue`, `statusMap`, `focusActiveNode`, `wheelZoomGuard`, `showMiniToolbar`, `#audit-popover`, `#mini-toolbar`                                   | 专用于业务详情与审批工单的只读流转追踪器，支持五态高亮与呼吸流动虚线、悬停审批审计浮层、SmartFocus 智能待办聚焦与 WheelZoomGuard 滚轮防冲突                         | [AtengFlowViewer.test.ts](./test/AtengFlowViewer.test.ts) / [App.vue](../../apps/sample-flow-vue/src/App.vue)               |
| **物料面板**         | 三段式图元库           | `AtengFlowStencil`                                                   | `groups`, `lf`, `title`, `@dragstart`, `@item:click`                                                                                                   | 遵循事件/任务/网关三段式规范分类展示预设图元，支持关键词即时过滤与 LogicFlow DND 拖拽投递                                                                           | [presets.test.ts](./test/presets.test.ts) / [App.vue](../../apps/sample-flow-vue/src/App.vue)                               |
| **属性抽屉**         | 元素属性配置抽屉       | `AtengFlowPropertyPanel`                                             | `element`, `disabled`, `title`, `@update:property`, `@update:properties`, `@close`, `#header`, `#footer`, `#extra`                                     | 针对选中节点与连线提供纯原生无依赖表单（只读 ID、名称、流转条件表达式、审批人与会签模式）                                                                           | [AtengFlowPropertyPanel.test.ts](./test/AtengFlowPropertyPanel.test.ts) / [App.vue](../../apps/sample-flow-vue/src/App.vue) |
| **顶部工具栏**       | 控制栏动作矩阵         | `AtengFlowToolbar`                                                   | `lf`, `canUndo`, `canRedo`, `disabled`, `@zoom-in`, `@fit-view`, `@undo`, `@redo`, `@clear`, `@layout`, `@toggle-grid`, `@toggle-minimap`, `@validate` | 集成缩放控制、Undo/Redo、网格切换、小地图开关、防误触清空弹层、自动排版与静态拓扑校验触发                                                                           | [AtengFlowToolbar.test.ts](./test/AtengFlowToolbar.test.ts) / [App.vue](../../apps/sample-flow-vue/src/App.vue)             |
| **静态拓扑校验**     | 流程静态校验引擎       | `FlowValidator`                                                      | `validate(graph) -> FlowValidationResult`, `hasErrors(result) -> boolean`                                                                              | 纯原生 TypeScript 校验 5 大图论刚性规则（起止唯一性、连通孤岛、排他网关分支与条件、无出口死循环检测）并输出结构化诊断实体集合                                       | [FlowValidator.test.ts](./test/FlowValidator.test.ts) / [App.vue](../../apps/sample-flow-vue/src/App.vue)                   |
| **规则代号枚举**     | 拓扑校验规则常量       | `FlowValidationRuleCode`                                             | `START_NODE_MISSING`, `DEADLOCK_CYCLE`, `GATEWAY_BRANCH_INSUFFICIENT` 等                                                                               | 结构化图论校验错误分类代号枚举字典                                                                                                                                  | [FlowValidator.test.ts](./test/FlowValidator.test.ts)                                                                       |
| **BPMN 转译器**      | BPMN 2.0 协议互转      | `BpmnAdapter`                                                        | `toBpmnXml(graph, options?) -> string`, `fromBpmnXml(xml) -> FlowGraph`                                                                                | 纯原生双向协议转译，兼容 Flowable/Camunda 标准规范，精确还原 Bounds 中心坐标、折点 Waypoint 与办理人/条件扩展属性                                                   | [BpmnAdapter.test.ts](./test/BpmnAdapter.test.ts) / [App.vue](../../apps/sample-flow-vue/src/App.vue)                       |
| **全景高清快照**     | 高清防虚快照导出       | `FlowSnapshot`                                                       | `computeBoundingBox`, `getSvgString`, `getSnapshot`, `download`                                                                                        | 最小外接边界自适应计算，2x/3x DPR 视网膜高清防虚栅格化，矢量 SVG 导出与自定义防泄密矩阵文本水印                                                                     | [FlowSnapshot.test.ts](./test/FlowSnapshot.test.ts) / [App.vue](../../apps/sample-flow-vue/src/App.vue)                     |
| **Vue 节点注册**     | SFC 自定义卡片适配     | `VueNodeRegistry`                                                    | `register(target, type, component, options?)` / `registerVueNode`                                                                                      | 将普通 Vue 3 SFC 单文件组件桥接注册为 LogicFlow 自定义卡片节点，响应式 Props 注入、原地 Diff 更新与销毁确定性清理                                                   | [VueNodeRegistry.test.ts](./test/VueNodeRegistry.test.ts) / [App.vue](../../apps/sample-flow-vue/src/App.vue)               |
| **预设审批卡片**     | 高颜值业务卡片节点     | `ApprovalCardNode`                                                   | `props: FlowVueNodeProps`, `@click:approve`, `@click:reject`                                                                                           | 预设开箱即用高颜值审批卡片，带头像、类型胶囊、状态指示徽标、办理进度条与快捷审批动作，支持双向属性回写                                                              | [VueNodeRegistry.test.ts](./test/VueNodeRegistry.test.ts) / [App.vue](../../apps/sample-flow-vue/src/App.vue)               |
| **五态枚举与字典**   | 执行状态枚举与样式字典 | `FlowExecutionStatus` / `STATUS_TEXT_MAP` / `STATUS_BADGE_CLASS_MAP` | `FlowExecutionStatus.*`, `Record<ExecutionStatus, string>`                                                                                             | 统一提供五态运行时枚举（COMPLETED/PROCESSING/REJECTED/PENDING/TERMINATED）与中文文案、专属 CSS 徽标映射字典                                                         | [types.ts](./src/types.ts) / [AtengFlowViewer.test.ts](./test/AtengFlowViewer.test.ts)                                      |
| **自动排版**         | DAG 分层排版引擎       | `AutoLayoutEngine` / `animateLayout`                                 | `layout(graph, options?) -> FlowGraph`, `animateLayout(lf, graph, options?)`                                                                           | 基于有向无环图分层拓扑算法，计算 Rank 与节点间距，支持水平 (LR) 与垂直 (TB) 规整重排、平滑缓动动画与折点自适应更新                                                  | [AutoLayoutEngine.test.ts](./test/AutoLayoutEngine.test.ts) / [App.vue](../../apps/sample-flow-vue/src/App.vue)             |
| **预设与规则**       | 核心预设图元与拓扑防呆 | `registerPresetNodes`                                                | `(lf: LogicFlow, beforeConnect?: BeforeConnectHook) => void`                                                                                           | 注册开始、结束、审批任务、服务任务、排他网关、并行网关与折线/贝塞尔连线，内置自环/起止点/重复连线防呆守卫                                                           | [presets.test.ts](./test/presets.test.ts) / [App.vue](../../apps/sample-flow-vue/src/App.vue)                               |
| **图元枚举与元数据** | 预设图元类型与徽标字典 | `FlowNodeType` / `NODE_TYPE_LABEL_MAP` / `getNodeBadgeIcon`          | `FlowNodeType.*`, `NODE_TYPE_LABEL_MAP`, `getNodeBadgeIcon(type) -> string`                                                                            | 标准化图元类型标识字典（如 `flow:start`）、显示名称映射与小徽标图标解析函数                                                                                         | [presets.test.ts](./test/presets.test.ts)                                                                                   |
| **物料常量**         | 默认三段式物料分组     | `DEFAULT_STENCIL_GROUPS`                                             | `StencilGroup[]`                                                                                                                                       | 默认物料预设分组配置（事件类、任务类、网关控制类）                                                                                                                  | [presets.test.ts](./test/presets.test.ts)                                                                                   |
| **插件安装**         | 全局组件注册器         | `install`                                                            | `(app: App) => void`                                                                                                                                   | 批量向 Vue 应用注册 `AtengFlowCanvas`, `AtengFlowDesigner`, `AtengFlowViewer`, `AtengFlowStencil`, `AtengFlowPropertyPanel`, `AtengFlowToolbar`, `ApprovalCardNode` | [index.ts](./src/index.ts) / [main.ts](../../apps/sample-flow-vue/src/main.ts)                                              |

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

### 3. 运行态只读流转追踪器 (AtengFlowViewer)

专用于 OA 审批、工单流转与进度追踪详情页，只读呈现五态状态高亮、悬停审批审计浮层与 SmartFocus 智能待办聚焦：

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { AtengFlowViewer, type FlowGraph, type FlowStatusMap } from '@atengk/flow-vue';
import '@atengk/flow-vue/style.css';

const flowGraph = ref<FlowGraph>({ ... });

const statusMap = ref<FlowStatusMap>({
  'start-1': 'completed',
  'task-leader': {
    status: 'completed',
    audit: [
      {
        operator: '李主管',
        status: 'completed',
        time: '2026-10-27 10:15',
        comment: '同意立项，报财务初审。',
      },
    ],
  },
  'task-cfo': {
    status: 'processing',
    audit: [
      {
        operator: '王财务',
        status: 'processing',
        time: '2026-10-27 11:00',
        comment: '正在复核发票与报销明细。',
      },
    ],
  },
  'end-1': 'pending',
});
</script>

<template>
  <div style="width: 100%; height: 500px;">
    <AtengFlowViewer
      :model-value="flowGraph"
      :status-map="statusMap"
      :focus-active-node="true"
      :wheel-zoom-guard="true"
    />
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

### 3. 使用标准 Vue 3 SFC 单文件组件注册富 UI 卡片节点 (`VueNodeRegistry`)

开发者可以直接编写标准 `.vue` 组件（使用 `<script setup>`、`<style scoped>` 或 Tailwind），利用 `registerVueNode` 注册为富 UI 审批卡片图元：

```vue
<!-- MyApprovalCard.vue -->
<script setup lang="ts">
import type { FlowVueNodeProps } from '@atengk/flow-vue';

const props = defineProps<FlowVueNodeProps>();

const handleApprove = () => {
  props.updateProperties({ status: 'approved', progress: 100 });
};
</script>

<template>
  <div class="my-card">
    <div class="card-title">{{ node.text || '审批卡片' }}</div>
    <div class="card-assignee">办理人: {{ node.properties.assignee }}</div>
    <button @click="handleApprove">✓ 快速核准</button>
  </div>
</template>
```

在设计器中直接注册与使用：

```vue
<script setup lang="ts">
import { AtengFlowDesigner } from '@atengk/flow-vue';
import MyApprovalCard from './MyApprovalCard.vue';

const customVueNodes = [
  {
    type: 'my-approval-card',
    component: MyApprovalCard,
    options: { width: 220, height: 90 },
  },
];
</script>

<template>
  <AtengFlowDesigner :custom-vue-nodes="customVueNodes" />
</template>
```

### 3. 自定义悬停审计卡片 (`#audit-popover` 插槽)

当默认的审计历史卡片无法满足企业级自定义视图或复杂操作需求时，可通过具名插槽 `#audit-popover` 完整接管：

```vue
<template>
  <AtengFlowViewer :model-value="flowGraph" :status-map="statusMap">
    <template #audit-popover="{ node, status, auditList, close }">
      <div class="my-custom-audit-popover">
        <header>
          <strong>{{ node.text }}</strong>
          <span>状态: {{ status }}</span>
        </header>
        <ul v-if="auditList.length">
          <li v-for="item in auditList" :key="item.operator">
            {{ item.operator }} ({{ item.time }}): {{ item.comment }}
          </li>
        </ul>
        <button @click="close">关闭</button>
      </div>
    </template>
  </AtengFlowViewer>
</template>
```

### 4. 低代码数据规则引擎与平滑贝塞尔路由 (`edgeType: 'bezier'` 与 `beforeConnect` 规则鉴权)

针对规则链引擎、流式计算拓扑与自动化工作流场景，可将连线路由切换为三次贝塞尔平滑曲线，并通过 `beforeConnect` 注入严格的 Source / Sink 角色鉴权：

```vue
<script setup lang="ts">
import { ref } from 'vue';
import {
  AtengFlowDesigner,
  FlowNodeType,
  type BeforeConnectHook,
  type FlowGraph,
  type StencilGroup,
} from '@atengk/flow-vue';

// 规则链拓扑鉴权钩子：严格校验输入、过滤、转换与输出拓扑单向流
const beforeRuleConnect: BeforeConnectHook = (source, target) => {
  // 禁止输入源被作为连线终点
  if (target.properties?.role === 'source') {
    return '规则拓扑拦截：数据输入源禁止作为连线终点！';
  }
  // 禁止输出汇聚终端向外连线
  if (source.properties?.role === 'sink') {
    return '规则拓扑拦截：汇聚输出终端为拓扑终点，禁止连出！';
  }
  // 禁止未经清洗过滤直接直连落盘
  if (source.properties?.role === 'source' && target.properties?.role === 'sink') {
    return '架构规约拦截：输入数据必须经过至少一级规则过滤或转换，禁止直连汇聚终端！';
  }
  return true;
};
</script>

<template>
  <AtengFlowDesigner
    v-model="ruleGraph"
    :stencil-groups="ruleStencilGroups"
    :before-connect="beforeRuleConnect"
    :options="{ edgeType: 'bezier', grid: { size: 10, visible: true, type: 'dot' } }"
  />
</template>
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
4. **静态拓扑校验引擎与错误高亮自愈机制 (FlowValidator)**：
   - 纯原生图论算法，内置 5 大刚性校验规则：
     - 🛑 **起止节点存在性与唯一性**：必须有且仅有 1 个开始节点（`START_NODE_MISSING` / `START_NODE_MULTIPLE`），至少 1 个结束节点（`END_NODE_MISSING`）；
     - 🛑 **悬空出入度与孤岛连通性**：非开始节点必须有前驱入度（`NODE_NO_INCOMING`），非结束节点必须有后继出度（`NODE_NO_OUTGOING`），从开始节点全图可达（`NODE_UNREACHABLE_FROM_START`）；
     - 🛑 **排他网关分支与流转条件**：出度分支必须 ≥ 2（`GATEWAY_BRANCH_INSUFFICIENT`），发出的每条分支连线必须配置条件表达式或标记为默认流（`GATEWAY_BRANCH_NO_CONDITION`）；
     - 🛑 **无出口死循环检测**：反向 BFS 结合深度优先遍历，准确识别拓扑中无法流向任何结束节点的死锁闭环（`DEADLOCK_CYCLE`），允许合法的审批驳回循环；
     - 🛑 **连线防呆与完整性**：识别悬空孤魂边（`DANGLING_EDGE`）与自环连线（`SELF_LOOP_EDGE`）；
   - **视觉呼吸高亮与一键平移定位**：校验发现异常时，设计器底层自动为违规节点添加 `at-flow-node--error` 红色呼吸边框，支持调用 `focusElement(id)` 自动平移视口居中并高亮聚焦目标图元。
5. **BPMN 2.0 双向保真互转与几何坐标保真 (BpmnAdapter)**：
   - 纯原生 TypeScript 与 DOMParser 解析，完全不依赖三方重量级 BPMN 运行时，产物轻量无臃肿；
   - 兼容标准 BPMN 2.0 命名空间（`http://www.omg.org/spec/BPMN/20100524/MODEL`）与 Flowable / Camunda 扩展前缀；
   - 精准实现 LogicFlow 中心点坐标 $(x, y)$ 与 BPMNDiagram 边界 Bounds $(x, y, w, h)$ 的相互换算，连线折点（`waypoint`）无损双向还原；
   - CDATA 深度解析器自适应提取 `customProperties`，保证自定义业务字段 100% 序列化保真。
6. **全景最小外接边界计算与高清防发虚倍率导出 (FlowSnapshot)**：
   - 自动扫描全图节点与连线折点，精准计算紧凑 Bounding Box 并注入自适应 Padding 留白，彻底消除大面积无效空白区域；
   - 重置视口缩放平移矩阵（`.lf-base`），矫正坐标系为绝对世界坐标；
   - 采用离屏 Canvas 与设备像素比（DPR 2x / 3x）超分辨率放大栅格化，彻底解决大图在移动端或大屏上发虚模糊的技术痛点；
   - 原生矢量注入防泄密安全文本水印，矩阵旋转排布且 `pointer-events: none` 零干扰。
7. **Vue 3 SFC 单文件组件虚拟树与确定性生命周期治理 (VueNodeRegistry)**：
   - 采用 Vue 3 原生 `createVNode` 与 `render` 挂载，数据变更通过原地 Diff 刷新 Props，零多余 DOM 重建开销；
   - 设立 `node:delete` 事件与 Preact `componentWillUnmount` 双重清理防线，节点删除或画布销毁时确定性调用 `render(null)`，触发组件内 `onUnmounted`，彻底回收内存；
   - 锚点生成函数基于真实尺寸精准对称偏移，拖拽连线无像素级偏差；按钮等交互元素阻止 mousedown 冒泡，确保点击交互不误触发节点位移。
8. **运行态只读锁定与视口人体工学治理 (AtengFlowViewer)**：
   - **严格只读模式**：`isSilentMode: true` 结合禁用全部锚点 (`hideAnchors`)、位置位移 (`adjustNodePosition: false`) 与文本编辑，彻底消除图元篡改与误连线风险；
   - **滚轮防冲突守卫 (`WheelZoomGuard`)**：默认屏蔽鼠标滚轮对画布视口的误缩放，支持外层长页面自然垂直滚动；按住 `Ctrl + 滚轮` 时激活视口缩放，未按 Ctrl 时显示友好引导气泡；
   - **智能待办聚焦 (`SmartFocus`)**：加载或状态更新时自动识别首个 `processing` 待办节点并平滑居中聚焦。
9. **低代码数据规则引擎与平滑贝塞尔路由 (Bezier Edge & Auth Rules)**：
   - **双模连线引擎**：深度增强 LogicFlow 内置连线，支持 `polyline` 正交折线与 `bezier` 三次贝塞尔平滑曲线双模路由，均无缝适配五态高亮与流动虚线呼吸光效；
   - **拓扑连接鉴权防线**：`beforeConnect` 钩子在连线握手阶段实施防御性校验，支持动态拦截非法反向连接、越级跨层直连与自环连接，从源头杜绝脏拓扑结构注入；
   - **分层流动与仿真执行**：适配 `AutoLayoutEngine` 的 DAG 有向无环分层拓扑算法，支持毫秒级全链路流转动态状态推进与监控日志捕获。

---

## 维度四：物理排版与代码全真验证 (Evergreen & Zero-Glitch)

- 本包所有公开组件与方法均具备 100% 离线自洽的单元测试覆盖；
- 真实端到端场景在自验工程 [`apps/sample-flow-vue`](../../apps/sample-flow-vue/src/App.vue) 中完整呈现；
- 运行测试与构建：
  ```bash
  pnpm --filter @atengk/flow-vue test
  pnpm --filter @atengk/flow-vue build
  ```
