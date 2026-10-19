# ateng-ui 前端工业级研发指南与 Agent 协作准则

本文档定义了 `ateng-ui` 前端基础设施套件的技术基线、代码契约、工业级成熟度防线、全维质量门禁与 Agent 协作 SOP 规约。

---

## 1. 项目定位与技术基线 (Project Baseline)

`ateng-ui` 是面向现代企业级中后台与微服务架构的工业级前端基础设施与中间件套件，坚持纯原生、强类型契约、零臃肿依赖与深模块解耦设计，兼顾单体应用直连与分布式微服务网关支撑。

- **运行与包管理器**：Node.js `>=20.18.0`（开发环境推荐 22.x LTS），pnpm `>=9.12.3`（由根 `packageManager` 严格锁定，参见 [ADR-0001](./docs/adr/0001-toolchain-and-pnpm-version-baseline.md) 与 [ADR-0006](./docs/adr/0006-dependency-baseline-and-upgrade-governance-strategy.md)）；
- **构建与编排**：Turborepo 2.x（增量编排与任务流），tsup 8.x（底层库双模构建，输出 ESM + CJS + DTS），Vite 6（应用与自验展厅构建）；
- **核心依赖基线**：TypeScript `^5.6.0`，Vue `^3.5.0`（自验工程对齐 `^3.5.44`，参见 [ADR-0002](./docs/adr/0002-vue-3-5-baseline-and-reactive-props-contract.md)），Element Plus `>=2.8.0`（自验展厅锁定 `^2.14.7`，参见 [ADR-0005](./docs/adr/0005-element-plus-version-baseline-and-peer-strategy.md)），Axios `^1.7.7`；
- **命名坐标与发版**：Scope 统一为 `@atengk/*`，采用 Changesets 独立版本流转模式（Independent Mode）；
- **双轨多框架演进战略**：架构遵循“**一套 L0 纯 TS 原生核心底座，双轨响应式状态机驱动（Vue / React），多套 UI 表现套件**”设计。当前阶段聚焦深耕 Vue 3.5 + Element Plus 工业级落地；顶层架构完全就绪 React 镜像演进（未来通过 L1 `@atengk/react` 与 L3 React UI 套件无缝扩展），当前严禁提前堆砌未经实测的 React 代码细则。

---

## 2. 核心架构与编码契约 (Architecture & Invariants)

- **多模块四层洋葱拓扑与单向无环依赖律 (Multi-Package Layering & Acyclic Invariant)**：
  面向未来百模块级扩展，仓库内所有模块（`packages/*`）严格归入四层单向拓扑结构，**依赖方向只能自顶向下单向流动（L3 ➔ L2 ➔ L1 ➔ L0）**，严禁逆向依赖与跨包循环依赖：
  - **L0 纯原生核心底座 (Core Layer，如 `@atengk/core`)**：纯 TypeScript 与 Web 标准 API 封装，保持**纯净跨框架中立，零 UI、零 Vue、零 React 依赖**；
  - **L1 无头响应式层 (Headless Layer，当前为 `@atengk/vue`，架构预留 `@atengk/react`)**：纯响应式状态机、无头 Hooks 与生命周期编排，**仅依赖 L0 与对应响应式框架（Vue/React），绝对严禁依赖任何具体 UI 库**；
  - **L2 专用能力/领域扩展层 (Extension Layer，如未来扩展的 `@atengk/echarts`、`@atengk/editor`)**：封装特定图表、富文本、流程图等专用引擎，仅依赖 L0/L1 与对应的第三方专业核心，保持领域高内聚；
  - **L3 表现与高阶组件层 (UI & Suite Layer，当前为 `@atengk/element-plus`，架构预留未来的 React UI 套件及移动端/Admin 模板)**：组装下层 L0~L2 能力，呈现具体设计系统的 UI 组件与交互展厅。
  - **拓扑登记铁律**：任何新建模块必须在根目录 [CONTEXT-MAP.md](./CONTEXT-MAP.md) 显式登记所属层级与合法依赖范围，未登记模块直接阻断准出。
- **显式强类型响应契约 (Explicit Contract)**：
  前端网络请求管道严格对齐企业级统一响应规范：
  - 标准响应结构：`Result<T>`（包含 `code: number`、`data: T`、`msg: string`、`traceId: string`）；
  - 分页查询与响应：`PageQuery`（`pageNum`, `pageSize`, `sortField`, `sortAsc`）与 `PageResult<T>`（`list: T[]`, `total: number`）；
  - 严禁在调用方将未经解包与校验的裸 HTTP 响应直接传递给业务视图层。
