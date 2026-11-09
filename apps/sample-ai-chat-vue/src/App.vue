<script setup lang="ts">
/**
 * sample-ai-chat-vue 体验展厅主视图。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref } from 'vue';
import { AtengAiChat, useAiChat } from '@atengk/ai-chat-vue';
import { simulateAiStream } from './mock/mockStream';

const isDark = ref(false);

const toggleDark = (): void => {
  isDark.value = !isDark.value;
  if (isDark.value) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

// 初始化无头状态机并挂载全真离线模拟器
const { messages, isStreaming, sendMessage, abort, clearMessages } = useAiChat({
  streamHandler: simulateAiStream,
});

const onSend = (content: string): void => {
  void sendMessage(content);
};

const onStop = (): void => {
  abort();
};

const sendPresetPrompt = (prompt: string): void => {
  void sendMessage(prompt);
};
</script>

<template>
  <div class="sample-container">
    <!-- 顶部导航栏 -->
    <header class="sample-header">
      <div class="sample-title-group">
        <h1 class="sample-title">@atengk/ai-chat-vue 体验展厅</h1>
        <el-tag type="success" size="small" effect="plain">端口: 3011</el-tag>
        <el-tag type="info" size="small" effect="plain">L2 专用能力扩展层</el-tag>
        <el-tag type="warning" size="small" effect="plain">全真离线 Mock 驱动</el-tag>
      </div>

      <div class="sample-actions">
        <el-button size="small" @click="toggleDark">
          {{ isDark ? '🌞 浅色模式' : '🌙 深色模式' }}
        </el-button>
        <el-button size="small" type="danger" plain @click="clearMessages"> 🗑️ 清空会话 </el-button>
      </div>
    </header>

    <!-- 主展示区 -->
    <main class="sample-main">
      <div class="sample-chat-card">
        <AtengAiChat
          :messages="messages"
          :is-streaming="isStreaming"
          height="620px"
          placeholder="请输入您的问题（例如：介绍 ateng-ui 的架构优势），Enter 发送..."
          @send="onSend"
          @stop="onStop"
        >
          <template #header>
            <div class="chat-custom-header">
              <span>🤖 智能对话助手（离线仿真运行中）</span>
              <span class="chat-status-pill" :class="{ 'chat-status-pill--active': isStreaming }">
                {{ isStreaming ? '正在生成中...' : '空闲就绪' }}
              </span>
            </div>
          </template>

          <template #footer>
            <div class="chat-custom-footer">
              <span class="preset-label">快捷预设：</span>
              <el-button
                size="small"
                text
                bg
                :disabled="isStreaming"
                @click="sendPresetPrompt('请解释四层洋葱拓扑的设计哲学与单向依赖律')"
              >
                📐 四层洋葱拓扑
              </el-button>
              <el-button
                size="small"
                text
                bg
                :disabled="isStreaming"
                @click="sendPresetPrompt('为什么 L2 扩展层严禁物理依赖 Element Plus？')"
              >
                🛡️ L2 纯净律
              </el-button>
              <el-button
                size="small"
                text
                bg
                :disabled="isStreaming"
                @click="sendPresetPrompt('介绍 ReasoningDemuxer 思考链双模分离算法')"
              >
                🧠 Reasoning 思考链
              </el-button>
            </div>
          </template>
        </AtengAiChat>
      </div>

      <!-- 状态监控侧栏 -->
      <aside class="sample-sidebar">
        <el-card shadow="never" class="info-card">
          <template #header>
            <div class="card-header">
              <span>📊 运行时状态看板</span>
            </div>
          </template>

          <div class="info-item">
            <span class="info-label">流式状态：</span>
            <el-tag :type="isStreaming ? 'primary' : 'info'" size="small">
              {{ isStreaming ? 'Streaming (在途传输)' : 'Idle (就绪)' }}
            </el-tag>
          </div>

          <div class="info-item">
            <span class="info-label">消息计数：</span>
            <span class="info-value">{{ messages.length }} 条</span>
          </div>

          <div class="info-item">
            <span class="info-label">网络接缝：</span>
            <span class="info-value">MockStreamEngine</span>
          </div>

          <el-divider style="margin: 12px 0" />

          <div class="info-desc">
            <p><strong>特性验证清单：</strong></p>
            <ul>
              <li>✅ 纯原生 CSS 变量驱动与 scoped 样式隔离；</li>
              <li>✅ 零 Element Plus 依赖与具名插槽反转；</li>
              <li>✅ ReasoningDemuxer 思考链双模流式分离与折叠计时；</li>
              <li>✅ 响应式输入控制与 Enter 发送快捷键；</li>
              <li>✅ 生成中动态切换“停止生成”按钮；</li>
              <li>✅ 组件作用域注销自动 Abort 中断。</li>
            </ul>
          </div>
        </el-card>
      </aside>
    </main>
  </div>
</template>

<style scoped>
.sample-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--el-bg-color-page, #f8fafc);
  color: var(--el-text-color-primary, #0f172a);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.sample-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 24px;
  background-color: var(--el-bg-color, #ffffff);
  border-bottom: 1px solid var(--el-border-color-light, #e2e8f0);
}

.sample-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sample-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.sample-main {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 20px;
  padding: 24px;
  max-width: 1360px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

.sample-chat-card {
  background: var(--el-bg-color, #ffffff);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.chat-custom-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.chat-status-pill {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  background-color: var(--el-fill-color, #f1f5f9);
  color: var(--el-text-color-secondary, #64748b);
  transition: all 0.2s;
}

.chat-status-pill--active {
  background-color: rgba(37, 99, 235, 0.1);
  color: #2563eb;
  font-weight: 500;
}

.chat-custom-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-top: 1px dashed var(--at-chat-border, #e2e8f0);
  background-color: var(--at-chat-surface, #f8fafc);
  font-size: 13px;
  flex-wrap: wrap;
}

.preset-label {
  color: var(--at-chat-text-muted, #94a3b8);
  font-size: 12px;
}

.sample-sidebar {
  display: flex;
  flex-direction: column;
}

.info-card {
  position: sticky;
  top: 24px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-size: 13px;
}

.info-label {
  color: var(--el-text-color-secondary, #64748b);
}

.info-value {
  font-weight: 500;
}

.info-desc {
  font-size: 12px;
  color: var(--el-text-color-secondary, #64748b);
}

.info-desc ul {
  padding-left: 18px;
  margin: 6px 0 0 0;
  line-height: 1.6;
}
</style>
