/**
 * @atengk/ai-chat-vue 统一领域类型定义与组件接口契约。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import type { Ref, MaybeRefOrGetter } from 'vue';

/**
 * 消息发送方领域角色。
 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * 消息流转生命周期状态。
 */
export type MessageStatus = 'pending' | 'streaming' | 'completed' | 'error';

/**
 * 思考链（Reasoning）内容结构。
 */
export interface ReasoningContent {
  /**
   * 思考过程纯文本或 Markdown 内容。
   */
  text: string;

  /**
   * 思考总耗时（毫秒）。
   */
  elapsedMs?: number;

  /**
   * 视图展示是否已折叠。
   */
  collapsed?: boolean;

  /**
   * 思考过程是否正在持续流式输出中。
   */
  isStreaming?: boolean;
}

/**
 * 工具执行模式：
 * - 'auto': 自动调用执行，无需人工干预
 * - 'confirm': 人机协同审批 (HITL)，需人工确认后方可执行
 */
export type ToolExecutionMode = 'auto' | 'confirm';

/**
 * 工具调用生命周期状态：
 * - 'calling': 正在发起调用/解析参数
 * - 'awaiting_approval': 挂起等待人工审批 (HITL)
 * - 'executing': 正在异步执行工具逻辑
 * - 'success': 执行成功
 * - 'error': 执行发生异常
 * - 'rejected': 人工已拒绝执行
 */
export type ToolCallState =
  'calling' | 'awaiting_approval' | 'executing' | 'success' | 'error' | 'rejected';

/**
 * 标准工具定义契约。
 */
export interface ToolDefinition {
  /**
   * 工具唯一名称，对应大模型调用的 function name。
   */
  name: string;

  /**
   * 工具功能描述。
   */
  description: string;

  /**
   * 入参 JSON Schema（可选）。
   */
  parameters?: Record<string, unknown>;

  /**
   * 执行模式：'auto' 自动执行 | 'confirm' 需人工审批确认。默认 'auto'。
   */
  mode?: ToolExecutionMode;

  /**
   * 工具执行处理器函数。
   */
  execute: (args: Record<string, unknown>) => Promise<unknown> | unknown;
}

/**
 * 工具调用状态实体。
 */
export interface ToolCallPayload {
  /**
   * 工具调用全局唯一标识符。
   */
  callId: string;

  /**
   * 调用的目标工具或函数名。
   */
  name: string;

  /**
   * 结构化输入参数字典。
   */
  arguments: Record<string, unknown>;

  /**
   * 工具调用状态。
   */
  state: ToolCallState;

  /**
   * 工具执行返回的结果数据。
   */
  result?: unknown;

  /**
   * 是否需要人工协同审批（HITL）。
   */
  requireConfirm?: boolean;

  /**
   * 执行异常或错误描述。
   */
  error?: string;

  /**
   * 人工拒批原因（当 state === 'rejected' 时）。
   */
  rejectionReason?: string;

  /**
   * 工具调用/执行开始时间戳。
   */
  startedAt?: number;

  /**
   * 工具执行结束时间戳。
   */
  finishedAt?: number;
}

/**
 * Artifact 产物版本切片。
 */
export interface ArtifactVersion {
  /**
   * 版本递增序号（1, 2, ...）。
   */
  version: number;

  /**
   * 该版本对应的源码或产物内容。
   */
  code: string;

  /**
   * 版本创建毫秒级时间戳。
   */
  timestamp: number;

  /**
   * 改动简短摘要。
   */
  summary?: string;
}

/**
 * Artifact 侧边栏展示与渲染视图模式。
 */
export type ArtifactMode = 'preview' | 'code' | 'diff';

/**
 * 独立交付物产物（Artifact）实体。
 */
export interface ArtifactPayload {
  /**
   * 产物全局唯一业务标识符。
   */
  identifier: string;

  /**
   * 产物展示标题。
   */
  title: string;

  /**
   * 产物语言或类型（如 vue, typescript, markdown, svg, html）。
   */
  language: string;

