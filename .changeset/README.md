# Changesets

欢迎使用 Changesets 协同管理变更集。

## 常用命令

- `pnpm changeset`：通过交互式向导记录一次改动与语义化版本影响（patch/minor/major）；
- `pnpm changeset version`：消耗所有变更记录，自动计算各包版本号并更新对应 `CHANGELOG.md`；
- `pnpm changeset publish --access public`：将已升级版本的公开包发布到 npm 官方源。

也可直接运行发版门面助手：
```bash
bash scripts/release.sh
```
