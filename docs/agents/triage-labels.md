# 分流标签规范 (Triage Labels)

各项工程技能遵循 5 个标准分流角色。本文档将这些角色映射到本仓库 Issue 跟踪器所使用的实际标签字符串。

| mattpocock/skills 标准标签 | 本仓库跟踪器对应标签 | 业务含义说明                                  |
| :------------------------- | :------------------- | :-------------------------------------------- |
| `needs-triage`             | `needs-triage`       | 待分流：维护者需要评估并规划该 Issue          |
| `needs-info`               | `needs-info`         | 待补充：等待提报者提供更多复现或背景信息      |
| `ready-for-agent`          | `ready-for-agent`    | Agent 就绪：规格完备，可由后台 Agent 独立承接 |
| `ready-for-human`          | `ready-for-human`    | 人工就绪：需要人类开发者介入实现              |
| `wontfix`                  | `wontfix`            | 不予解决：不作处理或关闭此需求                |

当技能提及某个分流角色（例如“应用可离线执行的 AFK 标签 / apply the AFK-ready triage label”）时，请使用此表中右侧对应的标签字符串。

后续若修改实际使用的标签体系，可直接编辑右侧一列。
