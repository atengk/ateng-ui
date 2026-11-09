<script setup lang="ts">
/**
 * 场景五：MCP 工具调用人机审批 (Human-in-the-Loop)。
 *
 * 验证核心能力：
 * 1. ToolDefinition 声明式定义工具入参与执行模式 (auto / confirm)；
 * 2. 自动工具静默执行与结果无缝插回会话流；
 * 3. 敏感特权工具触发审批卡片与入参 JSON 审计；
 * 4. 人工批准 (approveToolCall) 与人工驳回 (rejectToolCall) 全双工流转。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ElMessage } from 'element-plus';
import {
  AtengAiChat,
  useAiChat,
  type ToolDefinition,
  type StarterPrompt,
} from '@atengk/ai-chat-vue';
import { simulateAiStream } from '../mock/mockStream';

const starterPrompts: StarterPrompt[] = [
  {
    icon: '⛅',
    title: '自动工具调用',
    description: '查询北京实时气温与空气质量 (mode: auto)',
    prompt: '请帮我查询北京当前的实时天气状况',
  },
  {
    icon: '⚠️',
    title: '特权操作人机审批',
    description: '申请删除核心生产操作日志表 (mode: confirm)',
    prompt: '请执行删除生产操作日志表 drop table sys_operation_log',
  },
];

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
    description: '删除生产数据库表敏感特权操作 (HITL 人工审批)',
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

const {
  messages,
  isStreaming,
  sendMessage,
  abort,
  clearMessages,
  approveToolCall,
  rejectToolCall,
} = useAiChat({
  tools: sampleTools,
  streamHandler: simulateAiStream,
});

const onSend = (content: string): void => {
  void sendMessage(content);
};

const handleApprove = async (toolCallId: string): Promise<void> => {
  ElMessage.success('已审批通过该特权操作，正在执行底层指令...');
  await approveToolCall(toolCallId);
};

const handleReject = async (toolCallId: string): Promise<void> => {
  ElMessage.warning('已驳回该特权操作申请，已阻断潜在风险');
  await rejectToolCall(toolCallId, '管理员已驳回本次危险特权操作申请');
};
</script>

<template>
  <div class="scenario-panel">
    <div class="scenario-banner">
      <div class="banner-text">
        <h3 class="banner-title">场景五：MCP 工具调用人机审批 (HITL)</h3>
        <p class="banner-desc">
          支持大模型 Function Calling 与 MCP
          工具全双工流转。支持只读工具全自动调用与破坏性写操作人机确认防线。
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
        placeholder="输入“查询天气”测试自动工具，或“删库删表”测试人机审批拦截卡片..."
        @send="onSend"
        @stop="abort"
        @approve-tool="handleApprove"
        @reject-tool="handleReject"
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
