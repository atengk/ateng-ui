<script setup lang="ts">
/**
 * sample-ai-chat-vue 体验展厅主视图。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref, watch } from 'vue';
import { ElMessage, ElNotification, ElMessageBox } from 'element-plus';
import {
  AtengAiChat,
  AtengArtifactSidebar,
  useAiChat,
  useAiChatSessions,
  type ToolDefinition,
  type StarterPrompt,
  type ChatAttachment,
  type MessageFeedback,
  type SlashCommand,
  type BeforeSendHook,
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

// 1. 多会话持久化状态机
const {
  sessions,
  currentSessionId,
  currentSession,
  createSession,
  switchSession,
  renameSession,
  deleteSession,
  updateSessionMessages,
} = useAiChatSessions({
  defaultTitle: '新对话',
});

// 2. 斜杠快捷指令预设列表
const sampleSlashCommands: SlashCommand[] = [
  {
    name: '/clear',
    description: '清空当前对话所有消息',
    icon: '🗑️',
    action: ctx => {
      clearMessages();
      ctx.close();
      ElMessage.info('当前会话消息已清空');
    },
  },
  {
    name: '/architect',
    description: '插入系统架构分析提示词模板',
    icon: '📐',
    snippet: '作为资深系统架构师，请帮我分析该业务场景的技术架构与性能瓶颈：',
  },
  {
    name: '/weather',
    description: '快速查询指定城市气象数据',
    icon: '⛅',
    snippet: '请帮我查询北京当前的实时天气状况',
  },
  {
    name: '/timeout',
    description: '模拟网络超时与 504 异常以自验原位重试自愈',
    icon: '⚠️',
    snippet: '模拟超时：请执行一个会发生 504 超时的请求',
  },
];

// 3. 前置 DLP 安全合规拦截与脱敏钩子
const sampleBeforeSend: BeforeSendHook = content => {
  if (content.includes('删库跑路') || content.includes('密码明文')) {
    return {
      allow: false,
      reason: '触发企业 DLP 合规安全审查阻断：检测到高危涉密敏感词汇！',
    };
  }
  // 手机号自动脱敏
  const phoneRegex = /1[3-9]\d{9}/g;
  if (phoneRegex.test(content)) {
    return {
      allow: true,
      sanitizedContent: content.replace(
        phoneRegex,
        match => `${match.slice(0, 3)}****${match.slice(7)}`,
      ),
    };
  }
  return true;
};

// 空会话引导提示卡片网格
const sampleStarterPrompts: StarterPrompt[] = [
  {
    icon: '📦',
    title: '产物与不可变版本链',
    description: '为我生成一个 Vue 用户资料卡片组件 (v1 产物)',
    prompt: '请为我生成一个 Vue 用户资料卡片组件 (v1 产物)',
  },
  {
    icon: '⛅',
    title: '全双工工具调用 (Function Calling)',
    description: '查询北京实时气象与空气质量数据',
    prompt: '请帮我查询北京当前的实时天气状况',
  },
  {
    icon: '⚠️',
    title: '人机协同特权审批 (HITL)',
    description: '申请删除生产日志表敏感特权操作',
    prompt: '请执行删除生产操作日志表 drop table sys_operation_log',
  },
  {
    icon: '🔬',
    title: '高保真 Markdown + KaTeX + Mermaid',
    description: '数学公式、Prism 语法高亮与流程图全景',
    prompt: '请展示全场景综合用例（包含 KaTeX 数学、Prism 代码与 Mermaid 架构图）',
  },
];

// 多模态附件上传 SPI 处理器
const mockUploadHandler = async (file: File): Promise<ChatAttachment> => {
  await new Promise(resolve => setTimeout(resolve, 400));
  const isImage = file.type.startsWith('image/');
  const mockUrl = URL.createObjectURL(file);
  return {
    id: `att_${Date.now()}`,
    name: file.name,
    size: file.size,
    type: isImage ? 'image' : 'file',
    url: mockUrl,
    thumbnailUrl: isImage ? mockUrl : undefined,
    status: 'success',
  };
};

// 注册展厅工具集（自动查询工具 + 敏感操作审批工具）
const sampleTools: ToolDefinition[] = [
  {
    name: 'get_weather',
    description: '查询城市实时气象与空气质量数据',
    mode: 'auto',
    execute: async (args: Record<string, unknown>) => {
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
  regenerate,
  editMessage,
  artifacts,
  activeArtifact,
  activeArtifactVersion,
  isArtifactSidebarOpen,
  openArtifact,
} = useAiChat({
  initialMessages: currentSession.value?.messages || [],
  tools: sampleTools,
  streamHandler: simulateAiStream,
  typewriterSpeed,
  beforeSend: sampleBeforeSend,
  onFinish: message => {
    if (message.role === 'assistant') {
      if (message.content.includes('用户资料卡片')) {
        message.suggestedQuestions = [
          '请迭代升级该组件 (v2 版本)，增加头像、关注切换与 Diff 比对',
          '如何将该卡片改写为 TypeScript 严格契约？',
          '支持响应式移动端断点吗？',
        ];
      } else if (message.content.includes('天气') || message.content.includes('气温')) {
        message.suggestedQuestions = [
          '未来 3 天的天气趋势如何？',
          '空气质量指数 AQI 评级标准是什么？',
          '适合户外运动吗？',
        ];
      } else if (message.content.includes('洋葱拓扑')) {
        message.suggestedQuestions = [
          'L0 和 L1 层有什么明确的区别？',
          '为什么禁止 L2 反向依赖 L3？',
          '如何对 L0 运行跨框架中立单测？',
        ];
      } else {
        message.suggestedQuestions = [
          '请展开详细说明核心实现步骤',
          '有哪些潜在的边界异常需要防御？',
          '能否给出单元测试示例？',
        ];
      }
    }
  },
});

// 会话消息自动持久化到当前会话
watch(
  messages,
  newMsgs => {
    if (currentSessionId.value) {
      updateSessionMessages(currentSessionId.value, newMsgs);
    }
  },
  { deep: true },
);

// 切换会话时同步更新状态机中的消息链
const handleSwitchSession = (sid: string): void => {
  if (isStreaming.value) {
    ElMessage.warning('当前正在流式生成中，请先等待完成或停止');
    return;
  }
  switchSession(sid);
  if (currentSession.value) {
    messages.value = [...currentSession.value.messages];
  }
};

const handleCreateSession = (): void => {
  if (isStreaming.value) {
    ElMessage.warning('当前正在流式生成中，请先等待完成或停止');
    return;
  }
  const newS = createSession();
  messages.value = [];
  ElMessage.success(`已新建会话：“${newS.title}”`);
};

const handleRenameCurrentSession = async (): Promise<void> => {
  if (!currentSession.value) return;
  try {
    const { value } = await ElMessageBox.prompt('请输入新的会话名称：', '重命名会话', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: currentSession.value.title,
    });
    if (value && value.trim()) {
      renameSession(currentSession.value.id, value.trim());
      ElMessage.success('会话重命名成功');
    }
  } catch {
    // 取消
  }
};

const handleDeleteCurrentSession = (): void => {
  if (!currentSession.value) return;
  const targetId = currentSession.value.id;
  deleteSession(targetId);
  if (currentSession.value) {
    messages.value = [...currentSession.value.messages];
  } else {
    messages.value = [];
  }
  ElMessage.info('会话已删除');
};

const onSend = (content: string, attachments?: ChatAttachment[]): void => {
  void sendMessage(content, { attachments });
};

const onStop = (): void => {
  abort();
};

const sendPresetPrompt = (prompt: string): void => {
  void sendMessage(prompt);
};

// 工具栏反馈处理
const onFeedback = (feedback: MessageFeedback): void => {
  if (feedback.type === 'up') {
    ElMessage.success('已收到您的赞同反馈 👍');
  } else {
    ElNotification({
      title: '已收到改进建议 👎',
      message: `标签：${feedback.tags?.join('、') || '无'}；理由：${feedback.reason || '无'}`,
      type: 'warning',
    });
  }
};

const onRegenerate = async (messageId: string): Promise<void> => {
  ElMessage.info('正在为您重新生成回答...');
  await regenerate(messageId);
};

const onEditMessage = async (messageId: string, newContent: string): Promise<void> => {
  ElMessage.success('提问已修改，正在为您生成新分支...');
  await editMessage(messageId, newContent);
};

const onClickSuggestedQuestion = (question: string): void => {
  ElMessage.info(`发起追问：${question}`);
  void sendMessage(question);
};

const onBlocked = (reason: string): void => {
  ElMessage.error(`[DLP 合规拦截] ${reason}`);
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

        <!-- 会话选择器与多会话管理 -->
        <div class="session-manager-group">
          <el-select
            :model-value="currentSessionId"
            size="small"
            style="width: 150px"
            placeholder="切换会话"
            @update:model-value="handleSwitchSession"
          >
            <el-option v-for="s in sessions" :key="s.id" :label="s.title" :value="s.id" />
          </el-select>
          <el-button size="small" type="primary" plain @click="handleCreateSession">
            ➕ 新建
          </el-button>
          <el-button size="small" @click="handleRenameCurrentSession"> ✏️ 重命名 </el-button>
          <el-button
            size="small"
            type="danger"
            plain
            :disabled="sessions.length <= 1"
            @click="handleDeleteCurrentSession"
          >
            🗑️ 删除
          </el-button>
        </div>
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
          :starter-prompts="sampleStarterPrompts"
          :upload-handler="mockUploadHandler"
          :min-rows="1"
          :max-rows="6"
          :slash-commands="sampleSlashCommands"
          :before-send="sampleBeforeSend"
          height="620px"
          placeholder="请输入您的问题，支持 1~6 行自适应伸缩，输入 / 唤出快捷指令，支持拖拽或直接粘贴图片..."
          @send="onSend"
          @stop="onStop"
          @approve-tool="approveToolCall"
          @reject-tool="rejectToolCall"
          @open-artifact="art => openArtifact(art.identifier)"
          @regenerate="onRegenerate"
          @edit-message="onEditMessage"
          @feedback="onFeedback"
          @click-suggested-question="onClickSuggestedQuestion"
          @blocked="onBlocked"
        >
          <template #header>
            <div class="chat-custom-header">
              <span>🤖 智能对话助手（当前会话：{{ currentSession?.title }}）</span>
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
                type="danger"
                plain
                :disabled="isStreaming"
                @click="sendPresetPrompt('模拟超时：请执行一个会发生 504 超时的请求')"
              >
                🔄 504超时原位自愈
              </el-button>
              <el-button
                size="small"
                type="warning"
                plain
                :disabled="isStreaming"
                @click="sendPresetPrompt('测试敏感词拦截：我想准备删库跑路了')"
              >
                🛡️ DLP拦截：删库跑路
              </el-button>
              <el-button
                size="small"
                type="info"
                plain
                :disabled="isStreaming"
                @click="sendPresetPrompt('请为客户登记联系电话：13812345678')"
              >
                🔒 DLP脱敏：手机号脱敏
              </el-button>
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
                type="primary"
                plain
                :disabled="isStreaming"
                @click="sendPresetPrompt('请帮我查询北京当前的实时天气状况')"
              >
                ⛅ 自动工具：查询天气
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
              <li>✅ CompositionGuard：IME 中文拼音合成硬拦截防线，杜绝误触回车；</li>
              <li>✅ 自适应伸缩输入框：1~6 行高度动态伸展自适应，超出平滑滚动；</li>
              <li>✅ 斜杠快捷指令：输入 / 呼出浮层面板，支持键盘上下与回车选中；</li>
              <li>✅ ChatSession 多会话管理：新建/切换/重命名/删除与 StorageAdapter 持久化；</li>
              <li>✅ LocalStorageAdapter：持久化存储与 QuotaExceeded 配额防溢出保护；</li>
              <li>✅ DLP 前置合规：beforeSend 安全拦截阻断与手机号/敏感词脱敏掩码；</li>
              <li>✅ 原位重试自愈：流式网络中断或 504 异常消息标红，提供一键单点自愈重试；</li>
              <li>✅ 多模态附件流水线：文件拖拽、剪贴板截图直粘与 uploadHandler SPI；</li>
              <li>✅ 消息操作审计条 AtengMessageToolbar：复制、朗读、导出 Markdown/JSON；</li>
              <li>✅ 评价反馈 SPI：赞同高亮与批评理由/标签选择浮层提交；</li>
              <li>✅ 对话演进：助手回复重新生成与用户提问原位编辑分支重发；</li>
              <li>✅ 空会话视口引导：starterPrompts 提问卡片网格与一键发起；</li>
              <li>✅ 动态追问胶囊：suggestedQuestions 横向平滑滚动气泡；</li>
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

.session-manager-group {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 12px;
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
