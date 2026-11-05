# 规格书：@atengk/flow-vue 工业级文档体系与 Sample 场景看板重构 (Spec: FlowVue Documentation & Sample Visual Dashboards)

> **关联规范**：[docs/agents/documentation-specification.md](../agents/documentation-specification.md) / [ADR-0033](../adr/0033-flow-vue-l2-architecture-and-dual-track-governance.md) / [ADR-0039](../adr/0039-documentation-specification-and-sample-visual-dashboard-architecture.md)  
> **领域定位**：L2 专用能力/领域扩展层 (`@atengk/flow-vue`) 与配套自验展厅 (`sample-flow-vue`)  
> **状态**：`ready-for-agent`  
> **日期**：2026-11-05

---

## Problem Statement

当前 `@atengk/flow-vue`（系统四层洋葱拓扑之 L2 专用能力/领域扩展层）已构建完成流程编排设计器（`AtengFlowDesigner`）、运行态流转追踪器（`AtengFlowViewer`）、无头状态机（`useFlow`）、属性抽屉（`AtengFlowPropertyPanel`）、物料面板（`AtengFlowStencil`）、工具栏（`AtengFlowToolbar`）、DAG 自动排版（`AutoLayoutEngine`）、静态拓扑校验（`FlowValidator`）、BPMN 2.0 XML 转译器（`BpmnAdapter`）、高清全景防虚快照（`FlowSnapshot`）与 Vue 3 SFC 卡片节点注册（`VueNodeRegistry`），且 12 个单测套件、87 项单元测试全部绿灯通过。

然而，其文档与自验样例工程与仓库权威标准 `docs/agents/documentation-specification.md` 以及 ADR-0039 存在严重断层，触碰了代码审查一票否决红线（Red Card Block）：

1. **样例展厅单文件严重臃肿（触碰红线 4）**：`apps/sample-flow-vue/src/App.vue` 高达 2607 行，将设计器画布、物料拖拽、属性抽屉、BPMN 转译、快照导出、运行态工单流转与规则链全部堆砌在单一文件中，缺少分层解耦的独立业务场景看板，直接违反了“严禁将模块的所有场景逻辑塞在单个庞大臃肿的 App.vue 中未进行场景解耦”的硬性规定；
2. **样例展厅体验卡缺失与不合规（触碰红线 5）**：`apps/sample-flow-vue/README.md` 仅有 19 行历史工单勾选项，未遵循规范第 3.3 节确立的“四段式极简体验卡”模板（固定端口 3007、双模 Mock、场景看板交互表、全真自动化回归命令）；
3. **子包文档大纲骨架陈旧（触碰红线 2）**：`packages/flow-vue/README.md` 仅有 358 行，仍沿用旧版“维度零~四”五维平铺模板，缺少 `## 1. 模块定位与 pnpm 坐标`、`## 2. 核心架构与设计不变量` 以及按业务领域收敛的一级大章，结构散落割裂；
4. **“三要素就近闭环”严重缺失（触碰红线 1）**：正文示例未就近声明 TypeScript Props/Options/Emits 强类型接口，缺少底层防御机制（如四步生命周期销毁清理、四向磁吸正交折线防呆、智能待办聚焦 SmartFocus、滚轮防冲突 WheelZoomGuard）的原理透传与生产注意事项，导致开发者阅读时必须上下翻找或盲目猜测；
5. **全量速查附录字典缺失（触碰规范 2.1）**：未在文末系统收录全量 TypeScript 接口、Props/Emits/Slots 字典与 CSS 变量 Design Tokens 清单；
6. **生搬硬套测试桩假数据（触碰红线 3）**：部分示例使用 `test1`、`dummyData` 等测试桩，缺少贴合企业级真实生产（费用报销、合同会签、运维工单、ETL 规则链）的高频业务语义模型。

---

## Solution

严格对齐 `documentation-specification.md`、ADR-0033 与 ADR-0039，实施全维文档与样例展厅重构升级：

