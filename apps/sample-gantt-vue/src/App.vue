<script setup lang="ts">
/**
 * sample-gantt-vue 展厅顶层统领应用。
 *
 * 组织四大分层业务交互场景看板并支持场景 Tab 切换与宿主全局暗黑切换。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { ref } from 'vue';
import { GANTT_VUE_VERSION } from '@atengk/gantt-vue';

type ScenarioTab = 'agile' | 'baseline' | 'scale' | 'modal';

const activeTab = ref<ScenarioTab>('agile');
const isDarkMode = ref(false);

const tabs: Array<{ key: ScenarioTab; label: string; desc: string }> = [
  {
    key: 'agile',
    label: '敏捷研发 WBS 排程',
    desc: '树形折叠、FS/SS 依赖连线、里程碑、单元格插槽',
  },
  {
    key: 'baseline',
    label: '工程排产与基线偏差',
    desc: '计划基线对比、工期延误标红、今天指示垂线',
  },
  { key: 'scale', label: '多粒度缩放与控制', desc: '日/周/月/季/年切换、平滑定位、左右分栏拖拽' },
  {
    key: 'modal',
    label: '脱壳模态弹窗与导出',
    desc: 'Teleport 全屏排程、0x0 自愈、Retina 高清图片导出',
  },
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
  <div class="sample-gantt-app">
    <!-- 展厅全局顶栏 -->
    <header class="app-header">
      <div class="header-left">
        <h1 class="app-title">@atengk/gantt-vue</h1>
        <span class="app-subtitle"
          >高性能甘特图与资源排程自验展厅 (Port 3018 / v{{ GANTT_VUE_VERSION }})</span
        >
      </div>
      <div class="header-actions">
        <button class="theme-toggle-btn" @click="toggleDarkMode">
          {{ isDarkMode ? '☀️ 切换明亮' : '🌙 切换暗黑' }}
        </button>
      </div>
    </header>

    <!-- 场景切换导航 -->
    <nav class="scenario-nav">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="nav-tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        <span class="tab-label">{{ tab.label }}</span>
        <span class="tab-desc">{{ tab.desc }}</span>
      </button>
    </nav>

    <!-- 主展示区 -->
    <main class="app-main">
      <div class="placeholder-card">
        <h2>{{ tabs.find(t => t.key === activeTab)?.label }}</h2>
        <p>{{ tabs.find(t => t.key === activeTab)?.desc }}</p>
        <div class="placeholder-meta">
          <span>子包脚手架已就绪</span>
          <span>基础类型契约与 VisActor Canvas 引擎已对齐</span>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.sample-gantt-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--at-gantt-bg, #ffffff);
  color: var(--at-gantt-text-color, #1f2937);
  box-sizing: border-box;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background-color: var(--at-gantt-header-bg, #f9fafb);
  border-bottom: 1px solid var(--at-gantt-border-color, #e5e7eb);
}

.app-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.app-subtitle {
  margin-left: 12px;
  font-size: 0.875rem;
  color: var(--at-gantt-text-muted, #6b7280);
}

.theme-toggle-btn {
  padding: 6px 14px;
  font-size: 0.875rem;
  border-radius: 6px;
  border: 1px solid var(--at-gantt-border-color, #e5e7eb);
  background: var(--at-gantt-bg, #ffffff);
  color: var(--at-gantt-text-color, #1f2937);
  cursor: pointer;
}

.scenario-nav {
  display: flex;
  gap: 8px;
  padding: 12px 24px;
  background: var(--at-gantt-header-bg, #f9fafb);
  border-bottom: 1px solid var(--at-gantt-border-color, #e5e7eb);
}

.nav-tab-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 8px 16px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  color: inherit;
  transition: all 0.2s ease;
}

.nav-tab-btn:hover {
  background: rgba(0, 0, 0, 0.04);
}

.nav-tab-btn.active {
  background: var(--at-gantt-bg, #ffffff);
  border-color: var(--at-gantt-border-color, #e5e7eb);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.tab-label {
  font-weight: 600;
  font-size: 0.9375rem;
}

.tab-desc {
  font-size: 0.75rem;
  color: var(--at-gantt-text-muted, #6b7280);
  margin-top: 2px;
}

.app-main {
  flex: 1;
  padding: 24px;
  overflow: auto;
}

.placeholder-card {
  padding: 32px;
  border: 1px dashed var(--at-gantt-border-color, #e5e7eb);
  border-radius: 12px;
  text-align: center;
}

.placeholder-meta {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 16px;
  font-size: 0.875rem;
  color: var(--at-gantt-text-muted, #6b7280);
}
</style>