- **雪花 Long ID 大数防失真不变量 (Snowflake Long ID Invariant)**：
  - 针对后端返回的 64 位整型（Snowflake ID、分布式全局主键），由于超过 JavaScript `Number.MAX_SAFE_INTEGER`（$2^{53}-1$）会发生致命精度截断；
  - 核心网络层（`@atengk/core`）在 Axios 原始数据转换管道（`transformResponse`）中，在反序列化前必须通过纳秒级正则匹配将 16 位以上无引号数字加双引号转换为字符串，随后交付 V8 原生 `JSON.parse`（参见 [ADR-0003](./docs/adr/0003-snowflake-long-id-raw-json-transform.md)）；
  - 严禁全链路使用原生裸 `JSON.parse` 直接解析后端实体，严禁引入低效且破坏序列化的 `json-bigint`。
- **UI 组件封装与样式隔离契约 (Component & CSS Scoping Invariant)**：
  面向 UI 组件库（如 `@atengk/element-plus` 及衍生 UI 扩展），严格执行样式隔离与组件暴露规范：
  - **统一命名空间与 BEM**：组件根样式必须以 `at-` 作为独立命名空间前缀（如 `.at-table`），强制在 SFC 中开启 `<style scoped>`，严禁在未受命名空间保护的情况下全局污染或裸标签样式重写；
  - **设计令牌复用 (Design Tokens)**：颜色、字体、边框、层级等样式统一复用 Element Plus 原生 CSS 变量（`--el-*`）或在 `at-` 命名空间下派生 `--at-*`，严禁在组件内部硬编码 Hex 颜色、固定像素大尺寸等魔法值；
  - **泛型强类型接口**：组件 `defineProps<Props>()`、`defineEmits<Emits>()`、`defineSlots<Slots>()` 必须 100% 采用 TypeScript 泛型接口声明；
  - **显式收敛暴露**：组件对外提供的方法与状态必须显式收敛在 `defineExpose` 中，并由该组件源码文件同步导出专属 Ref 实例类型（如 `export type AtengTableInstance = InstanceType<typeof AtengTable>`）。
- **异步竞态与并发控制不变量 (Async Concurrency & Race Condition Invariant)**：
  - **核心取消管道**：底层网络层（`@atengk/core`）原生支持传递 `AbortSignal`，并提供请求取消协调器，保障底层 HTTP 连接可随生命周期即时中断；
  - **高频操作抗竞态**：无头逻辑层（`@atengk/vue`）针对搜索框联动、快速翻页、Tab 切换等高频异步场景，必须内置提供竞态控制状态机（如 `useLatest` 或请求状态机配置 `cancelPrevious: true`），确保后发请求先回时能够确定性丢弃或中断前序未决请求，彻底杜绝数据时序倒挂；
  - **提交互斥防重锁**：涉及保存、删除、状态流转等写操作请求，必须显式配备 Loading 互斥锁与幂等保护，杜绝重复点击造成脏写。
- **数据安全与“内存真明文”不变量 (In-Memory Plaintext Invariant)**：
  - 业务逻辑层、Composables 状态以及数据模型在内存中始终保持 100% 原始真实明文；
  - 严禁在获取到数据后直接就地打星号篡改响应式属性（防止提交或回传时将掩码脏数据回写数据库）；
  - 数据脱敏展示强制收敛于渲染层组件或专门的格式化工具（如 `formatMaskPhone`、`formatMaskIdCard`）。
- **传输层与表现层解耦 (Transport Decoupling & Clean View Models)**：
  - API 请求入参（DTO/Query）与前端展示状态（ViewModel/FormState）应保持清晰隔离；
  - 避免将带有无用元数据或未授权属性的对象全量作为 Payload 提交；解耦转换统一在 Service 或 Hook 边界完成。
- **全链路追踪与凭据注入 (Tracing & Sa-Token Propagation)**：
  - 核心客户端标配全局拦截器，自动从响应头或载荷中提取 `traceId`，并在异常报错时挂载至诊断错误对象中；
  - Sa-Token 鉴权凭据门面（`AuthManager`）支持灵活持久化（Storage 抽象），并在每次请求时标准化注入双轨请求头（`satoken` / `Authorization: Bearer`）；
  - 微服务多路由机制（Multi-Service Gateway Routing）：支持单体应用直连与微服务网关前缀（`service-id`）映射两套模式。
- **Blob-JSON 双态异常识别与 Excel 回写协议 (Blob Error & Fesod Protocol)**：
  - 拦截器针对 `responseType: 'blob'` 实施双态识别：若响应头或数据为 `application/json`，必须异步提取文本解析为 `Result<never>` 并转译为 `BusinessException` 抛出，彻底杜绝下载损坏伪文件；
  - 规范解析 `Content-Disposition` 提取 UTF-8 编码文件名，并在下载后由 `URL.revokeObjectURL` 确定性回收内存（参见 [ADR-0004](./docs/adr/0004-blob-error-dual-state-and-fesod-excel-protocol.md)）。