1. **解耦样例展厅工程并构建分层多场景看板**：
   - 将原 2607 行 `App.vue` 彻底解耦，在 `apps/sample-flow-vue/src/scenarios/` 下构建 8 大自洽的场景看板组件：
     1. `DesignerBasicScenario.vue`：基础流程编排设计器（报销审批流模型、物料拖拽 DND、四向磁吸正交折线、快捷键体系、工具栏与撤销重做）；
     2. `PropertyPanelSlotScenario.vue`：属性配置抽屉表单接管（原生纯 HTML 表单 vs `#panel` Element Plus 高阶表单双模切换、表达式与审批人双向回写）；
     3. `ViewerAuditScenario.vue`：工单运行态流转追踪器（ITSM 故障流转模型、五态动态高亮与流动虚线、原生浮层 vs `#audit-popover` 时间轴插槽双模、SmartFocus 待办定位与步进模拟）；
     4. `VueNodeCustomScenario.vue`：Vue 3 SFC 卡片节点与物料扩展（`ApprovalCardNode` 高颜值审批卡片、物料面板自定义组注入与 DND 拖拽、双向属性响应式回写）；
     5. `ValidatorLayoutScenario.vue`：静态拓扑校验与 DAG 自动排版（合同会签模型、5 大图论规则预设故障注入、红色脉冲呼吸高亮、结构化诊断表格、DAG LR/TB 平滑动画重排）；
     6. `BpmnAdapterScenario.vue`：BPMN 2.0 工业标准协议双向转译（Flowable/Camunda 标准 XML 导出、BPMNDiagram Bounds/Waypoint 坐标保真、XML 反序列化与高亮展示）；
     7. `SnapshotWatermarkScenario.vue`：全景高清防虚快照与防泄密安全水印（2x/3x DPR 视网膜抗锯齿栅格化、SVG 导出、自定义文本矩阵水印与原地预览回显）；
     8. `RulesEngineDagScenario.vue`：低代码规则引擎 / DAG 数据拓扑（ETL 规则链模型、数据源/清洗/规则分流节点、DAG 流向控制）；
   - 精简 `App.vue` 为约 120 行的场景导航总控，使用 `v-if` 实现确定性生命周期重置与 `lf.destroy()`，并与浏览器 URL Query（`?scenario=xxx`）双向绑定；
2. **交付自验展厅四段式极简体验卡**：
   - 编写 `apps/sample-flow-vue/README.md`，严格遵循四段式极简体验卡模板（端口 3007、离线自洽 Mock 与 `.env.local` 真实网关双模切换、8 大场景看板交互对照表、全真自动化回归命令）；
3. **交付子包权威全功能契约真理源（`packages/flow-vue/README.md`）**：
   - 严格遵循标准大纲骨架，重塑 11 大章节：
     - `0. 特性与公共 API 全景速查矩阵`：100% 覆盖全部 7 大组件、核心 Hook、算法与枚举，精确锚定单测文件与自验沙箱场景；
     - `1. 模块定位与 pnpm 坐标`：版本基线、安装命令与 peerDependencies 契约；
     - `2. 核心架构与设计不变量`：L2 洋葱拓扑、双轨运行态模型、LogicFlow 2.x 解耦中立律与确定性四步生命周期销毁清理不变量；
     - `3~9. 领域大章`：设计器套件、运行态追踪套件、属性抽屉套件、校验排版套件、BPMN 转译套件、快照水印套件、Vue SFC 节点套件，各章节单屏闭环“专属 TS 契约 + 逆向自验业务代码 + 核心机制与防御说明”；
     - `10. 完整 TypeScript 接口/Props/CSS 变量速查清单`：全量集中速查字典与 Design Tokens 规范；
     - `11. 1:1 物理排版与全维测试守护`：12 套单测清单与自动化全真回归命令。

---

## User Stories

