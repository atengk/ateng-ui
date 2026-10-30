<script setup lang="ts">
/**
 * sample-editor-vue 自验展厅顶级应用入口。
 *
 * 遵循工单 #195（Phase 1 收官）规范：
 * 1. 顶层 1:1 对齐官方四大编辑器模板一级大导航栏（Simple, Notion-like, DOCX, Agent）；
 * 2. 完善多态门面与各高阶场景开箱即用端到端交互；
 * 3. 将既有 6 大工程极限场景无缝收纳至二级工程自验抽屉，保持 100% 独立回归可用。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { ref } from 'vue';
import SimpleEditorScenario from './scenarios/SimpleEditorScenario.vue';
import NotionEditorScenario from './scenarios/NotionEditorScenario.vue';
import DocxEditorScenario from './scenarios/DocxEditorScenario.vue';
import AgentEditorScenario from './scenarios/AgentEditorScenario.vue';

// 6 大工程极限边界自验场景
import BasicEditorScenario from './scenarios/BasicEditorScenario.vue';
import TableErgonomicsScenario from './scenarios/TableErgonomicsScenario.vue';
import AssetUploadScenario from './scenarios/AssetUploadScenario.vue';
import SlashAndBubbleScenario from './scenarios/SlashAndBubbleScenario.vue';
import FormValidationScenario from './scenarios/FormValidationScenario.vue';
import DialogReadOnlyScenario from './scenarios/DialogReadOnlyScenario.vue';

// 当前激活的一级四大编辑器模板
type TemplateType = 'simple' | 'notion' | 'docx' | 'agent';
const activeTemplate = ref<TemplateType>('simple');

// 工程极限自验抽屉状态与二级 Tab 激活项
const drawerVisible = ref<boolean>(false);
const drawerActiveTab = ref<string>('basic');

// 深色模式热跟随
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
    <!-- 顶部导航栏：1:1 对齐官方顶级排版体验 -->
    <header class="sample-header">
      <div class="header-left">
        <h1 class="logo">⚡ ateng-ui / editor-vue</h1>
        <el-tag type="success" size="small" effect="plain">L2 专用扩展层 · 端口 3009</el-tag>
      </div>

      <!-- 一级四大模板导航栏 -->
      <nav class="template-nav" aria-label="四大编辑器模板一级导航">
        <button
          type="button"
          class="nav-tab-item"
          :class="{ 'is-active': activeTemplate === 'simple' }"
          @click="activeTemplate = 'simple'"
        >
          <span class="tab-icon">📝</span>
          <span class="tab-title">Simple editor</span>
          <span class="tab-subtitle">经典轻量</span>
        </button>

        <button
          type="button"
          class="nav-tab-item"
          :class="{ 'is-active': activeTemplate === 'notion' }"
          @click="activeTemplate = 'notion'"
        >
          <span class="tab-icon">🚀</span>
          <span class="tab-title">Notion-like editor</span>
          <span class="tab-subtitle">知识库白板</span>
        </button>

        <button
          type="button"
          class="nav-tab-item"
          :class="{ 'is-active': activeTemplate === 'docx' }"
          @click="activeTemplate = 'docx'"
        >
          <span class="tab-icon">📄</span>
          <span class="tab-title">DOCX editor</span>
          <span class="tab-badge">Phase 3</span>
        </button>

        <button
          type="button"
          class="nav-tab-item"
          :class="{ 'is-active': activeTemplate === 'agent' }"
          @click="activeTemplate = 'agent'"
        >
          <span class="tab-icon">🤖</span>
          <span class="tab-title">Agent editor</span>
          <span class="tab-badge">Phase 2</span>
        </button>
      </nav>

      <div class="header-right">
        <!-- 6 大工程极限场景收纳抽屉入口 -->
        <el-badge :value="6" type="primary" class="drawer-badge">
          <el-button type="primary" plain size="small" @click="drawerVisible = true">
            🛠️ 工程自验抽屉
          </el-button>
        </el-badge>

        <el-switch
          v-model="isDark"
          active-text="深色"
          inactive-text="浅色"
          @change="toggleDarkMode"
        />
      </div>
    </header>

    <!-- 主展示区域：四大模板无缝秒切 -->
    <main class="sample-main">
      <div v-show="activeTemplate === 'simple'" class="template-view">
        <SimpleEditorScenario />
      </div>

      <div v-show="activeTemplate === 'notion'" class="template-view">
        <NotionEditorScenario />
      </div>

      <div v-show="activeTemplate === 'docx'" class="template-view">
        <DocxEditorScenario />
      </div>

      <div v-show="activeTemplate === 'agent'" class="template-view">
        <AgentEditorScenario />
      </div>
    </main>

    <!-- 二级工程极限自验抽屉：100% 完整收纳 Phase 0 基础底座 6 大极限边界场景 -->
    <el-drawer
      v-model="drawerVisible"
      title="🛠️ 工程极限自验抽屉 (Phase 0 六大基线场景全量回归)"
      size="960px"
      direction="rtl"
      destroy-on-close
    >
      <div class="drawer-header-tip">
        <p>
          本抽屉纳管 Phase 0 基础富文本底座全部 6 大极限工程自验场景。支持表单联动校验、弹窗 0x0
          几何自愈、表格操控与列宽拖拽、媒体资产上传与骨架占位等，100% 端到端全量自洽运行。
        </p>
      </div>

      <el-tabs v-model="drawerActiveTab" type="border-card">
        <el-tab-pane label="场景一：基础富文本 (Basic)" name="basic">
          <BasicEditorScenario />
        </el-tab-pane>
        <el-tab-pane label="场景二：表格操控与列宽 (Table)" name="table">
          <TableErgonomicsScenario />
        </el-tab-pane>
        <el-tab-pane label="场景三：媒体上传与骨架 (Upload)" name="upload">
          <AssetUploadScenario />
        </el-tab-pane>
        <el-tab-pane label="场景四：选区气泡与斜杠 (Slash & Bubble)" name="slash">
          <SlashAndBubbleScenario />
        </el-tab-pane>
        <el-tab-pane label="场景五：表单联动与硬限制 (Form)" name="form">
          <FormValidationScenario />
        </el-tab-pane>
        <el-tab-pane label="场景六：弹窗挂载与阅读态 (Dialog)" name="dialog">
          <DialogReadOnlyScenario />
        </el-tab-pane>
      </el-tabs>
    </el-drawer>
  </div>
</template>

<style>
html.dark {
  color-scheme: dark;
}

body {
  margin: 0;
  padding: 0;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: var(--el-bg-color-page, #f2f3f5);
  color: var(--el-text-color-primary, #303133);
}

.sample-app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.sample-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background-color: var(--el-bg-color, #ffffff);
  border-bottom: 1px solid var(--el-border-color-light, #e4e7ed);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  font-size: 16px;
  font-weight: 700;
  margin: 0;
  color: var(--el-text-color-primary, #303133);
  letter-spacing: -0.2px;
}

/* 一级四大模板导航栏样式 */
.template-nav {
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: var(--el-fill-color-light, #f5f7fa);
  padding: 4px;
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
}

.nav-tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--el-text-color-regular, #606266);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
  user-select: none;
}