- **Vue 3.5 响应式解构入参规范 (MaybeRefOrGetter & toValue)**：
  - `@atengk/vue` 导出的所有公共 Composables 入参必须声明为 `MaybeRefOrGetter<T>` 类型，内部统一使用 Vue 原生 `toValue(param)` 进行解包；
  - 组件层调用时若传入解构后的 Prop，统一通过 Getter 箭头函数传入（如 `usePagination(() => pageSize)`），彻底消除响应性丢失陷阱。

---

## 3. 工业级代码成熟度十二道防线与审查红线 (The 12 Robustness Invariants)

立足于前端长期可维护性与面向未来无限扩展组件库的工业级基准，确立以下十二道不可逾越的通用代码成熟度防线：

1. **空安全保底与防御性返回 (Null Safety & Defensive Return Invariant)**：
   - 任何获取列表、集合、分页数据的 Hook 或 API 门面，在无数据或查询结果为空时，**统一保底返回空数组 `[]`，绝对严禁返回 `undefined` 或 `null`**；
   - 彻底杜绝调用方或 Vue 模板层因访问 `data.list.map` 或 `v-for="item in data.list"` 时出现空指针导致白屏崩溃。
2. **确定性生命周期与资源清理 (Deterministic Lifecycle & Cleanup Invariant)**：
   - 凡在 Composables / Hooks 或组件中注册的物理监听与瞬态资源（如 `window.addEventListener`、`setInterval`、`ResizeObserver`、`WebSocket`、未完成的 Axios 请求取消令牌、`URL.createObjectURL` 临时句柄），**必须且只能在 `onUnmounted` 或 `onScopeDispose` 钩子中执行 100% 确定性的释放与解绑**；
   - 坚决杜绝因组件频繁销毁与重建导致的内存泄漏与离线回调悬挂。
3. **严格无状态与单向数据流纪律 (Strict Statelessness & Unidirectional Flow Invariant)**：
   - 通用单例管理器（如 `TokenManager`、`HttpRegistry`）必须保持内部状态纯净，严禁共享可变业务状态；
   - Vue 组件严禁直接就地突变（Mutate）外部传入的 Props，所有属性变化必须通过显式 Emit 事件通知上层触发更新；
   - Hooks 导出的响应式状态（`ref`/`reactive`）在需要只读保护时必须通过 `readonly` 导出，确保状态变更路径单向透明。
4. **对称语义与完备门面设计 (Symmetric Facades Invariant)**：
   - 抽象的客户端门面、缓存工具或状态管理器，其操作语义必须具备完备性与对称性（注册与注销对称、订阅与取消对称、加解密对称、存取对称、创建与销毁对称）；
   - 严禁设计“只管监听不管解绑”或“只管连接不管断开”的残缺门面。
5. **分层防卫与快速失败 (Defense-in-Depth & Fail-Fast Invariant)**：
   - 核心方法与公共 Hooks 在执行具体业务或请求前，必须通过前置卫语句对关键入参（如 URL、必填参数、分页负数）实施严格校验；
   - 发现非法状态立即快速失败（抛出语义化异常或返回预设错误态），严禁放任脏数据穿透至网络层。
6. **环境宿主与跨框架中立防御 (Platform-Agnostic & Framework-Neutral Resilience Invariant)**：
   - 底层核心包（`@atengk/core`）必须保持纯净平台中立与框架中立，严禁直接硬编码依赖浏览器特有的全局变量（如裸写 `window`、`document`、`localStorage`），**绝对严禁渗入任何前端框架（Vue 或 React）专有的响应式类型（如 `Ref`、`State`）或特定框架钩子**；
   - 在必须访问宿主环境处，提供弹性探测与降级守卫，确保在 SSR、Node 命令行及未来 React 宿主环境平稳加载与零成本接入。
7. **因果异常体系与底层驱动解耦 (Causal Exceptions & Clean Mapping Invariant)**：
   - 严禁吞咽异常（禁止空的 `catch` 块或仅使用 `console.error` 敷衍）；
   - 网络底层 Axios 错误必须在拦截器统一转译为类型安全的 `BusinessException`，并将后端的 `code`、`msg` 与 `traceId` 完整封装；
   - 转译时必须完整保留原始错误因果链（保留原始 `cause`），恪守“要么就地降级补偿，要么转换为业务异常向外抛出”，严禁双重污染。
8. **原生优先与零臃肿依赖 (Zero-Bloat & Core-First Invariant)**：
   - 坚持纯原生 TypeScript / ES 标准与 Vue 3 原生能力优先，坚决杜绝在底层引入 `lodash`、`moment` 等重型第三方全量工具库；
   - 工具函数就近内聚于所属模块（类型转换收敛于 `core`，DOM 监听收敛于 `vue`），杜绝设计跨包垃圾桶模块。
