<script setup lang="ts">
/**
 * 场景二：DeepSeek R1 深度思考链折叠与用时统计。
 *
 * 验证核心能力：
 * 1. ReasoningDemuxer 流式解复用 <think> 标签与正文；
 * 2. 思考中骨架屏动效与精确耗时秒数实时累计；
 * 3. 思考完毕后自动折叠保护主视口；
 * 4. 独立 <AtengReasoningBlock /> 折叠展开交互。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { AtengAiChat, useAiChat, type StarterPrompt } from '@atengk/ai-chat-vue';
import { simulateAiStream } from '../mock/mockStream';

const starterPrompts: StarterPrompt[] = [
  {
    icon: '🧠',
    title: '算法深度对比',
    description: '深度推理快速排序与归并排序的稳定性、时间与空间复杂度',
    prompt: '请深度思考：快速排序与归并排序在工程落地中的优缺点与时空复杂度权衡是什么？',
  },
  {
    icon: '📐',
    title: '架构选型推演',
    description: '分析微前端架构与 Monorepo 多包套件的权衡边界',
    prompt: '请深度推理分析：现代大型前端基础设施为何优先选择 Monorepo 洋葱拓扑而非微前端？',
  },
  {
    icon: '🔍',
    title: '死锁与并发机制',
    description: '剖析分布式系统中的哲学家就餐问题与并发死锁消除策略',
    prompt: '请深度思考并推导：并发高吞吐场景下如何消除分布式锁竞争与死锁风险？',
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
        <h3 class="banner-title">场景二：DeepSeek R1 深度思考链折叠与用时统计</h3>
        <p class="banner-desc">
          多路解复用流式提取大模型推理思考过程（&lt;think&gt;
          标签），展示高保真脉冲动效、计时器与自适应折叠。
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
        placeholder="请输入需要深度推理的技术课题（包含“思考”或“为什么”触发 R1 思考流）..."
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
