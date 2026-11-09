# ateng-ui 研发指南与 Agent 行为指引

## 1. 项目定位与技术基线

`ateng-ui` 是面向现代 Web 应用与企业级系统的前端基础设施、无头响应式状态机、专业领域引擎与 UI 组件套件（Monorepo），坚持纯原生优先、零臃肿依赖与端到端强类型契约设计（全量架构决策见 [`docs/adr/README.md`](./docs/adr/README.md)）。

- **工程与构建基线**：Node.js `>=20.18.0`，pnpm `>=9.12.3`（Workspace 协议，ADR-0001），Turborepo `2.x`，tsup `8.x` / Vite `6.x`（双模输出 ESM + CJS + DTS），TypeScript `^5.6.0`（Strict Mode）
- **核心生态与双轨策略（ADR-0002、ADR-0005、ADR-0006）**：Vue `^3.5.0`（`peerDependencies` 宽进；Sample 锁定 `^3.5.44` 严出），Element Plus `>=2.8.0`（Sample 锁定 `^2.14.7`），Axios `^1.7.7`
- **命名与分发坐标**：Scope `@atengk/*`（`packages/<name>`），1:1 场景展厅 `sample-<name>`（`apps/sample-<name>`，固定端口 `3001`~`3010`），CSS 命名空间前缀 `at-`

---

## 2. 核心架构与编码契约

- **四层洋葱拓扑与单向依赖律（ADR-0009）**：全仓遵循 **`L3 (UI 套件层: @atengk/element-plus) ➔ L2 (专业扩展层: @atengk/file-viewer-vue, video-player-vue, echarts-vue, flow-vue, code-editor-vue, editor-vue) ➔ L1 (无头层: @atengk/vue) ➔ L0 (纯 TS 底座: @atengk/core, @atengk/monitor)`** 自顶向下单向无环流动（见 [`CONTEXT-MAP.md`](./CONTEXT-MAP.md)）；严禁下层反向引用上层或跨包循环依赖。
- **传输契约对齐与自适应解包（ADR-0010）**：HTTP 客户端对齐后端 `Result<T>`（`code`/`msg`/`data`/`traceId`）与分页 `PageResult<T>`（入参 `current`/`size`，响应 `records`/`total`）；默认剥壳返回 `Promise<T>`（支持 `rawResponse: true`），非 200 业务码转译为 `BusinessException`。
- **雪花 Long ID 原始 JSON 正则防截断（ADR-0003）**：针对后端 64 位长整型雪花 ID（`> Number.MAX_SAFE_INTEGER`），在 Axios `transformResponse` 原始字符串阶段通过零依赖正则将 16 位以上纯数字值包裹双引号转为 `string`，严禁引入 `json-bigint`。
- **Blob 异常双态识别与 Fesod Excel 协议（ADR-0004、ADR-0027）**：文件下载/导出流式响应（`responseType: 'blob'` 或 Fetch 流）前置嗅探 `Content-Type`；若为 `application/json` 错误帧，立即通过 `Blob.text()` 解析并抛出 `BusinessException`，严禁生成损坏假文件；原生支持 Apache Fesod 导入批注回写协议。
- **异步时序竞态双重防御（ADR-0013）**：高频检索、Tab 切换与分页拉取标配 `AbortController`（`AbortSignal` 中断过期请求）与 `useLatest`（逻辑序号比对丢弃过期响应），根除“先发后至”状态覆盖。
- **全链路 `traceId` 与双 Token 并发续期（ADR-0011、ADR-0038）**：请求拦截器注入 `X-Trace-Id` 与 `X-Idempotency-Key`；`AuthManager` 遇 `401` 时基于内存 Promise 锁队列挂起并发请求，单次刷新 Token 成功后批量重放，失败则清空凭据并触发登出。
- **前端内存真明文与渲染态脱敏（ADR-0017）**：网络层与状态层保持原始数据契约，严禁在业务表单状态中直接将属性篡改为星号字符串导致回显污染；展示脱敏收敛于渲染管道或 `AtengDescriptions` 声明式切换。
- **Vue 3.5+ 响应式入参与解包契约（ADR-0002、ADR-0013）**：Composables（Hooks）动态入参统一声明为 `MaybeRefOrGetter<T>`，内部统一使用 Vue 3.5 原生 `toValue()` 解包，严禁直接解构导致响应性丢失。
- **UI 样式隔离、Design Tokens 与实例暴露（ADR-0021、ADR-0029）**：① 组件根类名强制以 `at-` 为前缀（BEM），SFC 强制开启 `<style scoped>`（严禁全局样式污染与全局 `!important`）；② 颜色、圆角、阴影 100% 绑定 `--el-*` 或 `--at-*` CSS 变量，严禁硬编码物理 Hex 色值破坏暗黑模式；③ 复合组件必须通过 `defineExpose` 显式暴露实例方法（如 `refresh`、`validate`、`resetFields`）。

---

## 3. 工业级代码成熟度十二道防线与审查红线

以下十二道防线与四层洋葱单向依赖律为 `/code-review` **一票否决红牌阻断项**：

