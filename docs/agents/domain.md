# 领域文档规范 (Domain Docs)

工程技能在探索本代码库时，如何使用与遵循本项目的领域文档。

## 探索代码库前必须读取

- **`CONTEXT-MAP.md`**（位于仓库根目录）——它索引了各个子上下文对应的 `CONTEXT.md`。探索时请读取与当前任务相关的每一个上下文文档。
- **`docs/adr/`**——全局架构决策记录（ADR）。在多上下文仓库中，还须检查各子包内的 `packages/<context>/docs/adr/`（针对特定上下文的架构决策）。

如果上述任何文件不存在，**请静默继续执行**。不要主动报告其缺失，也不要提前建议创建它们。`/domain-modeling` 技能（通过 `/grill-with-docs` 或 `/improve-codebase-architecture` 调用）会在术语或架构决策真正收敛时按需延迟创建。

## 目录拓扑结构 (File Structure)

本仓库采用多上下文布局（根目录存在 `CONTEXT-MAP.md`）：

```text
/
├── CONTEXT-MAP.md                         ← 全局上下文拓扑索引
├── docs/adr/                              ← 全局系统级架构决策
└── packages/
    ├── core/
    │   ├── CONTEXT.md                     ← 纯 TS 契约与网络层上下文
    │   └── docs/adr/                      ← 核心网络与协议架构决策
    ├── vue/
    │   ├── CONTEXT.md                     ← Vue 3 响应式通用 Composables 上下文
    │   └── docs/adr/                      ← 响应式状态管理决策
    └── element-plus/
        ├── CONTEXT.md                     ← UI 组件库与指令体系上下文
        └── docs/adr/                      ← 组件交互与呈现层决策
```

## 严格遵循统一业务术语 (Use the glossary's vocabulary)

当交付物中涉及领域概念时（包括 Issue 标题、重构方案、方案假设、测试用例名称等），必须严格使用对应 `CONTEXT.md` 中定义的术语。严禁自创同义词或随意偏离词汇表。

若所需概念尚未收录在词汇表中，这是一个明确信号——要么你在发明项目未使用的生僻概念（需审视重构），要么存在真实的领域定义缺失（请记录并交由 `/domain-modeling` 补充）。

## 显式提示 ADR 冲突 (Flag ADR conflicts)

若输出方案与现有 ADR 决策相冲突，必须显式指明并阐明理由，严禁静默覆盖：

> _与 ADR-0002（雪花 ID 强转 String 契约）存在冲突——但值得重新探讨，因为……_