9. **对抗性极限用例守护 (Adversarial Testing & Sample Verification Invariant)**：
   - 单元测试严禁仅覆盖 Happy Path 玩具场景；
   - 核心契约与算法必须针对极限边缘场景编写对抗性测试用例（覆盖超大雪花数溢出、空结果集响应、401/403 权限降级、多重路由匹配冲突等）；
   - 所有特性在提交准出前必须在 1:1 镜像自验工程（`apps/sample-*`）中跑通真实端到端交互。
10. **零 `any` 与强类型闭环防线 (Type-Safety & Zero-Any Invariant)**：
    - **生产代码零裸 `any`**：生产源码（非测试桩代码）中严禁出现裸 `any`。遇到未知动态数据，必须使用 `unknown` 并配合类型守卫（Type Guard / Narrowing）或泛型推导；
    - **禁止未经守卫的强转**：严禁直接通过 `as unknown as T` 绕过类型系统，生产源码中严禁使用非空断言 `!`，必须通过前置卫语句判空；
    - **公共 API 类型导出完整性**：所有公共门面、组件 Props/Emits/Slots、Hooks 配置 Options 与返回实体类型，必须由所在子包入口 `index.ts` 100% 显式具名导出，严禁强迫下游通过深层路径引用隐蔽类型。
11. **无头表现彻底解耦防线 (Headless & UI-Agnostic Invariant)**：
    - `@atengk/vue` 属于纯无头响应式中间件层，**绝对严禁直接引用或物理调用 `ElMessage`、`ElNotification` 等具体 UI 弹窗组件**；
    - 业务异常与失败反馈，在 Hook 内部统一封装为响应式状态（如 `error: ShallowRef<BusinessException | null>`）或通过 `onError` 回调向外派发，具体交互提示完全交由表现层（`@atengk/element-plus` 或业务视图）接管。
12. **受管整洁代码与复杂度红线 (Managed Clean Code & Single Responsibility)**：
    - **单文件复杂度上限**：单 Vue SFC 组件建议不超过 400 行，生产源码 TS 模块不超过 500 行；一旦超标，复杂交互逻辑必须外抽至 Composables，内部复杂子视图必须拆分为局部子组件；
    - **SFC 排版结构标准**：Vue 组件统一遵循 `<script setup lang="ts">` 顶置、中置 `<template>`、底置 `<style scoped>` 的排版顺序；
    - **文件级与契约注释**：新建源码文件顶部必须规范标注 JSDoc（包含清晰职责陈述、`@author Ateng` 与系统真实日期 `@since YYYY-MM-DD`）；对外开放的方法与 Props 必须附带 JSDoc 阐明业务含义与边界约束。

- **审查红牌与分级治理机制 (Review Redlines & Tiered Governance Gate)**：
  在代码审查（`/code-review`）中，实施分级治理：
  - 🛑 **红牌一票否决项 (Red Card Block)**：触碰任一红线直接阻断准出：
    1. 源码中出现未受豁免的裸 `any` 或未经前置校验的非空断言 `!`；
    2. 无头层（`@atengk/vue`）跨层依赖或直接调用 UI 弹窗；
    3. 组件样式裸写未加 `scoped` 或未使用 `at-` 前缀污染全局命名空间；
    4. 产生跨层逆向依赖（如底层依赖上层包）或跨包循环依赖；
    5. 公共 API 未在入口 `index.ts` 完整具名导出类型定义；
    6. 集合查询未保底返回 `[]`，或监听资源未在销毁钩子中确定性清理；
    7. 雪花 ID 大数未经字符串正则化直接穿透造成数字截断；
    8. 底层核心包（`@atengk/core`）渗入 Vue 或 React 专有响应式类型、框架钩子或运行时依赖；
    9. 新增/修改的公开功能未在 Sample 页面渲染呈现、未启动服务提供页面体验、或未经人工页面审核确认擅自交付。
  - ⚠️ **黄牌限期整改项 (Yellow Warning)**：
    1. 新建源码顶部遗漏 `@author Ateng` 或 `@since`；
    2. 流程注释步骤编号不连续或存在孤立步骤号；
    3. 组件代码行数轻微超出 400 行但未严重恶化可读性。

---

## 4. 质量门禁与全维文档闭环 (Quality Gates & Documentation Invariants)

- **三阶梯测试准出机制 (Three-Tier Test Gate)**：
  严禁每次改动在本地无脑执行全项目串行单测：
  1. **阶梯一：特性日常自验（秒级极速反馈）**：单个包改动时，采用增量定向检查与单测：
     ```bash
     pnpm --filter @atengk/core test
     ```
  2. **阶梯二：本地提交准出验收（全维三道校验）**：准备提交前，执行变更模块与对应自验工程（`apps/sample-*`）的三维准出验收（编译类型无报错、静态规范全通过、端到端单测全绿）：
     ```bash
     pnpm --filter @atengk/vue --filter sample-vue typecheck && \
     pnpm --filter @atengk/vue --filter sample-vue lint && \
     pnpm --filter @atengk/vue --filter sample-vue test
     ```
  3. **阶梯三：全反应堆矩阵终极守护 (Post-Push CI Gate)**：全项目所有模块在 Node.js 20 & 22 矩阵下的全量回归，100% 交由 GitHub Actions CI 云端并行工作流异步守护；本地推送后通过 `gh run watch <run-id>` 闭环跟踪至全绿。
