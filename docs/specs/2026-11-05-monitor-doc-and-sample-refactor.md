# 规格书：@atengk/monitor 工业级文档体系与 Sample 场景展厅重构 (Spec: Monitor Documentation & Sample Visual Dashboards)

> **关联规范**：[docs/agents/documentation-specification.md](../agents/documentation-specification.md) / [ADR-0038](../adr/0038-monitor-l0-observability-architecture-and-governance.md) / [ADR-0039](../adr/0039-documentation-specification-and-sample-visual-dashboard-architecture.md)  
> **领域定位**：L0 纯原生核心底座 (`@atengk/monitor`) 与配套自验展厅 (`sample-monitor`)  
> **状态**：`ready-for-agent`  
> **日期**：2026-11-05

---

## Problem Statement

当前 `@atengk/monitor`（系统四层洋葱拓扑之 L0 纯原生核心底座）已完成前端 APM 微内核（`MonitorKernel`）、五大采集插件（`ErrorPlugin`, `WhiteScreenPlugin`, `PerformancePlugin`, `BreadcrumbPlugin`, `NetworkPlugin`）、三级敏感数据脱敏（`PiiSanitizer`）、FNV-1a 错误特征指纹与防抖去重聚合（`ErrorDeduplicator`）、会话级熔断断路器（`CircuitBreaker`）、三阶高可用传输管道与页面卸载紧急冲刷（`TransportQueue`），并在 `apps/sample-monitor` 中构建了包含 5 大交互看板的自验展厅，10 套单测套件、116 项单测与自验沙箱测试全部全绿通过。

然而，其文档体系与自验样例工程规范与仓库最新权威标准 `docs/agents/documentation-specification.md` 以及 ADR-0039 存在显著断层，触碰了多条代码审查一票否决红线（Red Card Block）：

1. **子包文档骨架大纲严重陈旧（触碰红线 2）**：`packages/monitor/README.md` 仍沿用废弃的“维度零～四”旧版五维平铺模板，缺少规范要求的 `## 1. 模块定位与 pnpm 坐标`、`## 2. 核心架构与设计不变量` 以及按技术领域聚合的一级大章，结构散落割裂；
2. **“三要素就近闭环”铁律严重缺失（触碰红线 1）**：正文各小节仅罗列零散代码片段或原理长文，未在当前屏幕内紧凑就近声明 TypeScript 强类型配置接口（带 JSDoc 中文注释与默认值），缺少底层防御机制（如 `onScopeDispose` 确定性生命周期清理、防套娃死循环协议、双阶段白屏防抖复验）的原理透传，导致开发者接入时需上下翻找或盲目猜测；
3. **自验展厅体验卡不合规（触碰红线 5）**：`apps/sample-monitor/README.md` 未遵循四段式极简体验卡标准模板（缺少固定的 3010 端口启动说明、离线 Mock 与真实网关双模切换、标准四列场景交互看板路由表以及四合一全真自动化回归命令）；
4. **规范与现实发生倒挂冲突**：`documentation-specification.md` 第 108 行机械将 `sample-monitor` 归入“纯 TS 严禁引入 Vue/UI”的范畴，但事实上由于需真机检验 Vue 3 全局未捕获异常适配器（`createVueErrorHandler`）、3×3 视口点阵白屏采样与骨架屏/Loading 白名单豁免、DOM 点击与输入框敏感属性掩码（`[data-monitor-mask]`）及 SPA 虚拟路由流转耗时，`sample-monitor` 必须基于 Vue 3 + Element Plus 构建高保真交互展厅；
5. **领域词汇表尚未闭环收敛**：随着核心实现的深化，已在实战中固化的 `TwoPhaseVerification`（双阶段防抖复验）、`AntiLoopProtocol`（防套娃死循环调用协议）与 `CustomReporter`（自定义上报执行器 SPI）尚未在 `packages/monitor/CONTEXT.md` 中收录标准定义与规避词。

---

## Solution

严格对齐 `documentation-specification.md`、ADR-0038 与 ADR-0039，实施全维文档与样例展厅规范重构升级：

