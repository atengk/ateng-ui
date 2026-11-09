# AiChatVue

面向现代 Web 应用与大语言模型交互的企业级 AI 智能体对话、思考链折叠与 Artifacts 产物协同响应式扩展基础设施，纯 Vue 3 驱动，归属于四层洋葱拓扑之 L2 专用能力/领域扩展层。

## Language

**AiChat**:
面向大模型与 AI 智能体多轮会话、思考链折耦、工具调用卡片与产物侧边栏协同的高阶表现容器。
_Avoid_: ChatBox, LLM dialog, chat window, messenger

**ChatMessage**:
会话流中单条消息的统一强类型领域实体，包含唯一标识、角色、状态、正文、思考链、工具调用与产物关联信息。
_Avoid_: Msg, chat item, dialogue record, message row

**MessageRole**:
消息发起方的领域角色枚举，标准化为 `system`、`user`、`assistant` 与 `tool` 四态。
_Avoid_: Sender type, author role, message type

**MessageStatus**:
消息流转与网络管道交互的生命周期状态，覆盖 `pending`、`streaming`、`completed` 与 `error`。
_Avoid_: Msg state, network status, progress

**ReasoningDemuxer**:
流式多路解复用器，在接收数据帧时流式解耦思考过程（Reasoning）与正文内容（Content）并计算精确耗时。
_Avoid_: Think parser, tag stripper, reasoning cleaner, stream splitter

**ReasoningBlock**:
呈现大模型深度推理与思考过程的可视化组件，原生支持流式计时动效、思考中骨架屏与完成自动折叠。
_Avoid_: Think box, reasoning card, thought viewer, reasoning drawer

**ToolCallCard**:
结构化呈现 Function Calling 与 MCP 工具调用全生命周期（执行中、成功、异常）、入参与返回值的卡片组件。
_Avoid_: Function box, action card, mcp viewer, tool widget

**Artifact**:
由大模型在对话中动态生成、具备全局唯一标识、语言类型、多版本历史与独立预览价值的代码、图表或结构化交付物。
_Avoid_: Code block, output file, result snippet, code preview

**ArtifactSidebar**:
承载 Artifacts 产物独立呈现、版本回溯、一键复制代码与沙箱预览的响应式分栏与抽屉容器。
_Avoid_: Preview pane, side drawer, artifact modal, right panel

**MessageAdapter**:
负责将 OpenAI、Anthropic、Ollama、Spring AI 或 Dify 等第三方外部大模型格式双向转译为标准消息实体的适配器。
_Avoid_: Converter, transformer, protocol translator, bridge

**RenderThrottler**:
基于 requestAnimationFrame 与字符缓冲队列的流式文本高频渲染节流器，消除高速流式输出时的 CPU 峰值与 DOM 抖动。
_Avoid_: Batch renderer, frame limiter, render timer

**ChatSession**:
具备独立标识、多轮会话消息链与元数据的持久化会话单元。
_Avoid_: Conversation item, dialogue history, thread

**StorageAdapter**:
声明式会话存储驱动接口，支持 LocalStorage、SessionStorage 或 IndexedDB/后端数据库双向同步。
_Avoid_: Persistence provider, cache driver, session sync

**ToolDefinition**:
描述工具入参 Schema、执行模式（自动执行或人工协同审批 HITL）与执行回调函数的统一规约。
_Avoid_: Function spec, tool config, action param

**ArtifactVersion**:
Artifact 产物不可变版本链的快照切片，包含版本序号、源码切片与生成摘要。
_Avoid_: Code snapshot, revision, history item

**ScrollAnchoring**:
基于视口离底差值阈值与用户向上滚动感知的自适应视口跟踪与脱离锁定算法。
_Avoid_: Auto scroll, scroll keep, stick to bottom

**ChatAttachment**:
附加于会话消息中的多模态媒体载荷（图片、文档、音频），包含上传状态、尺寸与预览元数据。
_Avoid_: Upload file, media payload, attached item

**MessageToolbar**:
汇聚一键复制、重新生成、用户原位编辑重发、点赞点踩审计与会话导出的消息操作微交互工具栏。
_Avoid_: Action bar, msg buttons, operation panel

**StarterPrompt**:
面向新建空会话场景、提供高频业务预设与灵感启发的可点击引导提问卡片。
_Avoid_: Preset question, prompt template, onboarding card

**FollowUpSuggestion**:
在大模型回答完毕后由模型产出或规则派生的横向滚动建议追问胶囊。
_Avoid_: Next prompt, hint chip, recommendation pill

**CompositionGuard**:
针对中文输入法等 IME 拼装状态下拦截 Enter 误提交的微交互防护机制。
_Avoid_: IME filter, keydown preventer, pinyin guard

**DlpGuard**:
在消息外发前执行敏感信息扫描、合规校验与脱敏阻断的前置安全守卫。
_Avoid_: Security check, data interceptor, audit filter