- **纯文档修改测试豁免 (Doc-Only Exemption)**：
  若本次变更仅涉及文档（如 `*.md`、纯文本或注释说明）而未改动任何业务源码、配置文件与工程依赖，一律免除执行本地单元测试与构建，直接受控提交。

- **全自洽单测三项铁律 (The 3 Hermetic Test Rules for Frontend)**：
  1. **DOM 现场严格还原**：挂载测试组件（`mount`/`shallowMount`）后，必须在 `afterEach` 中执行 `wrapper.unmount()` 并安全清理 `document.body` 中挂载的全局节点（如弹窗/通知），严禁幽灵 DOM 残留污染后续用例；
  2. **响应式与存储零污染**：任何涉及修改全局状态（Pinia/Vuex）、Storage 适配器或 Token 凭据的测试，必须在 `beforeEach`/`afterEach` 中无条件执行重置与清空，杜绝跨测试用例的脏状态继承；
  3. **100% 离线自洽**：单测必须具备完全离线独立运行能力（基于 MSW 或 Vitest Mock 拦截网络），绝对严禁向外部真实物理网络发起 HTTP 请求。

- **面向未来扩展的“新模块自举六件套”契约 (New Module Onboarding & Scaffolding Invariant)**：
  面向未来持续扩展的大量全新子包，任何新增的 `packages/<name>` 必须原子化齐备以下 6 项标准要素，缺一不可准出：
  1. **元数据与双模构建契约**：`package.json` 命名严格对齐 `@atengk/<name>`，构建采用 `tsup` 标准配置，显式声明 `exports` 导出 ESM (`dist/index.js`) + CJS (`dist/index.cjs`) + DTS (`dist/index.d.ts`)；
  2. **独立领域词汇表**：必须在 `packages/<name>/CONTEXT.md` 建立独立的领域术语定义与 Avoid 负面词清单；
  3. **1:1 镜像自验工程**：必须在 `apps/sample-<name>` 搭建开箱沙箱与端到端实测场景，接入根 Turbo 任务流水线；
  4. **五维 README 交付模型**：子包必须配备包含特性全景速查矩阵的权威 `README.md`，示例代码 100% 逆向提取自 Sample；
  5. **标准化质量脚本**：必须标配独立的 `test`、`typecheck`、`lint` 脚本，且单测遵循 DOM 清理与离线自洽 3 铁律；
  6. **系统拓扑同步登记**：必须同步更新根目录 [CONTEXT-MAP.md](./CONTEXT-MAP.md) 的系统依赖拓扑图。

- **极致 Tree-Shaking 与副作用零残留契约 (Tree-Shaking & Side-Effects Invariant)**：
  随着模块数量增加，必须确保下游应用按需引入时未使用的代码 0 字节打入产物：
  1. **显式声明副作用边界**：每个子包的 `package.json` 必须显式配置 `"sideEffects": false`（若包含组件样式文件，仅收敛为 `"sideEffects": ["*.css", "*.scss"]`）；
  2. **包入口零隐式副作用**：所有包的顶级入口 `index.ts` 必须是**纯声明式导出 (Pure Declarative Exports)**，严禁在入口或文件顶层执行隐式副作用（如自动向全局 `window` 注入属性、自动执行 Polyfill、未经调用的组件自注册等）；
  3. **插件安装显式受控**：若提供 Vue 插件安装器（`install(app)`），必须作为独立导出的函数供使用者主动调用，严禁在 `import` 时自动执行全局注册。

