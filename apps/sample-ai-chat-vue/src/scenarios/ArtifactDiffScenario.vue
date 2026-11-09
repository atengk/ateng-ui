<script setup lang="ts">
/**
 * 场景六：Artifacts 多版本管理与 Code Diff 比对。
 *
 * 验证核心能力：
 * 1. 流式解复用剥离 <artifact> 标签并提取独立工程产物；
 * 2. 气泡内紧凑 AtengArtifactCard 卡片，一键呼出右侧产物工作台；
 * 3. 同一产物多轮交互下不可变版本链递增 (v1 -> v2)；
 * 4. AtengArtifactSidebar 侧边栏通过 #diff 插槽反转装配 Monaco Diff 编辑器。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import {
  AtengAiChat,
  AtengArtifactSidebar,
  useAiChat,
  type StarterPrompt,
} from '@atengk/ai-chat-vue';
import { AtengCodeDiffEditor } from '@atengk/code-editor-vue';
import { simulateAiStream } from '../mock/mockStream';

const starterPrompts: StarterPrompt[] = [
  {
    icon: '📦',
    title: '生成 Vue 用户卡片 (v1)',
    description: '生成基础用户资料展示卡片组件，提取为独立产物',
    prompt: '请为我生成一个 Vue 用户资料卡片组件 (v1 产物)',
  },
  {
    icon: '🚀',
    title: '升级 v2 版本对比 Diff',
    description: '在原有组件基础上增加徽章动效与关注切换，比对代码差异',
    prompt: '请迭代升级该组件 (v2 版本)，增加头像、关注切换与 Diff 比对',
  },
];

const {
  messages,
  isStreaming,
  sendMessage,
  abort,
  clearMessages,
  activeArtifact,
  activeArtifactVersion,
  isArtifactSidebarOpen,
  openArtifact,
} = useAiChat({
  streamHandler: simulateAiStream,
});

const onSend = (content: string): void => {
  void sendMessage(content);
};
</script>

<template>
  <div class="scenario-panel" :class="{ 'scenario-panel--with-sidebar': isArtifactSidebarOpen }">
    <div class="scenario-banner">
      <div class="banner-text">
        <h3 class="banner-title">场景六：Artifacts 多版本管理与 Code Diff 比对</h3>
        <p class="banner-desc">
          提取大模型生成的独立代码/图表产物，支持不可变版本追溯、侧边栏独立工作台与 Monaco Diff
          差异比对。
        </p>
      </div>
      <div class="banner-actions">
        <el-button size="small" type="danger" plain @click="clearMessages">🗑️ 清空重置</el-button>
      </div>
    </div>

    <div class="workbench-layout">
      <div class="chat-wrapper">
        <AtengAiChat
          :messages="messages"
          :is-streaming="isStreaming"
          :starter-prompts="starterPrompts"
          height="560px"
          placeholder="点击上方引导生成 v1 产物，随后点击升级并打开侧边栏比对版本 Diff..."
          @send="onSend"
          @stop="abort"
          @open-artifact="art => openArtifact(art.identifier)"
          @click-suggested-question="q => onSend(q)"
        />
      </div>

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

.workbench-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.scenario-panel--with-sidebar .workbench-layout {
  grid-template-columns: 1fr auto;
}

.chat-wrapper {
  background: var(--el-bg-color, #ffffff);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}
</style>
