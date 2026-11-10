<script setup lang="ts">
/**
 * sample-print-vue 展厅顶层应用框架。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref, onMounted, watch } from 'vue';
import DriverDebugView from './views/DriverDebugView.vue';
import StandardSheetsView from './views/StandardSheetsView.vue';
import PaginationView from './views/PaginationView.vue';
import BatchQueueView from './views/BatchQueueView.vue';

const activeTab = ref('batch-queue');
const isDark = ref(false);

onMounted(() => {
  const hash = window.location.hash.replace('#/', '').replace('#', '');
  if (
    hash === 'batch-queue' ||
    hash === 'batch' ||
    window.location.pathname.includes('/batch-queue')
  ) {
    activeTab.value = 'batch-queue';
  } else if (hash === 'pagination' || window.location.pathname.includes('/pagination')) {
    activeTab.value = 'pagination';
  } else if (hash === 'sheets') {
    activeTab.value = 'sheets';
  } else if (hash === 'drivers') {
    activeTab.value = 'drivers';
  }
});

watch(activeTab, tab => {
  window.location.hash = `#/${tab}`;
});

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
        <h1 class="header-title">@atengk/print-vue 展厅</h1>
        <el-tag type="success" size="small">Port: 3014</el-tag>
        <span class="header-desc">企业级多驱动静默打印调度与精准单据排版自验展厅</span>
      </div>
      <div class="header-right">
        <el-button size="small" @click="toggleDark">
          {{ isDark ? '🌙 暗黑模式' : '☀️ 明亮模式' }}
        </el-button>
      </div>
    </header>

    <main class="sample-main">
      <el-tabs v-model="activeTab" type="border-card">
        <el-tab-pane label="1. 多驱动与样式保真调试" name="drivers">
          <DriverDebugView />
        </el-tab-pane>
        <el-tab-pane label="2. 多规格纸张与排版仿真" name="sheets">
          <StandardSheetsView />
        </el-tab-pane>
        <el-tab-pane label="3. 长单据动态分页防撕裂" name="pagination">
          <PaginationView />
        </el-tab-pane>
        <el-tab-pane label="4. 批量并发队列调度大盘" name="batch-queue">
          <BatchQueueView />
        </el-tab-pane>
      </el-tabs>
    </main>
  </div>
</template>

<style scoped>
.sample-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f1f5f9;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

.sample-header {
  height: 60px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
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
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.header-desc {
  font-size: 13px;
  color: #64748b;
  margin-left: 8px;
}

.sample-main {
  flex: 1;
  padding: 20px 24px;
}
</style>
