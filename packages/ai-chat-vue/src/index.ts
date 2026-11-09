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

// 无头响应式状态机
export { useAiChat } from './composables/useAiChat';

// 原生图标组件
export { IconSend, IconStop } from './components/icons';

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
