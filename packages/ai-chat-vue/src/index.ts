/**
 * @atengk/ai-chat-vue 顶级公共导出入口。
 *
 * 依据 ADR-0043 与成熟度防线：
 * 纯声明式具名导出，无隐式全局自注册副作用，支持极致 Tree-Shaking。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import './styles/index.css';

// 表现组件
export { default as AtengAiChat } from './components/AtengAiChat.vue';
export type AtengAiChatInstance = InstanceType<
  typeof import('./components/AtengAiChat.vue').default
>;

export { default as AtengChatMessage } from './components/AtengChatMessage.vue';
export type AtengChatMessageInstance = InstanceType<
  typeof import('./components/AtengChatMessage.vue').default
>;

export { default as AtengChatInput } from './components/AtengChatInput.vue';
export type AtengChatInputInstance = InstanceType<
  typeof import('./components/AtengChatInput.vue').default
>;

export { default as AtengReasoningBlock } from './components/AtengReasoningBlock.vue';
export type AtengReasoningBlockInstance = InstanceType<
  typeof import('./components/AtengReasoningBlock.vue').default
>;

export { default as AtengMarkdownRenderer } from './components/AtengMarkdownRenderer.vue';
export type AtengMarkdownRendererInstance = InstanceType<
  typeof import('./components/AtengMarkdownRenderer.vue').default
>;

export { default as AtengCodeBlock } from './components/AtengCodeBlock.vue';
export type AtengCodeBlockInstance = InstanceType<
  typeof import('./components/AtengCodeBlock.vue').default
>;

export { default as AtengMermaidBlock } from './components/AtengMermaidBlock.vue';
export type AtengMermaidBlockInstance = InstanceType<
  typeof import('./components/AtengMermaidBlock.vue').default
>;

// 无头响应式状态机、解复用与渲染引擎
export { useAiChat } from './composables/useAiChat';
export { ReasoningDemuxer } from './demux/ReasoningDemuxer';
export type { DemuxResult } from './demux/ReasoningDemuxer';
export { RenderThrottler } from './throttler/RenderThrottler';
export type { RenderThrottlerOptions } from './throttler/RenderThrottler';
export { MarkdownPipeline } from './pipeline/MarkdownPipeline';
export type { MarkdownChunk } from './pipeline/MarkdownPipeline';

// 原生图标组件
export {
  IconSend,
  IconStop,
  IconBrain,
  IconChevronDown,
  IconCopy,
  IconCheck,
  IconArrowDown,
} from './components/icons';

// 强类型领域契约与接口
export type {
  MessageRole,
  MessageStatus,
  ReasoningContent,
  ToolCallPayload,
  ArtifactVersion,
  ArtifactPayload,
  ChatAttachment,
  ChatMessage,
  SendMessageOptions,
  UseAiChatOptions,
  UseAiChatReturn,
  AtengAiChatProps,
  AtengAiChatEmits,
  AtengChatMessageProps,
  AtengChatInputProps,
  AtengChatInputEmits,
} from './types';
