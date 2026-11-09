<script setup lang="ts">
/**
 * sample-grid-layout-vue 展厅顶层应用框架。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref } from 'vue';
import BasicDashboard from './views/BasicDashboard.vue';

const activeTab = ref('basic');
const isDark = ref(false);

const toggleDark = () => {
  isDark.value = !isDark.value;
  if (isDark.value) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};
</script>

<template>
  <div class="sample-layout">
    <header class="sample-header">
      <div class="header-left">
        <h1 class="header-title">@atengk/grid-layout-vue 展厅</h1>
        <el-tag type="success" size="small">Port: 3013</el-tag>
        <span class="header-desc">可拖拽网格布局与千人千面工作台引擎自验展厅</span>
      </div>
      <div class="header-right">
        <el-button size="small" @click="toggleDark">
          {{ isDark ? '🌙 暗黑模式' : '☀️ 明亮模式' }}
        </el-button>
      </div>
    </header>

    <main class="sample-main">
      <el-tabs v-model="activeTab" type="border-card">
        <el-tab-pane label="1. 基础栅格与双向 JSON" name="basic">
          <BasicDashboard />
        </el-tab-pane>
        <el-tab-pane label="2. 排版物理与自由浮动" name="physics" disabled>
          <div class="placeholder-pane">待切片 #305 竣工接入</div>
        </el-tab-pane>
        <el-tab-pane label="3. ECharts 驾驶舱联动" name="cockpit" disabled>
          <div class="placeholder-pane">待切片 #308 竣工接入</div>
        </el-tab-pane>
        <el-tab-pane label="4. 外部物料抽屉拖拽" name="palette" disabled>
          <div class="placeholder-pane">待切片 #307 竣工接入</div>
        </el-tab-pane>
        <el-tab-pane label="5. 企业级治理与容灾" name="governance" disabled>
          <div class="placeholder-pane">待切片 #310 竣工接入</div>
        </el-tab-pane>
      </el-tabs>
    </main>
  </div>
</template>

<style>
body {
  margin: 0;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: var(--el-bg-color-page, #f5f7fa);
  color: var(--el-text-color-primary, #303133);
}
</style>

<style scoped>
.sample-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.sample-header {
  height: 60px;
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-title {
  font-size: 18px;
  margin: 0;
  font-weight: 600;
}

.header-desc {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.sample-main {
  flex: 1;
  padding: 16px 24px;
}

.placeholder-pane {
  padding: 40px;
  text-align: center;
  color: var(--el-text-color-secondary);
}
</style>
