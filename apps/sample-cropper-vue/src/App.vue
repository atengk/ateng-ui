<script setup lang="ts">
/**
 * sample-cropper-vue 自验展厅主应用顶层入口。
 *
 * 遵循工单 #337 与 documentation-specification.md 规约：
 * 1. 拆解为 4 大自洽业务场景看板（src/views/）；
 * 2. 顶层提供场景导航 Tab 栏（带端口 3016 标识与 L2 扩展层定位）；
 * 3. 支持暗黑模式切换与 URL Hash 状态记忆；
 * 4. 通过动态组件与 KeepAlive 实现流畅的场景自验切换。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref, computed, onMounted, type Component } from 'vue';
import BasicCropperView from './views/BasicCropperView.vue';
import AvatarCropperView from './views/AvatarCropperView.vue';
import ProductWatermarkView from './views/ProductWatermarkView.vue';
import AdvancedStressView from './views/AdvancedStressView.vue';

interface ScenarioMeta {
  id: string;
  name: string;
  icon: string;
  component: Component;
}

const scenarios: ScenarioMeta[] = [
  { id: 'basic', name: '基础画布与参数交互', icon: '🖼️', component: BasicCropperView },
  { id: 'avatar', name: '圆形头像与脱壳弹窗', icon: '👤', component: AvatarCropperView },
  { id: 'product', name: '商品主图与防伪水印', icon: '🏷️', component: ProductWatermarkView },
  { id: 'stress', name: '高级防御与内存监控', icon: '🛡️', component: AdvancedStressView },
];

const activeScenarioId = ref<string>('basic');
const isDarkMode = ref<boolean>(false);

const currentComponent = computed<Component>(() => {
  const item = scenarios.find(s => s.id === activeScenarioId.value);
  return item ? item.component : BasicCropperView;
});

onMounted(() => {
  const hash = window.location.hash.replace('#', '');
  if (hash && scenarios.some(s => s.id === hash)) {
    activeScenarioId.value = hash;
  }
});

function handleSwitchTab(id: string) {
  activeScenarioId.value = id;
  window.location.hash = id;
}

function toggleDarkMode() {
  isDarkMode.value = !isDarkMode.value;
  document.documentElement.classList.toggle('dark', isDarkMode.value);
}
</script>

<template>
  <div class="sample-app">
    <!-- 顶栏全局状态与导航 -->
    <header class="app-header">
      <div class="header-left">
        <span class="badge-layer">L2 专用能力扩展</span>
        <h1 class="header-title">@atengk/cropper-vue 场景展厅</h1>
        <span class="badge-port">端口: 3016</span>
      </div>

      <!-- 场景导航 Tab 栏 -->
      <nav class="nav-tabs" aria-label="核心看板导航">
        <button
          v-for="s in scenarios"
          :key="s.id"
          type="button"
          class="tab-btn"
          :class="{ 'is-active': activeScenarioId === s.id }"
          @click="handleSwitchTab(s.id)"
        >
          <span class="tab-icon">{{ s.icon }}</span>
          <span class="tab-text">{{ s.name }}</span>
        </button>
      </nav>

      <!-- 暗黑主题切换 -->
      <div class="header-right">
        <el-button circle size="small" class="theme-toggle-btn" @click="toggleDarkMode">
          {{ isDarkMode ? '☀️' : '🌙' }}
        </el-button>
      </div>
    </header>

    <!-- 核心视图看板区 -->
    <main class="app-content">
      <KeepAlive>
        <component :is="currentComponent" />
      </KeepAlive>
    </main>
  </div>
</template>

<style scoped>
.sample-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  box-sizing: border-box;
  background-color: var(--el-bg-color-page);
  color: var(--el-text-color-primary);
  padding: 12px 16px;
  gap: 12px;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  box-shadow: var(--el-box-shadow-lighter);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.badge-layer {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  background: var(--el-color-primary-light-8);
  color: var(--el-color-primary);
  border-radius: 12px;
}

.header-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.badge-port {
  font-size: 11px;
  padding: 2px 6px;
  background: var(--el-fill-color);
  color: var(--el-text-color-secondary);
  border-radius: 4px;
}

.nav-tabs {
  display: flex;
  gap: 6px;
  background: var(--el-fill-color-light);
  padding: 4px;
  border-radius: 6px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-regular);
  transition: all 0.2s ease;
}

.tab-btn:hover {
  color: var(--el-color-primary);
}

.tab-btn.is-active {
  background: var(--el-bg-color);
  color: var(--el-color-primary);
  font-weight: 600;
  box-shadow: var(--el-box-shadow-light);
}

.tab-icon {
  font-size: 14px;
}

.header-right {
  display: flex;
  align-items: center;
}

.theme-toggle-btn {
  font-size: 14px;
}

.app-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
</style>
