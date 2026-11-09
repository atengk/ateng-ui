<script setup lang="ts">
/**
 * 场景八：多会话持久化、IME 保护、斜杠指令与 DLP 合规切片。
 *
 * 验证核心能力：
 * 1. useAiChatSessions 多会话增删改查与 LocalStorageAdapter 防溢出持久化；
 * 2. CompositionGuard：IME 中文拼音候选状态敲击 Enter 绝不误触外发；
 * 3. 输入框 1~6 行动态自适应增高伸展与清空复位；
 * 4. 输入以 / 开头弹出斜杠快捷指令菜单，支持键盘上下与回车选中；
 * 5. beforeSend 前置合规拦截高危涉密敏感词与手机号自动脱敏；
 * 6. 流式网络中断或 504 超时异常消息标红，提供单点原位自愈重试。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  AtengAiChat,
  useAiChat,
  useAiChatSessions,
  type SlashCommand,
  type BeforeSendHook,
} from '@atengk/ai-chat-vue';
import { simulateAiStream } from '../mock/mockStream';

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

const { messages, isStreaming, sendMessage, abort, clearMessages, regenerate } = useAiChat({
  initialMessages: currentSession.value?.messages || [],
  streamHandler: simulateAiStream,
  beforeSend: sampleBeforeSend,
});

// 监听消息链并同步持久化至当前会话
watch(
  messages,
  newMsgs => {
    if (currentSessionId.value) {
      updateSessionMessages(currentSessionId.value, newMsgs);
    }
  },
  { deep: true },
);

// 切换会话
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
    // 用户取消
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

const onSend = (content: string): void => {
  void sendMessage(content);
};

const onBlocked = (reason: string): void => {
  ElMessage.error(`[DLP 合规拦截] ${reason}`);
};

const onRegenerate = async (msgId: string): Promise<void> => {
  ElMessage.info('触发原位单点重试自愈...');
  await regenerate(msgId);
};
</script>

<template>
  <div class="scenario-panel">
    <div class="scenario-banner">
      <div class="banner-text">
        <h3 class="banner-title">场景八：多会话持久化、IME 保护、斜杠指令与 DLP 合规切片</h3>
        <p class="banner-desc">
          提供全套企业级工程防线：输入法拼音防误触、1~6
          行高度自适应伸缩、斜杠指令浮层、前置合规审查脱敏与 504 原位自愈。
        </p>
      </div>

      <div class="session-actions">
        <el-select
          :model-value="currentSessionId"
          size="small"
          style="width: 140px"
          placeholder="切换会话"
          @update:model-value="handleSwitchSession"
        >
          <el-option v-for="s in sessions" :key="s.id" :label="s.title" :value="s.id" />
        </el-select>
        <el-button size="small" type="primary" plain @click="handleCreateSession"
          >➕ 新建</el-button
        >
        <el-button size="small" @click="handleRenameCurrentSession">✏️ 重命名</el-button>
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

    <div class="chat-wrapper">
      <AtengAiChat
        :messages="messages"
        :is-streaming="isStreaming"
        :min-rows="1"
        :max-rows="6"
        :slash-commands="sampleSlashCommands"
        :before-send="sampleBeforeSend"
        height="540px"
        placeholder="输入 / 呼出斜杠指令；输入中文拼音敲 Enter 验证防误触；输入“删库跑路”验证 DLP 拦截..."
        @send="onSend"
        @stop="abort"
        @regenerate="onRegenerate"
        @blocked="onBlocked"
        @click-suggested-question="q => onSend(q)"
      >
        <template #footer>
          <div class="preset-bar">
            <span class="preset-label">快速体验防线：</span>
            <el-button
              size="small"
              type="danger"
              plain
              :disabled="isStreaming"
              @click="onSend('模拟超时：请执行一个会发生 504 超时的请求')"
            >
              🔄 504 超时原位自愈
            </el-button>
            <el-button
              size="small"
              type="warning"
              plain
              :disabled="isStreaming"
              @click="onSend('测试敏感词拦截：我想准备删库跑路了')"
            >
              🛡️ DLP 敏感词阻断
            </el-button>
            <el-button
              size="small"
              type="info"
              plain
              :disabled="isStreaming"
              @click="onSend('登记客户联系方式：13812345678')"
            >
              🔒 手机号自动脱敏
            </el-button>
          </div>
        </template>
      </AtengAiChat>
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

.session-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chat-wrapper {
  background: var(--el-bg-color, #ffffff);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.preset-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-top: 1px dashed var(--at-chat-border, #e2e8f0);
  background-color: var(--at-chat-surface, #f8fafc);
  flex-wrap: wrap;
}

.preset-label {
  font-size: 12px;
  color: var(--at-chat-text-muted, #94a3b8);
}
</style>