.nav-tab-item:hover {
  color: var(--el-color-primary, #409eff);
  background-color: var(--el-fill-color, #e4e7ed);
}

.nav-tab-item.is-active {
  background-color: var(--el-bg-color, #ffffff);
  color: var(--el-color-primary, #409eff);
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.tab-icon {
  font-size: 15px;
}

.tab-title {
  font-size: 13px;
}

.tab-subtitle {
  font-size: 11px;
  color: var(--el-text-color-secondary, #909399);
  margin-left: 2px;
}

.tab-badge {
  font-size: 10px;
  background-color: var(--el-color-warning-light-8, #faecd8);
  color: var(--el-color-warning, #e6a23c);
  padding: 1px 6px;
  border-radius: 10px;
  margin-left: 4px;
  font-weight: 600;
}

.nav-tab-item.is-active .tab-subtitle {
  color: var(--el-color-primary-light-3, #79bbff);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.drawer-badge {
  margin-right: 4px;
}

.sample-main {
  flex: 1 1 auto;
  padding: 24px;
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

.template-view {
  animation: fadeIn 0.25s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0.4;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.drawer-header-tip {
  background-color: var(--el-color-primary-light-9, #ecf5ff);
  border: 1px solid var(--el-color-primary-light-5, #b3d8ff);
  border-radius: 6px;
  padding: 10px 14px;
  margin-bottom: 16px;
  font-size: 13px;
  color: var(--el-color-primary, #409eff);
  line-height: 1.5;
}

.drawer-header-tip p {
  margin: 0;
}
</style>
