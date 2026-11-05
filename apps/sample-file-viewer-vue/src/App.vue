<script setup lang="ts">
/**
 * sample-file-viewer-vue 自验展厅主应用入口。
 *
 * 遵循工单 #254 与 documentation-specification.md 规范：
 * 1. 消除单文件臃肿红线，在 src/scenarios/ 下解耦为 8 大自洽业务场景看板；
 * 2. 顶层提供场景导航 Tab 栏（带端口 3004 标识与 L2 扩展层定位）；
 * 3. 通过动态组件与 KeepAlive 实现流畅的场景自验切换。
 *
 * @author Ateng
 * @since 2026-11-05
 */

import { ref, computed, type Component } from 'vue';
import OfficeDocumentScenario from './scenarios/OfficeDocumentScenario.vue';
import TableOfContentsScenario from './scenarios/TableOfContentsScenario.vue';
import DlpSecurityScenario from './scenarios/DlpSecurityScenario.vue';
import AssetStrategyScenario from './scenarios/AssetStrategyScenario.vue';
import SizeGuardScenario from './scenarios/SizeGuardScenario.vue';
import DiagnosticPasswordScenario from './scenarios/DiagnosticPasswordScenario.vue';
import ModalPreviewScenario from './scenarios/ModalPreviewScenario.vue';
import HeadlessStateScenario from './scenarios/HeadlessStateScenario.vue';

interface ScenarioMeta {
  id: string;
  name: string;
  icon: string;
  component: Component;
}

const scenarios: ScenarioMeta[] = [
  { id: 'office', name: '办公文档渲染与嗅探', icon: '📄', component: OfficeDocumentScenario },
  { id: 'toc', name: 'DOM 大纲与目录联动', icon: '📖', component: TableOfContentsScenario },
  { id: 'dlp', name: '四维 DLP 与防篡改水印', icon: '🛡️', component: DlpSecurityScenario },
  { id: 'asset', name: '三级资产寻址与预设插拔', icon: '🌐', component: AssetStrategyScenario },
  { id: 'sizeguard', name: '百兆内存护栏与进度', icon: '🛑', component: SizeGuardScenario },
  {
    id: 'diagnostic',
    name: '异常诊断与原地解密',
    icon: '🔍',
    component: DiagnosticPasswordScenario,
  },
  { id: 'modal', name: '多模态声明与命令式弹窗', icon: '🪟', component: ModalPreviewScenario },
  { id: 'headless', name: '无头状态机与状态记忆', icon: '⚡', component: HeadlessStateScenario },
];

const activeScenarioId = ref<string>('office');

const currentScenarioComponent = computed<Component>(() => {
  const item = scenarios.find(s => s.id === activeScenarioId.value);
  return item ? item.component : OfficeDocumentScenario;
});
</script>

<template>
  <div class="sample-container">
    <header class="sample-header">
      <div class="header-left">
        <span class="badge">L2 专用能力扩展</span>
        <h1 class="title">@atengk/file-viewer-vue 场景展厅</h1>
        <span class="port-badge">端口: 3004</span>
      </div>

      <nav class="scenario-nav" aria-label="8大场景导航">
        <button
          v-for="s in scenarios"
          :key="s.id"
          type="button"
          class="nav-tab"
          :class="{ 'nav-tab--active': activeScenarioId === s.id }"
          @click="activeScenarioId = s.id"
        >
          <span class="tab-icon">{{ s.icon }}</span>
          <span class="tab-name">{{ s.name }}</span>
        </button>
      </nav>
    </header>

    <main class="sample-content">
      <KeepAlive>
        <component :is="currentScenarioComponent" />
      </KeepAlive>
    </main>
  </div>
</template>

<style scoped>
.sample-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  box-sizing: border-box;
  background-color: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  padding: 12px 20px;
  gap: 10px;
}

.sample-header {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.badge {
  background-color: #e0e7ff;
  color: #4338ca;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
}

.title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.port-badge {
  background-color: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  font-family: monospace;
}

.scenario-nav {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.nav-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid transparent;
  background-color: #f8fafc;
  color: #475569;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.nav-tab:hover {
  background-color: #e2e8f0;
  color: #1e293b;
}

.nav-tab--active {
  background-color: #2563eb;
  color: #ffffff;
  font-weight: 600;
}

.nav-tab--active:hover {
  background-color: #1d4ed8;
  color: #ffffff;
}

.tab-icon {
  font-size: 14px;
}

.sample-content {
  flex: 1;
  min-height: 0;
}
</style>
