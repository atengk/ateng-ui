<script setup lang="ts">
/**
 * sample-editor-vue 自验展厅应用入口。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { ref } from 'vue';
import BasicEditorScenario from './scenarios/BasicEditorScenario.vue';
import TableErgonomicsScenario from './scenarios/TableErgonomicsScenario.vue';
import AssetUploadScenario from './scenarios/AssetUploadScenario.vue';
import SlashAndBubbleScenario from './scenarios/SlashAndBubbleScenario.vue';
import FormValidationScenario from './scenarios/FormValidationScenario.vue';
import DialogReadOnlyScenario from './scenarios/DialogReadOnlyScenario.vue';

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
        <h1 class="logo">⚡ ateng-ui / editor-vue 自验展厅</h1>
        <el-tag type="success" size="small" effect="plain">L2 专用能力扩展层 · 端口 3009</el-tag>
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
        <el-tab-pane label="场景一：基础现代富文本编辑 (Basic)" name="basic">
          <BasicEditorScenario />
        </el-tab-pane>
        <el-tab-pane label="场景二：表格操控与列宽拖拽 (Table)" name="table">
          <TableErgonomicsScenario />
        </el-tab-pane>
        <el-tab-pane label="场景三：媒体上传与骨架占位 (Upload)" name="upload">
          <AssetUploadScenario />
        </el-tab-pane>
        <el-tab-pane label="场景四：选区气泡与斜杠命令 (Slash & Bubble)" name="slash">
          <SlashAndBubbleScenario />
        </el-tab-pane>
        <el-tab-pane label="场景五：表单联动与字数硬限制 (Form)" name="form">
          <FormValidationScenario />
        </el-tab-pane>
        <el-tab-pane label="场景六：弹窗挂载自愈与阅读器模式 (Dialog)" name="dialog">
          <DialogReadOnlyScenario />
        </el-tab-pane>
      </el-tabs>
    </main>
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
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background-color: var(--el-bg-color, #ffffff);
  border-bottom: 1px solid var(--el-border-color-light, #e4e7ed);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: var(--el-text-color-primary, #303133);
}

.sample-main {
  flex: 1 1 auto;
  padding: 20px 24px;
}

.placeholder-tip {
  padding: 40px;
  text-align: center;
  color: var(--el-text-color-secondary, #909399);
  font-size: 14px;
}
</style>
