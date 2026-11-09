<script setup lang="ts">
/**
 * 场景四：高频 Token 吞吐与智能滚动锚定。
 *
 * 验证核心能力：
 * 1. RenderThrottler 基于 requestAnimationFrame 的高频批处理节流，消除 CPU 抖动；
 * 2. 仿真打字机速率控制与“立即刷盘 (flushTypewriter)”逃生门；
 * 3. 视口智能滚动锚定 (ScrollAnchoring)：在底部时锁定最新行，翻阅历史时脱离锁定；
 * 4. 视口底部“有新消息 ⬇”智能气泡提示与一键回底。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref } from 'vue';
import { AtengAiChat, useAiChat, type StarterPrompt } from '@atengk/ai-chat-vue';
import { simulateAiStream } from '../mock/mockStream';

const typewriterSpeed = ref<number>(20);

const starterPrompts: StarterPrompt[] = [
  {
    icon: '⚡',
    title: '高吞吐长篇综述',
    description: '生成涵盖多维度的超长技术白皮书，检验 60fps 批处理抗抖动与滚动锚定',
    prompt:
      '请生成一份详尽的企业级前端 APM 监控与可观测性体系全景白皮书，包含架构设计、采样策略与核心指标',
  },
  {
    icon: '📜',
    title: '源码深度走读',
    description: '连续输出大段 TypeScript 源码与技术解析，检验滚动跟踪',
    prompt:
      '请输出一份工业级 Axios 拦截器管道的设计与完整实现代码，包含雪花 ID 转换与并发刷新 Token 队列',
  },
];

const { messages, isStreaming, sendMessage, abort, clearMessages, flushTypewriter } = useAiChat({
  typewriterSpeed,
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
        <h3 class="banner-title">场景四：高频 Token 吞吐与智能滚动锚定</h3>
        <p class="banner-desc">
          基于 requestAnimationFrame 节流批处理与视口动态锚定算法，消除 50+ token/s 高速流式下的 CPU
          飙升与视口撕扯。
        </p>
      </div>

      <div class="banner-actions">
        <div class="speed-control">
          <span class="control-label">打字速率：</span>
          <el-radio-group v-model="typewriterSpeed" size="small">
            <el-radio-button :value="0">🚀 全速 RAF</el-radio-button>
            <el-radio-button :value="15">⚡ 15ms/字</el-radio-button>
            <el-radio-button :value="30">⌨️ 30ms/字</el-radio-button>
          </el-radio-group>
          <el-button
            v-if="isStreaming && typewriterSpeed > 0"
            size="small"
            type="warning"
            plain
            @click="flushTypewriter"
          >
            ⚡ 立即刷盘
          </el-button>
        </div>
        <el-button size="small" type="danger" plain @click="clearMessages">🗑️ 清空重置</el-button>
      </div>
    </div>

    <div class="chat-wrapper">
      <AtengAiChat
        :messages="messages"
        :is-streaming="isStreaming"
        :starter-prompts="starterPrompts"
        height="560px"
        placeholder="发送长篇生成测试，尝试在生成过程中向上滚动鼠标滚轮验证滚动脱离锚定..."
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
  flex-wrap: wrap;
  gap: 12px;
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

.banner-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.speed-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-label {
  font-size: 13px;
  color: var(--el-text-color-secondary, #64748b);
}

.chat-wrapper {
  background: var(--el-bg-color, #ffffff);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}
</style>
