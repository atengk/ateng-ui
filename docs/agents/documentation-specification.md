# 前端工业级文档与样例工程标准规范 (Documentation & Sample Specification)

## 1. 核心定位与设计哲学 (Mission & Scope)

在 `ateng-ui` 基础设施套件中，**子包文档、根目录门面（`README.md` 与 `llms.txt`）与场景样例工程（Sample）是连接前端底层工程能力与终端业务开发者（及 AI 编程助手）的第一生命线**。本规范确立框架所有子包文档（`packages/*/README.md`）、仓库根目录门面与 AI 索引及配套样例工程（`apps/sample-*`）的工业级标准、Sample-First 双向锚定体系与 **15 项交付前强制自检清单**（[ADR-0039](../adr/0039-documentation-specification-and-sample-visual-dashboard-architecture.md)），作为代码审查（`/code-review`）的一票否决红线（Red Card Block）。

---

## 2. 子包五维 `README.md` 规范 (The Submodule Document Invariant)

子包根目录下的 `README.md` 是该模块对外唯一权威的**“全功能契约真理源”**。每个子包的 `README.md` 必须覆盖 **五维生产就绪交付模型**（① 定位、四层洋葱拓扑与安装契约、② 100% 全景速查矩阵、③ 核心能力领域大章与“类型-代码-原理”三要素闭环、④ 生产避坑与性能/生命周期治理指南、⑤ 完整 TypeScript 接口/Props/CSS 变量速查字典）。

### 2.1 标准大纲骨架 (Standard Outline Architecture)

```markdown
# @atengk/<module> <中文功能全称>

> 一句话核心价值宣言：阐明核心技术栈定位、所属四层拓扑层级（L0~L3）与面向的典型企业级前端交互场景。

---

## 0. 特性与公共 API 全景速查矩阵 (100% 覆盖门面、Hooks、组件 Props/Emits/Slots/Expose、指令与类型)

## 1. 模块定位与 pnpm 坐标 (包名、版本、安装命令与 peerDependencies 契约)

## 2. 核心架构与设计不变量 (四层拓扑位置 / Mermaid 响应式状态机 / 核心交互图 / 关键不变量)

## 3. <能力领域大章一> (按领域聚合收敛)

### 3.1 <核心子特性 A>

### 3.2 <核心子特性 B>

## 4. <能力领域大章二> (按领域聚合收敛)

...

## N-1. 生产环境避坑与生命周期/性能治理指南

## N. 完整 TypeScript 接口/Props/CSS 变量速查清单 (全量速查附录)
```

### 2.2 章节“三要素就近闭环”铁律 (Co-located 3-Element Invariant)

**【红线阻断项】** 严禁出现“正文只展示组件或 Hook 调用，而关键 Props/Options 强类型接口却扔在几百行后文末”的割裂现象！每个具体的业务特性章节必须在**当前屏幕内**实现以下“三要素”自洽闭环：

1. **本节专属 TypeScript 契约/配置片段**：仅展示当前特性所需的关键 Props/Emits/Slots/Expose 泛型接口、Hook Options 配置项或 CSS 变量 Design Tokens；标配清晰的 JSDoc 中文单行注释与生产默认值，属性名与类型与源码导出逐字对齐。
2. **面向实战的业务 Vue/TS 代码示例**：展示如何通过 Vue SFC（`<script setup lang="ts">` + `<template>`）或 TS 门面调用该特性；代码必须 100% 逆向提取自已在对应 Sample 中跑通的真实业务看板代码。
3. **核心机制与生产边界防御说明**：显式讲透底层机制与防御考量（如 `MaybeRefOrGetter` + `toValue` 响应性解构防丢失、`onScopeDispose` 确定性清理、`AbortSignal` 抗竞态逻辑丢弃、雪花 Long ID 大数防失真、样式 `at-` 隔离与 Design Tokens 继承等）。

