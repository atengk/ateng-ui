<script setup lang="ts">
/**
 * sample-echarts-vue 自验展厅主导航入口。
 *
 * 采用场景化架构解耦：集中编排 6 大核心领域场景看板、暗黑模式无损热切换与全局事件日志流。
 *
 * @author Ateng
 * @since 2026-11-05
 */

import { ref } from 'vue';
import ContainerScenario from './scenarios/ContainerScenario.vue';
import TrendScenario from './scenarios/TrendScenario.vue';
import DonutFunnelScenario from './scenarios/DonutFunnelScenario.vue';
import GaugeRadarScenario from './scenarios/GaugeRadarScenario.vue';
import MapDrillDownScenario from './scenarios/MapDrillDownScenario.vue';
import LifecycleAdvancedScenario from './scenarios/LifecycleAdvancedScenario.vue';

type ScenarioType = 'container' | 'trend' | 'donutFunnel' | 'gaugeRadar' | 'map' | 'lifecycle';

const activeScenario = ref<ScenarioType>('container');
const isDark = ref(false);
const isSidebarCollapsed = ref(false);
const eventLogs = ref<string[]>([]);
const isLogExpanded = ref(true);

const scenarioList: Array<{ key: ScenarioType; icon: string; title: string; subtitle: string }> = [
  { key: 'container', icon: '📊', title: '通用表现容器', subtitle: '多态遮罩与几何感知自愈' },
  { key: 'trend', icon: '📈', title: '经营趋势看板', subtitle: '双Y轴·柱线混合·时序缩放' },
  {
    key: 'donutFunnel',
    icon: '🍩',
    title: '占比与转化漏斗',
    subtitle: '自动求和指标卡·双轨转化率',
  },
  {
    key: 'gaugeRadar',
    icon: '🎯',
    title: '达成率与能力画像',
    subtitle: '多段色阶仪表·渐变多维雷达',
  },
  { key: 'map', icon: '🗺️', title: '行政区划地图下钻', subtitle: '全国-省-市三级下钻·GeoSPI' },
  {
    key: 'lifecycle',
    icon: '⚡',
    title: '高级生命周期与导出',
    subtitle: '0x0弹窗自愈·脱壳全屏·3x导出',
  },
];

const toggleDarkMode = () => {
  isDark.value = !isDark.value;
  if (isDark.value) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  appendLog(`系统亮暗模式热切换为: ${isDark.value ? 'Dark (暗色)' : 'Light (浅色)'}`);
};

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
  appendLog(
    `侧边栏折叠状态切换为: ${isSidebarCollapsed.value ? '已折叠 (64px)' : '已展开 (220px)'}，模拟外层容器重排`,
  );
};

const appendLog = (msg: string) => {
  const time = new Date().toLocaleTimeString();
  eventLogs.value.unshift(`[${time}] ${msg}`);
  if (eventLogs.value.length > 30) {
    eventLogs.value.pop();
  }
};
</script>

<template>
  <div class="sample-app" :class="{ 'dark-theme': isDark }">
    <!-- 顶部 Header -->
    <header class="app-header">
      <div class="header-left">
        <h1 class="logo">⚡ ateng-ui / echarts-vue</h1>
        <span class="badge badge-l2">L2 专用能力扩展层</span>
        <span class="badge badge-port">端口 3006</span>
      </div>
      <div class="header-right">
        <button class="btn btn-secondary" @click="toggleSidebar">
          {{ isSidebarCollapsed ? '📂 展开侧边 (220px)' : '📁 折叠侧边 (64px)' }}
        </button>
        <button class="btn btn-theme" @click="toggleDarkMode">
          {{ isDark ? '☀️ 浅色模式' : '🌙 暗黑模式' }}
        </button>
      </div>
    </header>

    <!-- 顶部 6 大场景卡片导航栏 -->
    <nav class="scenario-nav" aria-label="场景看板导航">
      <button
        v-for="item in scenarioList"
        :key="item.key"
        type="button"
        class="nav-tab-item"
        :class="{ 'is-active': activeScenario === item.key }"
        @click="activeScenario = item.key"
      >
        <span class="tab-icon">{{ item.icon }}</span>
        <div class="tab-meta">
          <span class="tab-title">{{ item.title }}</span>
          <span class="tab-subtitle">{{ item.subtitle }}</span>
        </div>
      </button>
    </nav>

    <!-- 主展示区布局（支持侧边栏折叠自愈验证） -->
    <div class="main-layout" :class="{ 'is-collapsed': isSidebarCollapsed }">
      <aside class="sidebar-mock">
        <div class="sidebar-title">
          <span>📐</span>
          <span v-if="!isSidebarCollapsed">业务中台导航</span>
        </div>
        <div v-if="!isSidebarCollapsed" class="sidebar-tip">
          折叠可验证容器 ResizeObserver 响应式自适应。
        </div>
      </aside>

      <main class="scenario-content">
        <ContainerScenario v-if="activeScenario === 'container'" @log="appendLog" />
        <TrendScenario v-else-if="activeScenario === 'trend'" @log="appendLog" />
        <DonutFunnelScenario v-else-if="activeScenario === 'donutFunnel'" @log="appendLog" />
        <GaugeRadarScenario v-else-if="activeScenario === 'gaugeRadar'" @log="appendLog" />
        <MapDrillDownScenario v-else-if="activeScenario === 'map'" @log="appendLog" />
        <LifecycleAdvancedScenario v-else-if="activeScenario === 'lifecycle'" @log="appendLog" />
      </main>
    </div>

    <!-- 底部可折叠事件日志终端 -->
    <footer class="app-footer">
      <div class="log-terminal">
        <div class="terminal-header" @click="isLogExpanded = !isLogExpanded">
          <span class="terminal-title"
            >🖥️ 实时交互与多态遮罩调度日志流 ({{ eventLogs.length }})</span
          >
          <span class="terminal-toggle">{{ isLogExpanded ? '收起 ▼' : '展开 ▲' }}</span>
        </div>
        <ul v-show="isLogExpanded" class="terminal-body">
          <li v-for="(log, idx) in eventLogs" :key="idx">{{ log }}</li>
          <li v-if="eventLogs.length === 0" class="log-empty">
            暂无事件触发，操作各场景组件将实时在此捕获
          </li>
        </ul>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.sample-app {
  max-width: 1360px;
  margin: 0 auto;
  padding: 20px 24px;
  color: #1f2937;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  transition:
    background-color 0.3s,
    color 0.3s;
}

