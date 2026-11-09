# 前端模块孵化与扩展通用标准 (Modular Extensibility SOP)

本指南规范 `ateng-ui` 从 0 到 1 孵化全新前端子包（`packages/<name>`，即 `@atengk/<name>`）及其配套体验展厅（`apps/sample-<name>`）的标准流程。

_(注：既有存量子包从 1 到 N 的深度体检、能力补齐与加固重构，请遵循 [存量前端模块加固与全场景演进规范](./module-hardening-and-expansion.md)。)_

---

## 1. 工业级六件套闭环门禁 (The 6-Piece Gate)

无论孵化何种层级的新模块（L0 纯 TS 底座、L1 无头响应式 Hooks、L2 专业领域渲染引擎、L3 UI 组件套件），必须一次性完整交付以下“工业级六件套”：

1. **行业全场景前置对标 (Scenario Benchmarking Gate)**：
   - 对标该领域业界成熟标杆（L0 对标 Axios/Ky/Sentry，L1 对标 VueUse/TanStack Query，L2 对标 PDF.js/Artplayer/ECharts/LogicFlow/Monaco/TipTap，L3 对标 Element Plus/Ant Design Pro/VxeTable），梳理排名前 80%~90% 的企业级高频生产场景与扩展 SPI，杜绝孵化“半残”玩具包。
2. **Workspace 拓扑、双模构建与 Tree-Shaking (Toolchain & Tree-Shaking Gate)**：
   - 模块命名对齐 `@atengk/<name>`，跨包依赖统一使用 `workspace:*`，双轨 peerDependencies 宽进严出（ADR-0005、ADR-0006）；
   - 构建采用 `tsup`（或 Vite Library Mode）输出 ESM (`dist/index.js`) + CJS (`dist/index.cjs`) + DTS (`dist/index.d.ts`)；
   - `package.json` 显式配置 `"sideEffects": false`（含样式文件则收敛为 `["*.css", "*.scss"]`），顶级入口 `src/index.ts` 纯声明式具名导出，严禁在 `import` 时执行隐式全局副作用。
3. **四层洋葱解耦与底座原语复用 (Onion Architecture & Core-First Gate)**：
   - 严格遵守 `L3 ➔ L2 ➔ L1 ➔ L0` 单向无环依赖（ADR-0009）与 [`AGENTS.md`](../../AGENTS.md) 确立的 **十二道代码成熟度防线**；
   - 100% 优先复用 `@atengk/core` 与 `@atengk/vue` 已就绪的网络管道、雪花大数处理、脱敏、并发竞态控制与响应式原语，严禁引入 `lodash`、`moment` 等重型第三方全量库。
4. **1:1 可视化多场景展厅与双模自验 (1:1 Visual Sample Gate)**：
   - 在 `apps/sample-<name>` 配套 1:1 独立体验展厅（标配 `"private": true` 与 `.env.example`），严格遵循 [`documentation-specification.md`](./documentation-specification.md) 第 3 章的分层可视化看板规范與全自洽前端单测三铁律。
5. **Sample-First 五维文档与体验卡 (5D Documentation Gate)**：
   - 先跑通 Sample 可视化看板与自动化单测，再按 [`documentation-specification.md`](./documentation-specification.md) 1:1 逆向提取生成子包五维 `README.md`（100% 全景速查矩阵、“类型-代码-原理”三要素就近闭环、能力大章收敛）与 Sample 四段式体验卡 `README.md`。
6. **领域词汇表与 ADR 架构记录 (Domain & ADR Gate)**：
   - 按 [`domain.md`](./domain.md) 新建 `packages/<name>/CONTEXT.md` 纯领域词汇表，新增编号递增的 `docs/adr/NNNN-*.md` 架构决策记录（严禁重号），并同步注册至 [`CONTEXT-MAP.md`](../../CONTEXT-MAP.md) 与 [`docs/adr/README.md`](../adr/README.md)。

---

## 2. 阶梯二四合一准出验证命令

新模块孵化完成后，必须执行定向四合一门禁验证并通过 [`documentation-specification.md`](./documentation-specification.md) 中的 **15 项交付前强制自检清单**：

```bash
pnpm --filter @atengk/<name> --filter sample-<name> typecheck && \
pnpm --filter @atengk/<name> --filter sample-<name> lint && \
pnpm --filter @atengk/<name> --filter sample-<name> test && \
pnpm --filter @atengk/<name> --filter sample-<name> build
```