  /**
   * 产物大类（可选，默认 'code'）。
   */
  type?: 'code' | 'markdown' | 'html' | 'svg';

  /**
   * 不可变多版本演进链。
   */
  versions: ArtifactVersion[];
}

/**
 * 多模态附件载荷。
 */
export interface ChatAttachment {
  /**
   * 附件唯一标识符。
   */
  id: string;

  /**
   * 附件原始文件名。
   */
  name: string;

  /**
   * 文件字节大小。
   */
  size: number;

  /**
   * 附件大类。
   */
  type: 'image' | 'file' | 'audio';

  /**
   * 访问或预览地址（URL 或 Blob Object URL）。
   */
  url: string;

  /**
   * 缩略图地址（可选）。
   */
  thumbnailUrl?: string;

  /**
   * 上传或处理状态。
   */
  status: 'uploading' | 'success' | 'error';

  /**
   * 本地原始 File 对象引用（可选）。
   */
  rawFile?: File;
}

/**
 * 空会话推荐卡片实体。
 */
export interface StarterPrompt {
  /**
   * 卡片展示图标或 Emoji。
   */
  icon?: string;

  /**
   * 引导标题。
   */
  title: string;

  /**
   * 完整提问提示词内容。
   */
  prompt: string;

  /**
   * 提示词副标题或功能说明。
   */
  description?: string;
}

/**
 * 消息评价反馈载荷 (点赞/点踩)。
 */
export interface MessageFeedback {
  /**
   * 目标消息唯一标识符。
   */
  messageId: string;

  /**
   * 反馈类型：'up' 点赞 | 'down' 点踩。
   */
  type: 'up' | 'down';

  /**
   * 点踩时的标签（如“答非所问”、“生成截断”）。
   */
  tags?: string[];

  /**
   * 详细反馈理由说明。
   */
  reason?: string;

  /**
   * 反馈提交毫秒级时间戳。
   */
  timestamp: number;
}

/**
 * 会话单条消息领域实体。
 */
export interface ChatMessage {
  /**
   * 消息唯一标识符。
   */
  id: string;

  /**
   * 消息发起方角色。
   */
  role: MessageRole;

  /**
   * 消息当前状态。
   */
  status: MessageStatus;

  /**
   * 消息正文文本。
   */
  content: string;

  /**
   * 思考链推理内容（可选）。
   */
  reasoning?: ReasoningContent;

  /**
   * 包含的工具调用数组（可选）。
   */
  toolCalls?: ToolCallPayload[];

  /**
   * 包含的交付物产物数组（可选）。
   */
  artifacts?: ArtifactPayload[];

  /**
   * 包含的多模态附件数组（可选）。
   */
  attachments?: ChatAttachment[];

  /**
   * 推荐追问气泡列表（可选）。
   */
  suggestedQuestions?: string[];

  /**
   * 消息创建时间戳。
   */
  createdAt: number;

  /**
   * 异常错误描述（可选）。
   */
  error?: string;
}

/**
 * 快捷指令执行上下文。
 */
export interface SlashCommandContext {
  /**
   * 替换或填充当前输入文本框内容。
   */
  setText: (text: string) => void;

  /**
   * 触发立即发送当前文本。
   */
  submit: (text?: string) => void;

  /**
   * 清空输入框并关闭面板。
   */
  close: () => void;
}

/**
 * 斜杠快捷指令定义实体。
 */
export interface SlashCommand {
  /**
   * 指令触发名称（如 "/clear"、"/model"、"/prompt"）。
   */
  name: string;

  /**
   * 指令简要功能描述。
   */
  description: string;

  /**
   * 指令展示图标或 Emoji（可选）。
   */
  icon?: string;

  /**
   * 快捷填充的目标提示词或模板文本（可选）。
   */
  snippet?: string;

  /**
   * 执行自定义行为的回调钩子（可选）。
   */
  action?: (context: SlashCommandContext) => void;
}

