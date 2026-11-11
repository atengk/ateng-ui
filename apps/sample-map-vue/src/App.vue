<script setup lang="ts">
/**
 * sample-map-vue 展厅主容器。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { ref } from 'vue';
import { MAP_VUE_VERSION, TilePreset, DEFAULT_MAP_CENTER } from '@atengk/map-vue';

const activeTab = ref('board1');
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
      <section v-if="activeTab === 'board1'" class="board-card">
        <h2>多源底图与瓦片预设看板</h2>
        <p>基线测试：中心点 {{ DEFAULT_MAP_CENTER.lng }}, {{ DEFAULT_MAP_CENTER.lat }}</p>
        <p>支持瓦片源：{{ Object.keys(TilePreset).join(', ') }}</p>
      </section>
      <section v-else-if="activeTab === 'board2'" class="board-card">
        <h2>坐标拾取与逆地理纠偏看板</h2>
        <p>待挂载 AtengMapPicker 交互沙箱</p>
      </section>
      <section v-else-if="activeTab === 'board3'" class="board-card">
        <h2>空间电子围栏与越界告警看板</h2>
        <p>待挂载 AtengMapFence 交互沙箱</p>
      </section>
      <section v-else-if="activeTab === 'board4'" class="board-card">
        <h2>历史轨迹回放与海量点聚合看板</h2>
        <p>待挂载 AtengMapTrack 与 AtengMapCluster 交互沙箱</p>
      </section>
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
  background: #3b82f6;
  color: #fff;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.subtitle {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 14px;
}

.board-nav {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 8px;
}

.board-nav button {
  padding: 8px 16px;
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.board-nav button.active {
  background: #3b82f6;
  color: #fff;
  border-color: #3b82f6;
}

.board-viewport {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  min-height: 480px;
  padding: 24px;
}

.board-card h2 {
  margin-top: 0;
  font-size: 18px;
}
</style>