- **五维生产就绪交付模型 (The 5D Production-Ready Invariant)**：
  子模块 `README.md` 面向真实生产接入者，严禁仅停留在简单 Demo 的自嗨罗列；任何新增或修改的功能特性，必须正交覆盖以下五个维度，缺一即阻断准出：
  1. **维度零：特性与公共 API 全景速查矩阵 (Feature & API Panorama Matrix)**：
     - 必须在子模块 `README.md` 核心显要位置提供标准速查矩阵表格：
       ```markdown
       | 特性分类 | 特性名称 | 核心门面 / 组件 / Hook | 关键参数 / Props / Emits | 核心行为说明 | 锚定验证源头 (*Test / Sample) |
       ```
     - **100% 全覆盖刚性铁律**：模块对外暴露的所有公共组件、Composables、公共方法、类型定义与指令，**必须 100% 在全景矩阵中收录**，彻底杜绝“代码写了但文档未记录”的隐形死代码；
  2. **维度一：最小起步体验 (Happy Path & Out-of-the-Box)**：直击一句话痛点、最小可用引入配置与开箱即用的极简代码示例；
  3. **维度二：生产扩展接管 (Customization & Extensibility)**：当默认行为无法满足企业级定制时，开发者如何扩展或接管（如自定义 Axios 实例、注入私有 Storage 适配器、自定义表格列插槽等，杜绝只教开箱不教定制）；
  4. **维度三：核心生产边界与非功能语义 (Production Boundary & Failure Modes)**：显式声明该模块在极端、高并发或复杂场景下的底层行为机制（如大数精度防截断边界、超时熔断策略、网络重试与取消令牌销毁、内存防泄露等，杜绝非功能黑盒）；
  5. **维度四：物理排版与代码全真验证 (Evergreen & Zero-Glitch)**：示例代码必跑通并锚定单测、Props 逐字对齐 TypeScript 类型定义、Markdown 代码块严格闭合无破损，严禁格式事故与伪代码。

- **“Sample-First 研发闭环与 100% 场景实测铁律” (Sample-Before-Docs & 100% Feature Coverage Invariant)**：
  - **功能 100% 场景对齐刚性铁律**：模块实现的每一个对外公开功能（包括所有公开组件、Hooks、工具函数与指令），**必须 100% 在归属的 `apps/sample-*` 镜像工程中提供真实、自洽、端到端可运行的演示用例**，严禁只在子模块局部单测写 Mock 而在 Sample 中缺位！
    - **网络与契约特性**（`@atengk/core`）：必须在 `apps/sample-core` 编写对应的原生 TS 调用与 Mock 联调；
    - **响应式 Hooks 特性**（`@atengk/vue`）：必须在 `apps/sample-vue` 编写极简 Vue 视图驱动验证；
    - **UI 组件与指令特性**（`@atengk/element-plus`）：必须在 `apps/sample-element-plus` 搭建高保真交互展厅。
  - **页面真实渲染与可视交互呈现契约 (Page Visualization Invariant)**：
    - 所有 Sample 工程（包括纯原生网络层与无头 Hooks 层）**必须启动本地开发服务并在浏览器页面中具象化渲染呈现**，坚决杜绝白屏或仅靠控制台 `console.log` 敷衍；
    - **`apps/sample-core`（固定端口 `3001`）**：页面必须构建“**协议与网络请求交互看板**”，提供模拟请求触发按钮、原始 JSON 响应对比、雪花大数字符串防截断高亮卡片、Token 状态切换指示器以及 Blob 下载状态展示；
    - **`apps/sample-vue`（固定端口 `3002`）**：页面必须构建“**响应式状态机监视卡片**”，直观呈现 `useRequest`、`usePagination`、`useLatest` 等 Hook 的触发按钮，实时动态刷新 `loading` 骨架/遮罩、`data` 渲染列表、`error` 错误卡片及并发竞态状态；
    - **`apps/sample-element-plus`（固定端口 `3003`）**：高保真展示表格、导入批注错误弹窗、文件上传下载及权限指令等完整组件级交互展厅；
    - **固定独立端口契约**：
      - `apps/sample-core` ➔ `http://localhost:3001`（`pnpm --filter sample-core dev`）
      - `apps/sample-vue` ➔ `http://localhost:3002`（`pnpm --filter sample-vue dev`）
      - `apps/sample-element-plus` ➔ `http://localhost:3003`（`pnpm --filter sample-element-plus dev`）。
  - **Sample-First 流程不变量（绝对前置工序）**：在编写或更新子模块 `README.md` 前，**必须先完成对应 Sample 场景用例的编写与实测验证并确保全绿**。严禁在尚未写出可运行 Sample 时凭空手敲文档！
  - **代码源头全真逆向提取**：`README.md` 中展示的 Vue/TS 示例代码及执行结果，**必须 100% 直接从已跑通的 Sample 源码、配置及实测日志中 1:1 逆向提取**。若某特性未在 Sample 中跑通，一律严禁写入文档！
  - **文档排版防裂守卫 (Markdown Integrity Guard)**：
    1. 表格单元格内若涉及泛型类型（如 `Result<T>`）、管道符或联合类型（`|`），必须使用行内代码反引号包裹（如 `` `Result<T>` ``）或转义（`\|`），严禁导致表格破损错位；
    2. 嵌套代码块严格遵循反引号阶梯（外四反引号 ```` 嵌套内三反引号 ```）；
    3. 文档互链 100% 使用相对路径，严禁包含本地绝对路径（如 `D:/...`、`file:///`）与死链。