/**
 * beforeSend 前置安全合规拦截返回值。
 * - boolean: true 允许发送；false 拦截并阻止发送
 * - 对象: 包含 allow、拒绝原因 reason 与可选的脱敏文本 sanitizedContent
 */
export type BeforeSendResult =
  | boolean
  | {
      allow: boolean;
      reason?: string;
      sanitizedContent?: string;
    };

/**
 * 发送前前置合规与脱敏拦截钩子 SPI。
 */
export type BeforeSendHook = (
  content: string,
  options?: SendMessageOptions,
) => Promise<BeforeSendResult> | BeforeSendResult;

/**
 * 结构化持久化存储适配器契约。
 */
export interface StorageAdapter {
  /**
   * 读取指定键名下的字符串值。
   */
  getItem: (key: string) => Promise<string | null> | string | null;

  /**
   * 写入指定键值对。
   */
  setItem: (key: string, value: string) => Promise<void> | void;

  /**
   * 删除指定键名。
   */
  removeItem: (key: string) => Promise<void> | void;

  /**
   * 清空所有命名空间下的数据（可选）。
   */
  clear?: () => Promise<void> | void;
}

/**
 * 独立对话会话领域模型。
 */
export interface ChatSession {
  /**
   * 会话全局唯一标识符。
   */
  id: string;

  /**
   * 会话展示标题（默认提取首条提问）。
   */
  title: string;

  /**
   * 该会话关联的消息历史列表。
   */
  messages: ChatMessage[];

  /**
   * 会话创建毫秒级时间戳。
   */
  createdAt: number;

  /**
   * 会话最近更新毫秒级时间戳。
   */
  updatedAt: number;
}

/**
 * useAiChatSessions 多会话状态机配置项。
 */
export interface UseAiChatSessionsOptions {
  /**
   * 持久化存储适配器。默认使用 LocalStorageAdapter。
   */
  storage?: StorageAdapter;

  /**
   * 存储键名前缀命名空间（默认 'ateng_ai_chat_sessions'）。
   */
  storageKey?: string;

  /**
   * 默认初始会话标题（默认 '新对话'）。
   */
  defaultTitle?: string;

  /**
   * 是否在初始化时自动生成一个默认空会话（若存储为空时，默认 true）。
   */
  autoCreate?: boolean;
}

/**
 * useAiChatSessions 多会话管理状态机返回门面。
 */
export interface UseAiChatSessionsReturn {
  /**
   * 所有历史会话列表。
   */
  sessions: Ref<ChatSession[]>;

  /**
   * 当前激活会话标识符。
   */
  currentSessionId: Ref<string>;

  /**
   * 当前激活的会话实体（若无则为 null）。
   */
  currentSession: Ref<ChatSession | null>;

  /**
   * 新建一个独立会话并自动切换为当前会话。
   */
  createSession: (title?: string, initialMessages?: ChatMessage[]) => ChatSession;

  /**
   * 切换当前激活的会话。
   */
  switchSession: (sessionId: string) => void;

  /**
   * 重命名指定会话标题。
   */
  renameSession: (sessionId: string, newTitle: string) => void;

  /**
   * 删除指定会话（若删除的是当前会话，自动切换至相邻会话）。
   */
  deleteSession: (sessionId: string) => void;

  /**
   * 清空所有历史会话并重置。
   */
  clearAllSessions: () => void;

  /**
   * 更新当前或指定会话的消息链并触发持久化。
   */
  updateSessionMessages: (sessionId: string, messages: ChatMessage[]) => void;
}

/**
 * 单条消息发送配置。
 */
export interface SendMessageOptions {
  /**
   * 自定义关联的附件列表。
   */
  attachments?: ChatAttachment[];

  /**
   * 外部动态透传的请求头字典。
   */
  headers?: Record<string, string>;

  /**
   * 额外请求体参数字典。
   */
  extraBody?: Record<string, unknown>;
}

/**
 * 无头 useAiChat 配置项。
 */
export interface UseAiChatOptions {
  /**
   * 初始预置消息列表。
   */
  initialMessages?: ChatMessage[];

  /**
   * 后端流式服务接口地址。
   */
  streamUrl?: string;

