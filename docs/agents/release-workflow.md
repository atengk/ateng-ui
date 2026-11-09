# 前端发版与 npm 分发流水线规范 (Release & Distribution Workflow)

本规约定义 `ateng-ui` Monorepo 的版本对齐、发版防呆自检、非分发沙箱隔离与远端 CI 发布流水线治理标准。

---

## 1. 主干发版与分支隔离铁律 (Trunk-Based Release Invariant)

1. **严禁非主干发版**：版本发布操作**只能且必须在 `main` 默认主干分支**上发起；日常开发所在的 `dev` 分支或任何特性分支严禁执行发版打标。
2. **发版前工作区零脏状态**：执行发版前，`git status --porcelain` 必须 100% 干净（无未暂存修改、无未提交文件），且本地 `main` 分支必须与 `origin/main` 完全同步（零落后提交）。
3. **非分发模块（Sample 展厅）隔离防线**：
   - `apps/sample-*` 下所有场景体验展厅在各自的 `package.json` 中强制声明 `"private": true`，仅作为开发自验与集成测试沙箱，**绝对严禁发布至 npm Registry**；
   - 仅 `packages/*` 下对外公开的 `@atengk/*` 子包参与构建产物封包与版本分发。

---

## 2. 标准发版执行协议 (`scripts/release.sh`)

发版严禁手动逐个修改 `package.json` 或裸跑 `git tag`；统一通过项目内置的全生命周期发版防呆脚本 [`scripts/release.sh`](../../scripts/release.sh) 执行：

### 2.1 演练预览模式（Dry-Run 推荐先行）

在正式发版前，建议先运行 `--dry-run`（或 `-n`）模式，安全预览前置环境检查、版本变更范围与 Git 操作指令，不产生任何真实变更：

```bash
bash scripts/release.sh v1.0.0 --dry-run
```

### 2.2 正式发版执行（AI / 自动化非交互模式）

确认演练无误且收到开发者明确发版指令后，附加 `-y`（或 `--yes`）执行非交互式一键发版：

```bash
bash scripts/release.sh v1.0.0 -y
```

### 2.3 脚本内部自动化流水线动作

`scripts/release.sh` 会自动依次完成以下防呆步骤：

1. **前置防呆自检 (Pre-flight Checks)**：校验 `git` / `pnpm (>=9.12.3)` 环境、确认当前处于 `main` 分支、确认工作区干净且已同步 `origin/main`、校验目标 SemVer 标签格式合法且未与历史 Tag 冲突；
2. **全域版本对齐 (Version Bump Hook)**：批量同步更新根目录 `package.json` 与 `packages/*/package.json` 的 `version` 字段，并执行 `pnpm install --lockfile-only --silent` 刷新 `pnpm-lock.yaml`；
3. **版本提交与附注标签 (Commit & Annotated Tag)**：自动生成规范化发版提交 `chore(release): publish vX.Y.Z` 并创建带签名的 Git Tag `vX.Y.Z`；
4. **远端原子推送 (Atomic Push)**：将 `main` 分支与 `vX.Y.Z` 标签同步推送到 `origin` 远端仓库，触发 GitHub Actions 发布流水线。

---

## 3. 推送后 CI 发布流水线守护 (Post-Release CI Gate)

标签推送完成后，必须立即通过 `gh` CLI 持续监控远端发版流水线直至 100% 成功：

```bash
# 1. 获取最新触发的发版工作流 Run ID
gh run list -L 1

# 2. 实时阻塞监控流水线执行状态直至全绿
gh run watch <run-id>
```

若远端流水线在全量 `typecheck`、`lint`、`test`、`build` 或产物发布阶段失败，必须立即读取失败日志（`gh run view <run-id> --log-failed`）排查修复，严禁在流水线飘红状态下宣告发版完成。
