<script setup lang="ts">
/**
 * sample-code-editor-vue 自验展厅应用入口。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { ref } from 'vue';
import BasicCodeEditorScenario from './scenarios/BasicCodeEditorScenario.vue';
import SqlFormattingScenario from './scenarios/SqlFormattingScenario.vue';
import JsonSchemaValidationScenario from './scenarios/JsonSchemaValidationScenario.vue';
import AuditReadOnlyScenario from './scenarios/AuditReadOnlyScenario.vue';
import DialogTabsLifecycleScenario from './scenarios/DialogTabsLifecycleScenario.vue';

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
        <h1 class="logo">⚡ ateng-ui / code-editor-vue 自验展厅</h1>
        <el-tag type="info" size="small" effect="plain">L2 专用能力扩展层 · 端口 3008</el-tag>
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
        <el-tab-pane label="场景一：基础代码编辑与常用语言 (Basic)" name="basic">
          <BasicCodeEditorScenario />
        </el-tab-pane>
        <el-tab-pane label="场景二：Diff 差异双模比对 (Diff)" name="diff" disabled>
          <div class="placeholder">等待后续 Ticket 交付...</div>
        </el-tab-pane>
        <el-tab-pane label="场景三：SQL 智能补全与美化 (SQL)" name="sql">
          <SqlFormattingScenario />
        </el-tab-pane>
        <el-tab-pane label="场景四：JSON Schema 语法校验 (JSON)" name="json">
          <JsonSchemaValidationScenario />
        </el-tab-pane>
        <el-tab-pane label="场景五：只读审计与行高亮 (Audit)" name="audit">
          <AuditReadOnlyScenario />
        </el-tab-pane>
        <el-tab-pane label="场景六：弹窗与 Tabs 几何自愈 (Lifecycle)" name="lifecycle">
          <DialogTabsLifecycleScenario />
        </el-tab-pane>
      </el-tabs>
    </main>
  </div>
</template>

<style>
body {
  margin: 0;
  padding: 0;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: #f1f5f9;
  color: #1e293b;
}

html.dark body {
  background-color: #0f172a;
  color: #f8fafc;
}
</style>

<style scoped>
.sample-app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.sample-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background-color: #ffffff;
  border-bottom: 1px solid #e2e8f0;
}

.dark .sample-header {
  background-color: #1e293b;
  border-bottom-color: #334155;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.dark .logo {
  color: #f8fafc;
}

.sample-main {
  flex: 1;
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

.placeholder {
  padding: 40px;
  text-align: center;
  color: #94a3b8;
  font-size: 14px;
}
</style>
