<script setup lang="ts">
/**
 * 场景三：KaTeX 数学公式与 Mermaid 架构图渲染。
 *
 * 验证核心能力：
 * 1. MarkdownPipeline 集成 KaTeX 解析行内公式与跨行显示公式；
 * 2. Prism.js 语法高亮代码块（TypeScript、Rust、Python、SQL 等）；
 * 3. 动态 Mermaid 懒加载引擎，支持流程图、时序图与状态机；
 * 4. 零代码泄漏与暗黑模式无损色彩跟随。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { AtengAiChat, useAiChat, type StarterPrompt } from '@atengk/ai-chat-vue';
import { simulateAiStream } from '../mock/mockStream';

const starterPrompts: StarterPrompt[] = [
  {
    icon: '📊',
    title: '全景综合用例',
    description: '展示 KaTeX 数学积分公式、TypeScript 代码块与 Mermaid 架构流程图',
    prompt: '请展示全场景综合用例（包含 KaTeX 数学、Prism 代码与 Mermaid 架构图）',
  },
  {
    icon: '📐',
    title: '数学公式矩阵',
    description: '展示傅里叶变换、正态分布与欧拉公式的高保真渲染',
    prompt: '请输出正态分布概率密度函数、高斯积分与欧拉公式的 KaTeX 表达并详细解释',
  },
  {
    icon: '🔀',
    title: 'Mermaid 时序交互图',
    description: '展示客户端、API 网关与认证服务器的 OAuth 2.0 授权码流转时序图',
    prompt: '请用 Mermaid sequenceDiagram 展示完整的 OAuth 2.0 授权码流转时序图',
  },
];

const { messages, isStreaming, sendMessage, abort, clearMessages } = useAiChat({
  streamHandler: simulateAiStream,
});

const onSend = (content: string): void => {
  void sendMessage(content);
};
</script>

<template>
  <div class="scenario-panel">
    <div class="scenario-banner">
      <div class="banner-text">
        <h3 class="banner-title">场景三：KaTeX 数学公式与 Mermaid 架构图渲染</h3>
        <p class="banner-desc">
          基于原生 MarkdownPipeline、KaTeX 引擎与动态 Mermaid
          渲染器，提供数学公式、代码高亮与动态架构图。
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
        placeholder="请输入需要渲染数学公式或架构图的题目（可点击上方预设卡片）..."
        @send="onSend"
        @stop="abort"
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
