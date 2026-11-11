<script setup lang="ts">
/**
 * sample-map-vue 展厅主容器。
 *
 * 遵循 ADR-0039 与前端工业级文档与样例工程标准规范，
 * 采用分层多场景看板架构，1:1 正交展示 @atengk/map-vue 核心能力。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { ref } from 'vue';
import { MAP_VUE_VERSION } from '@atengk/map-vue';
import BoardBaseMap from './components/BoardBaseMap.vue';
import BoardPicker from './components/BoardPicker.vue';
import BoardFence from './components/BoardFence.vue';
import BoardAdvanced from './components/BoardAdvanced.vue';

const activeTab = ref<'board1' | 'board2' | 'board3' | 'board4'>('board1');
</script>

<template>
  <div class="sample-map-app">
    <header class="sample-header">
      <div class="brand">
        <h1>@atengk/map-vue 展厅</h1>
        <span class="badge">v{{ MAP_VUE_VERSION }}</span>
      </div>
      <p class="subtitle">通用多源地图、坐标拾取、空间电子围栏与轨迹回放基础设施 (Port: 3019)</p>
    </header>

    <nav class="board-nav">
      <button :class="{ active: activeTab === 'board1' }" @click="activeTab = 'board1'">
        看板 1：多源底图与瓦片预设
      </button>
      <button :class="{ active: activeTab === 'board2' }" @click="activeTab = 'board2'">
        看板 2：坐标拾取与逆地理纠偏
      </button>
      <button :class="{ active: activeTab === 'board3' }" @click="activeTab = 'board3'">
        看板 3：空间电子围栏与越界告警
      </button>
      <button :class="{ active: activeTab === 'board4' }" @click="activeTab = 'board4'">
        看板 4：历史轨迹回放与海量点聚合
      </button>
    </nav>

    <main class="board-viewport">
      <BoardBaseMap v-if="activeTab === 'board1'" />
      <BoardPicker v-else-if="activeTab === 'board2'" />
      <BoardFence v-else-if="activeTab === 'board3'" />
      <BoardAdvanced v-else-if="activeTab === 'board4'" />
    </main>
  </div>
</template>

<style scoped>
.sample-map-app {
  max-width: 1440px;
  margin: 0 auto;
  padding: 24px;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
  color: #1e293b;
}

.sample-header {
  margin-bottom: 24px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
}

.badge {
  background: #eff6ff;
  color: #2563eb;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid #bfdbfe;
}

.subtitle {
  margin: 6px 0 0 0;
  color: #64748b;
  font-size: 14px;
}

.board-nav {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 12px;
  flex-wrap: wrap;
}

.board-nav button {
  padding: 8px 16px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}

.board-nav button:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.board-nav button.active {
  background: #2563eb;
  color: #ffffff;
  font-weight: 600;
}

.board-viewport {
  min-height: 600px;
}
</style>
