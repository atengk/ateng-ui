<script setup lang="ts">
/**
 * sample-form-designer-vue 自验展厅应用入口。
 *
 * 遵循 ADR-0039 与 docs/agents/documentation-specification.md 规范：
 * 1. 消除单文件臃肿红线，在 src/scenarios/ 下解耦业务场景看板；
 * 2. 顶层提供场景导航 Tab 栏（带端口 3012 标识与 L2 扩展层定位）；
 * 3. 支持深色与浅色模式无损热切换；
 * 4. 离线全真模拟驱动，零外部网络强依赖。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref } from 'vue';
import MinimalRendererScenario from './scenarios/MinimalRendererScenario.vue';
import AsyncValidationScenario from './scenarios/AsyncValidationScenario.vue';
import DynamicRuleScenario from './scenarios/DynamicRuleScenario.vue';
import WorkflowSynergyScenario from './scenarios/WorkflowSynergyScenario.vue';
import SubFormScenario from './scenarios/SubFormScenario.vue';
import FormDesignerScenario from './scenarios/FormDesignerScenario.vue';

const activeTab = ref<string>('designer');
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
        <h1 class="logo">📝 @atengk/form-designer-vue 体验展厅</h1>
        <el-tag type="info" size="small" effect="plain">L2 专用能力扩展层 · 端口 3012</el-tag>
        <el-tag type="success" size="small" effect="plain">运行态三段式 AST 驱动</el-tag>
        <el-tag type="warning" size="small" effect="plain">设计态 SortableJS 拖拽守卫</el-tag>
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
        <el-tab-pane label="场景一：运行态三段式 AST 渲染 (MinimalRenderer)" name="minimal">
          <MinimalRendererScenario />
        </el-tab-pane>
        <el-tab-pane label="场景二：异步网络校验与抗竞态 (AsyncValidation)" name="validation">
          <AsyncValidationScenario />
        </el-tab-pane>
        <el-tab-pane label="场景三：零 eval 动态规则与算术 AST (DynamicRules)" name="dynamic-rules">
          <DynamicRuleScenario />
        </el-tab-pane>
        <el-tab-pane label="场景四：BPMN 流程协同与节点权限 (WorkflowSynergy)" name="workflow">
          <WorkflowSynergyScenario />
        </el-tab-pane>
        <el-tab-pane label="场景五：嵌套排版与动态子表单 (SubForm)" name="subform">
          <SubFormScenario />
        </el-tab-pane>
        <el-tab-pane label="场景六：设计态画板、属性自举与历史栈 (FormDesigner)" name="designer">
          <FormDesignerScenario />
        </el-tab-pane>
      </el-tabs>
    </main>
  </div>
</template>

<style scoped>
.sample-app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--el-bg-color-page, #f8fafc);
  color: var(--el-text-color-primary, #0f172a);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.sample-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: var(--el-bg-color, #ffffff);
  border-bottom: 1px solid var(--el-border-color-light, #e2e8f0);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
}

.sample-main {
  padding: 20px 24px;
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

:deep(.el-tabs--border-card) {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

:deep(.el-tabs__content) {
  padding: 20px;
}
</style>
