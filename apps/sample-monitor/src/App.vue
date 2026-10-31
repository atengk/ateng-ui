<script setup lang="ts">
/**
 * @atengk/monitor 全链路可观测性与异常监控 1:1 自验展厅根界面。
 *
 * @author Ateng
 * @since 2026-10-31
 */

import { ref } from 'vue';
import { ElContainer, ElHeader, ElMain, ElTabs, ElTabPane, ElTag } from 'element-plus';
import FaultPanel from './components/FaultPanel.vue';
import WhiteScreenPanel from './components/WhiteScreenPanel.vue';
import PerformancePanel from './components/PerformancePanel.vue';
import BreadcrumbPanel from './components/BreadcrumbPanel.vue';
import ApmTerminal from './components/ApmTerminal.vue';

const activeTab = ref('fault');
</script>

<template>
  <el-container class="app-layout">
    <el-header class="app-header">
      <div class="header-content">
        <div class="logo-area">
          <span class="logo-title">@atengk/monitor 工业级全链路可观测性自验展厅</span>
          <el-tag type="success" size="small" effect="dark">Port: 3010</el-tag>
          <el-tag type="info" size="small">L0 Infrastructure</el-tag>
        </div>
        <div class="meta-area">
          <span class="meta-tag">Vue 3.5 + Element Plus 2.14</span>
        </div>
      </div>
    </el-header>

    <el-main class="app-main">
      <el-tabs v-model="activeTab" class="demo-tabs" type="border-card">
        <el-tab-pane label="1. 故障注入与异常熔断" name="fault">
          <FaultPanel />
        </el-tab-pane>

        <el-tab-pane label="2. 白屏感知与容器白名单" name="whitescreen">
          <WhiteScreenPanel />
        </el-tab-pane>

        <el-tab-pane label="3. 性能大盘与卡顿感知" name="performance">
          <PerformancePanel />
        </el-tab-pane>

        <el-tab-pane label="4. 行为轨迹与敏感脱敏" name="breadcrumb">
          <BreadcrumbPanel />
        </el-tab-pane>
      </el-tabs>

      <!-- 底部常驻 Mock APM 实时事件接收与 TraceId 回显终端 -->
      <ApmTerminal class="terminal-section" />
    </el-main>
  </el-container>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  background-color: var(--el-bg-color-page);
}
.app-header {
  height: 60px;
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
  display: flex;
  align-items: center;
  padding: 0 24px;
}
.header-content {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.logo-area {
  display: flex;
  align-items: center;
  gap: 12px;
}
.logo-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.meta-area {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.app-main {
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  padding: 20px;
}
.demo-tabs {
  margin-bottom: 24px;
  background: var(--el-bg-color);
  border-radius: 6px;
}
.terminal-section {
  margin-top: 20px;
}
</style>