1. **空安全保底返回**：列表、表格、下拉选项等集合查询无匹配或异常兜底时，**统一返回空数组 `[]`**，严禁返回 `null` 或 `undefined`。
2. **确定性生命周期与句柄清理**：事件监听（`addEventListener`）、定时器、`ResizeObserver`/`IntersectionObserver`/`MutationObserver`、WebSocket/SSE、Web Worker 及 `URL.createObjectURL` 临时 Blob URL，**必须在 `onUnmounted` 或 `onScopeDispose` 中 100% 销毁释放**。
3. **严格无状态与单向数据流**：单例管理器严禁混入组件实例状态；组件严禁直接突变 `Props`（通过 `emit` 或 `defineModel` 回传）；Hooks 内部状态按需使用 `readonly()` 包装。
4. **对称语义完备性**：门面与 Hooks 必须具备完备对称语义（注册/注销、订阅/取消、加锁/解锁、打开/关闭、挂载/卸载对称），严禁半残门面。
5. **分层防卫与快速失败（Fail-Fast）**：核心函数、网络管道与引擎入口通过前置卫语句校验非法参数（空 URL、非法页码、超限分片、空 DOM 容器）并立即抛出语义化错误。
6. **平台与跨框架中立防御（L0 纯净律）**：L0 底座（`@atengk/core`、`@atengk/monitor`）保持 100% 纯 TypeScript 跨框架中立，**严禁引入 `vue`、`react` 或任何 UI 库依赖与响应式类型（`Ref`）**。
7. **因果异常体系与驱动解耦**：严禁空 `catch` 吞咽异常或仅 `console.log` 敷衍；底层网络/引擎错误转译为 `BusinessException`，完整保留 `code`、`msg`、`traceId` 与原始 `cause` 链。
8. **原生优先与零臃肿底座收敛**：100% 优先使用 ESNext / Web 原生 API（`fetch`、`structuredClone`、`Intl`、`crypto`）与 Vue 3.5 原生算力；跨包通用能力收敛于 `@atengk/core` 与 `@atengk/vue`，**严禁引入 `lodash`、`moment` 等重型工具库**。
9. **对抗性极限单测与 1:1 Sample 守护**：除 Happy Path 外，单测必须覆盖雪花大数精度、空数组保底、并发竞态丢弃、网络中断重试、401 续期队列与组件卸载清理场景。
10. **零 `any`、禁裸非空断言与显式导出闭环**：生产代码 **100% 严禁裸 `any`**（未知结构使用 `unknown` + 类型守卫）与未防御的非空断言 `!`；子包顶级 `src/index.ts` 必须 100% 显式具名导出所有公开组件、Hooks 与 TypeScript 接口。
11. **无头层与 UI 表现彻底解耦（L1 纯净律）**：L1 无头层（`@atengk/vue`）只负责响应式状态机编排，**严禁直接导入或调用 `ElMessage`、`ElNotification` 等具体 UI 组件**。
12. **受管整洁代码与文档注释**：单个 `.vue` SFC 建议 $\le 400$ 行（标签顺序固定为 `<script setup lang="ts">` $\rightarrow$ `<template>` $\rightarrow$ `<style scoped>`），单个 `.ts` 文件 $\le 500$ 行；新建源码与公开 API 标配中文 JSDoc、`@author Ateng` 与 `@since YYYY-MM-DD`。

---

## 4. 质量门禁、全自洽单测与文档/样例闭环

- **三阶梯测试准出**（纯文档 `*.md` 修改豁免执行构建与单测）：
  1. **阶梯一（日常自验）**：`pnpm --filter @atengk/<pkg> test` 与 `pnpm --filter @atengk/<pkg> typecheck`
  2. **阶梯二（提交前四合一准出）**：`pnpm --filter @atengk/<pkg> --filter sample-<pkg> typecheck && pnpm --filter @atengk/<pkg> --filter sample-<pkg> lint && pnpm --filter @atengk/<pkg> --filter sample-<pkg> test && pnpm --filter @atengk/<pkg> --filter sample-<pkg> build`（L0/L1 核心改动须运行根目录全量 `pnpm typecheck && pnpm lint && pnpm test && pnpm build`）
  3. **阶梯三（推送后 CI 守护）**：推送后通过 `gh run watch <run-id>` 监控远端 GitHub Actions 流水线至全绿。
