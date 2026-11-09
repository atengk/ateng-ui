# sample-ai-chat-vue 企业级 AI 智能体会话与 Artifacts 体验展厅

> 专注于演示与自验 `@atengk/ai-chat-vue` 核心特性在真实业务场景下的开箱使用与交互自验。

---

## 1. 快速启动与服务端口

- **默认固定端口**：`3011`
- **启动方式**：
  ```bash
  pnpm --filter sample-ai-chat-vue dev
  ```
- 启动后浏览器访问：`http://localhost:3011`

---

## 2. 运行环境与 Mock 双模切换

- **默认/CI 模式**：内置离线自洽全真 Mock 流式引擎（`src/mock/mockStream.ts`），无需启动任何外部后端或大模型网关即可直接体验完整流式交互与跑通自动化测试；
- **Local 真实网关模式**：复制根目录 `.env.example` 为 `.env.local` 并修改 `VITE_API_BASE_URL`，重启开发服务即可直连真实大模型端点（该文件已被 Git 忽略）。

---

## 3. 核心场景看板与交互路由表

| 场景分类                                | 场景看板组件                    | 核心可视化交互操作                                                                    | 验证重点                                                                                                |
| :-------------------------------------- | :------------------------------ | :------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------ |
| **场景一：基础流式打字机**              | `BasicStreamScenario.vue`       | 发送问题、中止传输 (Abort)、重新生成、原位编辑提问、点赞点踩反馈                      | SSE 流式打字机状态机、时序中断响应与操作工具栏                                                          |
| **场景二：DeepSeek R1 深度思考链**      | `ReasoningStreamScenario.vue`   | 输入算法对比题目，观察思考脉冲动效、秒数计时、完成自动折叠                            | `ReasoningDemuxer` 多路解复用流式提取 `<think>` 标签与耗时统计                                          |
| **场景三：KaTeX 数学与 Mermaid 架构图** | `RichRenderScenario.vue`        | 触发全景综合用例、查看微积分公式与 OAuth 2.0 授权流程时序图                           | MarkdownPipeline 高保真解析、KaTeX 公式排版与动态 Mermaid 懒加载                                        |
| **场景四：高频吞吐与滚动锚定**          | `HighThroughputScenario.vue`    | 切换打字速率（全速 RAF / 15ms / 30ms）、点击“立即刷盘”、翻阅历史脱离锚定              | `RenderThrottler` 60fps 批处理抗抖动与 `ScrollAnchoring` 智能锁定算法                                   |
| **场景五：MCP 工具调用与人机审批**      | `ToolApprovalScenario.vue`      | 执行天气查询（自动执行）与删库删表（弹出审批卡片），执行批准或驳回                    | Function Calling / MCP 全双工流转与 HITL 特权人机协同确认防线                                           |
| **场景六：Artifacts 多版本 Diff 比对**  | `ArtifactDiffScenario.vue`      | 生成 Vue 卡片组件 (v1)、点击升级 (v2)、呼出侧边栏比对 Monaco Diff                     | 不可变版本链管理、紧凑卡片唤起与 `#diff` 插槽反转双栏比对                                               |
| **场景七：多模态附件与上传护栏**        | `MultiModalScenario.vue`        | 拖拽文件入框、Ctrl+V 直接粘贴系统截图、上传超限文件触发拦截                           | `uploadHandler` SPI 抽象、图片直粘与 10MB 尺寸护栏防御                                                  |
| **场景八：多会话持久化与 DLP 合规切片** | `SessionManagementScenario.vue` | 新建/切换/重命名会话、IME 拼音候选下敲 Enter、输入 `/` 选指令、发送涉密敏感词与手机号 | `CompositionGuard` 防走火、`LocalStorageAdapter` 持久化、斜杠菜单、`beforeSend` 合规脱敏与 504 原位自愈 |

---

## 4. 全真自动化回归命令

```bash
pnpm --filter @atengk/ai-chat-vue --filter sample-ai-chat-vue typecheck && \
pnpm --filter @atengk/ai-chat-vue --filter sample-ai-chat-vue lint && \
pnpm --filter @atengk/ai-chat-vue --filter sample-ai-chat-vue test && \
pnpm --filter @atengk/ai-chat-vue --filter sample-ai-chat-vue build
```

> 详细原理机制、Props/Options 接口清单与生产边界，请参阅核心子包文档：[@atengk/ai-chat-vue README](../../packages/ai-chat-vue/README.md)。
