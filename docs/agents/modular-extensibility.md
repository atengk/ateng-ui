# 前端模块孵化与扩展通用标准 (Modular Extensibility SOP)

本指南规范 `ateng-ui` 孵化新模块与扩展既有生态的标准流程（0 到 1 阶段），确保所有衍生子包具备统一的工程质量、架构一致性与纯净度。

_(注：新模块孵化完成后，后续的存量加固、深度重构与全场景功能补齐，请遵循 [存量前端模块加固与全场景演进规范](./module-hardening-and-expansion.md)。)_

---

## 1. 工业级六件套闭环门禁 (The 6-Piece Gate)

无论扩展何种新功能模块（如 L0 底座能力、L1 无头 Hooks、L2 专用引擎适配、L3 UI 组件套件），一律遵循“工业级六件套”闭环门禁：

1. **行业全场景前置对标 (Scenario Benchmarking Gate)**：
   - 孵化新模块前，必须对标该技术领域业界成熟标杆（L0 对标 Axios/Ky/Fetch 企业级管道，L1 对标 VueUse/ahooks/TanStack Query 响应式状态机，L2 对标 PDF.js/docx-preview/Artplayer/HLS.js 专业引擎，L3 对标 Element Plus/Ant Design/VxeTable 高级交互），梳理出排名前 80%~90% 的企业级典型高频业务场景；
   - 明确新模块首期需要支撑的核心场景矩阵与扩展点 SPI，杜绝孵化出只有一两个玩具方法的“半残”子包。
2. **包管理与双模构建统管 (Workspace & Toolchain Invariant)**：
   - 遵循 pnpm workspace 集中协议，模块命名严格对齐 `@atengk/<name>`，依赖跨包引用统一使用 `workspace:*`；
   - 构建采用 `tsup` 标准配置，显式声明 `exports` 双模输出 ESM (`dist/index.js`) + CJS (`dist/index.cjs`) + DTS (`dist/index.d.ts`)；
   - `package.json` 显式配置 `"sideEffects": false`（若包含组件样式文件，仅收敛为 `"sideEffects": ["*.css", "*.scss"]`）；顶级入口 `index.ts` 纯声明式导出，实现极致 Tree-Shaking 零副作用残留。
3. **专属自包含文档 (Sample-First 逆向提取)**：
   - 子模块根目录标配专属 `README.md`，文档中的所有 TypeScript / Vue 代码示例必须 100% 逆向提取自对应 Sample 中已跑通的真实端到端场景；
   - 严格遵循“五维生产就绪交付模型”，核心显要位置 100% 收录全景速查矩阵（收录所有公开门面、方法、Hooks、组件 Props/Emits/Slots、类型定义与指令）。
4. **领域拓扑与上下文映射 (Domain & Multi-Context Invariant)**：
   - 子包配备独立的 `packages/<name>/CONTEXT.md`（严格恪守纯领域词汇表定位，定义核心概念术语与 Avoid 负面词汇，严禁堆砌长篇实现代码）；
   - 在根目录 `CONTEXT-MAP.md` 中显式登记所属层级（L0~L3）与合法依赖边界，严格遵循自顶向下单向流动，严禁产生跨层逆向依赖与跨包循环依赖。
5. **全自动自验用例与 1:1 场景工程 (100% Feature Coverage)**：
   - 在 `apps/sample-<name>` 配套专属 1:1 对应的场景样例工程，新模块的所有公开 API、组件、配置项与扩展点必须 100% 在 Sample 中具备端到端可运行用例；
   - 样例工程必须可直接运行，Vite 编译无报错，并通过自动化单测与构建验证。
6. **底座原语优先复用 (Core-First Reuse Gate)**：
   - 新增模块涉及网络请求、Token 注入、雪花 ID 处理、时间/缓存、无头状态机、并发竞态控制等需求时，强制 100% 优先复用 `@atengk/core` 及 `@atengk/vue` 已就绪的基础设施与标准件；
   - 坚决杜绝在子模块内私造工具函数或引入 `lodash`、`moment` 等重型第三方全量依赖。

