<script setup lang="ts">
/**
 * 场景七：多模态附件流水线与文件尺寸护栏。
 *
 * 验证核心能力：
 * 1. 拖拽文件进入输入框或使用剪贴板粘贴截图 (Clipboard Paste)；
 * 2. uploadHandler SPI 接入统一大文件与媒体上传链路；
 * 3. 尺寸与类型拦截护栏 (支持 maxFileSize 与 mimeTypes 白名单)；
 * 4. 消息气泡内多模态预览（图片缩略图、文档卡片与大小展示）。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ElMessage } from 'element-plus';
import {
  AtengAiChat,
  useAiChat,
  type ChatAttachment,
  type StarterPrompt,
} from '@atengk/ai-chat-vue';
import { simulateAiStream } from '../mock/mockStream';

const starterPrompts: StarterPrompt[] = [
  {
    icon: '🖼️',
    title: '架构图视觉走查',
    description: '上传前端架构图截图或流程设计图，咨询优化改进建议',
    prompt: '请分析我上传的这张系统架构设计图，评估潜在的单点故障与吞吐瓶颈',
  },
  {
    icon: '📄',
    title: '接口契约文档审计',
    description: '上传 API 设计文档或 Swagger JSON，执行规范一致性校验',
    prompt: '请根据我上传的接口设计规范文档，核对字段命名与状态码是否符合 RESTful 规范',
  },
];

// 模拟多模态附件上传 SPI 处理器，包含大小护栏 (单个最大 10MB)
const mockUploadHandler = async (file: File): Promise<ChatAttachment> => {
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.error(`附件大小超过 10MB 护栏限制：${file.name}`);
    throw new Error('File size exceeds 10MB limit');
  }
  await new Promise(resolve => setTimeout(resolve, 300));
  const isImage = file.type.startsWith('image/');
  const mockUrl = URL.createObjectURL(file);
  return {
    id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: file.name,
    size: file.size,
    type: isImage ? 'image' : 'file',
    url: mockUrl,
    thumbnailUrl: isImage ? mockUrl : undefined,
    status: 'success',
  };
};

const { messages, isStreaming, sendMessage, abort, clearMessages } = useAiChat({
  streamHandler: simulateAiStream,
});

const onSend = (content: string, attachments?: ChatAttachment[]): void => {
  void sendMessage(content, { attachments });
};
</script>

<template>
  <div class="scenario-panel">
    <div class="scenario-banner">
      <div class="banner-text">
        <h3 class="banner-title">场景七：多模态附件流水线与文件尺寸护栏</h3>
        <p class="banner-desc">
          支持多模态图片与文档附件，原生支持直接粘贴系统截图（Ctrl+V）、文件拖拽与统一上传 SPI
          契约。
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
        :upload-handler="mockUploadHandler"
        height="560px"
        placeholder="可点击回形针图标上传文件、直接拖拽文件入框、或按 Ctrl+V 粘贴剪贴板截图..."
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
