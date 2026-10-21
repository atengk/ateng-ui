# 0014. 项目定位松绑与广义 Web 基础设施范畴演进决策

## 状态

Accepted (已接受)

## 背景与决策上下文

在项目孵化初期，`ateng-ui` 将核心定位表述为“面向现代企业级中后台与微服务架构的工业级前端基础设施与中间件套件”。随着工程基线健全与多层架构演进（L0 纯 TS 契约底座、L1 无头响应式层、L3 基础设施组件库），该初始定位暴露出若干排他性与过度收敛的弊端：

1. **场景固化（去中后台化）**：将适用范围限定于“企业级中后台”（Admin / Dashboard），使得外界与调用方易将本套件误解为单纯的后台管理界面模板。事实上，L0 底座的流式传输（SSE/大模型增量打字机）、大文件分片受控并发上传、雪花 Long ID 大数防截断、WebSocket 双向心跳保活，以及 L1 的抗竞态状态机与只读响应流，广泛适用于 SaaS 平台、企业数字化门户、AI 协同系统、多端 Web 甚至桌面端应用；
2. **架构强绑（去后端微服务绑架）**：原定语强调“微服务架构”，人为排斥了单体应用直连、BFF（Backend For Frontend）、Serverless 以及现代云原生架构场景，后端技术栈色彩过浓；
3. **术语晦涩（去中间件套件概念）**：在前端生态中，“中间件套件”偏向后端抽象概念，不如“基础设施”、“核心套件”或“工程底座”直观清晰。

因此，亟需对项目总体定位、标语（Tagline）及面向社区与开发者的公开画像进行松绑重塑，使其兼具广阔包容性与工业级严肃品质。

## 架构决策

基于“**场景广义包容、工程品质不妥协、中英文对齐、全维文档自洽**”原则，达成以下决策：

1. **主干定位与一句话标语统一演进**：
   - **中文定位**：`面向现代 Web 应用与企业级系统的工业级前端基础设施与核心套件`；
   - **英文 Tagline**：`Industrial-grade frontend infrastructure and core toolkit for modern web applications.`；
   - **核心价值表述**：坚持纯原生、强类型契约、零臃肿依赖与深模块解耦设计，兼顾单体应用直连、分布式微服务网关支撑以及现代云原生/AI 交互场景。
2. **GitHub Repository About 与元数据治理**：
   - **About 简介**：`面向现代 Web 应用与企业级系统的工业级前端基础设施与核心套件 | Industrial-grade frontend infrastructure and core toolkit for modern web applications.`；
   - **推荐 Topics 标签收敛**：`typescript`、`vue3`、`element-plus`、`monorepo`、`turborepo`、`frontend-infrastructure`、`headless`。
3. **全域文档与包元数据同步辐射**：
   - 同步修改根目录 `package.json`（`description`）、`README.md`（引言与标语）、`AGENTS.md`（项目基线）、`CONTEXT-MAP.md`；
   - 同步规范各子包（`@atengk/core`、`@atengk/vue`、`@atengk/element-plus`）的 `README.md` 与 `package.json` 中的前置描述，确保全域认知一致。

## 效果与权衡

- **收益**：
  - 彻底解除了“中后台管理界面”和“微服务架构”的单一标签束缚，使套件能够以更中立、更宽广的工程底座姿态赋能多样化的现代 Web 应用与企业级软件；
  - 英文定位更加精炼地道，符合开源社区与现代前端工具链生态的习惯；
  - 统一了全局文档、包描述与 GitHub 展台的一致性。
- **权衡**：
  - 范围放宽并不意味着降低工业级要求；底座的十二道代码成熟度防线、雪花大数保真、防竞态与确定性生命周期回收等严苛要求依然 100% 坚守执行。
