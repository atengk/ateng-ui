# 规格书：@atengk/core 工业级文档体系与 Sample 场景看板重构 (Spec: Core Documentation & Sample Visual Dashboards)

> **关联规范**：[docs/agents/documentation-specification.md](../agents/documentation-specification.md)  
> **领域定位**：L0 纯原生核心底座 (`@atengk/core`) 与配套自验展厅 (`sample-core`)  
> **状态**：`ready-for-agent`  
> **日期**：2026-11-04

---

## 1. 问题陈述 (Problem Statement)

在 `ateng-ui` 基础设施套件中，`@atengk/core` 作为处于四层洋葱拓扑最底层的 L0 核心底座，其文档与自验工程存在严重脱节和工程规范违背：

1. **子包文档架构陈旧与红线违规**：`packages/core/README.md` 仍停留在旧版“维度零~四”五维平铺模板，缺乏规范规定的 0~9 章节大纲骨架；核心配置与方法未在各章节就近声明强类型接口，触碰【类型/配置脱节红线】；多项正交特性在“起步”与“扩展”中交织，触碰【章节散落割裂红线】；
2. **自验工程缺少体验卡**：`apps/sample-core/README.md` 缺失，未遵循四段式极简体验卡标准，缺少交互路由与 DOM 索引映射；
3. **自验工程单文件过度臃肿**：`apps/sample-core/src/main.ts` 达 1188 行，将全部 14 个卡片通过一个巨型字符串模板集中拼接与事件绑定，触碰【缺少场景看板或单文件臃肿红线】；
4. **领域词汇未闭环**：ADR-0004 确立的 `BlobDualState`（Blob 双态异常识别防御）未在 `packages/core/CONTEXT.md` 建立正式词条。

---

## 2. 解决方案 (Solution)

严格遵循 `docs/agents/documentation-specification.md` 标准，实施全维闭环治理：

1. **`CONTEXT.md` 领域词汇闭环**：增补 `BlobDualState` 领域术语及负面规避词清单；
2. **`sample-core` 解耦与场景看板化**：
   - 提取共享客户端与离线 Mock 服务至 `src/client.ts`；
   - 将 14 个卡片按 6 大领域拆分为独立场景模块 `src/scenarios/*.ts`；
   - 重构 `src/main.ts` 为 < 80 行轻量框架 Bootstrap；
   - 编写遵循四段式体验卡模板的 `apps/sample-core/README.md`；
3. **`@atengk/core` 文档全景大纲重构**：
   - 0 维度：100% 覆盖全部 39 项公共 API 的速查矩阵表，双向锚定单测与 Sample；
   - 1~2 章：模块定位、pnpm 坐标与核心架构 Mermaid 拓扑及 6 大设计不变量；
   - 3~8 章：按 6 大能力领域收敛，严格执行“专属 TS 强类型契约 + 逆向提取自 Sample 的业务代码 + 核心机制与生产边界”三要素就近闭环；
   - 9 章：集中暴露全量 TypeScript 接口速查附录。

---

## 3. 用户故事 (User Stories)

1. **作为前端架构师**，我希望在阅读 `packages/core/README.md` 时能够在一屏内同时看到特性的强类型 TS 接口、面向真实业务的代码范式与底层边界防御说明，以便在接入时不产生认知黑盒；
2. **作为终端业务开发者**，我希望从 `packages/core/README.md` 复制的代码示例 100% 能够在实际工程中直接运行并跑通，以便零心智负担地开箱即用；
3. **作为跨团队协作工程师**，我希望在浏览器中启动 `sample-core`（端口 3001）时，能够直观通过独立的卡片交互体验雪花大数防截断、网关路由重写、防竞态中断、Blob 异常拦截与 WebSocket 心跳重连，以便进行白盒协议自验；
4. **作为代码审查人员**，我希望 `sample-core` 的代码按能力领域拆分成小巧高内聚的模块，而不是面对单一超过 1000 行的面条代码，以便快速定位问题与增量维护；
5. **作为 CI 维护人员**，我希望 Sample 工程提供离线自洽 Mock 模式并标配四段式快速启动卡，以便 CI 流水线无需启动任何外部后端即可秒级跑通测试与构建。

---

## 4. 实施决策 (Implementation Decisions)

- **模块拆解模式**：`sample-core` 拆分为 `contracts.ts`、`http.ts`、`auth.ts`、`stream-ws.ts`、`upload.ts`、`security.ts` 6 个场景模块，各自导出 `renderXxxCard()` 与 `initXxxScenario()`；
- **客户端解耦**：将 `http`、`microserviceClient`、`signedClient`、`sampleStreamClient` 与 `mockWebSocketServer` 收敛至 `src/client.ts`；
- **文档领域收敛**：`packages/core/README.md` 划分为契约异常、HTTP 调度、凭据存储、流式长连、文件上传、金融安全 6 大核心大章；
- **测试接缝 (Test Seams)**：
  - **接缝 1 (L0 单元测试层)**：`packages/core/test/*.test.ts`（277 个用例守护底座正确性）；
  - **接缝 2 (Sample 编译与规范层)**：`pnpm --filter sample-core typecheck` 与 `lint`；
  - **接缝 3 (Sample 生产构建产物层)**：`pnpm --filter sample-core build`（Vite 打包验证依赖解析与 Tree-Shaking）；
  - **接缝 4 (契约文档真实性校验层)**：文档 TS 接口与导出源码 100% 逐字对齐。

---

## 5. 验收门禁 (Acceptance Criteria)

- [ ] 0 项 Red Card 违规：严格消除类型脱节、章节散落、单文件臃肿、Sample 文档缺失等 6 大红线；
- [ ] 100% 单测绿灯：`pnpm --filter @atengk/core test` 19 个套件、277 个用例通过；
- [ ] 100% 静态与构建全绿：`sample-core` 的 `typecheck`、`lint`、`build` 全部 0 错误；
- [ ] 交互完整性：14 个协议卡片拆解后，DOM 锚点与功能事件完整保真。