- **全自洽单测三铁律（ADR-0008）**：① 挂载组件测试必须在 `afterEach` 执行 `wrapper.unmount()` 并清理残留 DOM / Teleport 节点；② `localStorage`/`sessionStorage`、Pinia 状态与 `AuthManager` 凭据必须在 `beforeEach`/`afterEach` 重置；③ 100% 依托 Vitest Mock 或 MSW 拦截网络请求，严禁发起真实外部网络调用。
- **极致 Tree-Shaking 与打包规范（ADR-0015）**：子包 `package.json` 必须声明 `"sideEffects": false`（含样式文件则收敛为 `["*.css", "*.scss"]`）；Vue 插件 `install(app)` 必须显式导出调用，严禁在顶层 `import` 执行全局自注册副作用。
- **Sample 1:1 正交与 Sample-First 五维文档铁律**（详见 **[`docs/agents/documentation-specification.md`](./docs/agents/documentation-specification.md)**，ADR-0039）：
  - **1:1 展厅与非分发隔离**：每个 `packages/<name>` 对应 `apps/sample-<name>`（见 `pnpm-workspace.yaml` 与 [`CONTEXT-MAP.md`](./CONTEXT-MAP.md)）；Sample 间零共享代码，标配 `"private": true`、`.env.example` 与离线 Mock / `.env.local` 网关双模切换；
  - **分层多场景看板与五维 `README.md`**：Sample 按领域拆分为多个可视化交互看板/路由视图（严禁白屏、纯 `console.log` 或单文件臃肿 `App.vue`），Sample `README.md` 采用四段式体验卡；先完成 Sample 四合一验证全绿，再 1:1 逆向提取至子包五维 `README.md`（100% 全景矩阵、“类型-代码-原理”三要素闭环、领域大章收敛、排版防裂）。
- **多上下文与 ADR 防膨胀**：根目录唯一维护 [`CONTEXT-MAP.md`](./CONTEXT-MAP.md)（严禁建根 `CONTEXT.md`），子包维护纯词汇表 `packages/<name>/CONTEXT.md`；仅在孵化新子包或重大重构时新建 ADR（严禁重号），存量优化在既有 ADR 增量修订。

---

## 5. 工程协同与 Git 流水线

- **双分支与显式两级授权**：`main` 只读发布，`dev` 活跃开发（在 `main` 须主动 `git checkout dev`）；**未收到用户明确的“提交/commit”或“推送/push”指令前，修改默认停留在工作区，严禁擅自提交或推送**；暂存须显式指定文件路径（严禁 `git add .` 或 `-A`）；提交执行：`bash scripts/commit.sh -t <type> -s <scope> -m "<主说明>" [-l "<细项>"] [-c <issue>] [-n] [-p] -y`。
- **推送后 CI 守护与发版**：推送后通过 `gh run list -L 1` 与 `gh run watch <run-id>` 跟踪 CI 至全绿；发版只能在干净同步的 `main` 分支通过 `bash scripts/release.sh` 发起。

---

## 6. Agent 执行状态机与专职规约路由表

- **双模状态机与停止判据**：① **阶段 1~3（认领/探查 → TDD 与 Sample-First 实现 → 阶梯二四合一验证、15 项自检与 `/code-review` 双绿）**：未获授权提交推送前，完成阶段 3 后**必须停留在工作区汇报结果**；② **阶段 4~5（`scripts/commit.sh` 提交推送 → `gh run watch` 守护全绿 → `gh issue comment -F` 关单）**：仅在收到显式指令时触发。
- **专职规约前置唤醒路由表**：触及以下分支时，**必须在操作前调用 `read_file` 读取对应规约**：

| 触发分支 / 任务场景                  | 必读权威规约文档                                                                                       | 核心完成判据                                                                                                         |
| :----------------------------------- | :----------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------- |
| **编写/修改 `README.md` 或 Sample**  | **[`docs/agents/documentation-specification.md`](./docs/agents/documentation-specification.md)**       | 可视化看板与四合一全绿、1:1 逆向提取、全景矩阵 100% 覆盖、通过 **15 项准出自检清单**                                 |
| **从 0 到 1 孵化全新前端子包**       | **[`docs/agents/modular-extensibility.md`](./docs/agents/modular-extensibility.md)**                   | 交付“工业级六件套”（标杆对标、tsup/Tree-Shaking、洋葱解耦、1:1 展厅、五维文档、Domain/ADR）                          |
| **对存量子包执行 1 到 N 体检或扩容** | **[`docs/agents/module-hardening-and-expansion.md`](./docs/agents/module-hardening-and-expansion.md)** | 执行四阶段流水线，阶段一输出 `module-health-check.md` 后**必须停下等待人工审批**                                     |
| **探索模块边界或查阅/新增 ADR**      | **[`docs/agents/domain.md`](./docs/agents/domain.md)** & **[`CONTEXT-MAP.md`](./CONTEXT-MAP.md)**      | 对齐子包 `CONTEXT.md` 术语与 `Avoid` 词表，同步维护 `CONTEXT-MAP.md` 与 [`docs/adr/README.md`](./docs/adr/README.md) |
| **操作 GitHub Issue / PR 或 `gh`**   | **[`docs/agents/issue-tracker.md`](./docs/agents/issue-tracker.md)**                                   | PowerShell `"@me"` 加引号、长文本强制 `-F <file>`、遵守五阶段状态机与 Git 授权边界                                   |
| **评估或修改 Issue 状态标签**        | **[`docs/agents/triage-labels.md`](./docs/agents/triage-labels.md)**                                   | 准确映射 `needs-triage` / `needs-info` / `ready-for-agent` / `ready-for-human` / `wontfix`                           |
| **执行版本发布或排查发版流水线**     | **[`docs/agents/release-workflow.md`](./docs/agents/release-workflow.md)**                             | 确认 `main` 纯净同步，使用 `bash scripts/release.sh` 与 `"private": true` 非分发防线                                 |