---

## 2. 架构契约与分层装配规范 (Architecture & Decoupling Invariants)

1. **十二道代码成熟度防线**：新模块编码必须全面对齐全局 [`AGENTS.md`](../../AGENTS.md) 确立的十二道成熟度防线（空安全保底返回 `[]`、确定性生命周期清理 `onScopeDispose`、因果异常转译、严格无状态单向流、平台与跨框架中立防御、零裸 `any` 等）。
2. **分层解耦与装配规范**：
   - **L0 纯 TS 底座**：平台中立与跨框架中立，严禁引入 Vue/React 专有响应式类型（`Ref`/`State`）与运行时钩子；
   - **L1 无头层**：纯响应式状态机，严禁直接引用或物理调用 `ElMessage` 等具体 UI 弹窗组件；
   - **L3 UI 层**：组件根样式强制以 `at-` 作为独立命名空间前缀，SFC 强制开启 `<style scoped>`，Design Tokens 复用 `--el-*` 或 `--at-*`；
   - **组件/插件受控安装**：若提供 Vue 插件安装器（`install(app)`），必须作为独立导出的函数供使用者显式调用，严禁在 `import` 时隐式自注册。

---

## 3. 场景化样例工程设计准则 (Sample Design Standards)

为保障多模块演化时的极速本地测试准出与环境无关性，样例工程遵循以下准则：

- **1:1 独立场景沙箱**：每个子包严格对应一个专属的 `apps/sample-<name>`（如 `sample-core`、`sample-vue`、`sample-file-viewer-vue`、`sample-video-player-vue`、`sample-element-plus`），彻底杜绝跨包混合的胖样例；
- **分层分明沙箱定位**：
  - **L0 纯 TS 原生沙箱 (`apps/sample-core`，固定端口 `3001`)**：纯 TypeScript 原生环境，严禁引入 Vue/UI 框架，专职自验网络管道、大数转换与 Token 注入；
  - **L1 无头响应式沙箱 (`apps/sample-vue`，固定端口 `3002`)**：Vue 3 视图驱动，直观呈现无头 Hooks 的状态机监视卡片（`loading`、`data`、`error`、抗竞态与销毁清理）；
  - **L2 专用引擎沙箱 (`apps/sample-file-viewer-vue` / `apps/sample-video-player-vue`)**：专属沙箱自验文档与流媒体多路矩阵及水印交互；
  - **L3 UI 组件交互展厅 (`apps/sample-element-plus`，固定端口 `3003`)**：高保真展示组件、表单、弹窗与指令交互；
- **业务场景命名驱动**：测试与组件用例以实际业务痛点场景命名（如 `ChunkedUploadScenario`、`AntiRaceSearchScenario`、`SnowflakeLongIdScenario` 等）；
- **全自洽单测三铁律**：
  1. **DOM 现场严格还原**：挂载测试组件后，必须在 `afterEach` 中执行 `wrapper.unmount()` 并安全清理全局残留节点；
  2. **响应式与存储零污染**：Pinia/Vuex、Storage 适配器或 Token 凭据在 `beforeEach`/`afterEach` 中无条件执行重置与清空；
  3. **100% 离线自洽**：基于 MSW 或 Vitest Mock 拦截网络，绝对严禁向外部真实物理网络发起 HTTP 请求；
- **自包含与零共享**：各场景工程完全独立自洽，严禁在样例工程之间建立依赖，严禁抽取跨样例共享代码；
- **非分发属性声明**：样例工程自身标配声明 `"private": true`，杜绝将测试工程封包发布至 npm。

---

## 4. 极速本地构建验证 (Fast Local Build Verification)

新模块开发完成后，必须执行定向精准命令执行端到端自验，保障 100% PASS：

```bash
pnpm --filter @atengk/<new-module> --filter sample-<new-module> typecheck && \
pnpm --filter @atengk/<new-module> --filter sample-<new-module> lint && \
pnpm --filter @atengk/<new-module> --filter sample-<new-module> test && \
pnpm --filter @atengk/<new-module> build
```