  /**
   * 自定义流式处理管道（可选，供完全自定义后端/Mock 驱动）。
   */
  streamHandler?: (
    prompt: string,
    onChunk: (chunk: string) => void,
    signal: AbortSignal,
  ) => Promise<void>;

  /**
   * 收到流式消息完成时的回调。
   */
  onFinish?: (message: ChatMessage) => void;

  /**
   * 遇到网络故障或读取异常时的错误回调。
   */
  onError?: (error: Error) => void;

  /**
   * 打字机呼吸感输出速率（毫秒/字符）。
   * 0: 全速 requestAnimationFrame 批处理（默认 0）；
   * >0: 匀速队列排队吐字。
   */
  typewriterSpeed?: MaybeRefOrGetter<number>;

  /**
   * 注册的可用工具集合定义。
   */
  tools?: ToolDefinition[];

  /**
   * 触发工具调用时的自定义钩子（可选）。
   */
  onToolCall?: (payload: ToolCallPayload) => Promise<void> | void;

  /**
   * 发送前前置合规检测与敏感数据脱敏拦截钩子（DLP）。
   */
  beforeSend?: BeforeSendHook;

  /**
   * 持久化存储适配器（可选）。提供后自动同步消息。
   */
  storage?: StorageAdapter;

  /**
   * 当前会话存储标识键（可选）。
   */
  storageKey?: string;
}

/**
 * 无头 useAiChat 状态机只读门面与控制方法。
 */
export interface UseAiChatReturn {
  /**
   * 当前会话消息列表。
   */
  messages: Ref<ChatMessage[]>;

  /**
   * 是否正在流式生成或在途传输中。
   */
  isStreaming: Ref<boolean>;

  /**
   * 当前最近一次发生的异常。
   */
  error: Ref<Error | null>;

  /**
   * 发送一条用户消息并触发流式交互。
   */
  sendMessage: (content: string, options?: SendMessageOptions) => Promise<void>;

  /**
   * 中断并终止当前正在进行的流式生成。
   */
  abort: () => void;

  /**
   * 清空当前所有消息。
   */
  clearMessages: () => void;

  /**
   * 瞬间跳过打字机呼吸感队列，立即刷出所有在途缓冲文本。
   */
  flushTypewriter: () => void;

  /**
   * 批准并执行处于 awaiting_approval 挂起态的工具调用 (HITL)。
   */
  approveToolCall: (callId: string) => Promise<void>;

  /**
   * 拒绝处于 awaiting_approval 挂起态的工具调用，并提供拒批原因 (HITL)。
   */
  rejectToolCall: (callId: string, reason?: string) => Promise<void>;

  /**
   * 当前会话已收集的所有 Artifact 产物列表。
   */
  artifacts: Ref<ArtifactPayload[]>;

  /**
   * 当前侧边栏激活展示的 Artifact 产物实体。
   */
  activeArtifact: Ref<ArtifactPayload | null>;

  /**
   * 当前在侧边栏激活查看的版本序号（1, 2, ...）。
   */
  activeArtifactVersion: Ref<number>;

  /**
   * Artifact 侧边栏/抽屉是否正处于打开展示态。
   */
  isArtifactSidebarOpen: Ref<boolean>;

  /**
   * 打开指定 identifier 的产物并唤起侧边栏工作台。
   */
  openArtifact: (identifier: string, version?: number) => void;

  /**
   * 关闭当前 Artifact 侧边栏。
   */
  closeArtifact: () => void;

  /**
   * 切换当前激活产物的版本切片。
   */
  selectArtifactVersion: (version: number) => void;

  /**
   * 重新生成指定消息或上一轮对话。
   */
  regenerate: (messageId?: string) => Promise<void>;

  /**
   * 原位编辑指定消息并重新触发流式分支。
   */
  editMessage: (messageId: string, newContent: string) => Promise<void>;
}

/**
 * AtengAiChat 统领容器组件 Props。
 */
