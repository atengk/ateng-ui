<script setup lang="ts">
/**
 * sample-flow-vue 自验展厅主应用入口。
 *
 * 遵循工单 #261 与 documentation-specification.md 规范：
 * 1. 消除单文件 2607 行严重臃肿红线，在 src/scenarios/ 下解耦为 8 大自洽业务场景看板；
 * 2. 顶层提供场景导航 Tab 栏（带端口 3007 标识与 L2 扩展层定位）；
 * 3. 使用 v-if 动态渲染，确保切换场景时前序 LogicFlow 实例通过 onUnmounted 执行确定性销毁；
 * 4. 支持 URL Query (?scenario=xxx) 双向同步与状态恢复。
 *
 * @author Ateng
 * @since 2026-11-05
 */

import { ref, computed, onMounted, type Component } from 'vue';
import DesignerBasicScenario from './scenarios/DesignerBasicScenario.vue';
import PropertyPanelSlotScenario from './scenarios/PropertyPanelSlotScenario.vue';
import ViewerAuditScenario from './scenarios/ViewerAuditScenario.vue';
import VueNodeCustomScenario from './scenarios/VueNodeCustomScenario.vue';
import ValidatorLayoutScenario from './scenarios/ValidatorLayoutScenario.vue';
import BpmnAdapterScenario from './scenarios/BpmnAdapterScenario.vue';
import SnapshotWatermarkScenario from './scenarios/SnapshotWatermarkScenario.vue';
import RulesEngineDagScenario from './scenarios/RulesEngineDagScenario.vue';

interface ScenarioMeta {
  id: string;
  name: string;
  icon: string;
  component: Component;
}

const scenarios: ScenarioMeta[] = [
  { id: 'designer', name: '基础流程编排设计器', icon: '🎨', component: DesignerBasicScenario },
  { id: 'property', name: '属性抽屉与表单插槽', icon: '📝', component: PropertyPanelSlotScenario },
  { id: 'viewer', name: '运行态工单流转追踪', icon: '🔍', component: ViewerAuditScenario },
  { id: 'vue-node', name: 'Vue SFC 卡片物料扩展', icon: '⭐', component: VueNodeCustomScenario },
  {
    id: 'validator',
    name: '图论静态校验与 DAG 排版',
    icon: '🛡️',
    component: ValidatorLayoutScenario,
  },
  { id: 'bpmn', name: 'BPMN 2.0 协议双向转译', icon: '📄', component: BpmnAdapterScenario },
  {
    id: 'snapshot',
    name: '全景快照与防泄密水印',
    icon: '🖼️',
    component: SnapshotWatermarkScenario,
  },
  { id: 'rules', name: '低代码规则引擎 DAG 拓扑', icon: '⚙️', component: RulesEngineDagScenario },
];

const activeScenarioId = ref<string>('designer');

const currentScenarioComponent = computed<Component>(() => {
  const item = scenarios.find(s => s.id === activeScenarioId.value);
  return item ? item.component : DesignerBasicScenario;
});

const handleSelectScenario = (id: string) => {
  activeScenarioId.value = id;
  const url = new URL(window.location.href);
  url.searchParams.set('scenario', id);
  window.history.replaceState({}, '', url.toString());
};

onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  const initial = params.get('scenario');
  if (initial && scenarios.some(s => s.id === initial)) {
    activeScenarioId.value = initial;
  }
});
</script>

<template>
  <div class="sample-container">
    <header class="sample-header">
      <div class="header-left">
        <span class="badge">L2 专用能力扩展</span>
        <h1 class="title">@atengk/flow-vue 流程设计与流转展厅</h1>
        <span class="port-badge">固定端口: 3007</span>
      </div>

      <nav class="scenario-nav" aria-label="8大场景导航">
        <button
          v-for="s in scenarios"
          :key="s.id"
          type="button"
          class="nav-tab"
          :class="{ 'nav-tab--active': activeScenarioId === s.id }"
          @click="handleSelectScenario(s.id)"
        >
          <span class="tab-icon">{{ s.icon }}</span>
          <span class="tab-name">{{ s.name }}</span>
        </button>
      </nav>
    </header>

    <main class="sample-content">
      <!-- 采用 v-if 动态组件，确保切换时前序组件触发 onUnmounted 彻底执行 lf.destroy() 清理 -->
      <component :is="currentScenarioComponent" :key="activeScenarioId" />
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
  padding: 10px 16px;
  gap: 10px;
}

.sample-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 14px;
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
  font-size: 15px;
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
  border: 1px solid #e2e8f0;
  background-color: #f8fafc;
  color: #475569;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.nav-tab:hover {
  background-color: #f1f5f9;
  color: #1e293b;
  border-color: #cbd5e1;
}

.nav-tab--active {
  background-color: #3b82f6;
  color: #ffffff;
  border-color: #3b82f6;
  font-weight: 600;
}

.nav-tab--active:hover {
  background-color: #2563eb;
  color: #ffffff;
}

.tab-icon {
  font-size: 13px;
}

.sample-content {
  flex: 1;
  overflow: hidden;
}
</style>
