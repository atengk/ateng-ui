# 0001. 工程工具链与 pnpm 版本基线锁定

## 状态

Accepted (已接受)

## 背景与决策上下文

项目定位于现代企业级工业级前端基础设施 Monorepo 套件，需要跨开发者机器、CI/CD 流水线以及 Turborepo 2.x 增量编排实现 100% 确定性的构建表现。当前开发机本地运行 pnpm `9.12.3`（搭载 Node.js `22.19.0`），而社区已演进至 pnpm 10。

经调研，pnpm 9.x 与 pnpm 10.x 均使用 Lockfile v9.0 (`lockfileVersion: '9.0'`)，但 pnpm 10 默认启用了 `onlyBuiltDependencies`，会全局阻断所有第三方依赖的原生编译与安装生命周期脚本（如 `esbuild`、`fsevents`），导致在未手动维护繁琐白名单的情况下引发依赖安装崩溃；同时其对全局工具提升的严格限制容易破坏子包对公共编译工具的寻址。

## 架构决策

1. 根目录 `package.json` 显式且严格锁定 `"packageManager": "pnpm@9.12.3"`；
2. 运行环境基线明确为 Node.js `>=20.18.0`（开发环境推荐 22.x LTS），CI 流水线采用 Node 20（PR）与 Node 20 & 22（主干）矩阵；
3. 后续若需修复 workspace 边界问题，仅在 9.x 体系内平滑升级（如 9.15.x），禁止在未经架构委员会评审的情况下激进升级至 pnpm 10。

## 效果与权衡

- **收益**：避免了 `onlyBuiltDependencies` 白名单维护负担，确保本地开发与 CI 环境 100% 幂等，保障 Turborepo 2.x 任务拓扑图与构建缓存绝对稳定。
- **代价**：无法使用 pnpm 10 的部分新配置特性（如原生多版本包管理器自动切换）。