export interface AtengAiChatProps {
  /**
   * 受控消息列表。未提供时内部自建。
   */
  messages?: ChatMessage[];

  /**
   * 是否正在流式生成中。
   */
  isStreaming?: boolean;

  /**
   * 输入框占位提示文本。
   */
  placeholder?: string;

  /**
   * 是否禁用输入与发送。
   */
  disabled?: boolean;

  /**
   * 容器最小高度或固定高度（CSS 字符串）。
   */
  height?: string;

  /**
   * 触底判断阈值（像素，默认 60px）。
   */
  scrollThreshold?: number;

  /**
   * 打字机呼吸感吐字速率（毫秒/字符，默认 0 为全速 RAF 批处理）。
   */
  typewriterSpeed?: number;

  /**
   * 空会话时在视口中央展示的引导卡片网格。
   */
  starterPrompts?: StarterPrompt[];

  /**
   * 自定义附件上传/预处理 SPI 处理器。
   */
  uploadHandler?: (file: File) => Promise<ChatAttachment>;

  /**
   * 允许上传的单文件最大字节数（默认 20MB）。
   */
  maxFileSize?: number;

  /**
   * 允许上传的文件类型匹配。
   */
  acceptedFileTypes?: string;

  /**
   * 是否启用语音朗读功能（默认 true）。
   */
  speechEnabled?: boolean;

  /**
   * 是否启用导出功能（默认 true）。
   */
  exportEnabled?: boolean;

  /**
   * 输入框自适应最小行高（默认 1）。
   */
  minRows?: number;

  /**
   * 输入框自适应最大行高（默认 6）。
   */
  maxRows?: number;

  /**
   * 斜杠快捷指令列表（输入 / 时唤出）。
   */
  slashCommands?: SlashCommand[];

  /**
   * 发送前前置合规检测与敏感数据脱敏拦截钩子（DLP）。
   */
  beforeSend?: BeforeSendHook;
}

/**
 * AtengAiChat 统领容器组件 Emits。
 */
export interface AtengAiChatEmits {
  /**
   * 用户提交发送消息时触发。
   */
  (e: 'send', content: string, attachments?: ChatAttachment[]): void;

  /**
   * 用户点击停止生成按钮时触发。
   */
  (e: 'stop'): void;

  /**
   * 清空会话时触发。
   */
  (e: 'clear'): void;

  /**
   * 批准工具调用时触发 (HITL)。
   */
  (e: 'approveTool', callId: string): void;

  /**
   * 拒绝工具调用时触发 (HITL)。
   */
  (e: 'rejectTool', callId: string, reason?: string): void;

  /**
   * 用户点击产物卡片请求打开侧边栏时触发。
   */
  (e: 'openArtifact', artifact: ArtifactPayload): void;

  /**
   * 触发重新生成指定消息时触发。
   */
  (e: 'regenerate', messageId: string): void;

  /**
   * 原位编辑指定用户消息并重新提交时触发。
   */
  (e: 'editMessage', messageId: string, newContent: string): void;

  /**
   * 提交评价反馈时触发。
   */
  (e: 'feedback', feedback: MessageFeedback): void;

  /**
   * 点击推荐追问问题胶囊时触发。
   */
  (e: 'clickSuggestedQuestion', question: string): void;

  /**
   * 发送前命中合规安全策略被拦截时触发（DLP）。
   */
  (e: 'blocked', reason: string): void;

  /**
   * 选中并激活快捷指令时触发。
   */
  (e: 'selectSlashCommand', command: SlashCommand): void;
}

/**
 * AtengChatMessage 消息气泡组件 Props。
 */
export interface AtengChatMessageProps {
  /**
   * 消息实体数据。
   */
  message: ChatMessage;

  /**
   * 是否为当前列表的最后一条。
   */
  isLast?: boolean;

  /**
   * 当前会话是否处于流式在途中。
   */
  isStreaming?: boolean;

  /**
   * 是否启用语音朗读功能（默认 true）。
   */
  speechEnabled?: boolean;

  /**
   * 是否启用导出功能（默认 true）。
   */
  exportEnabled?: boolean;
}

