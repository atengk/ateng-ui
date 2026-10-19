## 变更说明

<!-- 请简要说明此 PR 解决的问题或新增的能力 -->

## 关联 Issue

- 修复/关联: close #

## 涉及的包 (Packages)

- [ ] `@atengk/core`
- [ ] `@atengk/vue`
- [ ] `@atengk/element-plus`
- [ ] `apps/sample-*` 示例应用
- [ ] 工程基线 / 根配置

## 变更类型

<!-- 请在符合项的括号内填入 x，例如 [x]（与 CI Conventional Commits 门禁规范严格保持一致） -->

- [ ] `feat`: 新增功能 / 新组件 / 新 Hook
- [ ] `fix`: 缺陷修复
- [ ] `docs`: 文档变动
- [ ] `style`: 代码格式调整（不影响业务逻辑）
- [ ] `refactor`: 代码重构（非新功能、非修复）
- [ ] `perf`: 性能优化
- [ ] `test`: 补全或重构单元测试
- [ ] `build`: 构建系统或外部依赖变动
- [ ] `ci`: CI/CD 自动化流水线变动
- [ ] `chore`: 其他常规维护与辅助工具变动
- [ ] `revert`: 撤销/恢复先前的提交

## 自检清单

- [ ] PR 标题符合 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/) 规范
- [ ] 本地执行 `pnpm lint` 与 `pnpm typecheck` 100% 通过且无警告
- [ ] 本地执行 `pnpm test` 测试 100% 绿色通过
- [ ] 如涉及 API/组件 Props/Hooks 变动，已在对应的 `apps/sample-*` 中更新自验用例
- [ ] 若产生面向用户的包变更，已执行 `pnpm changeset` 生成变更集