.sample-app.dark-theme {
  background-color: #141414;
  color: #e5eaf3;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.dark-theme .app-header {
  border-bottom-color: #2c2d2e;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  font-size: 22px;
  font-weight: 700;
  margin: 0;
}

.badge {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 9999px;
  color: #fff;
}

.badge-l2 {
  background-color: #3b82f6;
}
.badge-port {
  background-color: #10b981;
}

.header-right {
  display: flex;
  gap: 10px;
}

.scenario-nav {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.nav-tab-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.dark-theme .nav-tab-item {
  background: #1d1e1f;
  border-color: #2c2d2e;
  color: #a3a6ad;
}

.nav-tab-item:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.dark-theme .nav-tab-item:hover {
  background: #2a2b2c;
}

.nav-tab-item.is-active {
  background: #eff6ff;
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px #3b82f6;
}

.dark-theme .nav-tab-item.is-active {
  background: #1e293b;
  border-color: #60a5fa;
  color: #fff;
}

.tab-icon {
  font-size: 22px;
}

.tab-meta {
  display: flex;
  flex-direction: column;
}

.tab-title {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.dark-theme .tab-title {
  color: #f3f4f6;
}

.tab-subtitle {
  font-size: 11px;
  color: #6b7280;
  margin-top: 2px;
}

.dark-theme .tab-subtitle {
  color: #9ca3af;
}

.main-layout {
  display: flex;
  gap: 20px;
  margin-bottom: 24px;
  align-items: flex-start;
}

.sidebar-mock {
  width: 220px;
  flex-shrink: 0;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.dark-theme .sidebar-mock {
  background: #1d1e1f;
  border-color: #2c2d2e;
}

.main-layout.is-collapsed .sidebar-mock {
  width: 64px;
  padding: 16px 8px;
  text-align: center;
}

.sidebar-title {
  font-weight: 600;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  white-space: nowrap;
}

.sidebar-tip {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.5;
}

.dark-theme .sidebar-tip {
  color: #9ca3af;
}

.scenario-content {
  flex: 1;
  min-width: 0;
}

.app-footer {
  margin-top: 24px;
}

.log-terminal {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.dark-theme .log-terminal {
  background: #1d1e1f;
  border-color: #2c2d2e;
}

.terminal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: #f3f4f6;
  border-bottom: 1px solid #e5e7eb;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}

.dark-theme .terminal-header {
  background: #191a1b;
  border-bottom-color: #2c2d2e;
}

.terminal-toggle {
  font-size: 12px;
  color: #6b7280;
}

.terminal-body {
  list-style: none;
  padding: 10px 16px;
  margin: 0;
  max-height: 140px;
  overflow-y: auto;
  font-family: monospace;
  font-size: 12px;
}

.terminal-body li {
  padding: 3px 0;
  color: #4b5563;
  border-bottom: 1px dashed #e5e7eb;
}

.dark-theme .terminal-body li {
  color: #9ca3af;
  border-bottom-color: #2c2d2e;
}

.log-empty {
  color: #9ca3af;
  padding: 8px 0;
}

.btn {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.btn-secondary {
  background-color: #f3f4f6;
  color: #374151;
  border-color: #d1d5db;
}
.btn-secondary:hover {
  background-color: #e5e7eb;
}

:global(.dark) .btn-secondary {
  background-color: #1f2022;
  color: #e5eaf3;
  border-color: #363637;
}

.btn-theme {
  background-color: #4f46e5;
  color: #fff;
}
.btn-theme:hover {
  background-color: #4338ca;
}
</style>