/**
 * AtengChatMessage 消息气泡组件 Emits。
 */
export interface AtengChatMessageEmits {
  /**
   * 批准工具调用时触发 (HITL)。
   */
  (e: 'approveTool', callId: string): void;

  /**
   * 拒绝工具调用时触发 (HITL)。
   */
  (e: 'rejectTool', callId: string, reason?: string): void;

  /**
   * 用户点击产物卡片请求打开侧边栏时触发。
   */
  (e: 'openArtifact', artifact: ArtifactPayload): void;

  /**
   * 请求重新生成时触发。
   */
  (e: 'regenerate', messageId: string): void;

  /**
   * 原位编辑用户消息并重发时触发。
   */
  (e: 'editMessage', messageId: string, newContent: string): void;

  /**
   * 提交评价反馈时触发。
   */
  (e: 'feedback', feedback: MessageFeedback): void;

  /**
   * 点击推荐追问胶囊时触发。
   */
  (e: 'clickSuggestedQuestion', question: string): void;
}

/**
 * AtengMessageToolbar 消息操作审计条组件 Props。
 */
export interface AtengMessageToolbarProps {
  /**
   * 关联的会话消息实体。
   */
  message: ChatMessage;

  /**
   * 是否为当前列表的最后一条消息。
   */
  isLast?: boolean;

  /**
   * 当前整体会话是否处于流式在途中。
   */
  isStreaming?: boolean;

  /**
   * 是否启用语音朗读功能（默认 true）。
   */
  speechEnabled?: boolean;

  /**
   * 是否启用全量导出功能（默认 true）。
   */
  exportEnabled?: boolean;
}

/**
 * AtengMessageToolbar 消息操作审计条组件 Emits。
 */
export interface AtengMessageToolbarEmits {
  /**
   * 复制消息正文时触发。
   */
  (e: 'copy', text: string): void;

  /**
   * 请求重新生成消息时触发。
   */
  (e: 'regenerate', messageId: string): void;

  /**
   * 请求编辑用户消息并重发时触发。
   */
  (e: 'edit', messageId: string, newContent: string): void;

  /**
   * 提交评价反馈时触发。
   */
  (e: 'feedback', feedback: MessageFeedback): void;

  /**
   * 朗读消息时触发。
   */
  (e: 'speak', messageId: string, text: string): void;

  /**
   * 导出单条消息为 Markdown 或 JSON 时触发。
   */
  (e: 'export', format: 'markdown' | 'json', message: ChatMessage): void;
}

/**
 * AtengChatInput 自适应输入组件 Props。
 */
export interface AtengChatInputProps {
  /**
   * 双向绑定的输入文本。
   */
  modelValue?: string;

  /**
   * 输入框占位提示文本。
   */
  placeholder?: string;

  /**
   * 是否禁用输入与交互。
   */
  disabled?: boolean;

  /**
   * 是否处于流式生成态（显示停止按钮）。
   */
  isStreaming?: boolean;

  /**
   * 自定义附件上传/处理处理器（SPI）。若未提供则使用本地 Blob URL。
   */
  uploadHandler?: (file: File) => Promise<ChatAttachment>;

  /**
   * 允许上传的文件类型 MIME 匹配串（默认图片与常规文档）。
   */
  acceptedFileTypes?: string;

  /**
   * 允许上传的单文件最大字节数（默认 20MB）。
   */
  maxFileSize?: number;

  /**
   * 当前待发送的附件列表。支持 v-model:attachments 双向绑定。
   */
  attachments?: ChatAttachment[];

  /**
   * 输入框自适应最小行高（默认 1）。
   */
  minRows?: number;

  /**
   * 输入框自适应最大行高（默认 6）。
   */
  maxRows?: number;

  /**
   * 斜杠快捷指令列表（输入 / 时唤出）。
   */
  slashCommands?: SlashCommand[];
}

/**
 * AtengChatInput 自适应输入组件 Emits。
 */
