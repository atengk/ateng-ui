/**
 * @atengk/ai-chat-vue 统一领域类型定义与组件接口契约。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import type { Ref } from 'vue';

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
  state: 'calling' | 'success' | 'error';

  /**
   * 工具执行返回的结果数据。
   */
  result?: unknown;

  /**
   * 是否需要人工协同审批（HITL）。
   */
  requireConfirm?: boolean;
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
   * 触发提交发送。
   */
  (e: 'submit', value: string): void;

  /**
   * 触发停止生成。
   */
  (e: 'stop'): void;
}
