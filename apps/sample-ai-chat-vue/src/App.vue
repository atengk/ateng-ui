<script setup lang="ts">
/**
 * sample-ai-chat-vue 体验展厅主视图。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref } from 'vue';
import {
  AtengAiChat,
  AtengArtifactSidebar,
  useAiChat,
  type ToolDefinition,
} from '@atengk/ai-chat-vue';
import { AtengCodeDiffEditor } from '@atengk/code-editor-vue';
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

// 初始化无头状态机并挂载全真离线模拟器，支持响应式打字机速率、工具全双工流转与全局 Artifacts 产物总线
const {
  messages,
  isStreaming,
  sendMessage,
  abort,
  clearMessages,
  flushTypewriter,
  approveToolCall,
  rejectToolCall,
  artifacts,
  activeArtifact,
  activeArtifactVersion,
  isArtifactSidebarOpen,
  openArtifact,
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
    <main class="sample-main" :class="{ 'sample-main--with-artifact': isArtifactSidebarOpen }">
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
          @open-artifact="art => openArtifact(art.identifier)"
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
                type="success"
                plain
                :disabled="isStreaming"
                @click="sendPresetPrompt('请为我生成一个 Vue 用户资料卡片组件 (v1 产物)')"
              >
                📦 产物v1：生成Vue卡片
              </el-button>
              <el-button
                size="small"
                type="warning"
                plain
                :disabled="isStreaming"
                @click="
                  sendPresetPrompt('请迭代升级该组件 (v2 版本)，增加头像、关注切换与 Diff 比对')
                "
              >
                🔄 产物v2：升级并Diff比对
              </el-button>
              <el-button
                size="small"
                type="primary"
                plain
                :disabled="isStreaming"
                @click="sendPresetPrompt('请帮我查询北京当前的实时天气状况')"
              >
                ⛅ 自动工具：查询天气
              </el-button>
              <el-button
                size="small"
                type="danger"
                plain
                :disabled="isStreaming"
                @click="sendPresetPrompt('请执行删除生产操作日志表 drop table sys_operation_log')"
              >
                ⚠️ HITL：删库审批
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

      <!-- 独立产物工作台侧边栏 (宽屏右侧分栏 / 窄屏全高抽屉，集成 Monaco Diff 比对) -->
      <AtengArtifactSidebar
        v-if="isArtifactSidebarOpen"
        v-model:visible="isArtifactSidebarOpen"
        v-model:active-version="activeArtifactVersion"
        :artifact="activeArtifact"
        :width="540"
      >
        <template #diff="{ originalCode, modifiedCode, language }">
          <AtengCodeDiffEditor
            :original="originalCode"
            :modified="modifiedCode"
            :language="language === 'vue' ? 'html' : language"
            height="100%"
          />
        </template>
      </AtengArtifactSidebar>

      <!-- 状态监控侧栏 -->
      <aside v-if="!isArtifactSidebarOpen" class="sample-sidebar">
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
            <span class="info-label">独立产物：</span>
            <el-tag type="success" size="small">{{ artifacts.length }} 个产物</el-tag>
          </div>

          <div class="info-item">
            <span class="info-label">网络接缝：</span>
            <span class="info-value">MockStreamEngine</span>
          </div>

          <el-divider style="margin: 12px 0" />

          <div class="info-desc">
            <p><strong>特性验证清单：</strong></p>
            <ul>
              <li>✅ ArtifactDemuxer 流式提取 &lt;artifact&gt; 产物并剥离正文；</li>
              <li>✅ 同一 identifier 自动生成递增不可变版本链 (v1 ➔ v2)；</li>
              <li>✅ AtengArtifactCard 气泡内紧凑卡片与一键唤起侧边栏；</li>
              <li>✅ AtengArtifactSidebar 独立产物工作台 (Preview / Code / Diff)；</li>
              <li>✅ 桌面端拖拽调节分栏宽度与最小/最大宽度防溢出边界；</li>
              <li>✅ 移动端/窄屏自动切换全高抽屉与遮罩自适应；</li>
              <li>✅ #diff 插槽反转装配 @atengk/code-editor-vue Monaco Diff；</li>
              <li>✅ ToolCallDemuxer 工具调用全双工执行与 HITL 审批拦截；</li>
              <li>✅ ReasoningDemuxer 思考链双模流式分离与折叠计时；</li>
              <li>✅ MarkdownPipeline 高保真 Markdown、KaTeX 公式与 Prism 高亮；</li>
              <li>✅ RenderThrottler 16~32ms RAF 渲染节流与呼吸感打字机；</li>
              <li>✅ 视口智能滚动锚定 (Δ ≤ 60px) 与“有新消息 ⬇”气泡；</li>
              <li>✅ 组件作用域注销确定性清理与 Abort 中断。</li>
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

.sample-main--with-artifact {
  grid-template-columns: 1fr auto;
  max-width: 1680px;
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