1. **勘误并澄清文档规范条款冲突**：
   - 更新 `docs/agents/documentation-specification.md` 第 108 行，明确将 L0 自验工程分流为：`sample-core` 保持纯 TS 原生无框架环境，而 `sample-monitor` 确立为“L0 APM 监控可视化自验展厅”，特例允许引入 Vue 3 与轻量 UI 容器以提供高保真可视化交互。
2. **闭环领域模型术语表**：
   - 更新 `packages/monitor/CONTEXT.md`，正式增补录入 `TwoPhaseVerification`、`AntiLoopProtocol`、`CustomReporter` 3 个标准领域词条及 _Avoid_ 规避词清单。
3. **重构自验展厅四段式极简体验卡**：
   - 彻底重构 `apps/sample-monitor/README.md`，严格遵循四段式极简模板：
     - 第 1 节：快速启动与服务端口（固定端口 3010，`pnpm --filter sample-monitor dev`）；
     - 第 2 节：运行环境与 Mock 双模切换（离线自洽 Mock 模式 vs Local 真实网关模式）；
     - 第 3 节：核心场景看板与交互路由表（精准映射 5 大面板：故障注入与异常熔断、白屏感知与骨架屏自愈、性能大盘与卡顿感知、行为轨迹与敏感脱敏、本地 Mock APM 实时终端）；
     - 第 4 节：全真自动化回归命令（`typecheck && lint && test && build`）。
4. **重构子包全功能契约真理源（`packages/monitor/README.md`）**：
   - 严格遵循标准大纲骨架，重塑 11 大标准章节：
     - `0. 特性与公共 API 全景速查矩阵`：100% 收录全部 32+ 核心 API/方法/类型，精确双向锚定单测文件与自验展厅面板；
     - `1. 模块定位与 pnpm 坐标`：明确 L0 纯 TS 原生定位、零外部框架运行时依赖、版本基线与安装命令；
     - `2. 核心架构与设计不变量`：L0 四层洋葱拓扑 Mermaid 图、三阶段生命周期全景泳道时序 Mermaid 图（初始化 ➔ 采集/脱敏/熔断 ➔ 批缓冲/卸载紧急冲刷）、6 大核心设计不变量；
     - `3~9. 领域大章`：按技术领域收敛为 7 大章（微内核与上下文、运行时异常捕获、3×3 点阵白屏感知、性能体验与 Web Vitals、行为轨迹与 TraceId 串联、三级脱敏与会话熔断、三阶高可用传输），各章采用 2~3 个二级小节平铺，单屏闭环“专属 TS 契约 + 逆向自验实战代码 + 核心机制与防御说明”；
     - `10. 完整 TypeScript 接口与配置速查清单`：集中收录全部导出的完整 TS 源码契约定义，作为权威类型字典；
     - `11. 1:1 物理排版与全维测试守护`：10 套单测清单与自动化全真回归命令。

---

## User Stories

