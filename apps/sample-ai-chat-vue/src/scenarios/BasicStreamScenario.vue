<script setup lang="ts">
/**
 * 场景一：基础流式打字机与智能客服对话。
 *
 * 验证核心能力：
 * 1. SSE 文本分块流式打字机平滑接收与状态流转；
 * 2. 外部中止响应 (AbortSignal) 与单点原位重新生成；
 * 3. 历史提问原位编辑并派生新分支会话；
 * 4. 消息操作工具栏（复制、朗读模拟、点赞点踩反馈）。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ElMessage, ElNotification } from 'element-plus';
import {
  AtengAiChat,
  useAiChat,
  type StarterPrompt,
  type MessageFeedback,
} from '@atengk/ai-chat-vue';
import { simulateAiStream } from '../mock/mockStream';

const starterPrompts: StarterPrompt[] = [
  {
    icon: '💬',
    title: '智能客服问答',
    description: '咨询 ateng-ui 四层洋葱架构的设计哲学与单向依赖律',
    prompt: '请解释四层洋葱拓扑的设计哲学与单向依赖律',
  },
  {
    icon: '⚡',
    title: '性能优化咨询',
    description: '在大规模数据渲染与复杂交互中如何避免主线程卡顿？',
    prompt: '请从浏览器事件循环与 RAF 渲染机制角度，分析大规模流式文本打字机的性能优化策略',
  },
  {
    icon: '🛡️',
    title: '前端工程防线',
    description: '探讨工业级代码成熟度十二道防线在实际业务中的落地',
    prompt: '请详细阐述前端工业级代码成熟度十二道防线中的空安全与确定性生命周期治理',
  },
];

const { messages, isStreaming, sendMessage, abort, regenerate, editMessage, clearMessages } =
  useAiChat({
    initialMessages: [
      {
        id: 'init_welcome',
        role: 'assistant',
        content:
          '您好！我是企业级前端智能助手。本场景专注于验证基础流式打字机、消息重发/编辑与点赞评价反馈链路。请随时提问或点击下方引导卡片！',
        status: 'completed',
        createdAt: Date.now(),
        suggestedQuestions: [
          '请解释四层洋葱拓扑的设计哲学与单向依赖律',
          '流式打字机遇到网络卡顿时如何自愈？',
        ],
      },
    ],
    streamHandler: simulateAiStream,
    onFinish: message => {
      if (message.role === 'assistant') {
        message.suggestedQuestions = [
          '请进一步说明该方案在生产环境的避坑指南',
          '能否提供对应的单元测试自验用例？',
        ];
      }
    },
  });

const onSend = (content: string): void => {
  void sendMessage(content);
};

const onFeedback = (feedback: MessageFeedback): void => {
  if (feedback.type === 'up') {
    ElMessage.success('感谢您的赞同反馈 👍');
  } else {
    ElNotification({
      title: '已记录改进建议 👎',
      message: `标签：${feedback.tags?.join('、') || '无'}；理由：${feedback.reason || '无'}`,
      type: 'warning',
    });
  }
};

const onRegenerate = async (msgId: string): Promise<void> => {
  ElMessage.info('正在重新生成当前回答...');
  await regenerate(msgId);
};

const onEditMessage = async (msgId: string, newContent: string): Promise<void> => {
  ElMessage.success('问题已更新，正在生成新回复...');
  await editMessage(msgId, newContent);
};
</script>

<template>
  <div class="scenario-panel">
    <div class="scenario-banner">
      <div class="banner-text">
        <h3 class="banner-title">场景一：基础流式打字机与智能客服对话</h3>
        <p class="banner-desc">
          基于 SSE
          响应式状态机模拟大模型流式打字机输出，支持实时中断、重新生成、原位编辑与评价反馈。
        </p>
      </div>
      <div class="banner-actions">
        <el-button size="small" type="danger" plain @click="clearMessages">🗑️ 清空重置</el-button>
      </div>
    </div>

    <div class="chat-wrapper">
      <AtengAiChat
        :messages="messages"
        :is-streaming="isStreaming"
        :starter-prompts="starterPrompts"
        height="560px"
        placeholder="请输入业务咨询问题，回车发送，Shift + Enter 换行..."
        @send="onSend"
        @stop="abort"
        @regenerate="onRegenerate"
        @edit-message="onEditMessage"
        @feedback="onFeedback"
        @click-suggested-question="q => onSend(q)"
      />
    </div>
  </div>
</template>

<style scoped>
.scenario-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.scenario-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  background: var(--el-fill-color-light, #f8fafc);
  border: 1px solid var(--el-border-color-light, #e2e8f0);
  border-radius: 8px;
}

.banner-title {
  margin: 0 0 4px 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary, #0f172a);
}

.banner-desc {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary, #64748b);
}

.chat-wrapper {
  background: var(--el-bg-color, #ffffff);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}
</style>
