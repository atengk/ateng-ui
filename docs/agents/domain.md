# 领域模型与多上下文治理规范 (Domain Docs & Multi-Context Governance)

`ateng-ui` 采用 **Multi-Context（四层洋葱拓扑多限界上下文）** 架构治理前端基础设施模块。在探索模块边界、命名领域概念、设计组件/Hooks 契约或新增/查阅架构决策记录（ADR）时，必须严格遵守本规约。

## 1. 领域文件拓扑布局 (File Structure)

```text
ateng-ui/
├── CONTEXT-MAP.md                         # 根目录唯一四层洋葱拓扑（L0~L3）与跨包依赖关系总览（严禁在根目录创建 CONTEXT.md）
├── packages/
│   └── <name>/
│       └── CONTEXT.md                     # 各子包（@atengk/<name>）限界上下文的纯领域词汇表（Ubiquitous Language + Avoid Terms）
├── apps/
│   └── sample-<name>/                     # 与 packages/<name> 严格 1:1 对应的可视化场景体验展厅与双模自验沙箱
└── docs/
    └── adr/
        ├── README.md                      # 全量系统级 ADR 索引看板与防膨胀治理规范
        └── NNNN-kebab-case-title.md       # 编号递增的架构决策记录（严禁重号）
```

## 2. 上下文探索与词汇对齐法则

1. **先读图，再入域**：跨包研发或架构探查时，首先读取根目录 [`CONTEXT-MAP.md`](../../CONTEXT-MAP.md) 识别目标子包所属的四层洋葱层级（`L0 纯 TS 底座`、`L1 无头响应式层`、`L2 专业能力扩展层`、`L3 UI 表现与套件层`）及单向依赖边界（`L3 ➔ L2 ➔ L1 ➔ L0`），再按需读取目标子包的 `packages/<name>/CONTEXT.md`。
2. **严格遵守领域通用语言（Ubiquitous Language）**：
   - 组件名、Composable 名称、Props/Emits/Slots 接口、CSS 变量与测试场景命名必须严格对齐所属子包 `CONTEXT.md` 中定义的标准术语。
   - **严禁使用 `Avoid` 列表中的废弃或歧义术语**。
3. **保持 `CONTEXT.md` 纯粹性**：子包 `packages/<name>/CONTEXT.md` 仅维护核心领域概念定义与禁用词表，严禁在其中堆砌长篇实现代码或把根仓库当成单体上下文。

## 3. ADR 查阅与防膨胀演进铁律

1. **前置对齐既有决策**：修改任何核心机制（如 L0 网络拦截与雪花大数转换、Blob 异常双态识别、L1 无头抗竞态状态机、L2 专业引擎 Worker 离线资产治理、L3 组件混合列/全局主题引擎）前，必须通过 [`docs/adr/README.md`](../adr/README.md) 查阅对应 ADR。
2. **冲突显式预警**：若当前需求或实现方案与既有 `Accepted` 状态的 ADR 存在冲突，**必须立即向开发者指出冲突点并阐明权衡理由**：
   > _与 ADR-0003（雪花 Long ID 原始 JSON 正则转换）存在冲突——但值得重新探讨，因为……_
3. **防膨胀与增量修订（Update Over Create）**：
   - **新建门槛**：仅当从 0 到 1 孵化全新子包（`packages/<name>`）、引入全新底层渲染内核/构建管线或推翻既有跨层架构契约时，方可新增编号递增的 `docs/adr/NNNN-*.md`（新增前必须核对 `docs/adr/README.md` 最大编号，严禁重号）。
   - **存量演进**：既有子包的常规组件扩充、Hooks 增强、样式微调或局部缺陷修复，一律在原归属 ADR 文档中增量修订，并同步更新 [`docs/adr/README.md`](../adr/README.md) 与 [`CONTEXT-MAP.md`](../../CONTEXT-MAP.md)。