export interface AtengChatInputEmits {
  /**
   * 双向更新输入内容。
   */
  (e: 'update:modelValue', value: string): void;

  /**
   * 双向更新当前待发送附件列表。
   */
  (e: 'update:attachments', attachments: ChatAttachment[]): void;

  /**
   * 触发提交发送（携带输入文本及附件列表）。
   */
  (e: 'submit', value: string, attachments?: ChatAttachment[]): void;

  /**
   * 触发停止生成。
   */
  (e: 'stop'): void;

  /**
   * 附件大小超限或格式不符时抛出的异常提示。
   */
  (e: 'fileError', message: string, file: File): void;

  /**
   * 选中并激活快捷指令时触发。
   */
  (e: 'selectSlashCommand', command: SlashCommand): void;
}

/**
 * AtengToolCallCard 工具调用卡片组件 Props。
 */
export interface AtengToolCallCardProps {
  /**
   * 工具调用载荷实体。
   */
  toolCall: ToolCallPayload;

  /**
   * 是否禁用操作交互（如审批按钮）。
   */
  disabled?: boolean;

  /**
   * 是否默认展开入参与结果详情。默认 false。
   */
  defaultExpanded?: boolean;
}

/**
 * AtengToolCallCard 工具调用卡片组件 Emits。
 */
export interface AtengToolCallCardEmits {
  /**
   * 批准执行处于 awaiting_approval 态的工具调用 (HITL)。
   */
  (e: 'approve', callId: string): void;

  /**
   * 拒绝执行处于 awaiting_approval 态的工具调用 (HITL)。
   */
  (e: 'reject', callId: string, reason?: string): void;
}

/**
 * AtengArtifactCard 气泡内紧凑产物卡片 Props。
 */
export interface AtengArtifactCardProps {
  /**
   * 关联的 Artifact 实体。
   */
  artifact: ArtifactPayload;

  /**
   * 是否处于当前激活选中态。
   */
  active?: boolean;
}

/**
 * AtengArtifactCard 气泡内紧凑产物卡片 Emits。
 */
export interface AtengArtifactCardEmits {
  /**
   * 点击产物卡片唤起工作台。
   */
  (e: 'click', artifact: ArtifactPayload): void;
}

/**
 * AtengArtifactSidebar 独立产物工作台侧边栏 Props。
 */
export interface AtengArtifactSidebarProps {
  /**
   * 当前查看的目标 Artifact 产物实体。为 null 时显示空状态。
   */
  artifact: ArtifactPayload | null;

  /**
   * 侧边栏是否可见。支持 v-model:visible 双向绑定。
   */
  visible?: boolean;

  /**
   * 当前激活选中的版本序号（1, 2, ...）。支持 v-model:activeVersion 双向绑定。
   */
  activeVersion?: number;

  /**
   * 默认初始展示视图模式 ('preview' | 'code' | 'diff')。默认 'code'。
   */
  initialMode?: ArtifactMode;

  /**
   * 桌面端默认宽度（像素，默认 560）。
   */
  width?: number;

  /**
   * 拖拽调节的最小宽度限制（像素，默认 360）。
   */
  minWidth?: number;

  /**
   * 拖拽调节的最大宽度限制（像素，默认 960）。
   */
  maxWidth?: number;

  /**
   * 移动端/窄屏切换全高抽屉的视口宽度阈值（像素，默认 768）。
   */
  breakpoint?: number;
}

/**
 * AtengArtifactSidebar 独立产物工作台侧边栏 Emits。
 */
export interface AtengArtifactSidebarEmits {
  /**
   * 双向同步可见性。
   */
  (e: 'update:visible', value: boolean): void;

  /**
   * 双向同步当前选中的版本序号。
   */
  (e: 'update:activeVersion', version: number): void;

  /**
   * 点击关闭按钮时触发。
   */
  (e: 'close'): void;

  /**
   * 切换版本时触发。
   */
  (e: 'versionChange', version: number): void;

  /**
   * 切换视图模式时触发。
   */
  (e: 'modeChange', mode: ArtifactMode): void;
}
