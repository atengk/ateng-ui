<script setup lang="ts">
/**
 * sample-ai-chat-vue 自验展厅应用入口。
 *
 * 遵循 ADR-0039 与 docs/agents/documentation-specification.md 规范：
 * 1. 消除单文件臃肿红线，在 src/scenarios/ 下解耦为 8 大自洽业务场景看板；
 * 2. 顶层提供场景导航 Tab 栏（带端口 3011 标识与 L2 扩展层定位）；
 * 3. 支持深色与浅色模式无损热切换；
 * 4. 离线全真模拟驱动，零外部网络强依赖。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref } from 'vue';
import BasicStreamScenario from './scenarios/BasicStreamScenario.vue';
import ReasoningStreamScenario from './scenarios/ReasoningStreamScenario.vue';
import RichRenderScenario from './scenarios/RichRenderScenario.vue';
import HighThroughputScenario from './scenarios/HighThroughputScenario.vue';
import ToolApprovalScenario from './scenarios/ToolApprovalScenario.vue';
import ArtifactDiffScenario from './scenarios/ArtifactDiffScenario.vue';
import MultiModalScenario from './scenarios/MultiModalScenario.vue';
import SessionManagementScenario from './scenarios/SessionManagementScenario.vue';

const activeTab = ref<string>('basic');
const isDark = ref<boolean>(false);

const toggleDarkMode = (val: boolean): void => {
  isDark.value = val;
  if (val) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};
</script>

<template>
  <div class="sample-app" :class="{ dark: isDark }">
    <header class="sample-header">
      <div class="header-left">
        <h1 class="logo">🤖 @atengk/ai-chat-vue 体验展厅</h1>
        <el-tag type="info" size="small" effect="plain">L2 专用能力扩展层 · 端口 3011</el-tag>
        <el-tag type="success" size="small" effect="plain">全真离线 Mock 驱动</el-tag>
      </div>

      <div class="header-right">
        <el-switch
          v-model="isDark"
          active-text="深色模式 (dark)"
          inactive-text="浅色模式 (light)"
          @change="toggleDarkMode"
        />
      </div>
    </header>

    <main class="sample-main">
      <el-tabs v-model="activeTab" type="border-card">
        <el-tab-pane label="场景一：基础流式打字机 (Basic)" name="basic">
          <BasicStreamScenario />
        </el-tab-pane>

        <el-tab-pane label="场景二：DeepSeek R1 深度思考链 (Reasoning)" name="reasoning">
          <ReasoningStreamScenario />
        </el-tab-pane>

        <el-tab-pane label="场景三：KaTeX 数学与 Mermaid 架构图 (RichRender)" name="rich">
          <RichRenderScenario />
        </el-tab-pane>

        <el-tab-pane label="场景四：高频吞吐与滚动锚定 (Throughput)" name="throughput">
          <HighThroughputScenario />
        </el-tab-pane>

        <el-tab-pane label="场景五：MCP 工具调用与人机审批 (HITL)" name="hitl">
          <ToolApprovalScenario />
        </el-tab-pane>

        <el-tab-pane label="场景六：Artifacts 多版本 Diff 比对 (Artifacts)" name="artifacts">
          <ArtifactDiffScenario />
        </el-tab-pane>

        <el-tab-pane label="场景七：多模态附件与上传护栏 (MultiModal)" name="multimodal">
          <MultiModalScenario />
        </el-tab-pane>

        <el-tab-pane label="场景八：多会话持久化与 DLP 合规切片 (Session & DLP)" name="session">
          <SessionManagementScenario />
        </el-tab-pane>
      </el-tabs>
    </main>
  </div>
</template>

<style scoped>
.sample-app {
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
  padding: 12px 24px;
  background: var(--el-bg-color, #ffffff);
  border-bottom: 1px solid var(--el-border-color-light, #e2e8f0);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
}

.sample-main {
  padding: 20px 24px;
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

:deep(.el-tabs--border-card) {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

:deep(.el-tabs__content) {
  padding: 20px;
}
</style>