> **注**：文档末尾的《完整 TypeScript 接口/Props/CSS 变量速查清单》仅作为全量属性的集中速查字典，**严禁**作为该模块配置或 Props 的唯一暴露点。

### 2.3 “能力领域大章”收敛架构 (Capability Domain Aggregation)

**【红线阻断项】** 严禁因开发批次不同而在文档末尾随意追加零碎散落的小章节！必须按技术领域或业务交互主线将同类功能收敛为**一级大章**，并在大章下合理划分二级小节（例如 `@atengk/vue`：`第 3 章：契约分页与时序竞态套件` 下设 `3.1 双向契约分页状态机 usePagination`、`3.2 异步时序竞态双重防御 useLatest`、`3.3 提交防刷与幂等互斥锁 useIdempotent`）。

### 2.4 真实业务语义场景驱动 (Real-World Business Semantics)

**【红线阻断项】** 严禁将单元测试中的测试桩假数据（如 `test1`、`dummyData`、`foo`、`bar`、`"TEST_SUCCESS_"`）复制到文档或 Sample 中！必须演化为真实高频前端业务模型：

- **表格与分页**：电商商品列表分页检索（`ProductItem`）、企业员工账户管理（`EmployeeAccount`）；
- **异步竞态与搜索**：客户档案实时联想搜索（`CustomerSearch`）、多 Tab 档案高频切换；
- **大文件与预览/上传**：高清视频分片断点续传（`VideoChunkPayload`）、多格式合同文档在线预览与防泄密水印；
- **流式与长连/监控**：AI 智能助手 SSE 打字机流式问答（`ChatMessage`）、WebSocket 实时告警看板（`AlertEvent`）、前端 APM 异常采样与白屏复验。

### 2.5 Markdown 排版完整性与防断裂铁律 (Markdown Integrity Guard)

1. **代码块闭合与防嵌套撕裂**：所有代码块必须显式声明语言标识符（`ts`、`vue`、`scss`、`bash`、`json`、`mermaid`）并严格成对闭合；若外层需包裹内层代码块，外层必须使用四反引号 ` ``` `。
2. **块级元素空行隔离**：标题、列表、代码块、引用块（`>`）与 Markdown 表格前后**必须保留一个空行**。
3. **表格结构严整**：表头与对齐分隔行（`| :--- |`）列数必须严格一致；单元格内严禁直接硬回车换行（多行内容使用 `<br>`），单元格内包含 TypeScript 联合类型管道符 `|` 时必须转义为 `\|`。
4. **Mermaid 图表语法安全**：节点文本包含括号 `()`、方括号 `[]`、斜杠 `/`、冒号 `:` 时，**必须使用双引号包裹节点标签**（如 `A["L1 无头状态机 (@atengk/vue)"]`）。
5. **文档内零绝对路径**：文档间互链 100% 使用相对路径（`./`、`../`），严禁写入 `file:///` 或本地盘符路径。

---

### 2.6 根目录门面文档 (`Root Storefront README.md`) 与 AI 索引 (`llms.txt`) 边界规范

根目录 [`README.md`](../../README.md) 与 [`llms.txt`](../../llms.txt) 是面向前端选型开发者与外部 AI 编程助手的**“第一入口与机读全景导航地图”**，严禁堆砌内部评审流程细则或全量 ADR 目录：

1. **19+ 包全覆盖与 L2 场景聚类**：
   - 根目录 `README.md` 的四层拓扑图与生态清单必须 **100% 覆盖全部已纳管子包（L0 / L1 / L2 / L3）及其 1:1 `apps/sample-*` 展厅直达链接**，彻底消除新增 L2 扩展包后门面表格失同步的问题；
   - 当 L2 领域扩展包数量较多时，Mermaid 与目录表须按语义场景收敛分组（如 **AI 与协同创作**、**可视化与低代码引擎**、**文档影像与专业表格**、**地图空间与工业识别**），兼顾可读性与零拥挤排版。
