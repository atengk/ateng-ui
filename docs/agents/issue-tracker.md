# Issue 跟踪器：GitHub (Issue Tracker: GitHub)

本仓库的需求（Specs）与任务（Issues）托管于 GitHub Issues。所有自动化与协同操作统一使用 `gh` CLI。

## 操作规范 (Conventions)

- **创建 Issue**：`gh issue create --title "..." --body "..."`。多行正文建议使用 Heredoc 语法。
- **查看 Issue**：`gh issue view <number> --comments`，可通过 `jq` 过滤评论并同时获取标签。
- **查询 Issue 列表**：`gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`，可搭配 `--label` 与 `--state` 过滤参数。
- **添加评论**：`gh issue comment <number> --body "..."`
- **添加 / 移除标签**：`gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **关闭 Issue**：`gh issue close <number> --comment "..."`

仓库信息自动根据 `git remote -v` 推断——在克隆仓库内执行 `gh` 命令时会自动绑定目标远端。

## Pull Request 作为分流面 (Pull Requests as a Triage Surface)

**PR 作为请求分流面：否 (PRs as a request surface: no)** _(若本仓库将外部 PR 视为功能请求，请改为 `yes`；`/triage` 技能会读取该标志。)_

当设置为 `yes` 时，PR 与 Issue 遵循相同的标签和状态流转规则，使用对应的 `gh pr` 命令：

- **查看 PR**：`gh pr view <number> --comments`，查看 Diff 使用 `gh pr diff <number>`。
- **列出待分流的外部 PR**：`gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments`，仅保留 `authorAssociation` 为 `CONTRIBUTOR`、`FIRST_TIME_CONTRIBUTOR` 或 `NONE` 的记录（排除 `OWNER` / `MEMBER` / `COLLABORATOR`）。
- **评论 / 标签 / 关闭**：分别使用 `gh pr comment`、`gh pr edit --add-label`/`--remove-label`、`gh pr close`。

GitHub 的 Issue 与 PR 共享同一数字编号空间，单独的 `#42` 可能指代任一类型——优先使用 `gh pr view 42` 解析，若不存在则回退至 `gh issue view 42`。

## 当技能提示“发布到 Issue 跟踪器 (publish to the issue tracker)”

创建对应的 GitHub Issue。

## 当技能提示“获取相关 Ticket (fetch the relevant ticket)”

执行 `gh issue view <number> --comments`。

## 探路操作规范 (Wayfinding Operations)

供 `/wayfinder` 技能使用。**路线图 (Map)** 为单个顶层 Issue，**子任务 (Child tickets)** 作为关联的子 Issue。

- **路线图 (Map)**：单个带有 `wayfinder:map` 标签的 Issue，正文维护“笔记 (Notes)” / “已有决策 (Decisions-so-far)” / “待决迷雾 (Fog)”。创建命令：`gh issue create --label wayfinder:map`。
- **子任务 (Child ticket)**：通过 GitHub sub-issue 关联到路线图的 Issue（调用 sub-issues 端点的 `gh api`）。若未启用 sub-issues，则在路线图正文的任务列表中追加子任务，并在子任务正文顶部注明 `Part of #<map>`。标签格式：`wayfinder:<type>`（如 `research` / `prototype` / `grilling` / `task`）。任务被认领后指派给当前推进的开发者。
- **阻塞依赖 (Blocking)**：采用 GitHub **原生 Issue 依赖**——这是规范且 UI 可视的表达方式。添加依赖关系：`gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`，其中 `<blocker-db-id>` 为阻塞者的数字型**数据库 ID**（通过 `gh api repos/<owner>/<repo>/issues/<n> --jq .id` 获取，**而非** `#number` 或 `node_id`）。GitHub 接口返回 `issue_dependencies_summary.blocked_by`（仅限开启的阻塞项——即实时门禁）。若依赖功能不可用，则在子任务正文顶部添加 `Blocked by: #<n>, #<n>` 作为降级方案。当所有阻塞项全部关闭后，Ticket 自动解除阻塞。
- **前沿任务查询 (Frontier query)**：列出路线图中开启的子任务（`gh issue list --state open`，作用域限定于路线图的子任务/任务列表），过滤掉存在未完成阻塞项（`issue_dependencies_summary.blocked_by > 0`，或 `Blocked by` 仍有未关闭 Issue）以及已有负责人的项；按路线图排列顺序优先胜出。
- **认领任务 (Claim)**：`gh issue edit <n> --add-assignee @me`——作为当前推进会话的首次写入操作。
- **解决任务 (Resolve)**：`gh issue comment <n> --body "<answer>"`，然后执行 `gh issue close <n>`，最后将上下文指针（摘要 + 链接）追加到路线图的“已有决策”中。
