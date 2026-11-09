<script setup lang="ts">
/**
 * sample-ai-chat-vue 体验展厅主视图。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref } from 'vue';
import { AtengAiChat, useAiChat, type ToolDefinition } from '@atengk/ai-chat-vue';
import { simulateAiStream } from './mock/mockStream';

const isDark = ref(false);
const typewriterSpeed = ref<number>(0);

const toggleDark = (): void => {
  isDark.value = !isDark.value;
  if (isDark.value) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

// 1. 注册展厅工具集（自动查询工具 + 敏感操作审批工具）
const sampleTools: ToolDefinition[] = [
  {
    name: 'get_weather',
    description: '查询城市实时气象与空气质量数据',
    mode: 'auto',
    execute: async (args: Record<string, unknown>) => {
      // 模拟 300ms 异步接口网络延迟
      await new Promise(resolve => setTimeout(resolve, 300));
      return {
        city: args.city || '北京',
        temperature: '22°C',
        condition: '晴朗 ☀️',
        humidity: '45%',
        aqi: 28,
        updateTime: new Date().toLocaleTimeString(),
      };
    },
  },
  {
    name: 'drop_database_table',
    description: '删除生产数据库表敏感特权操作 (HITL)',
    mode: 'confirm',
    execute: async (args: Record<string, unknown>) => {
      // 模拟特权数据库 DROP 操作
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        status: 'SUCCESS',
        droppedTable: args.table || 'sys_operation_log',
        database: args.database || 'production_db',
        freedBytes: '45.8 MB',
        auditId: `SEC-AUDIT-${Date.now()}`,
      };
    },
  },
];

// 初始化无头状态机并挂载全真离线模拟器，支持响应式打字机速率与工具全双工流转
const {
  messages,
  isStreaming,
  sendMessage,
  abort,
  clearMessages,
  flushTypewriter,
  approveToolCall,
  rejectToolCall,
} = useAiChat({
  tools: sampleTools,
  streamHandler: simulateAiStream,
  typewriterSpeed,
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
        <div class="speed-control-group">
          <span class="speed-label">渲染输出：</span>
          <el-radio-group v-model="typewriterSpeed" size="small">
            <el-radio-button :value="0">🚀 全速 RAF 节流</el-radio-button>
            <el-radio-button :value="20">⌨️ 打字机 (20ms/字)</el-radio-button>
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
          @approve-tool="approveToolCall"
          @reject-tool="rejectToolCall"
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
                type="primary"
                plain
                :disabled="isStreaming"
                @click="sendPresetPrompt('请帮我查询北京当前的实时天气状况')"
              >
                ⛅ 自动工具：查询北京天气
              </el-button>
              <el-button
                size="small"
                type="danger"
                plain
                :disabled="isStreaming"
                @click="sendPresetPrompt('请执行删除生产操作日志表 drop table sys_operation_log')"
              >
                ⚠️ HITL审批：删除生产日志表
              </el-button>
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
              <el-button
                size="small"
                text
                bg
                :disabled="isStreaming"
                @click="
                  sendPresetPrompt(
                    '请展示全场景综合用例（包含 KaTeX 数学、Prism 代码与 Mermaid 架构图）',
                  )
                "
              >
                🔬 数学+代码+架构图综合
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
              <li>✅ ToolCallDemuxer 流式 &lt;tool_call&gt; 协议解析与纯净剥离；</li>
              <li>✅ mode: 'auto' 工具自动触发与 role: 'tool' 结果回喂大模型；</li>
              <li>✅ mode: 'confirm' 人机协同审批 (HITL) 挂起、同意授权与拒批拦截；</li>
              <li>✅ AtengToolCallCard 纯原生三态卡片与 JSON 入参折叠查看；</li>
              <li>✅ ReasoningDemuxer 思考链双模流式分离与折叠计时；</li>
              <li>✅ MarkdownPipeline 高保真 Markdown 与 GFM 表格；</li>
              <li>✅ KaTeX 行内/块级数学公式与货币符号保护；</li>
              <li>✅ Prism.js 语法高亮与一键复制代码标牌；</li>
              <li>✅ Mermaid 动态懒加载渲染与语法异常兜底；</li>
              <li>✅ RenderThrottler 16~32ms RAF 渲染节流与动态队列批处理；</li>
              <li>✅ 呼吸感打字机模式 (typewriterSpeed) 与立即刷盘 (flushTypewriter)；</li>
              <li>✅ 视口智能滚动锚定 (Δ ≤ 60px) 与阅读位置锁定；</li>
              <li>✅ 向上回看历史自动浮现“有新消息 ⬇”悬浮胶囊；</li>
              <li>✅ 点击胶囊或滑回底部重新恢复滚动锚定；</li>
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

.sample-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.speed-control-group {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: var(--el-fill-color-light, #f1f5f9);
  padding: 4px 10px;
  border-radius: 6px;
}

.speed-label {
  font-size: 13px;
  color: var(--el-text-color-secondary, #64748b);
  white-space: nowrap;
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