2. **机读 AI 索引 (`llms.txt`) 三铁律**：
   - **纯仓内相对路径**：遵循 [llmstxt.org](https://llmstxt.org/) 分组规范，100% 使用 `./...` 相对路径索引全局文档与每个子包的 `README.md` / `CONTEXT.md` / `apps/sample-*/README.md`，**严禁跨仓库链接（如 `../ateng-boot`）**或绝对盘符路径。
   - **免硬编码版本号**：`llms.txt` 严禁写死 Vue、Element Plus 或 `@atengk/*` 具体版本号，统一引导 AI 读取根 [`package.json`](../../package.json) 与目标 `packages/<name>/package.json`（及各自 `README.md` 的 `peerDependencies`）。
   - **高危前端红线前置**：首屏明确四层洋葱单向流红线（L0 零框架、L1 零 UI 弹窗、L2 禁逆向依赖 L3）、`Result<T>` / `PageResult<T>`（`pageNum` / `pageSize`）/ 雪花 ID `string` 契约、Blob 双态嗅探与 `onScopeDispose` 确定性清理。

---

## 3. Sample 1:1 场景样例工程规范 (The Sample Engineering Invariant)

每个子包 `packages/<name>`（`@atengk/<name>`）严格 1:1 对应 `apps/sample-<name>` 独立可运行体验展厅（全量拓扑见 `pnpm-workspace.yaml` 与 [`CONTEXT-MAP.md`](../../CONTEXT-MAP.md)）。各 Sample 间严格遵守 **零共享代码（Zero-Shared-Code）** 与 `"private": true` 非分发隔离铁律。

### 3.1 全模块可视化与分层多场景看板 (Multi-Scenario Visual Dashboards)

Sample 严禁白屏或仅靠浏览器控制台 `console.log` 敷衍！必须根据四层拓扑架构提供多场景可视化交互看板，且**严禁将所有场景塞在单一庞大的 `App.vue` 中**：

1. **L0 纯 TS 原生工程 (`sample-core`)**：保持纯 TypeScript 原生环境（严禁引入 Vue/React/UI 库），在 `src/scenarios/*` 按领域拆解场景并挂载原生 DOM 交互触发器，直观对比雪花 Long ID 转换、Token 刷新队列、请求重试与取消前后的报文契约。
2. **L0 监控专用 APM 交互展厅 (`sample-monitor`)**：搭建真实交互看板与本地模拟 APM 接收终端，真机检验 Vue 异常适配器、3×3 视口点阵白屏双阶段复验、敏感输入掩码（`[data-monitor-mask]`）与路由性能采集。
3. **L1 无头响应式 / L2 专业扩展工程 (`sample-vue`, `sample-file-viewer-vue`, `sample-video-player-vue`, `sample-echarts-vue`, `sample-flow-vue`, `sample-code-editor-vue`, `sample-editor-vue`)**：在 `src/components/*Scenario.vue`（或 `*Demo.vue`、`src/views/*`）按业务领域拆分为多个自洽的场景看板组件，直观监视状态机的 `loading`、`data`、`error`、并发竞态与 `onScopeDispose` 销毁释放状态。
4. **L3 UI 表现层工程 (`sample-element-plus`)**：基于 `vue-router` 在 `src/views/*` 中按领域构建独立路由视图，高保真展示组件协同、弹窗/抽屉、多主题切换与指令交互。

### 3.2 离线自洽 Mock 与真实网关双模机制 (Dual-Mode Architecture)

1. **默认/CI 模式（离线自洽）**：默认通过本地 Mock 拦截器或 MSW 提供 100% 离线自洽的模拟数据，无需启动任何后端服务即可运行与通过测试。
2. **Local/网关模式（真实联调）**：工程根目录标配 `.env.example` 模板（大写占位符、零真实机密）；复制为 `.env.local`（已被 `.gitignore` 忽略）并配置 `VITE_API_BASE_URL` 后即可直连真实后端或微服务网关。

### 3.3 Sample 模块 `README.md` 四段式极简体验卡模板

Sample 自身的 `README.md` 统一定位为**“启动与场景交互体验卡”**，严禁重复堆砌对应子包的全景矩阵与底层原理，严格采用以下四段式模板：

````markdown
# sample-<module> <场景全称>体验展厅

> 专注于演示与自验 `@atengk/<module>` 核心特性在真实业务场景下的开箱使用与交互自验。

---

## 1. 快速启动与服务端口

- **默认固定端口**：`300X`
- **启动方式**：
  ```bash
  pnpm --filter sample-<module> dev
  ```
- 启动后浏览器访问：`http://localhost:300X`

---

## 2. 运行环境与 Mock 双模切换

- **默认/CI 模式**：内置离线自洽 Mock 数据，无需启动任何外部后端服务即可直接体验完整交互与跑通自动化测试；
- **Local 真实网关模式**：复制 `.env.example` 为 `.env.local` 并修改 `VITE_API_BASE_URL`，重启开发服务即可直连真实接口（该文件已被 Git 忽略）。

---

## 3. 核心场景看板与交互路由表

| 场景分类         | 场景看板组件 / 路由路径 | 核心可视化交互操作         | 验证重点                 |
| :--------------- | :---------------------- | :------------------------- | :----------------------- |
| **<业务场景一>** | `<XxxScenario.vue>`     | <点击/输入/切换等具体交互> | <验证的核心状态机或契约> |

---

## 4. 全真自动化回归命令

```bash
pnpm --filter @atengk/<module> --filter sample-<module> typecheck && \
pnpm --filter @atengk/<module> --filter sample-<module> lint && \
pnpm --filter @atengk/<module> --filter sample-<module> test && \
pnpm --filter @atengk/<module> --filter sample-<module> build
```

> 详细原理机制、Props/Options 接口清单与生产边界，请参阅核心子包文档：[@atengk/<module> README](../../packages/<module>/README.md)。
````

---

## 4. Sample-First 逆向研发流与 15 项准出自检清单 (Audit Checklist & Red Card Gate)

任何新特性的研发或存量特性的重构，必须严格遵循 **Sample 真实场景组件编码 $\rightarrow$ 可视化交互看板挂载 $\rightarrow$ 离线自洽单测与四合一门禁全绿 $\rightarrow$ 1:1 逆向提取至子包五维 `README.md` $\rightarrow$ 更新 Sample 四段式体验卡** 的单向流水线。

### 交付前 15 项强制自检清单 (Pre-Delivery Audit Checklist)

在每次任务交付前或执行 `/code-review` 时，必须逐项核对以下 15 项判据（任一未通过直接触发 Red Card 阻断）：

- [ ] **1. 四层洋葱单向依赖律（`L3 ➔ L2 ➔ L1 ➔ L0`）**：零逆向跨层引用、零循环依赖；L0（`@atengk/core`, `@atengk/monitor`）100% 纯 TS 跨框架中立（零 Vue/React 依赖）；L1（`@atengk/vue`）100% 纯无头状态机（零 `ElMessage` 等 UI 组件耦合）。
- [ ] **2. 后端契约与雪花 Long ID 防截断**：严格对齐 `Result<T>` 与 `PageResult<T>`（分页入参 `current`/`size`）；HTTP 管道在 `transformResponse` 阶段对 16 位以上长整型雪花 ID 正则加引号转 `string`（ADR-0003）。
- [ ] **3. Blob 异常双态识别与内存真明文**：下载/导出流式响应前置识别 `application/json` 错误帧并转译为 `BusinessException`，拒绝生成损坏假文件（ADR-0004）；前端状态层保持原始数据，展示脱敏仅在渲染态或内置脱敏组件执行。
- [ ] **4. 确定性生命周期与句柄清理**：事件监听、定时器、`ResizeObserver`/`IntersectionObserver`/`MutationObserver`、WebSocket/SSE 连接、Worker 实例及 `URL.createObjectURL` 临时句柄，在 `onUnmounted` 或 `onScopeDispose` 中 100% 释放。
- [ ] **5. 异步竞态防御与单向数据流**：高频检索/切换请求标配 `AbortSignal` 与 `useLatest` 逻辑序号双保险；Vue 3.5+ Hooks 入参支持 `MaybeRefOrGetter<T>` 并经 `toValue()` 解包；严禁直接突变 Props，内部状态按需通过 `readonly()` 暴露。
- [ ] **6. UI 样式隔离与主题变量契约**：组件根类名强制以 `at-` 为前缀，SFC 强制开启 `<style scoped>`，色彩/圆角/间距 100% 绑定 `--el-*` 或 `--at-*` Design Tokens（严禁硬编码物理 Hex 破坏暗黑模式，严禁滥用全局 `!important`），表单/容器组件标配 `defineExpose`。
- [ ] **7. 零 `any`、空安全与显式导出闭环**：生产代码零裸 `any`、零未防御非空断言 `!`；集合查询无数据保底返回 `[]`（严禁返回 `null`/`undefined`）；子包顶级 `src/index.ts` 100% 显式具名导出组件、Hooks 与 TypeScript 接口。
- [ ] **8. 因果异常体系与底座收敛**：严禁空 `catch` 吞咽异常，统一转译为携带 `code`、`msg`、`traceId` 与原始 `cause` 的 `BusinessException`；通用能力优先复用 `@atengk/core` 与 `@atengk/vue`，严禁引入 `lodash`、`moment` 等重型依赖。
- [ ] **9. 受管代码规模与 JSDoc 规范**：单个 `.vue` SFC 建议 $\le 400$ 行（标签顺序固定为 `<script setup lang="ts">` $\rightarrow$ `<template>` $\rightarrow$ `<style scoped>`），单个 `.ts` 模块 $\le 500$ 行；新建文件与公共契约标配中文 JSDoc、`@author Ateng` 与真实日期 `@since YYYY-MM-DD`。
- [ ] **10. 极致 Tree-Shaking 与双模构建契约**：`package.json` 显式声明 `"sideEffects": false`（或仅限 `["*.css", "*.scss"]`），构建稳定产出 ESM + CJS + DTS。
- [ ] **11. 全自洽前端单测三铁律**：测试组件在 `afterEach` 执行 `wrapper.unmount()` 还原 DOM；Storage/Pinia/Token 状态在 `beforeEach`/`afterEach` 重置清零；网络请求 100% 经由 Mock/MSW 离线自洽拦截。
- [ ] **12. Sample 1:1 可视化多场景看板与双模配置**：子包所有公开特性在 `apps/sample-<name>` 中 100% 实装可视化交互看板（严禁白屏、纯 `console.log` 或单文件臃肿 `App.vue`）；Sample 标配 `.env.example` 与 `"private": true` 隔离。
- [ ] **13. Sample-First 五维文档与三要素闭环**：子包 `README.md` 包含 100% 覆盖的全景速查矩阵，各特性章节在当前屏幕内实现“TS 类型/Props + 真实 Vue/TS 代码 + 核心机制”三要素闭环，按领域大章收敛，Sample `README.md` 采用四段式体验卡。
- [ ] **14. Markdown 排版完整性与零绝对路径**：代码块闭合、块级元素空行隔离、表格列数严整（联合类型 `|` 转义为 `\|`）、Mermaid 特殊字符节点加双引号，文档内 100% 使用相对路径互链。
- [ ] **15. 领域模型与阶梯二四合一门禁全绿**：`packages/<name>/CONTEXT.md`、`CONTEXT-MAP.md` 与 [`docs/adr/README.md`](../adr/README.md) 同步对齐；执行定向 `typecheck`、`lint`、`test`、`build` 四合一门禁 100% PASS。