1. 作为前端架构师，我希望在阅读 `packages/monitor/README.md` 时能够在一屏内同时看到特性的强类型 TS 接口、面向真实业务的代码范式与底层防御说明，以便在架构接入时不产生任何认知黑盒；
2. 作为终端业务开发者，我希望从 `packages/monitor/README.md` 复制的代码示例 100% 能够在实际工程中直接运行并跑通，以便零心智负担地开箱即用；
3. 作为 Vue 开发者，我希望通过 `createVueErrorHandler` 纯 TS 无损错误适配器将 Vue 3 全局未捕获异常与生命周期上下文无缝接入监控微内核，以便精准捕获组件渲染崩溃现场；
4. 作为 APM 运维人员，我希望通过 `ErrorPlugin` 自动捕获同步 JS 报错、Promise 异步拒付、静态资源 404 与代理 `console.error`，以便全景掌握客户端运行时异常；
5. 作为电商前台开发者，我希望通过 `WhiteScreenPlugin` 3×3 视口几何点阵采样感知白屏，并借助骨架屏白名单豁免与双阶段延迟复验消除误报，以便在真实白屏时秒级报警而在正常加载时保持静默；
6. 作为性能优化工程师，我希望通过 `PerformancePlugin` 实时采集 Google Core Web Vitals（FCP, LCP, CLS, TTFB, INP），并获得官方三态体验评级，以便直观评估用户真实体验；
7. 作为交互卡顿排查人员，我希望通过监控插件监听大于 50ms 的主线程长任务（Long Task）并派发 Jank 告警，以便迅速定位导致页面掉帧的长耗时逻辑；
8. 作为全链路排障专家，我希望通过 `createCoreAxiosMonitorInterceptor` 将前端监控上下文与 `@atengk/core` Axios 拦截器协同，自动提取后端分布式 MDC `traceId`，以便实现前后端端到端日志贯通；
9. 作为用户轨迹分析人员，我希望通过 `BreadcrumbPlugin` 定长环形缓冲区记录用户最近的 DOM 点击、控制台日志与 SPA 虚拟路由流转耗时，以便在报错时还原用户操作全过程；
10. 作为合规与信息安全官，我希望通过 `PiiSanitizer` 自动对密码输入框、带有 `[data-monitor-mask]` 属性的 DOM 容器、URL Query 与敏感 Header 进行星号掩码脱敏，以便严格恪守企业安全合规红线；
11. 作为前端可用性守护者，我希望在高频死循环报错时通过 `ErrorDeduplicator` FNV-1a 特征指纹在 5 秒窗口内自动聚合去重，以便彻底消除主线程卡顿与网络日志风暴；
12. 作为客户端稳定性人员，我希望在单个会话累计异常达到阈值时触发 `CircuitBreaker` 熔断休眠保护，以便防止监控 SDK 自身成为拖垮用户浏览器的二次凶手；
13. 作为网络中间件工程师，我希望所有监控上报请求统一携带 `X-Ateng-Monitor-Skip: true` 并在嗅探层自动豁免 `reportUrl`，以便彻底阻断监控递归自死循环；
14. 作为高可用传输开发者，我希望通过 `TransportQueue` 批处理缓冲队列兼顾性能与时效，并在页面关闭瞬间通过 `EmergencyFlush` 与 `navigator.sendBeacon` 紧急冲刷，以便保障异常现场 0 丢包；
15. 作为私有云运维人员，我希望通过 `CustomReporter` 扩展 SPI 注入自定义上报函数与鉴权签名请求头，以便适配企业私有化采集网关；
16. 作为 TypeScript 开发者，我希望在第 10 章速查附录中系统查阅全量导出的 TypeScript 接口与配置字典，以便在 IDE 中获得严格的静态类型推导；
17. 作为规范审查人员，我希望在 `apps/sample-monitor/README.md` 中查阅标准四段式体验卡，明确固定端口 3010 与 5 大自验面板交互表，以便开箱即用快速自验；
18. 作为本地调试人员，我希望启动自验展厅后直接通过 `ApmTerminal.vue` 实时查看上报事件的瀑布流与完整 JSON 载荷，以便直观校验脱敏与指纹聚合效果；
19. 作为持续集成 (CI) 工程师，我希望运行单条命令即可完成子包与自验展厅的类型检查、代码规范、单测回归与构建，以便在云端流水线中获得确定性质量保障；
20. 作为开源贡献者，我希望在文档规范中看到对 `sample-monitor` 引入 Vue 3 的明确架构澄清，以便理解为何纯 TS 底座拥有 Vue 交互展厅的设计初衷。

---

## Implementation Decisions

1. **规范倒挂条款精准修正**：修改 `docs/agents/documentation-specification.md` 第 108 行，明确界定 `sample-core` 为纯 TS 脚本工程，而 `sample-monitor` 属于 L0 监控专用 APM 交互展厅，特例允许引入 Vue 3 与轻量 UI 容器以承载真实 DOM 渲染与错误现场演练。
2. **领域术语表动态固化**：在 `packages/monitor/CONTEXT.md` 中正式收录 `TwoPhaseVerification`、`AntiLoopProtocol`、`CustomReporter` 3 个新术语，保持模型词汇与代码实现绝对一致。
3. **自验展厅体验卡四段式重塑**：重写 `apps/sample-monitor/README.md`，对齐 ADR-0039 四段式模板：
   - 端口 3010 与快速启动命令；
   - 离线自洽 Mock 与真实网关双模切换机制；
   - 5 大场景交互表（`FaultPanel.vue`, `WhiteScreenPanel.vue`, `PerformancePanel.vue`, `BreadcrumbPanel.vue`, `ApmTerminal.vue`）；
   - 四合一自动化全真回归命令。