- **子模块与样例工程职责正交与 1:1 矩阵 (Submodule & Samples 1:1 Alignment)**：
  - `packages/core` ↔ `apps/sample-core`（纯 TS 原生请求、大数转换、Token 注入自验）
  - `packages/vue` ↔ `apps/sample-vue`（Vue 3 无头 Hooks 响应式状态机与销毁自验）
  - `packages/element-plus` ↔ `apps/sample-element-plus`（全特性交互体验展厅）
  - 子模块 `README.md` 是该模块唯一权威的**“全功能契约真理源”**，承载完备的全景矩阵与五维交付规范；
  - 场景样例工程（`apps/sample-*`）是面向开发者的**“最小可运行沙箱与开箱体验展厅”**，代码专职作为文档代码片段的真实测试源头。

- **四维职责清晰正交与多上下文拓扑 (Multi-Context Invariant)**：
  - 本项目为多包多上下文（Multi-Context）架构，**根目录严格且唯一维护 `CONTEXT-MAP.md` 专职维护系统拓扑与调用依赖，坚决严禁在根目录创建单体 `CONTEXT.md`**；
  - 领域词汇表严格且只能按限界上下文就近落盘于各子包（`packages/*/CONTEXT.md`），恪守“纯领域词汇表 (Glossary)”定位，只定义术语与 Avoid 负面词汇，严禁堆砌长篇实现细节；
  - `docs/adr/` 专职沉淀重大架构选型，严禁滥发 ADR。

---

## 5. 工程协同与 Git 流水线 (Git Workflow & Release)

- **双分支开发铁律 (Dual-Branch Policy: dev for Active Coding & main for Pure Release)**：
  本项目严格遵循 `main`（只读发布主干）与 `dev`（活跃开发主分支）双分支演进模型；Agent 开展任何编码或修复工作前，必须确认当前处于 `dev` 分支；若检测到处于 `main`，必须主动切换至开发分支，严禁在 `main` 直接编辑业务代码；发版时严格收口于 `main` 分支。
- **精准路径暂存 (Safe Path Staging)**：
  暂存必须显式、精准指定具体的变更文件相对路径（如 `git add packages/core/src/index.ts`），**严禁使用 `.` 或 `-A` 全量通配**，严禁在任何会话答复或建议命令中推介 `git add .`；从源头杜绝未跟踪的临时文件、本地私密配置（如 `.env`）或未经审阅的变更误入暂存区。
- **受控提交与脚本门面 (Explicit Git & Script Facade)**：
  仅当收到用户明确的“提交/commit/保存”指令时方可操作 Git，修改默认停留在工作区供审阅；执行提交时统一使用项目门面脚本：
  ```bash
  bash scripts/commit.sh -t <type> -s <scope> -m "<主说明>" [-l "<细项1>" -l "<细项2>"] [-c <issue>] [-n] [-p] -y
  ```
  单次包含多项改动时须在正文中以 `-l` 逐项罗列；涉及工单闭环时使用 `-c <issue>` 自动生成 `Closes #N`；可用 `-n` 演练提交信息。
- **推送后流水线守护 (Post-Push CI Monitoring Gate)**：
  代码推送到远程后必须对 GitHub Actions CI 流水线实施闭环监控；通过 `gh run list -L 1` 获取最新工作流 Run ID 并执行 `gh run watch <run-id>` 持续跟踪，直到全量构建与单元测试矩阵（Node.js 20 & 22）100% 绿色通过；若检测到流水线失败，必须立即分析排查、修复本地代码并重新提交推送监控，直至流水线彻底成功后方可交付。
- **主干发布与运维解耦 (Trunk-Based Release & Decoupling)**：
  版本发布必须且只能在 `main` 主干分支发起，前置要求工作区 100% 干净且与远端同步，统一通过 `bash scripts/release.sh` 调度 Changesets 自动化发版。

---

## 6. Agent 协议与工单流转规范 (Agent Protocols & SOP)

