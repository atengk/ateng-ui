<script setup lang="ts">
/**
 * sample-spreadsheet-vue 展厅顶层统领应用。
 *
 * 组织四大分层业务交互场景看板并支持场景 Tab 切换与宿主全局暗黑切换。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref } from 'vue';
import FullWorkbookView from './views/FullWorkbookView.vue';
import CompactGridView from './views/CompactGridView.vue';
import ReadOnlyAuditView from './views/ReadOnlyAuditView.vue';
import ModalDialogView from './views/ModalDialogView.vue';

type ScenarioTab = 'full' | 'compact' | 'readonly' | 'modal';

const activeTab = ref<ScenarioTab>('full');
const isDarkMode = ref(false);

const tabs: Array<{ key: ScenarioTab; label: string; desc: string }> = [
  { key: 'full', label: '全功能工作簿', desc: '公式联动、多 Sheet、快照导出' },
  { key: 'compact', label: '紧凑行数据填报', desc: 'v-model:data 双向绑定、隐藏字段保全' },
  { key: 'readonly', label: '只读审计报表', desc: '禁用编辑、选区高亮、UTF-8 BOM CSV' },
  { key: 'modal', label: '脱壳模态弹窗', desc: 'Teleport 驱动、全屏切换、0x0 自愈' },
];

/**
 * 切换宿主 HTML 暗黑模式。
 */
const toggleDarkMode = (): void => {
  isDarkMode.value = !isDarkMode.value;
  if (isDarkMode.value) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};
</script>

<template>
  <div class="sample-spreadsheet-app">
    <!-- 展厅全局顶栏 -->
    <header class="app-header">
      <div class="header-left">
        <h1 class="app-title">@atengk/spreadsheet-vue</h1>
        <span class="app-subtitle">在线电子表格与批量填报自验展厅 (Port 3017)</span>
      </div>

      <div class="header-right">
        <button class="theme-toggle-btn" type="button" @click="toggleDarkMode">
          {{ isDarkMode ? '☀️ 日间模式' : '🌙 暗黑模式' }}
        </button>
      </div>
    </header>

    <!-- 场景导航 Tab 栏 -->
    <nav class="scenario-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-item"
        :class="{ 'tab-item--active': activeTab === tab.key }"
        type="button"
        @click="activeTab = tab.key"
      >
        <span class="tab-label">{{ tab.label }}</span>
        <span class="tab-desc">{{ tab.desc }}</span>
      </button>
    </nav>

    <!-- 主展示区 -->
    <main class="scenario-content">
      <FullWorkbookView v-if="activeTab === 'full'" />
      <CompactGridView v-else-if="activeTab === 'compact'" />
      <ReadOnlyAuditView v-else-if="activeTab === 'readonly'" />
      <ModalDialogView v-else-if="activeTab === 'modal'" />
    </main>
  </div>
</template>

<style>
/* 展厅全局基础重置 */
body {
  margin: 0;
  padding: 0;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: #f5f7fa;
  color: #303133;
  transition:
    background-color 0.2s,
    color 0.2s;
}

html.dark body {
  background-color: #0a0a0a;
  color: #e5eaf3;
}
</style>

<style scoped>
.sample-spreadsheet-app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background-color: #ffffff;
  border-bottom: 1px solid #e4e7ed;
}

html.dark .app-header {
  background-color: #141414;
  border-bottom-color: #363637;
}

.app-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #409eff;
}

.app-subtitle {
  font-size: 13px;
  color: #909399;
  margin-left: 12px;
}

.theme-toggle-btn {
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid #dcdfe6;
  background-color: transparent;
  cursor: pointer;
  font-size: 13px;
  color: inherit;
  transition: all 0.2s;
}

.theme-toggle-btn:hover {
  border-color: #409eff;
  color: #409eff;
}

.scenario-tabs {
  display: flex;
  gap: 12px;
  padding: 16px 24px 0;
  overflow-x: auto;
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 12px 18px;
  background-color: #ffffff;
  border: 1px solid #e4e7ed;
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  min-width: 180px;
  transition: all 0.2s;
}

html.dark .tab-item {
  background-color: #141414;
  border-color: #363637;
}

.tab-item:hover {
  border-color: #c0c4cc;
}

.tab-item--active {
  background-color: #409eff !important;
  border-color: #409eff !important;
  color: #ffffff !important;
}

.tab-label {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.tab-desc {
  font-size: 11px;
  color: #909399;
}

.tab-item--active .tab-desc {
  color: #ecf5ff;
}

.scenario-content {
  flex: 1;
  padding: 20px 24px 32px;
}
</style>