4. **子包全功能契约真理源大纲重塑**：彻底推翻 `packages/monitor/README.md` 旧版五维平铺布局，建立标准 11 大章节体系：
   - `0. 特性与公共 API 全景速查矩阵`（100% 覆盖全部 32+ 导出 API）；
   - `1. 模块定位与 pnpm 坐标`；
   - `2. 核心架构与设计不变量`（L0 洋葱拓扑 Mermaid 图、三阶段生命周期全景泳道时序 Mermaid 图、6 大核心设计不变量）；
   - `3~9. 领域大章`（微内核与上下文、运行时异常、白屏感知、性能体验、用户轨迹与 TraceId、脱敏与断路器、高可用传输），各大章细化 2~3 个二级小节平铺，严格闭环三要素；
   - `10. 完整 TypeScript 接口与配置速查清单`；
   - `11. 1:1 物理排版与全维测试守护`。
5. **实战业务代码 100% 逆向提取**：文档正文中的所有代码范式，必须 100% 逆向提取自已在 `apps/sample-monitor/src/` 中编译并测试跑通的真实源码（`monitor.ts`, `main.ts`, `FaultPanel.vue`, `WhiteScreenPanel.vue`, `PerformancePanel.vue`, `BreadcrumbPanel.vue`, `ApmTerminal.vue`），绝不编写未经实测的脑补伪代码。
6. **三阶段全生命周期泳道时序图**：在第 2 章绘制涵盖“阶段一：微内核初始化与插件挂载”、“阶段二：事件采集、三级脱敏、指纹防抖与断路器过滤”、“阶段三：批处理定时冲刷与页面卸载 Beacon 应急传输”的完整 Mermaid 时序图。

---

## Testing Decisions

- **测试外部契约与行为而非实现细节**：验证重点聚焦于公共 API 契约一致性、文档代码与沙箱代码的 100% 同构性、三级脱敏有效性、指纹去重幂等性以及页面卸载冲刷的可靠性。
- **五大质量验证接缝 (Seams)**：
  - **接缝 1 (L0 单元测试接缝)**：执行 `packages/monitor/test/*.test.ts`（10 个套件、116 项单测全部全绿守护底座正确性）；
  - **接缝 2 (Sample 自验展厅单测接缝)**：执行 `apps/sample-monitor/test/sample.test.ts`（3 项端到端组件挂载与交互测试全绿）；
  - **接缝 3 (严格类型检查接缝)**：执行 `pnpm --filter @atengk/monitor --filter sample-monitor typecheck`（零 `any`、零类型错误）；
  - **接缝 4 (代码规范静态分析接缝)**：执行 `pnpm --filter @atengk/monitor --filter sample-monitor lint`（零 ESLint 报警）；
  - **接缝 5 (生产构建打包接缝)**：执行 `pnpm --filter sample-monitor build`（验证 Vite 打包产物无破损、依赖解析正常）。
- **先验基线与已有资产**：本项目已具备完整的单元测试套件与沙箱单测作为坚实后盾，重构过程中必须确保所有既有用例持续全绿通过。

---

## Out of Scope

1. **核心运行时算法变更**：本次规格聚焦于文档体系与展厅体验卡的重构，不改动 `packages/monitor/src/` 内部的核心抓取算法、指纹哈希算法与传输实现；
2. **后端 APM 收集网关实现**：仅提供客户端上报契约与离线自洽 Mock 终端，不包含生产端分布式 APM 服务端的研发；
3. **React 监控生态扩展**：当前专注深耕 Vue 3 + 纯 TS 原生落地，React 错误边界组件等未来扩展留在后续阶段规划。

---

## Further Notes

- 本规格书由 `/grill-with-docs` 深入推演 3 轮前沿决策树后产出，所有设计不变量与边界约束均已达成严格共识；
- 实施阶段需严格遵循“术语落盘 ➔ 规范条款修正 ➔ Sample 体验卡重构 ➔ 子包 README 重构 ➔ 全维质量门禁验收”5 步原子工序单向流动，消除一切审查红牌。