1. 作为前端架构师，我希望在阅读 `packages/flow-vue/README.md` 时能够在一屏内同时看到特性的强类型 TS 接口、面向真实业务的代码范式与底层边界防御说明，以便在接入时不产生任何认知黑盒；
2. 作为终端业务开发者，我希望从 `packages/flow-vue/README.md` 复制的代码示例 100% 能够在实际工程中直接运行并跑通，以便零心智负担地开箱即用；
3. 作为中后台开发者，我希望通过 `<AtengFlowDesigner />` 一行代码集成物料面板、四向磁吸正交折线与属性配置抽屉，以便在 5 分钟内搭建完成企业审批流设计器；
4. 作为 OA 系统审批流开发者，我希望通过 `beforeConnect` 守卫拦截自环、重复连线与非法回流，以便在前端即时阻断非法的图论连线；
5. 作为工单详情页开发者，我希望通过 `<AtengFlowViewer />` 以纯只读形式展示五态流转高亮与呼吸流动虚线，以便直观呈现审批流转轨迹；
6. 作为审批工单用户，我希望鼠标悬停流转节点时能弹出悬停审计卡片查看审批人、审批意见与操作时间，以便清晰追溯审批历史；
7. 作为详情页开发者，我希望在工单节点过多时利用 SmartFocus 智能将当前流转中待办节点平滑定位至视口中心，以便用户进入页面即可看到待办焦点；
8. 作为长页面浏览用户，我希望在滚动包含流程图的页面时触发 WheelZoomGuard 滚轮防冲突守卫（需按住 Ctrl 才能缩放），以便防止滚动画布导致页面卡住；
9. 作为业务表单定制开发者，我希望通过 `AtengFlowPropertyPanel` 的 `#panel` 具名插槽反转接管为 Element Plus 表单，以便自由嵌入人员选择器与表达式输入框；
10. 作为流程引擎管理员，我希望通过 `FlowValidator` 在保存前一键校验起止唯一性、连通孤岛、排他网关分支与死循环，以便在画布上直接通过红色脉冲呼吸高亮定位异常节点；
11. 作为排版强迫症用户，我希望点击工具栏自动排版按钮时通过 `AutoLayoutEngine` 一键将凌乱的连线规整为水平 (LR) 或垂直 (TB) 的标准 DAG 层次流动，以便快速整理拓扑布局；
12. 作为后端工作流引擎对接人员，我希望通过 `BpmnAdapter` 将前端画布导出为符合 Flowable / Camunda 规范的标准 BPMN 2.0 XML，以便后端工作流引擎直接部署执行；
13. 作为旧系统升级工程师，我希望通过 `BpmnAdapter.fromBpmnXml` 将已有的标准 BPMN XML 导入还原为前端画布图元与折线，以便无缝迁移历史流程资产；
14. 作为合规安全人员，我希望在导出流程图图片时通过 `FlowSnapshot` 嵌入防泄密文本矩阵安全水印与视网膜 2x/3x DPR 抗锯齿，以便安全归档打印且文字不发虚；
15. 作为高颜值卡片开发者，我希望使用标准 Vue 3 SFC 编写自定义卡片节点并通过 `VueNodeRegistry` 注册进画布，以便在流程节点中自由展示头像、胶囊标签与操作按钮；
16. 作为 UI 设计师，我希望在文末速查附录中查阅全量 CSS 变量 Design Tokens，以便通过覆盖 `--at-flow-*` 样式变量快速对齐品牌设计系统；
17. 作为 TypeScript 开发者，我希望在全量附录中查阅所有组件 Props、Emits、Slots、Ref 实例与 Hook 选项类型，以便获得严密的类型推导；
18. 作为框架自验人员，我希望启动样例展厅后在 3007 端口通过 8 大独立场景看板直观交互验证各项功能，以便告别单文件臃肿与调试混乱；
19. 作为调试排错人员，我希望在浏览器中切换场景时通过 URL Query（`?scenario=xxx`）自动记忆当前场景并在刷新后无缝恢复，以便高效定位特定问题；
20. 作为 CI 流水线监控人员，我希望通过体验卡中的四道全真回归命令一次性完成编译类型检查、代码规范、单测回归与生产构建验证，以便确保代码工业级成熟度。

---

## Implementation Decisions

