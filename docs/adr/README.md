# 架构决策记录看板 (Architectural Decision Records)

本文档看板索引 `ateng-ui` 前端基础设施套件在演进过程中沉淀的所有系统级架构决策。

| 编号                                                                               | 决策标题                                             | 状态     | 决策核心摘要                                                                      |
| :--------------------------------------------------------------------------------- | :--------------------------------------------------- | :------- | :-------------------------------------------------------------------------------- |
| [ADR-0001](./0001-toolchain-and-pnpm-version-baseline.md)                          | 工程工具链与 pnpm 版本基线锁定                       | Accepted | 锁定 `pnpm@9.12.3` 与 Node `>=20.18.0`，规避 pnpm 10 脚本白名单阻断               |
| [ADR-0002](./0002-vue-3-5-baseline-and-reactive-props-contract.md)                 | Vue 3.5 核心基线升级与响应式解构传参契约             | Accepted | 升级基线至 `^3.5.0`，Hooks 入参强制规范为 `MaybeRefOrGetter<T>`                   |
| [ADR-0003](./0003-snowflake-long-id-raw-json-transform.md)                         | 基于 Axios 原始转换管道的雪花 Long ID 大数防截断方案 | Accepted | `transformResponse` 阶段正则预处理加引号，零依赖、原生 V8 极速解析                |
| [ADR-0004](./0004-blob-error-dual-state-and-fesod-excel-protocol.md)               | Blob 异常双态识别防御与 Apache Fesod Excel 协议对接  | Accepted | 拦截器识别 Blob 中的 JSON 业务错误，消灭假文件，规范 Fesod 批注回写               |
| [ADR-0005](./0005-element-plus-version-baseline-and-peer-strategy.md)              | Element Plus 版本基线演进与双轨兼容策略              | Accepted | 库 peer 声明 `>=2.8.0` 宽泛包容，自验展厅锁定 `2.14.7` 与 `vue: 3.5.44` 最新守护  |
| [ADR-0006](./0006-dependency-baseline-and-upgrade-governance-strategy.md)          | 依赖版本基线锁定与升级治理策略                       | Accepted | 主干稳态优先、成熟体系补丁及时跟进、双轨依赖隔离（库宽进/沙箱严出）与全量准出红线 |
| [ADR-0007](./0007-code-specification-and-static-analysis-governance.md)            | 代码规范与静态代码分析治理策略                       | Accepted | ESLint 9 Flat Config + Prettier 3 职责解耦，固化工业防线硬规则，CI 零缺陷硬门禁   |
| [ADR-0008](./0008-unit-testing-engine-and-lightweight-dom-environment.md)          | 单元测试引擎与轻量 DOM 运行环境选型                  | Accepted | Vitest 2.x 工作区调度，happy-dom 轻量提速 70%，node/DOM 分层隔离与全自洽单测铁律  |
| [ADR-0009](./0009-monorepo-four-layer-onion-topology-and-dependency-governance.md) | Monorepo 多模块四层洋葱拓扑与单向依赖治理架构        | Accepted | L0~L3 四层单向无环流动，无头与 UI 彻底解耦，为百模块扩展确立准入与拓扑硬防线      |