- **官方 CLI 与工单生命周期闭环 (CLI & Ticket Lifecycle)**：
  GitHub Issues、PR 审阅与 CI 交互一律通过官方 `gh` 命令行闭环。工单生命周期严格遵循五阶段状态机：
  1. **认领**：查阅工单并指派当前开发者（`gh issue edit <n> --add-assignee "@me"`）；
  2. **TDD 与 Sample-First 逆向闭环实现**：
     - **2.1 核心驱动与白盒单测**：测试驱动编码，全面遵循第 3 节“工业级代码成熟度十二道防线”，在模块内部编写完善的白盒与对抗性单元测试；
     - **2.2 Sample 端到端实测补全（Hard Gate）**：在归属的 `apps/sample-*` 中编写真实端到端场景用例，100% 覆盖新增/修改的公开 API、组件、配置项与扩展 SPI，执行定向测试确保端到端全绿；
     - **2.2.1 本地服务启动与人工视觉审核卡点 (Human Visual Review Gate - Blocking)**：
       - Agent 编写完 Sample 用例后，必须启动对应的本地 Vite 开发服务；
       - 在会话中明确向用户输出本地直达访问链接（`http://localhost:3001` / `3002` / `3003`）、交互操作指引与预期视觉表现；
       - **强制阻塞**：必须等待用户在浏览器中亲自交互体验并显式回复“页面审核通过”，方可进入 2.3 阶段；严禁跳过页面审核擅自准出！
     - **2.3 全真逆向提取生成 `README.md`**：从已跑通且通过人工页面审核的 Sample 源码、配置与实测输出中 1:1 逆向提取示例与结果，在所属子模块 `README.md` 中按“五维生产就绪交付模型”补齐全景矩阵、开箱代码、扩展定制接入、核心生产边界与实测输出契约；
  3. **准出、自检与双轴审查**：
     - 执行第 4 节阶梯二准出测试（纯文档改动免测）；
     - **《交付前成熟度与文档双向对齐清单 (Audit Checklist)》强制自检卡点**：
       - [ ] **多模块拓扑单向流**：新增或修改模块依赖是否符合 L0~L3 洋葱拓扑？是否已登记在 `CONTEXT-MAP.md`？
       - [ ] **Sample 100% 场景对齐**：模块新增/修改的所有公共 API 方法、组件 Props/Emits、Hooks 是否已 100% 在归属的 `apps/sample-*` 工程中提供端到端真实可运行用例？
       - [ ] **页面真实渲染与可视交互审核**：是否已启动对应 Sample 服务（3001/3002/3003）？页面上是否已完整挂载可视用例并供用户在浏览器中完成真实交互审核？
       - [ ] **Sample-First 逆向闭环**：`README.md` 中的所有 Vue/TS 示例代码与输出结果，是否 100% 提取自上述已验证跑通的 Sample 工程？
       - [ ] **全景速查矩阵**：模块新增/修改的所有公共组件、API、类型与指令是否 100% 入表？
       - [ ] **代码-文档真理一致性**：文档中展示的代码是否直接截取自已跑通的单测/Sample？组件 Props 与函数签名是否完全对齐？
       - [ ] **十二道成熟度防线自检**：是否通过空安全保底返回 `[]`、确定性生命周期清理、严格单向流、对称门面、边界 Fail-Fast、因果异常转译、零裸 `any`、无头与 UI 解耦等全部 12 项检查？
       - [ ] **单测环境隔离**：是否在 `afterEach` 中执行 DOM 节点销毁（`wrapper.unmount()`）、清空 Storage 状态、100% 离线 Mock 自洽？
       - [ ] **雪花 ID 大数防线**：网络请求反序列化是否通过正则加引号固化为 String，严禁数字截断？
       - [ ] **L0 跨框架纯净防御**：底层核心包（`@atengk/core`）是否保持 100% 平台中立与框架中立，严禁引入 Vue 或 React 专有响应式类型（`Ref`/`State`）与运行时钩子？
       - [ ] **样式隔离与无侵入**：组件样式是否强制 `scoped` 且遵循 `at-` 独立命名空间？是否复用 `--el-*` Design Tokens？
       - [ ] **副作用声明**：`package.json` 是否显式声明 `"sideEffects": false`（或仅限定样式）？顶级入口是否纯净导出？
     - **审查红牌阻断 (Red Card Gate)**：调用 `/code-review` 开展双轴审查；若审查发现模块公开功能在 Sample 中缺位、未在页面渲染呈现、未拉起服务提供页面体验、未经人工页面审核确认、文档示例未经 Sample 真实跑通、文档漏写公开功能，或触碰成熟度红线，一律出具红牌阻断，强制返修直至双绿；
  4. **受控提交**：按第 5 节执行受控提交并推送（代码与文档同工单同提交原子交付）；
  5. **闭环**：守护 CI 监控至全绿，通过文件回写验收清单与提交哈希（`gh issue comment <n> -F <file>`），关闭工单（`gh issue close <n>`）。
- **工单操作与 CLI 规范 (Issue Tracker & CLI)**：操作 GitHub Issues / PR 或编写终端命令时，遵循 [docs/agents/issue-tracker.md](./docs/agents/issue-tracker.md)（含特殊字符引号包裹、`-F` 文件回写防截断及 Wayfinding 路线图映射）。
- **分流标签规范 (Triage Labels)**：分流或标记 Issue 状态时，遵循 [docs/agents/triage-labels.md](./docs/agents/triage-labels.md)（`needs-triage` / `needs-info` / `ready-for-agent` / `ready-for-human` / `wontfix`）。
- **领域词汇与架构决策 (Domain Docs)**：探索代码库、设计新领域实体或查阅架构决策时，阅读全局映射 [CONTEXT-MAP.md](./CONTEXT-MAP.md) 及各模块独立的 `CONTEXT.md`，架构选型遵循 [docs/adr/](./docs/adr/)，规约详见 [docs/agents/domain.md](./docs/agents/domain.md)。
