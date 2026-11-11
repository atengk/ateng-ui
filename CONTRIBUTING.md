# ateng-ui 贡献与本地开发指南 (Contributing Guide)

感谢关注并参与 `ateng-ui` 的建设与维护！本项目采用 Turborepo + pnpm Workspace 进行多包架构治理，坚持纯原生优先、四层洋葱解耦与严格端到端类型契约。

---

## 1. 环境准备 (Prerequisites)

在本地克隆并运行本项目前，请确保本地开发环境满足以下版本基线：

- **Node.js**：`>= 20.18.0`（推荐使用 LTS 版本）
- **pnpm**：`>= 9.12.3`（项目强依赖 pnpm Workspace 协议，严禁使用 npm 或 yarn 直接安装）
- **Git**：建议在 Unix/Linux/macOS 或 Windows PowerShell / Git Bash 环境下操作

---

## 2. 常用开发与质量门禁指令 (Scripts & Verification)

### 2.1 依赖安装与全局构建

```bash
# 1. 安装全仓依赖
pnpm install

# 2. 全仓增量并发构建所有子包与场景展厅 (Sample)
pnpm run build
```

### 2.2 本地运行场景展厅 (Sample Apps)

各子包在 `apps/sample-*` 目录下均配有 1:1 独立可运行的场景展厅，支持极速自验：

```bash
# 运行核心网络与大数防截断展厅 (端口 3001)
pnpm --filter sample-core dev

# 运行 Element Plus 增强组件展厅 (端口 3009)
pnpm --filter sample-element-plus dev

# 运行无头响应式状态机展厅 (端口 3003)
pnpm --filter sample-vue dev
```

### 2.3 提交前质量检查四合一 (Typecheck, Lint, Test, Build)

提交代码前，必须执行三阶梯质量门禁，确保本地自洽验证全绿：

```bash
# 1. 严格类型检查 (Typecheck)
pnpm run typecheck

# 2. 单元测试 (离线自洽测试，覆盖率与抗时序测试)
pnpm run test

# 3. 代码风格与规范检查 (ESLint & Prettier)
pnpm run lint
pnpm run format

# 针对单包与配套展厅的快速自检 (例如 element-plus)
pnpm --filter @atengk/element-plus --filter sample-element-plus typecheck
pnpm --filter @atengk/element-plus --filter sample-element-plus test
```

---

## 3. 核心架构与编码红线 (Architectural Invariants)

在编写或修改代码时，请严格遵守全仓架构红线：

1. **四层洋葱单向依赖律**：
   - 依赖流向必须严格遵循：`L3 (UI 套件: @atengk/element-plus) ➔ L2 (专业扩展层) ➔ L1 (无头层: @atengk/vue) ➔ L0 (纯 TS 底座: @atengk/core, @atengk/monitor)`；
   - 严禁下层反向引用上层，严禁跨包循环依赖；L0/L1 严禁引入具体 UI 库依赖。
2. **确定性生命周期清理**：
   - 所有事件监听、定时器、Observer、WebSocket 及临时 Object URL 必须在 `onUnmounted` 或 `onScopeDispose` 中 100% 销毁。
3. **样式隔离与 Design Tokens**：
   - 组件根类名强制以 `at-` 为前缀，SFC 必须声明 `<style scoped>`；样式颜色严格绑定 CSS 变量，严禁硬编码 Hex 色值。
4. **测试自洽铁律**：
   - 单测 100% 依赖 Vitest Mock 或 MSW 拦截，严禁发起真实外部网络请求；单测执行完毕必须恢复 DOM 与全局状态。

---

## 4. Git 提交规范 (Commit Conventions)

仓库提供标准化提交脚本，统一遵循 Conventional Commits 规范：

```bash
# 交互式提交与类型检查
bash scripts/commit.sh -t <type> -s <scope> -m "<主说明>" [-l "<细项>"]

# 常用类型 (type)：
# feat:     新功能或新特性
# fix:      修复缺陷
# docs:     纯文档变更
# refactor: 代码重构 (不改变外部表现与接口契约)
# test:     增补测试用例
# chore:    构建脚本、依赖升级或辅助工具变动
```

---

## 5. 深入了解 (Deep Dive)

- 欲深入了解项目全景规范、15 项准出自检与 Agent 规约，请参阅 [AGENTS.md](./AGENTS.md)。
- 欲查看架构演进脉络与技术抉择（雪花 ID 纳秒级正则、双态 Blob 识别等），请查阅 [架构决策记录库 (ADR)](./docs/adr/)。