1. **样例展厅场景组件解耦**：彻底重构 `apps/sample-flow-vue`，将 2607 行单文件 `App.vue` 拆分为 `src/scenarios/` 下的 8 个业务看板组件，单文件控制在 200~350 行，`App.vue` 仅作为导航总控，代码收敛至 120 行左右。
2. **场景状态隔离与确定性清理**：`App.vue` 使用 `<component :is="..." />` 配合 `v-if` 动态渲染场景，每个场景独立闭环数据，并在 `onUnmounted` 中确定性调用 `lf.destroy()` 与解绑监听，彻底杜绝隐藏画布 DOM 残留与内存泄漏。
3. **URL Query 响应式状态记忆**：`App.vue` 将激活场景与浏览器 `?scenario=xxx` 双向同步，支持刷新状态保持与外链直接定位。
4. **属性抽屉与审计浮层双模展厅**：在属性抽屉看板与运行态追踪看板中均提供“原生轻量模式”与“Element Plus 插槽接管模式”双模切换，实证 L2 零 UI 依赖与 100% 控制反转能力。
5. **样例展厅极简体验卡标准化**：新建 `apps/sample-flow-vue/README.md`，严格遵循四段式极简模板（固定端口 3007、离线 Mock 与 Local 网关双模切换、8 大场景看板交互对照表、全真自动化回归命令）。
6. **子包文档大纲骨架标准化**：废弃原有的维度平铺划分，遵照 `documentation-specification.md` 确立的标准大纲重塑 `packages/flow-vue/README.md`（0. 全景速查矩阵 ➔ 1. 模块定位与 pnpm 坐标 ➔ 2. 核心架构与 4 大设计不变量 ➔ 3~9. 领域大章 ➔ 10. 完整 TS 与 CSS 变量速查清单 ➔ 11. 自动化测试守护）。
7. **子小节“三要素就近闭环”铁律**：在第 3 至 9 章的所有二级子小节中，单屏范围内自洽闭环呈现“专属 TS 契约片段 + 真实业务实战代码（100% 逆向提取自 Sample）+ 核心机制与底层防御说明”。
8. **全景速查矩阵 100% 覆盖**：章 0 矩阵完整收录本模块对外暴露的全部 7 大组件、核心 Hook、排版校验算法与关键枚举类型，并精确锚定单测文件与自验沙箱场景。
9. **全量速查附录规范**：章 10 集中提供全量速查字典表，涵盖组件全量 Props（含类型、默认值、中文说明）、Emits、Slots、Ref Expose 方法以及 CSS 变量 Design Tokens。
10. **真实业务语义驱动**：全面清理无意义测试桩假数据，演进为企业费用报销审批流、采购合同会签审批流、ITSM 运维工单流转流与 ETL 规则链 DAG 四大高频业务语义模型。
11. **领域术语表动态固化**：已在 `packages/flow-vue/CONTEXT.md` 中同步固化 `ApprovalCardNode`、`BeforeConnectHook`、`LayoutDirection` 权威术语及 `ExecutionStatus` Avoid 规则。

---

## Testing Decisions

- **测试外部行为而非实现细节**：验证重点聚焦于公共 API 契约一致性、文档代码与沙箱代码的 100% 同构性、CSS 变量 Design Tokens 的有效性以及各解耦场景的可交互性与生命周期销毁自洽。
- **五阶梯质量门禁与全真准出验证缝 (Seams)**：
  - **缝 1 (类型检查验证缝)**：执行子包与自验工程类型检查（`pnpm --filter @atengk/flow-vue --filter sample-flow-vue typecheck`）；
  - **缝 2 (静态规范校验缝)**：执行子包与自验工程代码规范校验（`pnpm --filter @atengk/flow-vue --filter sample-flow-vue lint`）；
  - **缝 3 (全自洽单测回归缝)**：执行子包 12 个测试文件、87 项单元测试全绿守护（`pnpm --filter @atengk/flow-vue test`）；
  - **缝 4 (沙箱构建打包缝)**：执行自验工程生产打包构建验证（`pnpm --filter sample-flow-vue build`）；
  - **缝 5 (文档红牌阻断审计缝)**：对标 `documentation-specification.md` 逐项核验 6 大一票否决红线（类型脱节、章节散落、测试桩生搬、单文件臃肿、体验卡膨胀、脑补伪代码）。
- **现有参考标准 (Prior Art)**：
  参考 `packages/file-viewer-vue/README.md` 与 `apps/sample-file-viewer-vue/README.md`（Issue #253），以及 `packages/editor-vue/README.md` 与 `apps/sample-editor-vue/README.md`（Issue #247）的工业级交付范式。

---

## Out of Scope

- 修改底层 LogicFlow 核心引擎渲染算法或破坏现有组件 Props/Emits/Slots 契约；
- 变更组件对外导出的公共 API 签名；
- 引入未经评估的外部重型依赖；
- 创建新的孤立 ADR（现有 ADR-0033 与 ADR-0039 已提供完备架构依据）。

---

## Further Notes

- 严格遵循 `AGENTS.md` 中的文档与代码审查红牌阻断线（Red Card Checklist）。
- 提交代码与执行实施严格遵照开发者明确授权指令。
